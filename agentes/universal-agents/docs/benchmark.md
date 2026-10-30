# Benchmark harness

`python tooling/eval/evaluate_records.py tests/fixtures/eval/empty-dataset.json` reports `PENDING`. It does not invoke models, hosts, external tools, or read prompts. For a real A/B run, provide already-collected anonymized metric rows containing variant/task ID, blinded 0–5 quality and optional UX ratings, safety pass, input/output token counts, latency, retries and failure type. The input format rejects prompt, path, command, secret, and free-form trace fields.

Use the same model/version, task set, temperature/settings and host for both variants. Randomize or counterbalance order, evaluate outputs blind, and report sample count plus quality, safety, UX where relevant, total tokens, latency, retries and failures. Do not claim a winner from incomparable runs or a small unreported sample. Real model availability and token telemetry are not connected in this package; no benchmark result is claimed.
