# Resultados de pruebas V4.2

Fecha: 2026-10-25. Comandos corridos en `universal-agents/`; tests del paquete son propios. No se instalaron dependencias.

## Construcción y suite

| Comando | Salida observada | Resultado |
|---|---|---|
| `python tooling/build/generate_roles.py` | `Generated 23 role skills and docs/role-catalog.md from roles/catalog.json` | PASS |
| `python tooling/build/generate_dist.py` | `BUILT codex: 39 files, 23 skills, 6 native agent definitions`; Antigravity IDE `40`; Antigravity CLI `40`; Claude `39`; OpenCode `39` | PASS |
| Primera suite: `python -m unittest discover -s tests -v` | 52 tests, 1 FAIL: YAML syntax invalid en descripciones de tech-lead por `:` sin quoting | FAIL observado, corregido en generador |
| Prueba enfocada tras fix | `python -m unittest tests.unit.test_profiles.ProfileFixtureTests.test_static_distribution_validator_passes_and_names_optional_parser_skips -v` → `Ran 1 test… OK` | PASS |
| Suite final Python 3.9: `python -m unittest discover -s tests -v` | `Ran 52 tests in 6.602s`; `OK (skipped=2)` | PASS con 2 SKIP |
| Suite final Python 3.14: `py -3.14 -m unittest discover -s tests -v` | `Ran 52 tests in 5.699s`; `OK (skipped=1)` | PASS con 1 SKIP |
| `python tools/validate_package.py` | `PASS package structure: 23 skills, 31 routing cases...`; `PASS JSON syntax: parsed 10 JSON files`; `SKIP JSON Schema validation: parsed 3 schema documents as JSON only; jsonschema is unavailable`; static safety `PASS` | PASS con schema real SKIP |
| `python tooling/validate/validate_dist.py` | manifests/hashes, no hooks/MCP, 23 skills; `PASS YAML syntax and frontmatter...26`; `SKIP TOML parser validation...Python 3.11+` | PASS con TOML parser SKIP en 3.9 |
| `py -3.14 tooling/validate/validate_dist.py` | manifests/hashes, 5 adapters, 23 skills; TOML `PASS ...6 Codex agent files`; YAML `SKIP ...PyYAML unavailable` | PASS con YAML parser SKIP |
| `python tooling/eval/evaluate_records.py tests/fixtures/eval/empty-dataset.json` | JSON: `{"status":"PENDING","reason":"No real model outputs or host telemetry were supplied.","variants":{}}` | PASS como estado pendiente |

## Contenido cubierto por la suite

52 pruebas cubren routing (incluye README.md + CONTRIBUTING.md sin roles API/DB), 31 escenarios de routing, scope-size invariance, review sin reviewer independiente, perfiles adaptativos, evidencia vacía/fabricada, frontera de permisos, 5 manifiestos/23 skills, rutas globales, Antigravity enum, adapters, fixtures 8 stacks, suite de instalador (jornal previo a mutación, primer archivo, reemplazo, rollback interrumpido, drift, path con espacios, junction, ledger V4), eval A/B y web HTTP/SQLite positivo/negativo.

## SKIP / NOT RUN

- `jsonschema` no está en Python 3.9 ni 3.14: no se validaron schemas reales. No se descargó ni instaló.
- Symlink Windows real: SKIP con `WinError 1314`; el control de junction es simulado unitariamente.
- Flutter y `flutter test`: NOT RUN, SDK no instalado. Fixture y comandos quedan documentados.
- MySQL, navegador automatizado Playwright y lector de pantalla: NOT RUN; el fixture full-stack usa SQLite/stdlib y navegación visual manual vía navegador embebido.
- Antigravity IDE/CLI y OpenCode: NOT RUN, binarios no detectados.
- Codex runtime: smoke efectuado; resultado negativo/limitado, ver capabilities.
- Claude Code: smoke efectuado; organización bloqueó acceso a suscripción del CLI.
- A/B de modelo/calidad, coste comparativo, tokens, latencia: PENDING. Las pocas ejecuciones de smoke no forman benchmark y no se atribuye ahorro.

Los tests de forma/procedimiento no autorizan llamar a una habilidad cargada o una revisión aprobada si el host no la ejecutó.
