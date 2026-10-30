import contextlib
import importlib.util
import io
import json
import os
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("ua_installer", ROOT / "tooling" / "install" / "installer.py")
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)
BUNDLE = ROOT.parent / "dist" / "codex"


class InstallerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="ua tests ")
        self.root = Path(self.tmp.name) / "profile with spaces"
        self.root.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def run_installer(self, *extra):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = installer.main(["--host", "codex", "--scope", "global", "--bundle", str(BUNDLE), "--target-root", str(self.root), *extra])
        return code, output.getvalue()

    def install(self):
        code, output = self.run_installer("--apply")
        self.assertEqual(code, 0, output)
        marker = "INSTALLED "
        install_id = output.split(marker, 1)[1].split(";", 1)[0]
        return install_id

    def test_dry_run_is_default_and_writes_nothing(self):
        code, output = self.run_installer()
        self.assertEqual(code, 0, output)
        self.assertIn("DRY_RUN:", output)
        self.assertIn("GLOBAL_ROOT/.agents/", output)
        self.assertNotIn(str(self.root), output)
        self.assertFalse((self.root / ".agents").exists())
        self.assertFalse((self.root / installer.CONTROL).exists())

    def test_apply_and_repeat_are_idempotent_in_paths_with_spaces(self):
        install_id = self.install()
        first = installer.sha256(self.root / ".agents/skills/architect/SKILL.md")
        before_manifests = list((self.root / installer.CONTROL / "manifests").glob("*.json"))
        code, output = self.run_installer("--apply")
        self.assertEqual(code, 0, output)
        self.assertIn("ALREADY_INSTALLED", output)
        self.assertIn("UNCHANGED", output)
        self.assertEqual(first, installer.sha256(self.root / ".agents/skills/architect/SKILL.md"))
        self.assertEqual(before_manifests, list((self.root / installer.CONTROL / "manifests").glob("*.json")))

    def test_conflict_blocks_without_replace(self):
        target = self.root / ".agents/skills/architect/SKILL.md"
        target.parent.mkdir(parents=True)
        target.write_text("user file\n", encoding="utf-8")
        code, output = self.run_installer()
        self.assertEqual(code, 2)
        self.assertIn("BLOCKED", output)
        self.assertEqual(target.read_text(encoding="utf-8"), "user file\n")

    def test_project_scope_installs_and_uninstalls_only_in_target_tree(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = installer.main(["--host", "codex", "--scope", "project", "--bundle", str(BUNDLE), "--project-root", str(self.root), "--apply"])
        self.assertEqual(code, 0, output.getvalue())
        install_id = output.getvalue().split("INSTALLED ", 1)[1].split(";", 1)[0]
        self.assertTrue((self.root / ".agents/skills/tech-lead/SKILL.md").is_file())
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = installer.main(["--host", "codex", "--scope", "project", "--bundle", str(BUNDLE), "--project-root", str(self.root), "--uninstall", install_id])
        self.assertEqual(code, 0, output.getvalue())
        self.assertFalse((self.root / ".agents/skills/tech-lead/SKILL.md").exists())

    def test_replace_can_be_rolled_back_exactly(self):
        target = self.root / ".agents/skills/architect/SKILL.md"
        target.parent.mkdir(parents=True)
        original = "valuable local content\n"
        target.write_text(original, encoding="utf-8")
        install_id = self.install_with_replace()
        unrelated = self.root / "README.md"
        unrelated.write_text("untouched\n", encoding="utf-8")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = installer.main(["--host", "codex", "--scope", "global", "--target-root", str(self.root), "--rollback", install_id])
        self.assertEqual(code, 0, output.getvalue())
        self.assertEqual(target.read_text(encoding="utf-8"), original)
        self.assertEqual(unrelated.read_text(encoding="utf-8"), "untouched\n")

    def install_with_replace(self):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            code = installer.main(["--host", "codex", "--scope", "global", "--bundle", str(BUNDLE), "--target-root", str(self.root), "--apply", "--replace"])
        self.assertEqual(code, 0, output.getvalue())
        return output.getvalue().split("INSTALLED ", 1)[1].split(";", 1)[0]

    def test_rollback_stops_if_owned_file_drifted(self):
        install_id = self.install()
        journal_path = self.root / installer.CONTROL / "operations" / install_id / "journal.json"
        ledger = json.loads(journal_path.read_text(encoding="utf-8"))
        record = ledger["files"][0]
        target = self.root.joinpath(*installer.safe_relative(record["target"]).parts)
        untouched = self.root.joinpath(*installer.safe_relative(ledger["files"][-1]["target"]).parts)
        untouched_before = installer.sha256(untouched)
        target.write_text("changed after install\n", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "target drifted"):
            installer.rollback(argparse_namespace(self.root, install_id))
        self.assertEqual(target.read_text(encoding="utf-8"), "changed after install\n")
        self.assertEqual(installer.sha256(untouched), untouched_before, "preflight drift must not partially remove later-owned files")

    def test_recover_after_first_new_file_write(self):
        args, root, plan = self.install_plan()
        def fail(stage, index):
            if stage == "after_replace" and index == 1:
                raise OSError("injected process interruption")
        with self.assertRaises(OSError):
            installer.apply_install(args, root, plan, failpoint=fail)
        op_id = next((root / installer.CONTROL / "operations").iterdir()).name
        installer.recover_operation(root, op_id)
        self.assertFalse((root / ".agents/skills/architect/SKILL.md").exists())
        self.assertEqual(json.loads((root / installer.CONTROL / "operations" / op_id / "journal.json").read_text())['state'], "recovered")

    def test_recover_after_replace_restores_existing_bytes_without_bundle(self):
        target = self.root / ".agents/skills/architect/SKILL.md"
        target.parent.mkdir(parents=True)
        original = b"prior bytes\x00\r\n"
        target.write_bytes(original)
        args, root, plan = self.install_plan(replace=True)
        def fail(stage, index):
            if stage == "after_replace" and index == 1:
                raise OSError("injected interruption after replacement")
        with self.assertRaises(OSError):
            installer.apply_install(args, root, plan, failpoint=fail)
        op_id = next((root / installer.CONTROL / "operations").iterdir()).name
        installer.recover_operation(root, op_id)
        self.assertEqual(target.read_bytes(), original)

    def test_recovery_survives_failure_during_compensating_rollback(self):
        args, root, plan = self.install_plan()
        def stop_install(stage, index):
            if stage == "after_replace" and index == 2:
                raise OSError("interrupted install")
        with self.assertRaises(OSError):
            installer.apply_install(args, root, plan, failpoint=stop_install)
        op_id = next((root / installer.CONTROL / "operations").iterdir()).name
        def stop_rollback(stage, index):
            if stage == "during_rollback":
                raise OSError("interrupted rollback")
        with self.assertRaises(OSError):
            installer.recover_operation(root, op_id, failpoint=stop_rollback)
        installer.recover_operation(root, op_id)
        self.assertEqual(json.loads((root / installer.CONTROL / "operations" / op_id / "journal.json").read_text())['state'], "recovered")
        self.assertFalse((root / ".agents/skills/architect/SKILL.md").exists())

    def test_v4_ledger_migrates_to_journal_without_current_bundle(self):
        target_rel = ".agents/skills/architect/SKILL.md"
        target = self.root / target_rel
        target.parent.mkdir(parents=True)
        target.write_bytes(b"v4 installed")
        op_id = "codex-global-legacy001"
        backup_rel = f"{installer.CONTROL}/backups/{op_id}/{target_rel}"
        backup = self.root / backup_rel
        backup.parent.mkdir(parents=True)
        backup.write_bytes(b"prior exact bytes\x00")
        ledger = {"schema_version": 1, "install_id": op_id, "host": "codex", "scope": "global", "state": "installed", "files": [{"target": target_rel, "installed_sha256": installer.sha256(target), "created": False, "previous_sha256": installer.sha256(backup), "backup": backup_rel}]}
        ledger_path = self.root / installer.CONTROL / "manifests" / f"{op_id}.json"
        ledger_path.parent.mkdir(parents=True)
        ledger_path.write_text(json.dumps(ledger), encoding="utf-8")
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            installer.rollback(argparse_namespace(self.root, op_id))
        self.assertEqual(target.read_bytes(), b"prior exact bytes\x00")
        migrated = self.root / installer.CONTROL / "operations" / op_id / "journal.json"
        self.assertEqual(json.loads(migrated.read_text(encoding="utf-8"))["migrated_from"], "v4-ledger-v1")

    def test_recover_after_durable_journal_before_any_target_write(self):
        args, root, plan = self.install_plan()
        def fail(stage, index):
            if stage == "after_journal":
                raise OSError("interrupted before target mutation")
        with self.assertRaises(OSError):
            installer.apply_install(args, root, plan, failpoint=fail)
        op_id = next((root / installer.CONTROL / "operations").iterdir()).name
        installer.recover_operation(root, op_id)
        self.assertFalse((root / ".agents").exists())

    def install_plan(self, replace=False):
        from types import SimpleNamespace
        args = SimpleNamespace(host="codex", scope="global", bundle=str(BUNDLE), project_root=None, target_root=str(self.root), replace=replace)
        root, plan, collision = installer.plan_install(args)
        self.assertFalse(collision and not replace)
        return args, root, plan

    def test_destination_symlink_is_rejected(self):
        outside = Path(self.tmp.name) / "outside"
        outside.mkdir()
        try:
            (self.root / ".agents").symlink_to(outside, target_is_directory=True)
        except (OSError, NotImplementedError) as exc:
            error = getattr(exc, "winerror", None)
            self.skipTest("symlink creation unavailable in this Windows session" + (f" (WinError {error})" if error else ""))
        code, output = self.run_installer()
        self.assertEqual(code, 2)
        self.assertIn("symlink/junction", output)
        self.assertFalse(any(outside.iterdir()))

    def test_junction_marker_is_rejected_even_without_windows_link_privilege(self):
        linked = self.root / ".agents"
        original = installer.has_reparse
        def mark_junction(path):
            return Path(path).absolute() == linked.absolute() or original(path)
        with mock.patch.object(installer, "has_reparse", side_effect=mark_junction):
            with self.assertRaisesRegex(ValueError, "symlink/junction") as raised:
                installer.assert_no_links(linked / "skills" / "tech-lead" / "SKILL.md", self.root)
        self.assertNotIn(str(self.root), str(raised.exception))

    def test_bundle_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix="ua bad bundle ") as tmp:
            bad = Path(tmp) / "bundle"
            shutil.copytree(BUNDLE, bad)
            manifest = json.loads((bad / "manifest.json").read_text(encoding="utf-8"))
            manifest["files"][0]["path"] = "../escape.txt"
            (bad / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "unsafe package-relative path"):
                installer.package_files(bad, "codex")


def argparse_namespace(root, install_id):
    from types import SimpleNamespace
    return SimpleNamespace(target_root=str(root), scope="global", project_root=None, rollback=install_id, host="codex")


if __name__ == "__main__":
    unittest.main()
