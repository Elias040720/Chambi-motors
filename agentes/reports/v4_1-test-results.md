# Resultados reproducibles V4.1

Fecha: 2026-10-24; Windows PowerShell, workspace `C:\Users\ABEL\Downloads\agentes`. Solo se ejecutaron scripts propios bajo `universal-agents/`, generador y un smoke Codex de lectura en carpeta temporal. No scripts originales, dependencias de terceros, instalación global, hooks ni MCP.

## Comandos y salida real

| Comando | Salida observada | Estado |
|---|---|---|
| `python tooling/build/generate_dist.py` | `BUILT codex: 39 files, 23 skills, 6 native agent definitions`; `BUILT antigravity-ide: 40 files, 23 skills, 6 native agent definitions`; `BUILT antigravity-cli: 40 files, 23 skills, 6 native agent definitions`; `BUILT claude-code: 39 files, 23 skills, 6 native agent definitions`; `BUILT opencode: 39 files, 23 skills, 6 native agent definitions` | PASS |
| `python tooling/build/generate_dist.py` (segunda ejecución) | Cinco líneas `UNCHANGED ... existing manifest matches canonical source and all file hashes` | PASS; regeneración reproducible |
| `python -m unittest discover -s tests -v` (Python 3.9.11) | `Ran 43 tests in 6.147s`; `OK (skipped=2)` | PASS con 2 SKIP |
| `py -3.14 -m unittest discover -s tests -v` (Python 3.14.7) | `Ran 43 tests in 4.981s`; `OK (skipped=1)` | PASS con 1 SKIP |
| `python tools/validate_package.py` | `PASS package structure: 23 skills, 31 routing cases, registry/catalog alignment and required deliverables`; `PASS JSON syntax: parsed 8 JSON files`; `SKIP JSON Schema validation: parsed 3 schema documents as JSON only; jsonschema is unavailable`; static safety scan PASS | PASS; JSON Schema SKIP |
| `python tooling/validate/validate_dist.py` (3.9) | Five manifests/hashes, 23 skills por paquete y refs; `PASS YAML syntax and frontmatter objects: parsed 26 native agent/rule headers`; TOML SKIP porque Python no incluye tomllib | PASS; TOML SKIP |
| `py -3.14 tooling/validate/validate_dist.py` | `PASS generated host manifests: 5 packages...`; `PASS native adapter structure: 6 selected agent files per host...`; `PASS TOML syntax and required fields: parsed 6 Codex agent files`; YAML parser SKIP porque PyYAML no está en 3.14 | PASS; YAML parser SKIP |
| Instalador CLI, `--dry-run`, scope proyecto en directorio temporal `project with spaces`, cinco hosts | Codex `DRY_RUN: 38 mapped files`; Antigravity IDE `39`; Antigravity CLI `39`; Claude Code `38`; OpenCode `38`; todos `exit=0` y `no files written` | PASS; directorio temporal eliminado tras confirmar root/prefijo |
| `python tooling/eval/evaluate_records.py tests/fixtures/eval/empty-dataset.json` | `"status": "PENDING"`, `"reason": "No real model outputs or host telemetry were supplied."` | PENDING, no métrica inventada |
| `codex login status` | `Logged in using ChatGPT` | Auth detectada; sin exponer datos de cuenta |
| Smoke Codex en proyecto temporal externo a `dist/` con `codex exec --ignore-user-config --ephemeral --skip-git-repo-check --sandbox read-only --disable apps --disable plugins --cd <temporal> '$architect ...'` | Salida final observada: `- No impongas Clean Architecture, DDD, microservicios ni un stack.` | PASS para carga/uso de skill Codex en proyecto temporal, solo lectura. Datos temporales eliminados después. |
| Primer intento Codex: pedir delegación nativa al subagente `architect` en mismo sandbox temporal | Log observado: `ERROR codex_core::tools::router: error=collab spawn failed: no thread with id: <id>`; output: `No tengo una sección «## Boundaries» en las instrucciones disponibles.` | FAIL de smoke de delegación del host; no se presenta como PASS. |
| Smoke Claude heredado en V4 (documentado en `reports/tests.md`) | CLI aislada respondió `Not logged in`; no invocó modelo | BLOCKED por autenticación; no fue reinstalada ni reintentada |
| Antigravity IDE/CLI y OpenCode | Ejecutables no encontrados; no se ejecutaron | NOT RUN / host no disponible |

## Cobertura de las 43 pruebas

Los tests actuales cubren 31 escenarios de routing (incluye README + CONTRIBUTING sin rol API/DB, refactor, UI, read-only, riesgo con tooling ausente, conflicto de permiso/instrucciones, evidencia vacía/fabricada), evidencia documental frente a ejecución, 23 skills, aliases, siete fixtures de proyectos, esquemas documentales, cinco adaptadores, enumeraciones Antigravity, skill/core paths globales calculados desde un segundo proyecto, y el instalador.

Fallos deterministas del instalador: journal durable antes de primera escritura; crash tras primera copia; reemplazo de archivo existente y restauración byte exacta; fallo durante compensación y segundo recovery exitoso; rollback drift preflight; migración de ledger V4 sin bundle; colisión, idempotencia, ruta con espacios, traversal, test marker junction. La creación real de symlink en Windows quedó SKIP por `WinError 1314` (privilegio de enlace ausente).

## Estado de host y UI

Codex cargó una skill real en proyecto temporal separado mediante el host CLI. La subdelegación custom falló dentro del runtime (ver salida arriba). No se comprobó el modo global porque no se modificó el perfil; el mapeo global se cubrió estáticamente/mediante plan temporal. Antigravity IDE/CLI y OpenCode no están presentes. Claude Code no estaba autenticado en el smoke previo. Por tanto, la disponibilidad real de roles/skills en esos hosts sigue NO VERIFIED.

Las tres solicitudes UI (dashboard, formulario complejo y landing) son briefs, no HTML/pixel snapshots. No hubo browser, GUI, captura, lector de pantalla, medición de contraste automatizada, ni test responsive visual. Cualquier review visual se marca NOT RUN. Benchmark A/B/token/coste/latencia permanece PENDING; la suite documental no constituye evaluación de modelo.

## Distinción schema

La salida confirma sintaxis: `PASS JSON syntax: parsed 8 JSON files`. Tres ficheros `*.schema.json` fueron solo parseados como JSON y NO pasaron meta-validación Draft 2020-12, ya que ni Python 3.9 ni 3.14 tienen `jsonschema`; el output exacto es `SKIP JSON Schema validation: parsed 3 schema documents as JSON only; jsonschema is unavailable`. No se instaló dependencia.
