import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class RoleCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.roles = json.loads((ROOT / "roles" / "catalog.json").read_text(encoding="utf-8-sig"))
        cls.operations = json.loads((ROOT / "roles" / "operations.json").read_text(encoding="utf-8-sig"))["roles"]

    def test_every_role_has_positive_negative_workflow_output_and_limits(self):
        self.assertGreaterEqual(len(self.roles), 20)
        for role in self.roles:
            with self.subTest(role=role["id"]):
                self.assertTrue(role["use_when"])
                self.assertTrue(role["avoid_when"])
                self.assertTrue(role["workflow"])
                self.assertTrue(role["output"])
                self.assertTrue(role["limits"])
                self.assertEqual(role["procedure_version"], 2)
                self.assertIn(role["id"], self.operations)
                skill = (ROOT / "skills" / role["id"] / "SKILL.md").read_text(encoding="utf-8-sig")
                for term in ("## Use when", "## Do not use when", "## Workflow", "## Output", "## Boundaries", "## Decision procedure", "## Evidence to collect", "## Stack-specific adaptation", "## Common failure modes", "## Role-specific quality gates", "## Exit criteria", "## Delegation handoff"):
                    self.assertIn(term, skill)
                for trigger in (role["use_when"][0], role["avoid_when"][0]):
                    self.assertIn(trigger, skill)
                for item in self.operations[role["id"]]["decision"] + self.operations[role["id"]]["evidence"] + self.operations[role["id"]]["stack_notes"] + self.operations[role["id"]]["failure_modes"] + self.operations[role["id"]]["quality_gates"]:
                    self.assertIn(item, skill)

    def test_role_descriptions_match_v41_baseline_across_catalog_skills_registry_and_hosts(self):
        import json

        baseline = json.loads((ROOT / "tests" / "fixtures" / "role-descriptions-v4_1.json").read_text(encoding="utf-8-sig"))
        expected = baseline["descriptions"]
        by_id = {role["id"]: role for role in self.roles}
        self.assertEqual({role_id: role["description"] for role_id, role in by_id.items()}, expected)

        registry = json.loads((ROOT / "core" / "registry" / "capabilities.json").read_text(encoding="utf-8-sig"))
        summaries = {item["id"]: item["summary"] for item in registry["capabilities"] if item["id"] in expected}
        self.assertEqual(summaries, expected)

        for role_id, description in expected.items():
            skill = (ROOT / "skills" / role_id / "SKILL.md").read_text(encoding="utf-8-sig")
            self.assertIn(f"description: {description}\n", skill, role_id)

        dist_root = ROOT.parent / "dist"
        for host, layout in (("codex", ".agents"), ("antigravity-ide", ".agents"), ("antigravity-cli", ".agents"), ("claude-code", ".claude"), ("opencode", ".opencode")):
            bundle = dist_root / host
            for role_id, description in expected.items():
                packaged_skill = bundle / layout / "skills" / role_id / "SKILL.md"
                self.assertIn(f"description: {description}\n", packaged_skill.read_text(encoding="utf-8-sig"), f"{host}/{role_id}")
            agent_root = bundle / ({"codex": ".codex/agents", "antigravity-ide": ".agents/agents", "antigravity-cli": ".agents/agents", "claude-code": ".claude/agents", "opencode": ".opencode/agents"}[host])
            for agent_file in agent_root.iterdir():
                role_id = agent_file.stem
                description = expected[role_id]
                content = agent_file.read_text(encoding="utf-8-sig")
                if host == "codex":
                    self.assertIn(f"description = {json.dumps(description, ensure_ascii=False)}", content, f"{host}/{role_id}")
                else:
                    self.assertIn(f"description: {json.dumps(description, ensure_ascii=False)}\n", content, f"{host}/{role_id}")

    def test_operational_profiles_cover_exact_role_set_and_aliases_remain(self):
        self.assertEqual(set(self.operations), {role["id"] for role in self.roles})
        for profile in self.operations.values():
            self.assertTrue(profile["decision"] and profile["evidence"] and profile["stack_notes"] and profile["failure_modes"])
            self.assertTrue(profile["exit"] and profile["handoff"])

    def test_public_legacy_aliases_are_exact_and_unambiguous(self):
        by_id = {role["id"]: role for role in self.roles}
        expected = {"architect": "arch", "api-engineer": "api-core", "db-engineer": "db-master", "security-check": "sec", "security-auditor": "security-audit", "tech-lead": "caio", "ui-engineer": "ui-expert"}
        for role_id, alias in expected.items():
            self.assertIn(alias, by_id[role_id]["aliases"])
        self.assertEqual(by_id["security-check"]["id"], "security-check")
        self.assertNotEqual(by_id["security-check"]["id"], by_id["security-auditor"]["id"])

    def test_file_count_is_not_a_domain_activation_signal(self):
        router_source = (ROOT / "tools" / "route_request.py").read_text(encoding="utf-8-sig")
        self.assertNotRegex(router_source, re.compile(r"len\(\s*req\[['\"]scope['\"]\]\s*\)\s*[><=]"))
        fixture = json.loads((ROOT / "core" / "routing" / "cases.json").read_text(encoding="utf-8-sig"))
        case_ids = {case["id"] for case in fixture["cases"]}
        self.assertIn("readme_and_contributing_no_api_db", case_ids)
        self.assertIn("two_unrelated_files_are_not_domain_signal", case_ids)


if __name__ == "__main__":
    unittest.main()
