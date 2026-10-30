#!/usr/bin/env python3
"""Suggest a route from declared signals; never grants host permissions."""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TASK_TYPES = {"answer", "diagnose", "plan", "implement", "review", "release"}
PERMISSIONS = {"read-only", "workspace-write", "needs-approval"}
RISKS = {"low", "medium", "high", "critical"}
DOMAINS = {"general", "documentation", "api", "database", "ui", "security", "performance", "infrastructure", "architecture", "test", "mobile", "frontend", "backend", "full_stack", "research", "desktop"}
IMPACTS = {"local", "cross_component", "public_contract", "data_migration", "security_sensitive", "external_effect"}
CONTROLS = {"tests", "independent_review", "security_check", "security_audit", "visual_review", "accessibility", "motion_review", "new_visual_direction", "rollback"}

EDIT_WORDS = re.compile(r"\b(edit|modify|change|write|implement|create|delete|update|refactor|fix|edita|modifica|cambia|escribe|implementa|crea|elimina|actualiza|refactoriza|corrige)\b", re.I)
NO_EDIT = re.compile(r"\b(?:(?:do\s+not|don't|no)\s+(?:(?:file\s+)?edit(?:s|ing)?|modify|change|writ(?:e|ing)|implement|create|delete|update|refactor|fix|editar|modificar|cambiar|escribir|implementar|crear|eliminar|actualizar|refactorizar|corregir)|without\s+(?:editing|changing|modifying)|sin\s+(?:editar|cambiar|modificar|escribir)|solo\s+(?:revisa|analiza)|only\s+(?:review|analyze))\b", re.I)


def load_capabilities():
    data = json.loads((ROOT / "core/registry/capabilities.json").read_text(encoding="utf-8"))
    return {item["id"]: item for item in data["capabilities"]}


def _is_string_list(value, label, allow_empty=True):
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{label} must be an array of non-empty strings")
    if not allow_empty and not value:
        raise ValueError(f"{label} must not be empty")


def validate_request(req):
    if not isinstance(req, dict):
        raise ValueError("request must be a JSON object")
    required = {"request_id", "verbatim", "intent", "task_type", "scope", "constraints", "acceptance", "unknowns", "permission_boundary", "risk", "signals"}
    missing = required - req.keys()
    extra = req.keys() - (required | {"project_profile"})
    if missing or extra:
        raise ValueError(f"request fields invalid; missing={sorted(missing)}, extra={sorted(extra)}")
    for key in ("request_id", "verbatim", "intent"):
        if not isinstance(req[key], str) or (key != "verbatim" and not req[key].strip()):
            raise ValueError(f"{key} must be a string" + ("" if key == "verbatim" else " and non-empty"))
    if not isinstance(req["task_type"], str) or req["task_type"] not in TASK_TYPES:
        raise ValueError("task_type is not supported")
    if not isinstance(req["permission_boundary"], str) or req["permission_boundary"] not in PERMISSIONS:
        raise ValueError("permission_boundary is not supported")
    if not isinstance(req["risk"], str) or req["risk"] not in RISKS:
        raise ValueError("risk is not supported")
    for key in ("scope", "constraints", "acceptance", "unknowns"):
        _is_string_list(req[key], key)

    signals = req["signals"]
    if not isinstance(signals, dict) or set(signals) != {"domains", "impacts", "stages", "context", "controls"}:
        raise ValueError("signals must contain exactly domains, impacts, stages, context and controls")
    for key, allowed in (("domains", DOMAINS), ("impacts", IMPACTS)):
        entries = signals[key]
        if not isinstance(entries, list):
            raise ValueError(f"signals.{key} must be an array")
        for index, entry in enumerate(entries):
            if not isinstance(entry, dict) or set(entry) != {"value", "evidence_paths"}:
                raise ValueError(f"signals.{key}[{index}] must contain value and evidence_paths")
            if not isinstance(entry["value"], str) or entry["value"] not in allowed:
                raise ValueError(f"signals.{key}[{index}].value is unsupported")
            _is_string_list(entry["evidence_paths"], f"signals.{key}[{index}].evidence_paths", allow_empty=False)
    if not isinstance(signals["stages"], list):
        raise ValueError("signals.stages must be an array")
    for index, stage in enumerate(signals["stages"]):
        if not isinstance(stage, dict) or set(stage) != {"value", "evidence_refs"}:
            raise ValueError(f"signals.stages[{index}] must contain value and evidence_refs")
        if not isinstance(stage["value"], str) or not stage["value"].strip():
            raise ValueError(f"signals.stages[{index}].value must be non-empty")
        _is_string_list(stage["evidence_refs"], f"signals.stages[{index}].evidence_refs", allow_empty=False)
    context = signals["context"]
    if not isinstance(context, dict) or set(context) != {"status", "breadth", "evidence_paths"}:
        raise ValueError("signals.context must contain status, breadth and evidence_paths")
    if not isinstance(context["status"], str) or context["status"] not in {"known", "unknown"} or not isinstance(context["breadth"], str) or context["breadth"] not in {"narrow", "broad"}:
        raise ValueError("signals.context status or breadth is unsupported")
    _is_string_list(context["evidence_paths"], "signals.context.evidence_paths")
    if context["status"] == "known" and not context["evidence_paths"]:
        raise ValueError("known context requires evidence_paths")
    if context["status"] == "unknown" and context["evidence_paths"]:
        raise ValueError("unknown context cannot claim evidence_paths")
    if not isinstance(signals["controls"], list):
        raise ValueError("signals.controls must be an array")
    for index, control in enumerate(signals["controls"]):
        if not isinstance(control, dict) or set(control) != {"value", "evidence_refs"}:
            raise ValueError(f"signals.controls[{index}] must contain value and evidence_refs")
        if not isinstance(control["value"], str) or control["value"] not in CONTROLS:
            raise ValueError(f"signals.controls[{index}].value is unsupported")
        _is_string_list(control["evidence_refs"], f"signals.controls[{index}].evidence_refs", allow_empty=False)
    if "project_profile" in req and req["project_profile"] is not None:
        if not isinstance(req["project_profile"], dict):
            raise ValueError("project_profile must be an object or null")
        profile = req["project_profile"]
        unknown_profile_fields = set(profile) - {"missing_tools", "essential_tools"}
        if unknown_profile_fields:
            raise ValueError(f"project_profile has unsupported fields: {sorted(unknown_profile_fields)}")
        _is_string_list(profile.get("missing_tools", []), "project_profile.missing_tools")
        _is_string_list(profile.get("essential_tools", []), "project_profile.essential_tools")
        if not set(profile.get("essential_tools", [])).issubset(profile.get("missing_tools", [])):
            raise ValueError("project_profile.essential_tools must also appear in missing_tools")


def detect_conflicts(req):
    conflicts = []
    task = req["task_type"]
    says_no_edit_in_verbatim = bool(NO_EDIT.search(req["verbatim"]))
    says_no_edit_in_constraints = any(NO_EDIT.search(item) for item in req["constraints"])
    asks_edit = bool(EDIT_WORDS.search(req["verbatim"]))
    write_task = task in {"implement", "release"}
    read_only_task = task in {"answer", "diagnose", "plan", "review"}

    if write_task and req["permission_boundary"] == "read-only":
        conflicts.append("write_task_conflicts_with_read_only_boundary")
    if write_task and (says_no_edit_in_verbatim or says_no_edit_in_constraints):
        conflicts.append("write_task_conflicts_with_no_edit_instruction")
    if asks_edit and says_no_edit_in_constraints:
        conflicts.append("verbatim_edit_request_conflicts_with_no_edit_constraint")
    if task in {"answer", "diagnose", "plan", "review"} and asks_edit and not says_no_edit_in_verbatim:
        conflicts.append("task_type_conflicts_with_edit_request")
    if task == "review" and req["permission_boundary"] != "read-only":
        # A broader declared boundary is not authority to edit during a review.
        conflicts.append("review_task_must_remain_read_only")
    return conflicts


def select_execution_profile(req, domains, impacts, controls):
    """Choose a lightweight work strategy; profiles never imply a fixed agent team."""
    task = req["task_type"]
    if task == "answer":
        mode = "technical-research" if "research" in domains else "consultation"
    elif task == "diagnose":
        mode = "debugging"
    elif task == "release":
        mode = "release"
    elif "mobile" in domains:
        mode = "mobile"
    elif "security" in domains or impacts.intersection({"security_sensitive", "data_migration", "external_effect"}):
        mode = "security-data"
    elif "full_stack" in domains or (domains.intersection({"frontend", "ui"}) and domains.intersection({"api", "backend", "database"})) or ("api" in domains and "database" in domains):
        mode = "full-stack"
    elif "ui" in domains or "frontend" in domains or controls.intersection({"visual_review", "accessibility", "new_visual_direction", "motion_review"}):
        mode = "ui-design"
    elif "architecture" in domains or "cross_component" in impacts or "public_contract" in impacts:
        mode = "refactor"
    elif "performance" in domains:
        mode = "technical-research"
    elif task == "review":
        mode = "review"
    elif task == "plan":
        mode = "refactor" if len(req["signals"]["stages"]) >= 2 else "feature"
    else:
        mode = "small-change" if impacts.issubset({"local"}) and len(req["signals"]["stages"]) < 2 else "feature"
    critical = req["risk"] in {"high", "critical"} or "independent_review" in controls
    return {
        "mode": mode,
        "is_strategy_not_agent_list": True,
        "parallelism": "consider_only_for_independent_workstreams_with_exclusive_ownership",
        "independent_review_required_by_signals": critical,
        "independent_reviewer_status": "requires_host_runtime_confirmation" if critical else "not_required_by_declared_signals",
        "retry_without_new_evidence": 0,
        "direct_execution_fallback": "primary_agent_with_available_tools",
    }


def route(req):
    validate_request(req)
    registry = load_capabilities()
    signals = req["signals"]
    impacts = {item["value"] for item in signals["impacts"]}
    domains = {item["value"] for item in signals["domains"]}
    controls = {item["value"] for item in signals["controls"]}
    context = signals["context"]
    conflicts = detect_conflicts(req)
    missing_tools = (req.get("project_profile") or {}).get("missing_tools", [])
    essential_tools = (req.get("project_profile") or {}).get("essential_tools", [])
    execution_profile = select_execution_profile(req, domains, impacts, controls)

    available = sorted(item["id"] for item in registry.values() if item["status"] == "implemented")
    selected = []
    rationale = []
    deferred = {}
    pending = {}
    route_kind = "blocked" if conflicts else "direct"

    def defer(capability, reason):
        item = registry.get(capability)
        if item and item["status"] != "implemented":
            deferred[capability] = {"status": item["status"], "reason": reason}

    if conflicts:
        if "request-analyst" in available:
            selected.append("request-analyst")
        rationale.append("Conflicting request signals prevent an implementation recommendation.")
    else:
        if req["unknowns"]:
            selected.append("request-analyst")
            rationale.append("Material unknowns are listed in the request.")
        if context["status"] == "unknown":
            selected.append("repo-explorer")
            rationale.append("Context is explicitly unknown; discovery remains read-only.")
        if req["task_type"] == "diagnose":
            selected.append("debugger")
            rationale.append("Diagnosis request selects the debugger procedure; reproduction remains an explicit verification step.")
            pending["diagnosis"] = "A cause must be reproduced or supported by repository evidence before it is reported as confirmed."
        planner_task = req["task_type"] in {"plan", "implement", "release"}
        if planner_task and (len(signals["stages"]) >= 2 or impacts.intersection({"cross_component", "public_contract", "data_migration", "security_sensitive", "external_effect"})):
            selected.append("planner")
            rationale.append("Declared stages or impact signal require sequencing.")
        if context["breadth"] == "broad":
            selected.append("context-curator")
            rationale.append("Context breadth is explicitly marked broad.")
        specialist_task = req["task_type"] in {"plan", "implement", "release"}
        domain_roles = {"api": "api-engineer", "database": "db-engineer", "ui": "ui-engineer", "architecture": "architect", "performance": "performance-engineer"}
        if specialist_task:
            for domain, capability in domain_roles.items():
                if domain in domains:
                    selected.append(capability)
                    rationale.append(f"Explicit {domain} signal with evidence references selects the matching role skill.")
            if "documentation" in domains and req["task_type"] == "release":
                selected.append("docs-release")
        if "new_visual_direction" in controls and specialist_task:
            selected.append("design-director")
        if req["task_type"] == "review":
            selected.append("code-reviewer")
            pending["independent_review"] = "No independent reviewer is available; direct review is not independent review."
        elif "independent_review" in controls:
            selected.append("code-reviewer")
            pending["independent_review"] = "The reviewer skill is available, but a separate process was not observed for this route."
        if "tests" in controls or (req["task_type"] in {"implement", "release"} and req["risk"] in {"high", "critical"}):
            selected.append("test-engineer")
            pending["tests"] = "Run the repository's applicable tests in the host; no result is inferred by routing."
        elif req["task_type"] in {"implement", "release"}:
            pending["tests"] = "Test applicability and execution remain unverified; the selected route does not claim a test result."
        if req["risk"] in {"high", "critical"} or "security_check" in controls or ("security" in domains and "security_sensitive" in impacts):
            selected.append("security-check")
            pending["security_check"] = "Security-check skill is selected; no check result is claimed until the host performs and observes it."
        if "security_audit" in controls:
            selected.append("security-auditor")
            pending["security_audit"] = "Deep audit procedure is available as a skill; task-specific execution and evidence remain pending."
        if "visual_review" in controls or "accessibility" in controls:
            selected.append("ux-reviewer")
            pending["visual_review"] = "A browser or visual inspection tool must be available and used before reporting visual evidence."
        if "motion_review" in controls:
            selected.append("motion-reviewer")
            pending["motion_review"] = "Motion review procedure selected; runtime/reduced-motion behavior requires host evidence."
        if "tests" in controls and req["task_type"] in {"plan", "implement", "release"}:
            selected.append("qa-strategist")
            rationale.append("Explicit test control selects a verification strategy in addition to any test execution.")
        if "rollback" in controls or "data_migration" in impacts:
            pending["rollback"] = "A rollback plan is required; routing cannot verify that one exists."

    selected = list(dict.fromkeys(cap for cap in selected if cap in available))
    if missing_tools:
        for tool in missing_tools:
            pending[f"tool:{tool}"] = f"Tool declared unavailable; no result may be attributed to {tool}."
    blocking_conditions = []
    for tool in essential_tools:
        blocking_conditions.append(f"essential_tool_unavailable:{tool}")
    if blocking_conditions and not conflicts:
        route_kind = "blocked"
    write_requested = req["task_type"] in {"implement", "release"}
    permission_requires_user = write_requested and req["permission_boundary"] == "needs-approval"
    permission_conflict = "write_task_conflicts_with_read_only_boundary" in conflicts or "write_task_conflicts_with_no_edit_instruction" in conflicts
    if permission_requires_user and not conflicts:
        route_kind = "blocked"
    elif set(selected).intersection({"planner", "repo-explorer", "context-curator", "request-analyst"}) and not conflicts and not blocking_conditions:
        route_kind = "workflow"
    return {
        "request_id": req["request_id"],
        "route_kind": route_kind,
        "direct_action": route_kind == "direct",
        "available_capabilities": available,
        "selected_available_capabilities": selected,
        "deferred_capabilities": [{"id": key, **value} for key, value in sorted(deferred.items())],
        "rationale": rationale,
        "conflicts": conflicts,
        "verification_pending": [{"check": key, "reason": value} for key, value in sorted(pending.items())],
        "permissions": {
            "declared_boundary": req["permission_boundary"],
            "effective_authority": "owned_by_host",
            "host_authorization_required_for_write": write_requested,
            "host_authorization_observed": False,
            "requires_user_decision": permission_requires_user or bool(conflicts) or bool(blocking_conditions),
            "write_blocked_by_declared_conflict": permission_conflict
        },
        "signals": {"domains": sorted(domains), "impacts": sorted(impacts), "stages_declared": len(signals["stages"]), "controls": sorted(controls), "context_status": context["status"], "context_breadth": context["breadth"], "signals_verified_by_router": False},
        "tool_gaps": missing_tools,
        "essential_tool_gaps": essential_tools,
        "blocking_conditions": blocking_conditions,
        "execution_form": "portable skill instructions; host-specific subagent isolation is not implied",
        "execution_profile": execution_profile,
        "host_skill_discovery_observed": False,
        "limitations": ["Signals are declarations with references, not verified repository facts.", "This router does not invoke skills, inspect files, run checks, approve work, or grant permissions."]
    }


def main():
    try:
        request = json.load(sys.stdin)
        print(json.dumps(route(request), ensure_ascii=False, indent=2))
    except (json.JSONDecodeError, ValueError) as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
