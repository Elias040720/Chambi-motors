#!/usr/bin/env python3
"""Check documentary evidence shape only; never verifies execution or approval."""

import json
import sys

CLAIM_STATUSES = {"passed", "failed", "not_run", "not_applicable", "blocked"}
PROVENANCE_FIELDS = {"producer", "event_id", "event_type", "observed_at", "artifact_digest", "signer_key_id", "signature"}


def validate_records(records):
    if not isinstance(records, list):
        raise ValueError("evidence input must be a JSON array")
    if not records:
        raise ValueError("empty evidence cannot establish that any check was run")
    report = []
    for index, item in enumerate(records):
        if not isinstance(item, dict) or set(item) != {"check", "claim", "provenance"}:
            raise ValueError(f"evidence[{index}] must contain only check, claim and provenance")
        if not isinstance(item["check"], str) or not item["check"].strip():
            raise ValueError(f"evidence[{index}].check must be non-empty")
        claim = item["claim"]
        if not isinstance(claim, dict) or set(claim) != {"status", "summary"}:
            raise ValueError(f"evidence[{index}].claim must contain only status and summary")
        if not isinstance(claim["status"], str) or claim["status"] not in CLAIM_STATUSES:
            raise ValueError(f"evidence[{index}].claim.status is invalid")
        if not isinstance(claim["summary"], str) or not claim["summary"].strip():
            raise ValueError(f"evidence[{index}].claim.summary must be non-empty")
        provenance = item["provenance"]
        if provenance is not None:
            if not isinstance(provenance, dict) or set(provenance) != PROVENANCE_FIELDS:
                raise ValueError(f"evidence[{index}].provenance has an invalid shape")
            if provenance["event_type"] not in {"process_exit", "manual_observation"}:
                raise ValueError(f"evidence[{index}].provenance.event_type is invalid")
            for key in PROVENANCE_FIELDS - {"event_type"}:
                if not isinstance(provenance[key], str) or not provenance[key].strip():
                    raise ValueError(f"evidence[{index}].provenance.{key} must be non-empty")
            digest = provenance["artifact_digest"]
            if len(digest) != 71 or not digest.startswith("sha256:") or any(c not in "0123456789abcdef" for c in digest[7:]):
                raise ValueError(f"evidence[{index}].provenance.artifact_digest must be sha256 plus 64 lowercase hex characters")
        report.append({"check": item["check"], "claimed_status": claim["status"], "provenance_present": provenance is not None, "execution_observation": "unverified"})
    return {
        "documentation_record": "valid",
        "records": report,
        "execution_observation": "unverified",
        "reason": "This tool validates record shape only. It does not validate signatures, prove execution, or issue approval."
    }


def main():
    try:
        records = json.load(sys.stdin)
        print(json.dumps(validate_records(records), ensure_ascii=False, indent=2))
    except (json.JSONDecodeError, ValueError) as exc:
        print(json.dumps({"documentation_record": "invalid", "error": str(exc), "execution_observation": "unverified"}, ensure_ascii=False), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
