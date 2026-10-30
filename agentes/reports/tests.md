# Pruebas locales V4

Fecha de ejecución: 2026-10-24. Host: Windows / PowerShell. Solo se ejecutaron scripts, generadores y tests propios inspeccionados; no se ejecutaron inicializadores V2/V3.1, hooks, MCP, paquetes de terceros ni instalaciones globales.

| Comando | Resultado observado | Duración | Estado |
|---|---|---:|---|
| `python -B -m unittest discover -s tests -v` | 35 tests, `OK (skipped=2)`; cubre 31 routing cases, evidence, roles, siete perfiles de proyecto, tres briefs UI, instalador temporal y rollback | 2.822 s (salida unittest) | PASS con 2 SKIP |
| `python -B tools/validate_package.py` | 23 skills; 31 casos; `PASS JSON syntax: parsed 8 JSON files`; `SKIP JSON Schema validation: parsed 3 schema documents as JSON only; jsonschema is unavailable`; static safety scan PASS | 0.186 s | PASS / JSON Schema SKIP |
| `python -B tooling/validate/validate_dist.py` (Python 3.9.11) | Cinco manifests/hashes/file sets; 23 skills por host; referencias; frontmatter y `PASS YAML syntax and frontmatter objects: parsed 26 native agent/rule headers`; TOML parser SKIP por Python <3.11 | 0.455 s | PASS / TOML SKIP |
| `py -3.14 -B -m unittest tests.unit.test_profiles.ProfileFixtureTests.test_codex_native_agent_toml_parses_when_tomllib_is_available -v` | Se analizaron los seis TOML nativos de Codex con `tomllib` | 0.255 s | PASS |
| `py -3.14 -B tooling/validate/validate_dist.py` | Misma integridad del dist; `PASS TOML syntax and required fields: parsed 6`; PyYAML no está instalado en Python 3.14, por lo que su paso informa SKIP | 0.427 s | PASS / YAML parser SKIP |
| `python -B tooling/eval/evaluate_records.py tests/fixtures/eval/empty-dataset.json` | `status: PENDING`; explica que no se entregó telemetría/model outputs | 0.123 s | PASS; no inventa benchmark |
| `python -B tooling/install/installer.py --host codex --scope global --dry-run --bundle ..\\dist\\codex --target-root <temp>` | `DRY_RUN: 38 mapped files; no files written.`; resumen de destinos usa raíz relativa y no expone el path privado | 0.215 s | PASS |
| `claude --bare --setting-sources project --strict-mcp-config --mcp-config '{"mcpServers":{}}' --permission-mode plan --permission-prompts none --tools Read,Glob,Grep --print --no-session-persistence ...` | Cargó desde copia temporal aislada; CLI respondió `Not logged in`; no invocó el modelo ni descubrió skill. Hooks omitidos, MCP vacío y sesión no persistida; temporal eliminado | ~2.2 s | BLOCKED por autenticación; host **NO PROBADO** |
| Intento previo de configuración de smoke Claude con `--mcp-config '{}'` | La CLI rechazó la configuración antes de iniciar (`Invalid MCP configuration: mcpServers: Invalid input: expected record, received undefined`); se corrigió a `{ "mcpServers": {} }` para el intento anterior | <1 s | FAIL de configuración de prueba, no del paquete; sin modelo/MCP |
| `codex --help`; búsqueda local de ejecutables | CLI encontrada y help responde; Antigravity CLI/OpenCode no encontrados. No se llamó modelo Codex: no se comprobó una sesión temporal aislada de configuración global/hooks/MCP | ~3 s | Descubrimiento runtime **NO PROBADO** |
| `python tooling/build/generate_dist.py` | Construyó 5 paquetes (Codex, Antigravity IDE/CLI, Claude Code y OpenCode); segunda ejecución respondió `UNCHANGED` para los 5 tras verificar digest/hash | No cronometrado | PASS |

## SKIP y alcance

- JSON Schema real: **SKIP** porque no hay `jsonschema`; los 8 documentos JSON sí se analizaron como JSON. Los 3 schemas solo se leyeron como JSON, no se validaron semánticamente contra un meta-schema ni se validaron instancias.
- En la suite, `test_destination_symlink_is_rejected` fue SKIP: Windows devolvió `WinError 1314` al crear un symlink sin privilegio. `test_junction_marker_is_rejected_even_without_windows_link_privilege` pasó con una marca reparse simulada. No se afirmó una prueba real de junction creado.
- El test TOML de Codex se salta bajo Python 3.9 porque `tomllib` no existe; se ejecutó y pasó separado bajo Python 3.14.
- PyYAML ya estaba disponible en Python 3.9, no fue instalado. Python 3.14 no lo tiene: allí el validator reportó SKIP. No se ejecutaron pruebas Unix.
- Host skills/subagentes no se invocaron en Codex, Antigravity, Claude Code ni OpenCode; los cinco estados de descubrimiento runtime son **NO PROBADO**. No se midieron modelos, tokens, latencia, calidad A/B ni screenshots.
