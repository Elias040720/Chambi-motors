#!/usr/bin/env python3
"""Summarize pre-collected A/B evaluation metrics without calling a model."""

import json
import statistics
import sys
from pathlib import Path

ALLOWED = {"variant", "task_id", "quality_score", "safety_pass", "ux_score", "input_tokens", "output_tokens", "latency_ms", "retries", "failure_type", "tool_calls", "cost_usd"}
META_FIELDS = {"dataset_sha256", "model_id", "model_version", "host_id", "host_version", "tooling_fingerprint", "permissions_fingerprint", "blind_order", "repetitions"}


def paired_delta(records, metric):
    paired = {}
    if metric != "total_tokens" and not any(metric in row for row in records):
        return {"n_paired_tasks": 0, "median_delta": None, "range_delta": None, "status": "NOT_MEASURED"}
    for row in records:
        if metric != "total_tokens" and metric not in row:
            continue
        paired.setdefault((row["variant"], row["task_id"]), []).append(row[metric] if metric in row else row["input_tokens"] + row["output_tokens"])
    tasks = sorted({task for variant, task in paired if variant == "baseline"} & {task for variant, task in paired if variant == "v4.2"})
    deltas = [statistics.mean(paired[("v4.2", task)]) - statistics.mean(paired[("baseline", task)]) for task in tasks if ("baseline", task) in paired and ("v4.2", task) in paired]
    if not deltas:
        return {"n_paired_tasks": 0, "median_delta": None, "range_delta": None, "status": "NOT_PAIRED"}
    return {"n_paired_tasks": len(deltas), "median_delta": round(statistics.median(deltas), 3), "range_delta": [round(min(deltas), 3), round(max(deltas), 3)], "status": "MEASURED"}


def evaluate(document):
    if not isinstance(document, dict) or set(document) - {"records", "run_metadata"} or "records" not in document:
        raise ValueError("input must contain records and optional fixed run_metadata; raw prompts and secrets are not accepted")
    metadata = document.get("run_metadata")
    if metadata is not None:
        if not isinstance(metadata, dict) or set(metadata) != META_FIELDS:
            raise ValueError(f"run_metadata must contain exactly {sorted(META_FIELDS)}")
        for field in META_FIELDS - {"blind_order", "repetitions"}:
            if not isinstance(metadata[field], str) or not metadata[field].strip():
                raise ValueError(f"run_metadata.{field} must be a non-empty string")
        if type(metadata["blind_order"]) is not bool or type(metadata["repetitions"]) is not int or metadata["repetitions"] < 1:
            raise ValueError("run_metadata.blind_order must be boolean and repetitions a positive integer")
    records = document["records"]
    if not isinstance(records, list):
        raise ValueError("records must be an array")
    if not records:
        return {"status": "PENDING", "reason": "No real model outputs or host telemetry were supplied.", "variants": {}}
    groups = {}
    for index, record in enumerate(records):
        if not isinstance(record, dict) or set(record) - ALLOWED:
            raise ValueError(f"records[{index}] has unsupported fields; raw content is not accepted")
        required = {"variant", "task_id", "quality_score", "safety_pass", "input_tokens", "output_tokens", "latency_ms", "retries"}
        if not required.issubset(record):
            raise ValueError(f"records[{index}] is missing required measured fields")
        if not isinstance(record["variant"], str) or not record["variant"].strip() or not isinstance(record["task_id"], str) or not record["task_id"].strip():
            raise ValueError(f"records[{index}] variant/task_id must be non-empty strings")
        if type(record["safety_pass"]) is not bool:
            raise ValueError(f"records[{index}].safety_pass must be boolean")
        for field in ("quality_score", "input_tokens", "output_tokens", "latency_ms", "retries"):
            if type(record[field]) not in (int, float) or record[field] < 0:
                raise ValueError(f"records[{index}].{field} must be a non-negative number")
        if record["quality_score"] > 5:
            raise ValueError(f"records[{index}].quality_score must be 0..5")
        if "ux_score" in record and (type(record["ux_score"]) not in (int, float) or not 0 <= record["ux_score"] <= 5):
            raise ValueError(f"records[{index}].ux_score must be 0..5")
        for field in ("tool_calls", "cost_usd"):
            if field in record and (type(record[field]) not in (int, float) or record[field] < 0):
                raise ValueError(f"records[{index}].{field} must be a non-negative number")
        groups.setdefault(record["variant"], []).append(record)
    variants = {}
    for name, items in sorted(groups.items()):
        variants[name] = {
            "n": len(items),
            "quality_mean_0_5": round(statistics.mean(row["quality_score"] for row in items), 3),
            "safety_pass_rate": round(sum(row["safety_pass"] for row in items) / len(items), 3),
            "ux_mean_0_5": round(statistics.mean(row["ux_score"] for row in items if "ux_score" in row), 3) if any("ux_score" in row for row in items) else None,
            "input_tokens_mean": round(statistics.mean(row["input_tokens"] for row in items), 2),
            "output_tokens_mean": round(statistics.mean(row["output_tokens"] for row in items), 2),
            "total_tokens_mean": round(statistics.mean(row["input_tokens"] + row["output_tokens"] for row in items), 2),
            "latency_ms_mean": round(statistics.mean(row["latency_ms"] for row in items), 2),
            "retries_mean": round(statistics.mean(row["retries"] for row in items), 2),
            "tool_calls_mean": round(statistics.mean(row["tool_calls"] for row in items if "tool_calls" in row), 2) if any("tool_calls" in row for row in items) else None,
            "cost_usd_mean": round(statistics.mean(row["cost_usd"] for row in items if "cost_usd" in row), 6) if any("cost_usd" in row for row in items) else None,
            "failures": sum(bool(row.get("failure_type")) for row in items),
        }
    return {
        "status": "MEASURED",
        "model_invocation": "not performed by this harness",
        "run_metadata": metadata or "NOT_PROVIDED; comparability is not established",
        "variants": variants,
        "paired_v4.2_minus_baseline": {
            field: paired_delta(records, field) for field in ("quality_score", "total_tokens", "latency_ms", "tool_calls", "cost_usd")
        } if {"baseline", "v4.2"}.issubset(groups) else "NOT_COMPARABLE; both baseline and v4.2 variants are required",
    }


def main(path):
    try:
        document = json.loads(Path(path).read_text(encoding="utf-8-sig"))
        report = evaluate(document)
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(json.dumps({"status": "INVALID", "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: evaluate_records.py METRICS.json", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main(sys.argv[1]))
