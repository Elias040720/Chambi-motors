import importlib.util
import json
import tempfile
import unittest
import copy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
PROFILE_ROOT = ROOT / "tests" / "fixtures" / "projects"
INSTALL_SPEC = importlib.util.spec_from_file_location("ua_installer_profiles", ROOT / "tooling" / "install" / "installer.py")
installer = importlib.util.module_from_spec(INSTALL_SPEC)
INSTALL_SPEC.loader.exec_module(installer)
DIST_SPEC = importlib.util.spec_from_file_location("ua_dist_validator", ROOT / "tooling" / "validate" / "validate_dist.py")
dist_validator = importlib.util.module_from_spec(DIST_SPEC)
DIST_SPEC.loader.exec_module(dist_validator)
ROUTER_SPEC = importlib.util.spec_from_file_location("ua_profile_router", ROOT / "tools" / "route_request.py")
router = importlib.util.module_from_spec(ROUTER_SPEC)
ROUTER_SPEC.loader.exec_module(router)


class ProfileFixtureTests(unittest.TestCase):
    def test_requested_project_profiles_exist_without_installable_dependencies(self):
        required = {"php-mysql-jquery", "react-typescript", "python-package", "java-service", "cli-tool", "empty-repository", "monorepo", "web-fullstack-sqlite", "mobile-flutter-offline"}
        found = {path.name for path in PROFILE_ROOT.iterdir() if path.is_dir()}
        self.assertTrue(required.issubset(found), f"missing: {required - found}")
        self.assertFalse(any(path.name in {"node_modules", ".venv", "venv", "target", "vendor"} for path in PROFILE_ROOT.rglob("*")))
        empty = PROFILE_ROOT / "empty-repository"
        self.assertFalse(any(empty.iterdir()), "empty repository fixture must contain no project files")
        profile_doc = json.loads((ROOT / "tests" / "fixtures" / "project-profiles.json").read_text(encoding="utf-8-sig"))
        self.assertEqual({row["id"] for row in profile_doc["profiles"]}, required)

    def test_ui_evaluation_briefs_are_present(self):
        for name in ("dashboard.md", "complex-form.md", "landing-page.md"):
            self.assertTrue((ROOT / "tests" / "fixtures" / "ui" / name).is_file())

    def test_project_stack_profiles_do_not_select_unrelated_api_or_db_specialists(self):
        base = json.loads((ROOT / "core" / "routing" / "cases.json").read_text(encoding="utf-8-sig"))["base_request"]
        for project in ("php-mysql-jquery", "react-typescript", "python-package", "java-service", "cli-tool"):
            request = copy.deepcopy(base)
            request.update(task_type="implement", intent=f"Make a small, local change in {project}", permission_boundary="workspace-write", scope=[f"tests/fixtures/projects/{project}/README.md"])
            with self.subTest(project=project):
                result = router.route(request)
                self.assertTrue(result["direct_action"])
                self.assertFalse({"api-engineer", "db-engineer"} & set(result["selected_available_capabilities"]))

    def test_empty_repository_and_monorepo_request_focused_discovery(self):
        base = json.loads((ROOT / "core" / "routing" / "cases.json").read_text(encoding="utf-8-sig"))["base_request"]
        empty = copy.deepcopy(base)
        empty.update(task_type="diagnose", intent="Analyze a bug in an empty repository", scope=[])
        empty["signals"]["context"] = {"status": "unknown", "breadth": "narrow", "evidence_paths": []}
        result = router.route(empty)
        self.assertIn("repo-explorer", result["selected_available_capabilities"])
        mono = copy.deepcopy(base)
        mono.update(task_type="plan", intent="Plan a change in one package of a monorepo", scope=["tests/fixtures/projects/monorepo/apps/web/README.md"])
        mono["signals"]["context"]["breadth"] = "broad"
        self.assertIn("context-curator", router.route(mono)["selected_available_capabilities"])

    def test_read_only_stack_detection_on_project_fixtures(self):
        detector_spec = importlib.util.spec_from_file_location("ua_detect_project", ROOT / "tools" / "detect_project.py")
        detector = importlib.util.module_from_spec(detector_spec)
        detector_spec.loader.exec_module(detector)
        expected = {
            "php-mysql-jquery": {"php", "database"},
            "react-typescript": {"node", "typescript"},
            "python-package": {"python"},
            "java-service": {"java"},
            "cli-tool": {"python"},
            "monorepo": {"monorepo"},
            "web-fullstack-sqlite": {"python", "database", "backend", "frontend", "full_stack"},
            "mobile-flutter-offline": {"flutter"},
        }
        for project, wanted in expected.items():
            result = detector.detect(ROOT / "tests" / "fixtures" / "projects" / project)
            ids = {item["id"] for item in result["detected_hints"]}
            with self.subTest(project=project):
                self.assertTrue(wanted.issubset(ids), f"{project}: missing {wanted - ids}; found {ids}")
                self.assertEqual(result["execution"], "read_only_no_project_code_executed")
                self.assertTrue(all(item["evidence_paths"] for item in result["detected_hints"]))

    def test_detector_prunes_ignored_directories_before_descending(self):
        detector_spec = importlib.util.spec_from_file_location("ua_detect_project_pruned", ROOT / "tools" / "detect_project.py")
        detector = importlib.util.module_from_spec(detector_spec)
        detector_spec.loader.exec_module(detector)
        with tempfile.TemporaryDirectory(prefix="ua detector pruned ") as temp:
            root = Path(temp)
            (root / "README.md").write_text("fixture\n", encoding="utf-8")
            (root / "app.py").write_text("print('fixture')\n", encoding="utf-8")
            ignored_dirs = ("node_modules", "vendor", ".venv", "dist", "build")
            for name in ignored_dirs:
                nested = root / name / "deep"
                nested.mkdir(parents=True)
                for index in range(3):
                    (nested / f"ignored-{index}.js").write_text("not scanned\n", encoding="utf-8")

            visited = []
            real_scandir = detector.os.scandir

            def record_scandir(path):
                visited.append(Path(path).resolve())
                return real_scandir(path)

            detector.MAX_FILES = 2
            with patch.object(detector.os, "scandir", side_effect=record_scandir):
                result = detector.detect(root)

            self.assertIn("python", {item["id"] for item in result["detected_hints"]})
            for name in ignored_dirs:
                self.assertNotIn((root / name).resolve(), visited)

    def test_codex_native_agent_toml_parses_when_tomllib_is_available(self):
        if importlib.util.find_spec("tomllib") is None:
            self.skipTest("Python tomllib is unavailable; no TOML dependency installed")
        import tomllib
        agents = ROOT.parent / "dist" / "codex" / ".codex" / "agents"
        files = list(agents.glob("*.toml"))
        self.assertEqual(len(files), 6)
        for path in files:
            with self.subTest(agent=path.name):
                data = tomllib.loads(path.read_text(encoding="utf-8-sig"))
                self.assertTrue(data["name"])
                self.assertTrue(data["description"])
                self.assertTrue(data["developer_instructions"])
                self.assertNotIn(".agents/skills/", data["developer_instructions"], "global agent prompt must not depend on project-relative skill paths")
                self.assertNotIn("shell_tool = false", path.read_text(encoding="utf-8-sig"), "read-only inspector must retain file read/search ability")

    def test_native_adapter_enums_skills_and_role_discovery_contracts(self):
        dist = ROOT.parent / "dist"
        for host in ("antigravity-ide", "antigravity-cli"):
            agent_root = dist / host / ".agents/agents"
            found = {p.stem for p in agent_root.glob("*.md")}
            self.assertEqual(found, {"tech-lead", "architect", "debugger", "implementer", "code-reviewer", "security-auditor"})
            for path in agent_root.glob("*.md"):
                text = path.read_text(encoding="utf-8-sig")
                self.assertRegex(text, r"(?m)^commandExecutionPolicy: (off|auto|eager|sandbox)$")
                self.assertIn("skills:", text)
                self.assertNotIn("ask", text.split("commandExecutionPolicy:", 1)[1].splitlines()[0])
        for host in ("claude-code", "opencode"):
            agent_root = dist / host / (".claude/agents" if host == "claude-code" else ".opencode/agents")
            for path in agent_root.glob("*.md"):
                text = path.read_text(encoding="utf-8-sig")
                self.assertNotIn("SKILL.md`", text)
                if host == "claude-code":
                    self.assertRegex(text, r"(?m)^skills:\n  - [a-z0-9-]+$")
                else:
                    self.assertIn("skill:", text)

    def test_global_skill_maps_resolve_from_a_separate_temporary_project(self):
        # This proves generated target paths, not native host discovery or model execution.
        for host in ("codex", "antigravity-ide", "antigravity-cli", "claude-code", "opencode"):
            with tempfile.TemporaryDirectory(prefix="ua separate workspace ") as temp:
                profile = Path(temp) / "profile"
                project = Path(temp) / "other-project"
                profile.mkdir(); project.mkdir()
                args = SimpleNamespace(host=host, scope="global", target_root=str(profile), project_root=None, bundle=str(ROOT.parent / "dist" / host), replace=False)
                _, plan, _ = installer.plan_install(args)
                skill_targets = [entry["target"] for entry in plan if entry["package_path"].endswith("/architect/SKILL.md")]
                self.assertEqual(len(skill_targets), 1, host)
                self.assertTrue(skill_targets[0].is_relative_to(profile), host)
                self.assertFalse(skill_targets[0].is_relative_to(project), host)
                self.assertNotIn(str(project), str(skill_targets[0]), host)

    def test_global_core_links_from_skills_resolve_in_host_profile_mappings(self):
        import re
        from pathlib import PurePosixPath
        for host in ("codex", "antigravity-ide", "antigravity-cli", "claude-code", "opencode"):
            bundle = ROOT.parent / "dist" / host
            layout = ".claude" if host == "claude-code" else (".opencode" if host == "opencode" else ".agents")
            skill_root = bundle / layout / "skills"
            with tempfile.TemporaryDirectory(prefix="ua global skill links ") as temp:
                profile = Path(temp) / "profile with spaces"
                profile.mkdir()
                failures = []
                for skill_file in skill_root.glob("*/SKILL.md"):
                    text = skill_file.read_text(encoding="utf-8-sig")
                    skill_package = skill_file.relative_to(bundle).as_posix()
                    skill_target = installer.map_target(host, "global", PurePosixPath(skill_package), profile)
                    for ref in re.findall(r"\[[^]]+\]\((\.\./\.\./core/[^)]+)\)", text):
                        package_core = (PurePosixPath(skill_package).parent / ref).as_posix()
                        expected = installer.map_target(host, "global", PurePosixPath(package_core), profile)
                        actual = (skill_target.parent / ref).resolve(strict=False)
                        if expected is None or actual != expected.resolve(strict=False):
                            failures.append(f"{host}: {skill_package} -> {ref} resolves to {actual}, expected {expected}")
                self.assertFalse(failures, "\n".join(failures))

    def test_all_host_manifests_reconcile_with_emitted_files(self):
        hosts = {"codex", "antigravity-ide", "antigravity-cli", "claude-code", "opencode"}
        for host in hosts:
            root = ROOT.parent / "dist" / host
            manifest = json.loads((root / "manifest.json").read_text(encoding="utf-8-sig"))
            self.assertEqual(manifest["host"], host)
            listed = {entry["path"] for entry in manifest["files"]}
            actual = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file() and path.name != "manifest.json"}
            self.assertEqual(listed, actual)
            self.assertFalse(manifest["hooks_enabled"])
            self.assertFalse(manifest["mcp_enabled"])

    def test_all_five_hosts_have_nonconflicting_global_dry_run_maps(self):
        for host in ("codex", "antigravity-ide", "antigravity-cli", "claude-code", "opencode"):
            with tempfile.TemporaryDirectory(prefix="ua host map ") as tmp:
                root = Path(tmp) / "profile with spaces"
                root.mkdir()
                args = SimpleNamespace(host=host, scope="global", target_root=str(root), project_root=None, bundle=str(ROOT.parent / "dist" / host), replace=False)
                with self.subTest(host=host):
                    _, plan, collision = installer.plan_install(args)
                    self.assertTrue(plan)
                    self.assertFalse(collision)
                    targets = {entry["target"] for entry in plan}
                    self.assertEqual(len(targets), len(plan))

    def test_static_distribution_validator_passes_and_names_optional_parser_skips(self):
        results = dist_validator.check()
        self.assertFalse(any(row.startswith("FAIL ") for row in results), "\n".join(results))
        self.assertTrue(any(row.startswith("PASS generated host manifests:") for row in results), "\n".join(results))
        if importlib.util.find_spec("yaml"):
            self.assertTrue(any(row.startswith("PASS YAML syntax and frontmatter objects:") for row in results), "\n".join(results))
        else:
            self.assertTrue(any(row.startswith("SKIP YAML parser validation:") for row in results), "\n".join(results))


if __name__ == "__main__":
    unittest.main()
