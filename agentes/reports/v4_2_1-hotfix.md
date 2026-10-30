# V4.2.1 — corrección de restauración semántica y poda del detector

## Alcance

Hotfix acotado a dos hallazgos del informe de V4.2. Se conservaron las 23 skills operativas, sus procesos, límites y quality gates de V4.2. No se inició piloto, evaluación de modelo ni instalación.

## Evidencia de baseline

El archivo indicado por el informe como `agentes(5).zip` no está presente con ese nombre. Se encontró `C:\Users\ABEL\Downloads\agentes.zip` (SHA-256 `333b49e45b6e2921a4767ca1e8ec9b369b902f15665cb37c06b0595454c5fe0e`); su paquete previo `agentes/archive/builds/previous/codex-4b3763c09129/manifest.json` registra el digest fuente V4.1 `4b3763c09129a0fe8c78ce6892aec254549dbed7343647185a10a0b8e4b18534`. Se leyeron sus miembros sin extraerlos ni ejecutar código. El fixture `universal-agents/tests/fixtures/role-descriptions-v4_1.json` conserva las 23 descripciones recuperadas y sus identificadores de procedencia.

## Matriz antes / después

| Área | Antes de V4.2.1 | Después de V4.2.1 | Verificación |
|---|---|---|---|
| Descubrimiento de roles | Descripciones habían derivado de criterios de salida/procedimiento; debilitaban los disparadores de descubrimiento | Restauradas las 23 descripciones V4.1 en `roles/catalog.json`; los cuerpos procedimentales V4.2 quedan intactos | Fixture compara catálogo, registry, skills fuente y skills/agentes de las cinco distribuciones |
| Detección de proyectos | `Path.rglob("*")` recorría los árboles excluidos antes de descartarlos | `os.walk(topdown=True)` poda `SKIP_DIRS` antes de descender; orden estable; omite symlinks y puntos reparse | Test de recorrido instrumentado, límite de archivos y exclusión de `node_modules`, `vendor`, `.venv`, `dist`, `build` |
| Reproducibilidad | Dist V4.2 con descripciones modificadas | Cinco distribuciones regeneradas desde `universal-agents/` | Validador compara hashes, tamaños, set exacto de archivos y digest fuente |

Ejemplos de descripción restaurada: `architect` vuelve a describir comparación de opciones y activación ante cambios estructurales; `tech-lead` a clasificación, coordinación y cierre; `test-engineer` a pruebas apropiadas al contrato con resultados observados. La lista completa exacta vive en el fixture de baseline, no en resúmenes reescritos.

## Pruebas ejecutadas

- `py -3.14 -m unittest discover -s tests -v` — **54 tests, OK, 1 SKIP**.
- `py -3.9 -m unittest discover -s tests -v` — **54 tests, OK, 2 SKIP**: symlink creation unavailable and Python 3.9 has no built-in `tomllib`. El skip es `test_destination_symlink_is_rejected`: Windows devolvió WinError 1314 al crear el symlink. La prueba de marcador junction sí pasó.
- `python tools/validate_package.py` — **PASS** para estructura de paquete, 23 skills, 31 casos de routing, sintaxis JSON (11 documentos) y análisis estático de seguridad. **SKIP** JSON Schema real: `jsonschema` no está disponible; parsear JSON no se reporta como validar Schema.
- `py -3.14 tooling/validate/validate_dist.py` — **PASS** cinco manifests/hashes, exactitud de archivos, adaptadores/enum Antigravity, referencias skill empaquetadas y seis archivos TOML Codex. **SKIP** parseo YAML: PyYAML no está disponible; solo checks estáticos de delimitadores y claves.
- Primera ejecución de la suite ampliada: 53 de 54 pasaron; falló únicamente una aserción nueva demasiado estrecha que esperaba no recibir la etiqueta auxiliar `backend` al detectar Python. Se corrigió la expectativa para validar Python sin asumir ausencia de etiquetas adicionales. La ejecución final de 54 tests pasó.

Estas pruebas del paquete y fixture no demuestran que un host nativo externo active roles en un proyecto real. No se ejecutaron CLIs de hosts ni smoke de modelo en esta corrección.

## Build e integridad

Source digest: `fb8eccfb881550f552d89e80db4f9a070a06ed883d726bd46855cc6e166c6b5c`.

| Distribución | SHA-256 de manifest.json | Archivos |
|---|---|---:|
| codex | 6c8af9058583401f7e634d3ebef29ac1eb91daac7dd84066e1bc65c03f53e401 | 39 |
| antigravity-ide | fd2252bb6acd8afd4632a60b5f4d2e7b589cb92b7797209453f7f9a4733b565a | 40 |
| antigravity-cli | 40c9a4cc4cadfab1c45b0f438fe0eaa68dc4923153882a3295c834efce1fda3f | 40 |
| claude-code | 97647eb53bfdbef4e742265630a5c14872e75f528aecf82d32dddba905d854fb | 39 |
| opencode | 4df587e93ed190a86df8c4c3138b2c86d76c4444c6f27ffc13fa88b0556f23df | 39 |

Manifiesto detallado: `reports/v4_2_1-build-manifest.json`.

## Riesgos residuales

- Parseo YAML real y validación JSON Schema real siguen sin ejecutarse por dependencias opcionales ausentes; no se instalaron.
- Symlink real en Windows no fue verificable por falta de privilegio, aunque rechazo de junction marcado y otras pruebas de rutas sí pasaron.
- Los hosts Antigravity, Claude Code y OpenCode no se smoke-probaron durante este hotfix; la propagación de descripciones es validación estática.
- No se midieron resultados, coste, tokens ni calidad de modelo; el piloto sigue pendiente.

## Seguridad y alcance de cambios

No hubo instalación global, `--apply`, hooks, MCP, descargas ni ejecución de terceros. El ZIP histórico fue leído sin extraer. Se modificaron fuente canónica, dist generado, pruebas, README/changelog y este reporte. `archive/legacy/`, `archive/received/` y fuentes V2/V3.1 no se alteraron.
