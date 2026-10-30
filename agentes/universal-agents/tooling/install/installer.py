#!/usr/bin/env python3
"""Manifest-scoped installer. Dry-run is default; operations are journaled before writes."""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import tempfile
import uuid
from pathlib import Path, PurePosixPath

HOSTS = {"codex", "antigravity-ide", "antigravity-cli", "claude-code", "opencode"}
SCOPES = {"project", "global"}
CONTROL = ".universal-agents"
READ_ONLY_ATTR = getattr(__import__("stat"), "FILE_ATTRIBUTE_REPARSE_POINT", 0x400)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def has_reparse(path):
    try:
        stat = path.lstat()
    except FileNotFoundError:
        return False
    return path.is_symlink() or bool(getattr(stat, "st_file_attributes", 0) & READ_ONLY_ATTR)


def assert_components_no_links(path):
    path = path.absolute()
    if str(path).startswith("\\\\"):
        raise ValueError("UNC paths are not accepted")
    current = Path(path.anchor)
    for part in path.parts[1:]:
        current = current / part
        if has_reparse(current):
            raise ValueError("symlink/junction not allowed in selected installation path")


def assert_no_links(path, boundary):
    boundary, current = boundary.absolute(), path.absolute()
    try:
        relative = current.relative_to(boundary)
    except ValueError:
        raise ValueError("destination escapes the selected installation root")
    assert_components_no_links(boundary)
    check = boundary
    for part in relative.parts:
        check = check / part
        if has_reparse(check):
            raise ValueError("symlink/junction not allowed in selected destination")


def safe_relative(value):
    path = PurePosixPath(value)
    if not isinstance(value, str) or not value or path.is_absolute() or any(p in {"", ".", ".."} for p in path.parts) or "\\" in value or ":" in value:
        raise ValueError(f"unsafe package-relative path: {value!r}")
    return path


def package_files(bundle, host):
    manifest_path = bundle / "manifest.json"
    if has_reparse(bundle) or not manifest_path.is_file() or has_reparse(manifest_path):
        raise ValueError("bundle or manifest is missing or linked")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
    if manifest.get("host") != host or manifest.get("schema_version") != 1:
        raise ValueError("bundle manifest host/version does not match requested host")
    if manifest.get("hooks_enabled") is not False or manifest.get("mcp_enabled") is not False or manifest.get("third_party_runtime_dependencies") != []:
        raise ValueError("bundle manifest enables hooks/MCP or declares unreviewed runtime dependencies")
    entries = manifest.get("files")
    if not isinstance(entries, list) or not entries:
        raise ValueError("bundle manifest files must be a non-empty array")
    files, declared = [], set()
    for item in entries:
        if not isinstance(item, dict) or set(item) != {"path", "sha256", "size"}:
            raise ValueError("bundle manifest file entries must contain path, sha256 and size")
        rel = safe_relative(item.get("path", ""))
        if rel.as_posix() in declared:
            raise ValueError(f"duplicate manifest path: {rel}")
        declared.add(rel.as_posix())
        src = bundle.joinpath(*rel.parts)
        if has_reparse(src) or not src.is_file() or sha256(src) != item.get("sha256") or src.stat().st_size != item.get("size"):
            raise ValueError(f"bundle file missing, linked or hash/size mismatch: {rel}")
        files.append((rel, src, item["sha256"]))
    actual = {p.relative_to(bundle).as_posix() for p in bundle.rglob("*") if p.is_file() and p.name != "manifest.json"}
    if any(has_reparse(p) for p in bundle.rglob("*")) or actual != declared:
        raise ValueError("bundle manifest file set mismatch or bundle contains a link")
    return files


def map_target(host, scope, relative, root):
    text = relative.as_posix()
    if text in {"README.md", "manifest.json"}:
        return None
    if scope == "project":
        return root.joinpath(*relative.parts)
    mappings = {
        "codex": [(".agents/", ".agents/"), (".codex/", ".codex/"), ("AGENTS.md", ".codex/AGENTS.md")],
        "antigravity-ide": [(".agents/core/", ".gemini/config/core/"), (".agents/", ".gemini/config/"), ("AGENTS.md", ".gemini/config/AGENTS.md")],
        "antigravity-cli": [(".agents/core/", ".gemini/antigravity-cli/core/"), (".agents/skills/", ".gemini/antigravity-cli/skills/"), (".agents/agents/", ".gemini/config/agents/"), (".agents/rules/", ".gemini/config/rules/"), ("AGENTS.md", ".gemini/config/AGENTS.md")],
        "claude-code": [(".claude/", ".claude/"), ("CLAUDE.md", ".claude/CLAUDE.md")],
        "opencode": [(".opencode/", ".config/opencode/"), ("AGENTS.md", ".config/opencode/AGENTS.md")],
    }
    for source, destination in mappings[host]:
        if text.startswith(source):
            return root.joinpath(*PurePosixPath(destination + text[len(source):]).parts)
    return None


def map_v4_target(host, scope, relative, root):
    if scope == "global" and host == "antigravity-ide" and relative.as_posix().startswith(".agents/"):
        return root.joinpath(".gemini/config", *relative.parts[1:])
    return map_target(host, scope, relative, root)


def temp_root_ok(path):
    root = Path(tempfile.gettempdir()).resolve()
    requested = path.absolute()
    assert_components_no_links(requested)
    candidate = requested.resolve(strict=False)
    if candidate == root or not candidate.is_relative_to(root):
        raise ValueError("--target-root is test-only and must be below the system temporary directory")
    assert_no_links(candidate, root)
    return candidate


def check_target_root(args):
    if args.target_root:
        return temp_root_ok(Path(args.target_root))
    if args.scope == "project":
        requested = Path(args.project_root or Path.cwd()).absolute()
        assert_components_no_links(requested)
        project = requested.resolve(strict=True)
        if not project.is_dir() or project == Path(project.anchor) or str(project).startswith("\\\\"):
            raise ValueError("project root must be an existing non-root directory")
        assert_no_links(project, project)
        return project
    if args.scope == "global":
        requested = Path.home().absolute()
        assert_components_no_links(requested)
        home = requested.resolve(strict=True)
        if home == Path(home.anchor):
            raise ValueError("resolved user home is unsafe")
        assert_no_links(home, home)
        return home
    raise ValueError("invalid installation scope")


def plan_install(args):
    if args.host not in HOSTS or args.scope not in SCOPES:
        raise ValueError("host or scope is unsupported")
    bundle = Path(args.bundle).resolve(strict=True)
    root = check_target_root(args)
    files = package_files(bundle, args.host)
    plan, collision = [], False
    for rel, src, digest in files:
        target = map_target(args.host, args.scope, rel, root)
        if target is None:
            continue
        assert_no_links(target, root)
        if target.exists():
            if not target.is_file():
                raise ValueError(f"destination is not a file: {rel.as_posix()}")
            previous = sha256(target)
            state = "unchanged" if previous == digest else "collision"
            collision |= state == "collision"
        else:
            previous, state = None, "create"
        plan.append({"package_path": rel.as_posix(), "target": target, "source": src, "sha256": digest, "previous_sha256": previous, "action": state})
    if not plan:
        raise ValueError("bundle did not map to any installation paths")
    return root, plan, collision


def operations_dir(root):
    path = root / CONTROL / "operations"
    assert_no_links(path, root)
    return path


def durable_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=".ua-journal-", dir=str(path.parent))
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(data, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def atomic_copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".ua-stage-", dir=str(target.parent))
    os.close(fd)
    temp_path = Path(temporary)
    try:
        shutil.copyfile(source, temp_path)
        with temp_path.open("r+b") as stream:
            os.fsync(stream.fileno())
        os.replace(temp_path, target)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def file_digest(path):
    return sha256(path) if path.is_file() and not has_reparse(path) else None


def apply_install(args, root, plan, failpoint=None):
    op_id = f"{args.host}-{args.scope}-{uuid.uuid4().hex[:12]}"
    op_root = operations_dir(root) / op_id
    payload_dir = op_root / "payload"
    payload_dir.mkdir(parents=True, exist_ok=False)
    entries = []
    # Stage every new payload and every pre-existing byte before the journal becomes prepared.
    for index, item in enumerate(plan):
        if item["action"] == "unchanged":
            continue
        target = item["target"]
        assert_no_links(target, root)
        if item["action"] == "collision" and not args.replace:
            raise RuntimeError(f"collision found; pass --replace after reviewing the diff: {item['package_path']}")
        new_rel = f"payload/{index}.new"
        new_path = op_root / new_rel
        shutil.copyfile(item["source"], new_path)
        if sha256(new_path) != item["sha256"]:
            raise RuntimeError("staged payload hash mismatch")
        before = file_digest(target)
        backup_rel = None
        if before is not None:
            backup_rel = f"payload/{index}.old"
            backup = op_root / backup_rel
            shutil.copyfile(target, backup)
            if sha256(backup) != before:
                raise RuntimeError("staged backup hash mismatch")
        entries.append({"target": target.relative_to(root).as_posix(), "package_path": item["package_path"], "before_sha256": before, "new_sha256": item["sha256"], "new_payload": new_rel, "backup_payload": backup_rel})
    journal = {"schema_version": 2, "operation_id": op_id, "host": args.host, "scope": args.scope, "state": "prepared", "files": entries}
    journal_path = op_root / "journal.json"
    durable_json(journal_path, journal)
    if failpoint:
        failpoint("after_journal", 0)
    journal["state"] = "installing"
    durable_json(journal_path, journal)
    try:
        for idx, entry in enumerate(entries, 1):
            target = root.joinpath(*safe_relative(entry["target"]).parts)
            assert_no_links(target, root)
            actual = file_digest(target)
            if actual != entry["before_sha256"]:
                raise RuntimeError(f"pre-write drift detected: {entry['target']}")
            atomic_copy(op_root / entry["new_payload"], target)
            if file_digest(target) != entry["new_sha256"]:
                raise RuntimeError(f"post-copy hash mismatch: {entry['package_path']}")
            if failpoint:
                failpoint("after_replace", idx)
        if failpoint:
            failpoint("before_commit", len(entries))
        journal["state"] = "committed"
        durable_json(journal_path, journal)
    except Exception:
        # The durable journal and staged bytes survive so explicit --recover can compensate.
        raise
    return op_id


def _load_journal(root, op_id):
    if not re.fullmatch(r"[a-z0-9-]{8,80}", op_id):
        raise ValueError("invalid operation id")
    path = operations_dir(root) / op_id / "journal.json"
    assert_no_links(path, root)
    if not path.is_file():
        raise ValueError("operation journal not found")
    journal = json.loads(path.read_text(encoding="utf-8"))
    if journal.get("schema_version") != 2 or journal.get("operation_id") != op_id or journal.get("host") not in HOSTS or journal.get("scope") not in SCOPES or not isinstance(journal.get("files"), list):
        raise ValueError("operation journal identity/schema is invalid")
    return path, journal


def _preflight_compensation(root, op_root, journal):
    prepared = []
    seen = set()
    for entry in journal["files"]:
        if not isinstance(entry, dict) or set(entry) != {"target", "package_path", "before_sha256", "new_sha256", "new_payload", "backup_payload"}:
            raise ValueError("journal entry shape is invalid")
        rel = safe_relative(entry["target"]).as_posix()
        if rel in seen:
            raise ValueError("journal has duplicate targets")
        seen.add(rel)
        package_rel = safe_relative(entry["package_path"])
        mapper = map_v4_target if journal.get("migrated_from") == "v4-ledger-v1" else map_target
        expected = mapper(journal["host"], journal["scope"], package_rel, root)
        if expected is None or expected.relative_to(root).as_posix() != rel:
            raise ValueError(f"journal target is not authorized by its original host/scope mapping: {rel}")
        for payload_key in ("new_payload", "backup_payload"):
            payload_name = entry[payload_key]
            if payload_name is not None and not safe_relative(payload_name).as_posix().startswith("payload/"):
                raise ValueError("journal payload reference escapes its operation directory")
        target = root.joinpath(*PurePosixPath(rel).parts)
        assert_no_links(target, root)
        actual = file_digest(target)
        if actual not in {entry["new_sha256"], entry["before_sha256"]}:
            raise RuntimeError(f"recovery stopped: target drifted: {rel}")
        new_payload = op_root.joinpath(*safe_relative(entry["new_payload"]).parts)
        assert_no_links(new_payload, op_root)
        if not new_payload.is_file() or sha256(new_payload) != entry["new_sha256"]:
            raise RuntimeError("recovery stopped: staged payload missing or corrupt")
        backup = None
        if entry["before_sha256"] is not None:
            if not isinstance(entry["backup_payload"], str):
                raise ValueError("journal backup path is invalid")
            backup = op_root.joinpath(*safe_relative(entry["backup_payload"]).parts)
            assert_no_links(backup, op_root)
            if not backup.is_file() or sha256(backup) != entry["before_sha256"]:
                raise RuntimeError("recovery stopped: staged backup missing or corrupt")
        elif entry["backup_payload"] is not None:
            raise ValueError("new file unexpectedly has a backup")
        prepared.append((entry, target, backup, actual))
    return prepared


def recover_operation(root, op_id, failpoint=None):
    path, journal = _load_journal(root, op_id)
    if journal["state"] in {"rolled_back", "recovered"}:
        print(f"RECOVERED {op_id}: already compensated")
        return
    if journal["state"] == "committed":
        print(f"COMMITTED {op_id}: no interrupted operation to recover")
        return
    if journal["state"] not in {"prepared", "installing", "rolling_back"}:
        raise ValueError("journal state is not recoverable")
    prepared = _preflight_compensation(root, path.parent, journal)
    journal["state"] = "rolling_back"
    durable_json(path, journal)
    for idx, (entry, target, backup, actual) in enumerate(reversed(prepared), 1):
        if actual == entry["before_sha256"]:
            continue
        if backup is None:
            target.unlink()
        else:
            atomic_copy(backup, target)
            if file_digest(target) != entry["before_sha256"]:
                raise RuntimeError("recovery restore verification failed")
        if failpoint:
            failpoint("during_rollback", idx)
    journal["state"] = "recovered"
    durable_json(path, journal)
    print(f"RECOVERED {op_id}: interrupted installation compensated from journal; bundle not required")


def _legacy_package_path(host, scope, target_rel, root):
    """Infer an old V4 package path only through its closed host/scope mapping."""
    if scope == "project":
        candidates = [target_rel]
    else:
        reverse = {
            "codex": [(".agents/", ".agents/"), (".codex/", ".codex/"), (".codex/AGENTS.md", "AGENTS.md")],
            # V4 and V4.1 both use config/core so ../../core links resolve
            # from config/skills in the IDE's global tree.
            "antigravity-ide": [(".gemini/config/core/", ".agents/core/"), (".gemini/config/skills/", ".agents/skills/"), (".gemini/config/agents/", ".agents/agents/"), (".gemini/config/rules/", ".agents/rules/"), (".gemini/config/AGENTS.md", "AGENTS.md")],
            "antigravity-cli": [(".gemini/antigravity-cli/core/", ".agents/core/"), (".gemini/antigravity-cli/skills/", ".agents/skills/"), (".gemini/config/agents/", ".agents/agents/"), (".gemini/config/rules/", ".agents/rules/"), (".gemini/config/AGENTS.md", "AGENTS.md")],
            "claude-code": [(".claude/", ".claude/"), (".claude/CLAUDE.md", "CLAUDE.md")],
            "opencode": [(".config/opencode/", ".opencode/"), (".config/opencode/AGENTS.md", "AGENTS.md")],
        }
        candidates = []
        for dest, source in reverse[host]:
            if target_rel == dest or (dest.endswith("/") and target_rel.startswith(dest)):
                candidates.append(source + target_rel[len(dest):])
    for candidate in candidates:
        if candidate in {"README.md", "manifest.json"}:
            continue
        safe_relative(candidate)
        allowed = (".agents/skills/", ".agents/core/", ".agents/agents/", ".agents/rules/", ".codex/agents/", ".claude/skills/", ".claude/core/", ".claude/agents/", ".opencode/skills/", ".opencode/core/", ".opencode/agents/")
        if candidate in {"AGENTS.md", "CLAUDE.md"} or candidate.startswith(allowed):
            return candidate
    raise ValueError(f"legacy V4 target is outside its original host/scope map: {target_rel}")


def _migrate_v4_ledger(root, args):
    legacy_path = root / CONTROL / "manifests" / f"{args.rollback}.json"
    assert_no_links(legacy_path, root)
    if not legacy_path.is_file():
        return None
    legacy = json.loads(legacy_path.read_text(encoding="utf-8"))
    if legacy.get("schema_version") != 1 or legacy.get("install_id") != args.rollback or legacy.get("state") != "installed" or legacy.get("host") != args.host or legacy.get("scope") != args.scope or not isinstance(legacy.get("files"), list):
        raise ValueError("legacy V4 install ledger identity/state is invalid")
    op_root = operations_dir(root) / args.rollback
    if op_root.exists():
        raise ValueError("cannot migrate legacy V4 ledger: operation journal already exists")
    payload_dir = op_root / "payload"
    payload_dir.mkdir(parents=True)
    entries, seen = [], set()
    for index, item in enumerate(legacy["files"]):
        if not isinstance(item, dict) or set(item) != {"target", "installed_sha256", "created", "previous_sha256", "backup"}:
            raise ValueError("legacy V4 ledger entry shape is invalid")
        target_rel = safe_relative(item["target"]).as_posix()
        if target_rel in seen:
            raise ValueError("legacy V4 ledger has duplicate targets")
        seen.add(target_rel)
        package_path = _legacy_package_path(args.host, args.scope, target_rel, root)
        target = root.joinpath(*PurePosixPath(target_rel).parts)
        assert_no_links(target, root)
        if file_digest(target) != item["installed_sha256"] or type(item["created"]) is not bool:
            raise RuntimeError(f"legacy V4 migration stopped: installed target drifted: {target_rel}")
        new_rel = f"payload/{index}.new"
        shutil.copyfile(target, op_root / new_rel)
        backup_rel = None
        if item["created"]:
            if item["previous_sha256"] is not None or item["backup"] is not None:
                raise ValueError("legacy created-file entry unexpectedly contains backup")
        else:
            prefix = f"{CONTROL}/backups/{args.rollback}/"
            if not isinstance(item["backup"], str) or not item["backup"].startswith(prefix) or item["previous_sha256"] is None:
                raise ValueError("legacy backup reference is outside its operation backup directory")
            old = root.joinpath(*safe_relative(item["backup"]).parts)
            assert_no_links(old, root)
            if not old.is_file() or sha256(old) != item["previous_sha256"]:
                raise RuntimeError("legacy V4 backup missing or hash mismatch")
            backup_rel = f"payload/{index}.old"
            shutil.copyfile(old, op_root / backup_rel)
        entries.append({"target": target_rel, "package_path": package_path, "before_sha256": item["previous_sha256"], "new_sha256": item["installed_sha256"], "new_payload": new_rel, "backup_payload": backup_rel})
    journal = {"schema_version": 2, "operation_id": args.rollback, "host": args.host, "scope": args.scope, "state": "committed", "migrated_from": "v4-ledger-v1", "files": entries}
    durable_json(op_root / "journal.json", journal)
    return journal


def rollback(args, failpoint=None):
    root = check_target_root(args)
    try:
        path, journal = _load_journal(root, args.rollback)
    except ValueError as exc:
        if "journal not found" not in str(exc):
            raise
        journal = _migrate_v4_ledger(root, args)
        if journal is None:
            raise
        path = operations_dir(root) / args.rollback / "journal.json"
    if journal.get("host") != args.host or journal.get("scope") != args.scope:
        raise ValueError("operation host/scope does not match request")
    if journal["state"] in {"prepared", "installing", "rolling_back"}:
        return recover_operation(root, args.rollback, failpoint)
    if journal["state"] not in {"committed", "rolled_back", "recovered"}:
        raise ValueError("operation state cannot be rolled back")
    if journal["state"] in {"rolled_back", "recovered"}:
        print(f"ROLLED_BACK {args.rollback}: already complete")
        return
    prepared = _preflight_compensation(root, path.parent, journal)
    journal["state"] = "rolling_back"
    durable_json(path, journal)
    for idx, (entry, target, backup, actual) in enumerate(reversed(prepared), 1):
        if actual == entry["before_sha256"]:
            continue
        if backup is None:
            target.unlink()
        else:
            atomic_copy(backup, target)
            if file_digest(target) != entry["before_sha256"]:
                raise RuntimeError("rollback restore verification failed")
        if failpoint:
            failpoint("during_rollback", idx)
    journal["state"] = "rolled_back"
    durable_json(path, journal)
    print(f"ROLLED_BACK {args.rollback}: exact bytes restored/created files removed from journal")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", choices=sorted(HOSTS), required=True)
    parser.add_argument("--scope", choices=sorted(SCOPES), required=True)
    parser.add_argument("--bundle", help="required only for install or dry-run")
    parser.add_argument("--project-root")
    parser.add_argument("--target-root", help="TEST ONLY: must be below the OS temporary directory")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="default; never writes")
    mode.add_argument("--apply", action="store_true", help="perform explicit installation")
    parser.add_argument("--replace", action="store_true", help="back up and replace conflicting files")
    parser.add_argument("--rollback", metavar="OPERATION_ID")
    parser.add_argument("--uninstall", metavar="OPERATION_ID")
    parser.add_argument("--recover", metavar="OPERATION_ID", help="compensate an interrupted install using its durable journal")
    parser.add_argument("--list-recoverable", action="store_true")
    args = parser.parse_args(argv)
    selected = [args.rollback, args.uninstall, args.recover, args.list_recoverable]
    if sum(bool(x) for x in selected) > 1:
        parser.error("choose only one of rollback, uninstall, recover or list-recoverable")
    if args.uninstall:
        args.rollback = args.uninstall
    if (args.rollback or args.recover or args.list_recoverable) and args.apply:
        parser.error("recovery/rollback are explicit actions; do not combine with --apply")
    try:
        root = check_target_root(args)
        if args.recover:
            recover_operation(root, args.recover)
            return 0
        if args.rollback:
            rollback(args)
            return 0
        if args.list_recoverable:
            folder = operations_dir(root)
            for path in sorted(folder.glob("*/journal.json")) if folder.exists() else []:
                journal = json.loads(path.read_text(encoding="utf-8"))
                if journal.get("state") in {"prepared", "installing", "rolling_back"}:
                    print(f"RECOVERABLE {journal.get('operation_id')}: {journal.get('state')}")
            return 0
        if not args.bundle:
            parser.error("--bundle is required for dry-run or installation")
        root, plan, collision = plan_install(args)
        for item in plan:
            label = "GLOBAL_ROOT" if args.scope == "global" else "PROJECT_ROOT"
            print(f"{item['action'].upper():10} {item['package_path']} -> {label}/{item['target'].relative_to(root).as_posix()}")
        if collision and not args.replace:
            print("BLOCKED: conflicts exist; no files changed. Review and use --replace only if intended.")
            return 2
        if all(item["action"] == "unchanged" for item in plan):
            print("ALREADY_INSTALLED: every mapped file matches; no files or journal written.")
            return 0
        if not args.apply:
            print(f"DRY_RUN: {len(plan)} mapped files; no files written.")
            return 0
        op_id = apply_install(args, root, plan)
        print(f"INSTALLED {op_id}; use --rollback {op_id} to restore, or --recover {op_id} after interruption.")
        return 0
    except OSError:
        print("ERROR: filesystem operation failed; local paths omitted from diagnostic. If a journal exists, run --list-recoverable then --recover ID.", file=sys.stderr)
        return 2
    except (ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
