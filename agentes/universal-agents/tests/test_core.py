import copy
import importlib.util
import json
import re
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_tool(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "tools" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def merge(base, patch):
    result = copy.deepcopy(base)
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(result.get(key), dict):
            result[key] = merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


router = load_tool("route_request")
validator = load_tool("validate_package")
evidence_verifier = load_tool("verify_evidence")


class RoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture = json.loads((ROOT / "core/routing/cases.json").read_text(encoding="utf-8"))
        cls.base = cls.fixture["base_request"]

    def test_at_least_twenty_representative_cases(self):
        self.assertGreaterEqual(len(self.fixture["cases"]), 20)
        for case in self.fixture["cases"]:
            with self.subTest(case=case["id"]):
                request = merge(self.base, case.get("overrides", {}))
                if "expected_error" in case:
                    with self.assertRaisesRegex(ValueError, re.escape(case["expected_error"])):
                        router.route(request)
                    continue
                result = router.route(request)
                expected = case["expected"]
                self.assertEqual(result["route_kind"], expected["route_kind"])
                self.assertEqual(result["selected_available_capabilities"], expected.get("selected", []))
                self.assertEqual({item["id"] for item in result["deferred_capabilities"]}, set(expected.get("deferred", [])))
                self.assertEqual(set(result["conflicts"]), set(expected.get("conflicts", [])))
                if "pending" in expected:
                    self.assertEqual({item["check"] for item in result["verification_pending"]}, set(expected["pending"]))
                if "not_deferred" in expected:
                    self.assertFalse(set(expected["not_deferred"]) & {item["id"] for item in result["deferred_capabilities"]})
                if "tool_gaps" in expected:
                    self.assertEqual(result["tool_gaps"], expected["tool_gaps"])
                if "essential_tool_gaps" in expected:
                    self.assertEqual(result["essential_tool_gaps"], expected["essential_tool_gaps"])
                    self.assertEqual(result["blocking_conditions"], expected["blocking_conditions"])
                if "permissions" in expected:
                    for key, value in expected["permissions"].items():
                        self.assertEqual(result["permissions"][key], value)

    def test_two_docs_do_not_route_api_or_database(self):
        case = next(item for item in self.fixture["cases"] if item["id"] == "readme_and_contributing_no_api_db")
        result = router.route(merge(self.base, case["overrides"]))
        self.assertTrue(result["direct_action"])
        self.assertEqual(result["selected_available_capabilities"], [])
        deferred = {item["id"] for item in result["deferred_capabilities"]}
        self.assertNotIn("api-engineer", deferred)
        self.assertNotIn("db-engineer", deferred)

    def test_scope_size_does_not_change_route(self):
        req = copy.deepcopy(self.base)
        req.update(task_type="implement", permission_boundary="workspace-write")
        one = router.route(req)
        req["scope"] = [f"file-{i}.md" for i in range(80)]
        many = router.route(req)
        self.assertEqual(one["route_kind"], many["route_kind"])
        self.assertEqual(one["selected_available_capabilities"], many["selected_available_capabilities"])

    def test_execution_profiles_are_adaptive_and_keep_direct_fallback(self):
        cases = [
            ("answer", [], [], "consultation"),
            ("implement", [], ["local"], "small-change"),
            ("implement", ["api", "backend", "database", "frontend"], ["cross_component"], "full-stack"),
            ("implement", ["mobile"], ["local"], "mobile"),
            ("diagnose", [], ["local"], "debugging"),
            ("release", ["documentation"], ["local"], "release"),
            ("answer", ["research"], [], "technical-research"),
            ("implement", ["architecture"], ["cross_component"], "refactor"),
        ]
        for task, domains, impacts, expected in cases:
            request = copy.deepcopy(self.base)
            request.update(task_type=task, permission_boundary="workspace-write" if task in {"implement", "release"} else "read-only")
            request["signals"]["domains"] = [{"value": domain, "evidence_paths": ["manifest.json"]} for domain in domains]
            request["signals"]["impacts"] = [{"value": impact, "evidence_paths": ["src/entry"]} for impact in impacts]
            with self.subTest(task=task, domains=domains, impacts=impacts):
                profile = router.route(request)["execution_profile"]
                self.assertEqual(profile["mode"], expected)
                self.assertTrue(profile["is_strategy_not_agent_list"])
                self.assertEqual(profile["direct_execution_fallback"], "primary_agent_with_available_tools")
                self.assertEqual(profile["retry_without_new_evidence"], 0)

    def test_json_request_cannot_expand_host_permissions(self):
        case = next(item for item in self.fixture["cases"] if item["id"] == "host_authorization_never_claimed")
        result = router.route(merge(self.base, case["overrides"]))
        self.assertEqual(result["permissions"]["effective_authority"], "owned_by_host")
        self.assertFalse(result["permissions"]["host_authorization_observed"])

    def test_review_does_not_imply_independent_reviewer(self):
        case = next(item for item in self.fixture["cases"] if item["id"] == "readonly_review_no_independent_reviewer")
        result = router.route(merge(self.base, case["overrides"]))
        pending = {item["check"]: item["reason"] for item in result["verification_pending"]}
        self.assertIn("independent_review", pending)
        self.assertIn("no independent reviewer", pending["independent_review"].lower())
        self.assertIn("code-reviewer", result["selected_available_capabilities"])
        self.assertTrue(result["direct_action"])


class EvidenceVerifierTests(unittest.TestCase):
    def test_empty_evidence_rejected(self):
        with self.assertRaisesRegex(ValueError, "empty evidence"):
            evidence_verifier.validate_records([])

    def test_fabricated_command_and_result_fields_are_rejected(self):
        fabricated = [{"check": "tests", "status": "passed", "command": "pytest", "result": "12 passed"}]
        with self.assertRaisesRegex(ValueError, "only check, claim and provenance"):
            evidence_verifier.validate_records(fabricated)

    def test_claimed_pass_with_no_provenance_is_not_observed(self):
        record = [{"check": "tests", "claim": {"status": "passed", "summary": "pytest: 12 passed"}, "provenance": None}]
        result = evidence_verifier.validate_records(record)
        self.assertEqual(result["documentation_record"], "valid")
        self.assertEqual(result["execution_observation"], "unverified")
        self.assertNotIn("approval", result)
        self.assertEqual(result["records"][0]["claimed_status"], "passed")

    def test_fabricated_provenance_shape_still_does_not_prove_execution(self):
        evidence = [{"check": "tests", "claim": {"status": "passed", "summary": "passed"}, "provenance": {"producer": "fake", "event_id": "fake-1", "event_type": "process_exit", "observed_at": "2099-01-01T00:00:00Z", "artifact_digest": "sha256:" + "a" * 64, "signer_key_id": "invented", "signature": "invented"}}]
        result = evidence_verifier.validate_records(evidence)
        self.assertEqual(result["execution_observation"], "unverified")
        self.assertIn("does not validate signatures", result["reason"])

    def test_invalid_or_malformed_provenance_is_rejected(self):
        evidence = [{"check": "tests", "claim": {"status": "passed", "summary": "passed"}, "provenance": {"signature": "fake"}}]
        with self.assertRaisesRegex(ValueError, "provenance has an invalid shape"):
            evidence_verifier.validate_records(evidence)


class StaticPackageTests(unittest.TestCase):
    def test_package_reports_syntax_and_schema_checks_separately(self):
        results = validator.validate()
        self.assertTrue(any(line.startswith("PASS JSON syntax:") for line in results), "\n".join(results))
        self.assertTrue(any(line.startswith(("PASS JSON Schema validation:", "SKIP JSON Schema validation:")) for line in results), "\n".join(results))
        self.assertTrue(any(line.startswith("PASS package structure:") for line in results), "\n".join(results))
        self.assertTrue(any(line.startswith("PASS static safety scan:") for line in results), "\n".join(results))

    def test_skills_relative_core_references_resolve_after_host_packaging(self):
        host_roots = {
            "codex": ".agents",
            "antigravity-ide": ".agents",
            "antigravity-cli": ".agents",
            "claude-code": ".claude",
            "opencode": ".opencode",
        }
        skill_links = []
        for skill_file in (ROOT / "skills").glob("*/SKILL.md"):
            body = skill_file.read_text(encoding="utf-8")
            refs = re.findall(r"\[[^]]+\]\(([^)]+)\)", body)
            refs.extend(re.findall(r"`((?:\.\./)+core/[^`]+)`", body))
            for target in refs:
                if "core" in target.replace("\\", "/"):
                    skill_links.append((skill_file.parent.name, target))
        self.assertTrue(skill_links, "no relative core references found to verify")
        for host, source_root in host_roots.items():
            bundle = ROOT.parent / "dist" / host
            skill_root = bundle / source_root / "skills"
            core_root = bundle / source_root / "core"
            self.assertTrue(core_root.is_dir(), f"{host}: missing packaged core")
            for skill_id, target in skill_links:
                skill_file = skill_root / skill_id / "SKILL.md"
                resolved = (skill_file.parent / target).resolve()
                self.assertTrue(resolved.is_relative_to(bundle.resolve()), f"{host}: reference escaped bundle: {target}")
                self.assertTrue(resolved.exists(), f"{host}: broken packaged reference for {skill_id}: {target}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
