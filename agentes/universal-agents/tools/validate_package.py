#!/usr/bin/env python3
"""Validate package structure and report precisely which JSON checks ran."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

try:
    import jsonschema
except ImportError:
    jsonschema = None

REQUIRED_SECTIONS = ["## Use when", "## Do not use when", "## Input", "## Workflow", "## Escalate", "## Output", "## Examples"]


def parse_frontmatter(path):
    content = path.read_text(encoding="utf-8-sig")
    match = re.match(r"\A---\s*\n(.*?)\n---\s*\n", content, re.S)
    if not match:
        raise ValueError(f"{path.relative_to(ROOT)}: missing YAML frontmatter")
    fields = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, sep, value = line.partition(":")
        if not sep:
            raise ValueError(f"{path.relative_to(ROOT)}: malformed frontmatter")
        fields[key.strip()] = value.strip().strip("\"'")
    return content, fields


def validate():
    errors, checks = [], []
    skills = sorted((ROOT / "skills").glob("*/SKILL.md"))
    if not skills:
        errors.append("skills/: no SKILL.md files found")
    for path in skills:
        try:
            content, fields = parse_frontmatter(path)
            skill_id = path.parent.name
            if fields.get("name") != skill_id:
                errors.append(f"{path.relative_to(ROOT)}: frontmatter name must match directory")
            if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", skill_id):
                errors.append(f"{path.relative_to(ROOT)}: skill directory name is invalid")
            if not fields.get("description") or len(fields["description"]) > 1024:
                errors.append(f"{path.relative_to(ROOT)}: description missing or over 1024 characters")
            for section in REQUIRED_SECTIONS:
                if section not in content:
                    errors.append(f"{path.relative_to(ROOT)}: missing {section}")
            examples = content.split("## Examples", 1)[-1]
            if "Positive:" not in examples or "Negative:" not in examples:
                errors.append(f"{path.relative_to(ROOT)}: positive and negative examples required")
            refs = re.findall(r"\[[^]]+\]\(([^)]+)\)", content)
            refs += re.findall(r"`((?:\.\./)+core/[^`]+)`", content)
            for target in refs:
                if target.startswith(("http:", "https:", "#")):
                    continue
                resolved = (path.parent / target).resolve()
                if not resolved.is_relative_to(ROOT.resolve()) or not resolved.exists():
                    errors.append(f"{path.relative_to(ROOT)}: unresolved or escaping local reference {target}")
        except (OSError, ValueError) as exc:
            errors.append(str(exc))

    json_files = sorted(path for path in ROOT.rglob("*.json") if "__pycache__" not in path.parts)
    parsed = {}
    for path in json_files:
        try:
            parsed[path.relative_to(ROOT).as_posix()] = json.loads(path.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{path.relative_to(ROOT)}: invalid JSON syntax: {exc}")
    if not errors:
        checks.append(f"PASS JSON syntax: parsed {len(json_files)} JSON files")

    schema_files = sorted((ROOT / "core/contracts").glob("*.schema.json"))
    if jsonschema is None:
        checks.append(f"SKIP JSON Schema validation: parsed {len(schema_files)} schema documents as JSON only; jsonschema is unavailable")
    else:
        for path in schema_files:
            try:
                schema = json.loads(path.read_text(encoding="utf-8"))
                jsonschema.Draft202012Validator.check_schema(schema)
            except Exception as exc:
                errors.append(f"{path.relative_to(ROOT)}: JSON Schema meta-validation failed: {exc}")
        if not errors:
            checks.append(f"PASS JSON Schema meta-validation: {len(schema_files)} schemas checked as Draft 2020-12")

    try:
        roles = json.loads((ROOT / "roles/catalog.json").read_text(encoding="utf-8"))
        registry = json.loads((ROOT / "core/registry/capabilities.json").read_text(encoding="utf-8"))
        ids = {r["id"] for r in roles}
        aliases = [a for r in roles for a in r["aliases"]]
        registry_ids = {c["id"] for c in registry["capabilities"]}
        if len(ids) != len(roles) or len(aliases) != len(set(aliases)) or ids.intersection(aliases):
            errors.append("roles/catalog.json: duplicate ids/aliases or alias shadows id")
        if ids != {p.parent.name for p in skills}:
            errors.append("roles/catalog.json: role ids do not match generated SKILL.md directories")
        if registry_ids != ids | {"verifier"}:
            errors.append("capabilities registry does not match role catalog plus verifier")
        if any(c["status"] != "implemented" for c in registry["capabilities"]):
            errors.append("capabilities registry contains a capability marked implemented without a local skill/tool")
        if len(aliases) + len(ids) != len(registry_ids) - 1 + len(aliases):
            errors.append("capability aliases failed consistency check")
    except (OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        errors.append(f"role registry/catalog invalid: {exc}")

    fixture = parsed.get("core/routing/cases.json", {})
    case_count = len(fixture.get("cases", [])) if isinstance(fixture, dict) else 0
    if case_count < 20:
        errors.append(f"core/routing/cases.json: expected at least 20 cases, found {case_count}")

    required = ["README.md", "core/policies/constitution.md", "core/routing/policy.md", "docs/architecture.md", "docs/host-matrix.md", "docs/role-catalog.md", "docs/design-system-policy.md", "docs/compatibility.md", "docs/third-party.md", "docs/security-and-trust.md", "docs/install-and-rollback.md", "docs/prompt-guidance.md", "docs/benchmark.md", "docs/changelog.md", "tooling/install/installer.py", "tooling/build/generate_dist.py", "tooling/validate/validate_dist.py", "tooling/eval/evaluate_records.py", "adapters/README.md"]
    for relative in required:
        if not (ROOT / relative).is_file():
            errors.append(f"missing required file {relative}")

    for path in ROOT.rglob("*"):
        if not path.is_file() or "__pycache__" in path.parts or path.suffix.lower() in {".pyc", ".tmp"}:
            continue
        if path.resolve() == Path(__file__).resolve():
            continue
        if path.name.lower() in {"init-project.cmd", "init-project.ps1"}:
            errors.append(f"{path.relative_to(ROOT)}: V2 initializer must not ship in V4")
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            if "@" + "latest" in content:
                errors.append(f"{path.relative_to(ROOT)}: floating third-party version reference")
        except OSError as exc:
            errors.append(f"{path.relative_to(ROOT)}: cannot read for static safety scan: {exc}")

    if errors:
        return ["FAIL " + item for item in errors]
    checks.insert(0, f"PASS package structure: {len(skills)} skills, {case_count} routing cases, registry/catalog alignment and required deliverables")
    checks.append("PASS static safety scan: no V2 initializers or floating third-party @latest references in canonical package")
    return checks


if __name__ == "__main__":
    result = validate()
    print("\n".join(result))
    raise SystemExit(1 if any(line.startswith("FAIL ") for line in result) else 0)
