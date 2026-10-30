#!/usr/bin/env python3
"""Generate portable role skills and the human-readable catalog from roles/catalog.json."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / "roles" / "catalog.json"
OPERATIONS = ROOT / "roles" / "operations.json"
OPERATION_FIELDS = ("decision", "evidence", "stack_notes", "failure_modes", "exit", "handoff", "quality_gates")


def load_catalog():
    roles = json.loads(CATALOG.read_text(encoding="utf-8-sig"))
    operations_doc = json.loads(OPERATIONS.read_text(encoding="utf-8-sig"))
    operations = operations_doc.get("roles") if isinstance(operations_doc, dict) and operations_doc.get("schema_version") == 1 else None
    if not isinstance(operations, dict) or set(operations) != {role.get("id") for role in roles}:
        raise ValueError("operational role profiles must match catalog ids exactly")
    if not isinstance(roles, list) or len({r.get("id") for r in roles}) != len(roles):
        raise ValueError("role catalog must be a list with unique ids")
    for role in roles:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", role["id"]):
            raise ValueError(f"invalid role id: {role['id']}")
        for field in ("description", "use_when", "avoid_when", "workflow", "output", "limits", "procedure_version"):
            if not role.get(field):
                raise ValueError(f"{role['id']} is missing {field}")
        if role["procedure_version"] != 2:
            raise ValueError(f"{role['id']} procedure_version must be 2")
        profile = operations[role["id"]]
        for field in OPERATION_FIELDS:
            value = profile.get(field)
            if not value or (field not in {"exit", "handoff"} and not isinstance(value, list)) or (field in {"exit", "handoff"} and not isinstance(value, str)):
                raise ValueError(f"{role['id']} operational profile is missing valid {field}")
        role["operations"] = profile
        if len(role["description"]) > 1024:
            raise ValueError(f"{role['id']} description exceeds 1024 characters")
    aliases = [alias for role in roles for alias in role["aliases"]]
    ids = [role["id"] for role in roles]
    if len(aliases) != len(set(aliases)) or set(aliases) & set(ids):
        raise ValueError("role aliases must be unique and must not shadow ids")
    return roles


def render(role):
    positives = "\n".join(f"- {x}" for x in role["use_when"])
    negatives = "\n".join(f"- {x}" for x in role["avoid_when"])
    workflow = "\n".join(f"{i}. {x}" for i, x in enumerate(role["workflow"], 1))
    limits = "\n".join(f"- {x}" for x in role["limits"])
    ops = role["operations"]
    operational = []
    for heading, key in (("Decision procedure", "decision"), ("Evidence to collect", "evidence"), ("Stack-specific adaptation", "stack_notes"), ("Common failure modes", "failure_modes")):
        operational.extend([f"## {heading}", "", "\n".join(f"- {item}" for item in ops[key]), ""])
    operational.extend(["## Role-specific quality gates", "", "\n".join(f"- {item}" for item in ops["quality_gates"]), "", "## Exit criteria", "", ops["exit"], "", "## Delegation handoff", "", ops["handoff"], ""])
    alias_line = f"Alias público: `{', '.join(role['aliases'])}`." if role["aliases"] else "No tiene alias legado."
    return f'''---
name: {role['id']}
description: {role['description']}
---

# {role['id']}

{role['description']}

## Use when

{positives}

## Do not use when

{negatives}

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. {alias_line}

## Workflow

{workflow}

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

{role['output']}

## Boundaries

{limits}

## Examples

Positive: {role['use_when'][0]}

Negative: {role['avoid_when'][0]}

{chr(10).join(operational)}
## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
'''


def main():
    roles = load_catalog()
    for role in roles:
        directory = ROOT / "skills" / role["id"]
        directory.mkdir(parents=True, exist_ok=True)
        with (directory / "SKILL.md").open("w", encoding="utf-8", newline="\n") as stream:
            stream.write(render(role))
    rows = ["# Catálogo funcional de roles", "", "Cada entrada tiene una skill con instrucciones operativas; eso no crea por sí solo un subproceso aislado. Los adaptadores solo exponen subagentes nativos donde el host los soporta y la tarea gana aislamiento. Procedimientos v2 se cargan solo al activar la skill.", "", "| ID | Alias | Grupo | Activación positiva | No activar para |", "|---|---|---|---|---|"]
    for role in roles:
        rows.append(f"| `{role['id']}` | {', '.join(f'`{a}`' for a in role['aliases']) or '—'} | {role['group']} | {role['use_when'][0]} | {role['avoid_when'][0]} |")
    rows.extend(["", "## Decisiones de catálogo", "", "`caio` queda como alias de `tech-lead`; `sec` y `security-audit` apuntan a skills distintas. `devops-ops` y `observability` no se agregan como roles genéricos: despliegue, operación y métricas se activan dentro de `implementer`, `performance-engineer` o `tech-lead` solo cuando el producto y la solicitud muestran un flujo propio. Esto evita crear subagentes sin activador ni contrato diferenciado."])
    with (ROOT / "docs" / "role-catalog.md").open("w", encoding="utf-8", newline="\n") as stream:
        stream.write("\n".join(rows) + "\n")
    capabilities = [{"id": role["id"], "group": role["group"], "mode": "skill", "status": "implemented", "aliases": role["aliases"], "summary": role["description"]} for role in roles]
    capabilities.append({"id": "verifier", "group": "quality", "mode": "deterministic_script", "status": "implemented", "aliases": [], "summary": "Validates documentary evidence shape only; never proves execution or issues approval."})
    registry = {"schema_version": 2, "capabilities": capabilities}
    with (ROOT / "core" / "registry" / "capabilities.json").open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(registry, stream, ensure_ascii=False, indent=2)
        stream.write("\n")
    print(f"Generated {len(roles)} role skills and docs/role-catalog.md from roles/catalog.json")


if __name__ == "__main__":
    main()
