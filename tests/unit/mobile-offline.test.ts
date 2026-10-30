import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canPersistDraft,
  canEditIntake,
  editNotesDraft,
  refreshNotesDraft,
  notesConflict,
  recoveryReady,
  recoverNotes,
  replaceDraftPhoto,
} from "../../apps/mobile/lib/drafts";

const server = { internal_notes: "Servidor v2", public_notes: "Visible v2", version: 2 };
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("intake recovery write gate", () => {
  it("blocks actions until both recoveries succeed, including retry failures", () => {
    expect(recoveryReady(false, true, false)).toBe(false);
    expect(recoveryReady(true, false, false)).toBe(false);
    expect(recoveryReady(true, true, true)).toBe(false);
    expect(recoveryReady(true, true, false)).toBe(true);
  });
  it("preserves UUID/payload before recovery and after a failed read", () => {
    const persisted = { key: "original-uuid", submissionPayload: '{"unchanged":true}' };
    let stored = persisted;
    for (const recovered of [false, false]) {
      if (canPersistDraft(recovered, false)) stored = { key: "empty-uuid", submissionPayload: "" };
    }
    expect(stored).toBe(persisted);
    expect(canPersistDraft(true, false)).toBe(true);
    expect(canPersistDraft(true, true)).toBe(false);
  });
});

describe("notes revision and dirty state", () => {
  it("refresh updates clean displayed notes before the first edit", () => {
    const initial = recoverNotes(undefined, { ...server, internal_notes: "Inicial", version: 1 });
    const shown = refreshNotesDraft(initial, { ...server, internal_notes: "Actualizada" });
    const edited = editNotesDraft(shown, "internal", `${shown.internal}!`);
    expect(edited.internal).toBe("Actualizada!");
    expect(edited.baseVersion).toBe(2);
  });
  it("edit racing ahead of refresh retains displayed v1 and produces conflict, never implicit v2", () => {
    const initial = recoverNotes(undefined, { ...server, internal_notes: "Inicial", version: 1 });
    const edited = editNotesDraft(initial, "internal", `${initial.internal}!`);
    expect(refreshNotesDraft(edited, server)).toBe(edited);
    expect(edited.baseVersion).toBe(1);
    expect(notesConflict(edited, 2)).toBe(true);
  });
  it("reading an order does not create a dirty draft", () => {
    expect(recoverNotes(undefined, server)).toEqual({
      internal: "Servidor v2",
      public: "Visible v2",
      baseVersion: 2,
      dirty: false,
    });
  });
  it("keeps recovered text/version and blocks overwriting a newer version", () => {
    const restored = recoverNotes(
      { internal: "Local v1", public: "", baseVersion: 1, dirty: true },
      server,
    );
    expect(restored.internal).toBe("Local v1");
    expect(restored.baseVersion).toBe(1);
    expect(notesConflict(restored, 2)).toBe(true);
    expect(notesConflict(restored, 1)).toBe(false);
  });
  it("legacy drafts with unknown base require explicit conflict resolution", () => {
    const restored = recoverNotes({ internal: "No perder", public: "" }, server);
    expect(restored.dirty).toBe(true);
    expect(restored.baseVersion).toBeNull();
    expect(notesConflict(restored, 2)).toBe(true);
  });
  it("clean records use current server text; explicit discard starts fresh", () => {
    const clean = recoverNotes({ internal: "Antiguo", dirty: false, baseVersion: 1 }, server);
    expect(clean.internal).toBe(server.internal_notes);
    expect(notesConflict(clean, 3)).toBe(false);
    expect(recoverNotes(undefined, server).baseVersion).toBe(2);
  });
});

describe("photo reference replacement: real host files, not Expo native", () => {
  it("blocks field/checklist/step edits during picker and reference persistence", async () => {
    let pending = true;
    let draft = { concern: "Original", checklist: ["Revisado"], step: 3 };
    let picked!: () => void;
    let persisted!: () => void;
    const picker = new Promise<void>((resolve) => {
      picked = resolve;
    });
    const save = new Promise<void>((resolve) => {
      persisted = resolve;
    });
    const photo = (async () => {
      await picker;
      await save;
      pending = false;
    })();
    const edit = () => {
      if (canEditIntake(pending)) draft = { concern: "Nuevo", checklist: [], step: 4 };
    };
    edit();
    picked();
    await Promise.resolve();
    edit();
    expect(draft).toEqual({ concern: "Original", checklist: ["Revisado"], step: 3 });
    persisted();
    await photo;
    edit();
    expect(draft.step).toBe(4);
  });
  async function fixture() {
    const directory = await mkdtemp(join(tmpdir(), "chambi-draft-"));
    temporary.push(directory);
    const old = join(directory, "old.jpg");
    const next = join(directory, "next.jpg");
    const record = join(directory, "draft.json");
    await Promise.all([
      writeFile(old, "old-bytes"),
      writeFile(next, "new-bytes"),
      writeFile(record, JSON.stringify({ photo: old })),
    ]);
    return { old, next, record };
  }
  it("persists new reference before deleting original", async () => {
    const { old, next, record } = await fixture();
    await replaceDraftPhoto(
      old,
      next,
      async (photo) => {
        expect(existsSync(old)).toBe(true);
        await writeFile(record, JSON.stringify({ photo }));
      },
      unlinkSync,
    );
    expect(JSON.parse(await readFile(record, "utf8")).photo).toBe(next);
    expect(existsSync(old)).toBe(false);
    expect(await readFile(next, "utf8")).toBe("new-bytes");
  });
  it("failed save preserves original bytes/reference and removes only new file", async () => {
    const { old, next, record } = await fixture();
    await expect(
      replaceDraftPhoto(
        old,
        next,
        async () => {
          throw new Error("disk full");
        },
        unlinkSync,
      ),
    ).rejects.toThrow("disk full");
    expect(JSON.parse(await readFile(record, "utf8")).photo).toBe(old);
    expect(await readFile(old, "utf8")).toBe("old-bytes");
    expect(existsSync(next)).toBe(false);
  });
  it("cannot delete original while persistence acknowledgment is pending", async () => {
    let acknowledge!: () => void;
    const durable = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    const discard = vi.fn();
    const operation = replaceDraftPhoto("old", "new", () => durable, discard);
    await Promise.resolve();
    expect(discard).not.toHaveBeenCalled();
    acknowledge();
    await operation;
    expect(discard).toHaveBeenCalledExactlyOnceWith("old");
  });
});
