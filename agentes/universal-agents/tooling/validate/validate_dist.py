#!/usr/bin/env python3
"""Check emitted host bundles, hashes, static native frontmatter and skill links."""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT.parent / "dist"
HOSTS = {
    "codex": (".agents", ".codex/agents", ".toml"),
    "antigravity-ide": (".agents", ".agents/agents", ".md"),
    "antigravity-cli": (".agents", ".agents/agents", ".md"),
    "claude-code": (".claude", ".claude/agents", ".md"),
    "opencode": (".opencode", ".opencode/agents", ".md"),
}
EXPECTED_AGENTS = {"tech-lead", "architect", "debugger", "implementer", "code-reviewer", "security-auditor"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def check():
    errors, checks, toml_files, yaml_documents = [], [], [], []
    for host, (layout, agents_rel, extension) in HOSTS.items():
        bundle = DIST / host
        manifest_file = bundle / "manifest.json"
        try:
            manifest = json.loads(manifest_file.read_text(encoding="utf-8-sig"))
        except (OSError, json.JSONDecodeError) as exc:
            errors.append(f"{host}: manifest JSON invalid: {exc}")
            continue
        if manifest.get("host") != host or manifest.get("source") != "universal-agents" or manifest.get("schema_version") != 1:
            errors.append(f"{host}: manifest identity/version invalid")
        if manifest.get("hooks_enabled") is not False or manifest.get("mcp_enabled") is not False or manifest.get("third_party_runtime_dependencies") != []:
            errors.append(f"{host}: package enables hooks/MCP or declares runtime dependencies")
        declared = {}
        for entry in manifest.get("files", []):
            rel = entry.get("path", "")
            if not isinstance(rel, str) or not rel or rel.startswith(("/", "\\")) or ".." in Path(rel).parts or rel in declared:
                errors.append(f"{host}: unsafe or duplicate manifest path: {rel!r}")
                continue
            target = bundle / Path(rel)
            if target.is_symlink() or not target.is_file() or sha256(target) != entry.get("sha256") or target.stat().st_size != entry.get("size"):
                errors.append(f"{host}: missing/file hash-size mismatch: {rel}")
            declared[rel] = entry.get("sha256")
        actual = {}
        for path in bundle.rglob("*"):
            if path.is_symlink():
                errors.append(f"{host}: symlink/junction in package: {path.relative_to(bundle)}")
            elif path.is_file() and path.name != "manifest.json":
                if path.suffix.lower() in {".pyc", ".tmp"} or "__pycache__" in path.parts:
                    errors.append(f"{host}: generated cache/temp file in package: {path.relative_to(bundle)}")
                actual[path.relative_to(bundle).as_posix()] = sha256(path)
        if set(actual) != set(declared):
            errors.append(f"{host}: manifest path set differs; unlisted={sorted(set(actual)-set(declared))}, missing={sorted(set(declared)-set(actual))}")
        skill_root = bundle / layout / "skills"
        skills = sorted(skill_root.glob("*/SKILL.md"))
        ids = [path.parent.name for path in skills]
        if len(ids) != 23 or len(ids) != len(set(ids)):
            errors.append(f"{host}: expected 23 uniquely named skills; found {len(ids)}")
        else:
            for path in skills:
                body = path.read_text(encoding="utf-8-sig")
                for target in re.findall(r"\[[^]]+\]\(([^)]+)\)", body):
                    if target.startswith(("http:", "https:", "#")):
                        continue
                    resolved = (path.parent / target).resolve()
                    if not resolved.is_relative_to(bundle.resolve()) or not resolved.exists():
                        errors.append(f"{host}: broken/escaping reference {path.relative_to(bundle)} -> {target}")
        agent_root = bundle / agents_rel
        agent_files = sorted(agent_root.glob("*" + extension))
        if {p.stem for p in agent_files} != EXPECTED_AGENTS:
            errors.append(f"{host}: native agent definitions do not match selected agent set")
        for agent_file in agent_files:
            content = agent_file.read_text(encoding="utf-8-sig")
            if host == "codex":
                toml_files.append(agent_file)
            else:
                if not content.startswith("---\n") or "\n---\n" not in content[4:]:
                    errors.append(f"{host}: missing native YAML frontmatter delimiters in {agent_file.name}")
                header = content.split("\n---\n", 1)[0]
                yaml_documents.append((agent_file, header))
                required = ["description:"] if host == "opencode" else ["name:", "description:"]
                if any(key not in header for key in required):
                    errors.append(f"{host}: required frontmatter key absent in {agent_file.name}")
        if host.startswith("antigravity"):
            rule = bundle / ".agents/rules/universal-agent-safety.md"
            if not rule.is_file() or not re.search(r"(?m)^trigger:\s*always_on\s*$", rule.read_text(encoding="utf-8-sig")):
                errors.append(f"{host}: required always_on rule trigger missing")
            elif rule.is_file():
                yaml_documents.append((rule, rule.read_text(encoding="utf-8-sig").split("\n---\n", 1)[0][4:]))
    if not errors:
        checks.append("PASS generated host manifests: 5 packages, every listed SHA-256/size, exact file sets, no symlinks/caches/hooks/MCP, 23 unique skills each")
        checks.append("PASS native adapter structure: 6 selected agent files per host, required frontmatter keys and valid Antigravity trigger value")
        checks.append("PASS packaged skill references: all relative references resolve inside each host bundle")
    try:
        import tomllib
    except ImportError:
        checks.append(f"SKIP TOML parser validation: {len(toml_files)} Codex agent files require Python 3.11+ tomllib; no dependency installed")
    else:
        for path in toml_files:
            try:
                doc = tomllib.loads(path.read_text(encoding="utf-8-sig"))
                if not {"name", "description", "developer_instructions"}.issubset(doc):
                    errors.append(f"Codex TOML required field missing: {path.name}")
            except (OSError, ValueError) as exc:
                errors.append(f"Codex TOML invalid: {path.name}: {exc}")
        if not errors:
            checks.append(f"PASS TOML syntax and required fields: parsed {len(toml_files)} Codex agent files with tomllib")
    try:
        import yaml
    except ImportError:
        checks.append("SKIP YAML parser validation: PyYAML is unavailable; native frontmatter delimiter/key checks are static only")
    else:
        for path, header in yaml_documents:
            try:
                parsed = yaml.safe_load(header)
                if not isinstance(parsed, dict):
                    errors.append(f"YAML frontmatter is not an object: {path}")
            except yaml.YAMLError as exc:
                errors.append(f"YAML syntax invalid: {path}: {exc}")
        if not errors:
            checks.append(f"PASS YAML syntax and frontmatter objects: parsed {len(yaml_documents)} native agent/rule headers")
    return ["FAIL " + error for error in errors] if errors else checks


if __name__ == "__main__":
    results = check()
    print("\n".join(results))
    raise SystemExit(1 if any(row.startswith("FAIL ") for row in results) else 0)
