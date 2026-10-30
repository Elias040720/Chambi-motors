import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("ua_evaluation", ROOT / "tooling" / "eval" / "evaluate_records.py")
evaluation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evaluation)


class EvaluationHarnessTests(unittest.TestCase):
    def test_empty_dataset_is_pending_not_zero_quality(self):
        report = evaluation.evaluate({"records": []})
        self.assertEqual(report["status"], "PENDING")
        self.assertEqual(report["variants"], {})

    def test_metric_summary_uses_only_measured_fields(self):
        report = evaluation.evaluate({"records": [
            {"variant": "baseline", "task_id": "t1", "quality_score": 3, "safety_pass": True, "input_tokens": 100, "output_tokens": 20, "latency_ms": 900, "retries": 0},
            {"variant": "v4", "task_id": "t1", "quality_score": 4, "safety_pass": True, "ux_score": 4, "input_tokens": 110, "output_tokens": 20, "latency_ms": 1000, "retries": 1},
        ]})
        self.assertEqual(report["status"], "MEASURED")
        self.assertEqual(report["variants"]["baseline"]["total_tokens_mean"], 120)
        self.assertEqual(report["variants"]["v4"]["retries_mean"], 1)
        self.assertEqual(report["model_invocation"], "not performed by this harness")

    def test_free_form_prompt_and_secret_fields_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "unsupported fields"):
            evaluation.evaluate({"records": [{"prompt": "private text"}]})

    def test_paired_metrics_require_matching_variants_and_do_not_invent_missing_cost(self):
        rows = []
        for variant, quality, tokens, latency in (("baseline", 3, 120, 900), ("v4.2", 4, 100, 850)):
            rows.append({"variant": variant, "task_id": "case-1", "quality_score": quality, "safety_pass": True, "input_tokens": tokens - 20, "output_tokens": 20, "latency_ms": latency, "retries": 0, "tool_calls": 2})
        report = evaluation.evaluate({"records": rows})
        paired = report["paired_v4.2_minus_baseline"]
        self.assertEqual(paired["quality_score"]["median_delta"], 1)
        self.assertEqual(paired["total_tokens"]["median_delta"], -20)
        self.assertEqual(paired["cost_usd"]["status"], "NOT_MEASURED")

    def test_metadata_freezes_ab_controls_without_accepting_raw_outputs(self):
        metadata = {"dataset_sha256": "a" * 64, "model_id": "model-x", "model_version": "v1", "host_id": "codex", "host_version": "v1", "tooling_fingerprint": "sha256:tools", "permissions_fingerprint": "sha256:permissions", "blind_order": True, "repetitions": 3}
        report = evaluation.evaluate({"records": [], "run_metadata": metadata})
        self.assertEqual(report["status"], "PENDING")
        with self.assertRaisesRegex(ValueError, "run_metadata"):
            evaluation.evaluate({"records": [], "run_metadata": {"model_id": "model-x", "prompt": "raw prompt"}})

    def test_v42_behavior_dataset_is_frozen_but_not_model_evaluated(self):
        path = ROOT / "tests" / "fixtures" / "eval" / "v4_2-scenarios.json"
        dataset = __import__("json").loads(path.read_text(encoding="utf-8-sig"))
        self.assertEqual(dataset["execution_status"], "DESIGNED_NOT_EXECUTED_AS_MODEL_EVAL")
        self.assertEqual(dataset["comparison_protocol"]["current_status"], "PENDING; no model outputs or host telemetry embedded")
        self.assertGreaterEqual(len(dataset["scenarios"]), 10)
        self.assertIn("Flutter widget test", " ".join(dataset["scenarios"][4]["required_invariants"]))
        self.assertIn("visual test NOT RUN", " ".join(dataset["scenarios"][6]["required_invariants"]))

if __name__ == "__main__":
    unittest.main()
