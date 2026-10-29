export type NotesDraft = {
  internal: string;
  public: string;
  baseVersion: number | null;
  dirty: boolean;
};

export function recoverNotes(
  saved: Partial<NotesDraft> | undefined,
  server: { internal_notes?: string | null; public_notes?: string | null; version: number },
): NotesDraft {
  if (saved && saved.dirty !== false)
    return {
      internal: saved.internal ?? "",
      public: saved.public ?? "",
      baseVersion: saved.baseVersion ?? null,
      dirty: true,
    };
  return {
    internal: server.internal_notes ?? "",
    public: server.public_notes ?? "",
    baseVersion: server.version,
    dirty: false,
  };
}

export function notesConflict(draft: NotesDraft, version: number) {
  return draft.dirty && draft.baseVersion !== version;
}

export function editNotesDraft(
  draft: NotesDraft,
  field: "internal" | "public",
  value: string,
): NotesDraft {
  return { ...draft, [field]: value, dirty: true };
}

export function refreshNotesDraft(draft: NotesDraft, server: Parameters<typeof recoverNotes>[1]) {
  return draft.dirty ? draft : recoverNotes(undefined, server);
}

export function canEditIntake(photoOperationPending: boolean) {
  return !photoOperationPending;
}

export function canPersistDraft(recovered: boolean, finished: boolean) {
  return recovered && !finished;
}

export function recoveryReady(queueLoaded: boolean, notesLoaded: boolean, failed: boolean) {
  return queueLoaded && notesLoaded && !failed;
}

/** Persist the replacement reference before removing the original file. */
export async function replaceDraftPhoto<T>(
  previous: T | undefined,
  replacement: T,
  persist: (photo: T) => Promise<void>,
  discard: (photo: T) => void,
) {
  try {
    await persist(replacement);
  } catch (error) {
    discard(replacement);
    throw error;
  }
  if (previous) discard(previous);
}
