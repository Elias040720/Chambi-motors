# Auditoría V4.2

Fecha de verificación: 2026-10-25 (America/Lima). Inspección del árbol existente, `AGENTS.md`, manifiestos, documentación por host y suite propia. No hay `.git` en la raíz, por lo que no existe diff Git confiable para certificar autoría previa. V2/V3.1 y `archive/legacy`, `archive/received` se conservaron.

## Hallazgos y correcciones

| Severidad | Brecha observada | Evidencia / corrección |
|---|---|---|
| Alta | Configuración Antigravity no puede usar el valor arbitrario `ask`; runtime previo no estaba disponible | `tooling/build/generate_dist.py` emite `off` para inspectores y `sandbox` para ejecutores. Enumeración, frontmatter y estructura validados estáticamente; ejecución de host NOT VERIFIED. |
| Alta | V4.1 tenía rutas/global-path claims sin comprobación en repo ajeno | `tools/install` y referencias core/skills pasan pruebas estáticas desde segundo proyecto temporal; sin instalación global ni host real, por lo que la detección global es NOT VERIFIED salvo el smoke histórico Codex de proyecto. |
| Alta | El CLI Codex real no confirmó lectura/delegación en V4.2 | Con `features.shell_tool=false` no apareció lector de archivos. Con shell activo, `Get-Content` fue rechazado y el host retornó `collab spawn failed: no thread with id`. Actualizado el límite de Codex: inspector deja shell y hereda sandbox read-only de sesión; no hay aislamiento propio. |
| Alta | No había evidencia conductual comparativa reproducible | Dataset congelado de 10 escenarios y harness pareado; evaluación de modelo continúa PENDING, no se reporta mejora ni eficiencia. |
| Media | Los roles no distinguían bien evidencia/calidad de salida | `roles/operations.json` incorpora quality gates concretos por cada uno de los 23 roles; generador los materializa como sección diferenciada por rol. Se conserva catálogo y aliases. |
| Media | El empaquetador escribía descripciones YAML sin comillas; descripción `VERIFY/REPORT: ...` rompía parser | `generate_dist.py` usa string JSON quoted (compatible con YAML); una prueba inicial falló con línea 3; el caso enfocado y suite final pasan. |
| Media | Un fixture web reportaba error tras POST exitoso por acceder `event.currentTarget` luego de `await` | Fix: captura estable de form antes del await; pruebas HTTP integración y revisión visual/teclado en navegador temporal pasaron. |
| Media | README V4.1/reportes no describían límites V4.2 | README principal y reportes V4.2 añaden versiones, hashes, SKIP/NOT RUN y readiness manual. V4.1 reportes se preservan. |
| Baja | Sintaxis JSON era descrita con riesgo de confundirse con JSON Schema | La herramienta identifica parseo JSON y esquema real por separado; validador `jsonschema` no está disponible: JSON Schema real = SKIP. |

## Matriz antes/después

| Área | V4.1 observado | V4.2 implementado/verificado | Límite actual |
|---|---|---|---|
| Routing | 23 skills base; múltiples perfiles/rutas | 31 escenarios; ruta directa adaptativa; tamaño de scope no activa API/DB; roles solo por dominio | Sin evaluación con modelos |
| Skills/roles | 23 archivos, operaciones generales | 23 profiles con quality gates específicos, cada uno generado; aliases `caio`, `tech-lead`, etc. comprobados | Mejora de calidad de comportamiento sin A/B |
| Adaptadores | 5 distribuciones estáticas | 5 manifests/sets/hash; enumeración Antigravity valida; YAML quoted; rutas globales estáticas verificadas | 2 host families sin binario; Codex/Claude runtime incompleto |
| QA | Pruebas de estructura y recovery previas | 52 tests Python; web HTTP fixture con errores/estado; eval harness no inventa métricas | JSON Schema real sin librería; Flutter sin SDK |
| UI | Diseño procedimientos, sin aceptación ejecutable | Form web API+SQLite aislado; estados, labels, contraste estático, render a 390×844 y foco Tab observados | No lector de pantalla, browser matrix, Core Web Vitals ni QA visual multi-página |
| Instalador | Journal/rollback V4.1 | Fallo inyectado tras nuevos/reemplazo/rollback; recovery sin bundle; dry-run/collision/drift/junction probados | Symlink real SKIP por privilegio Windows; test residual temp cleanup bloqueado por política de herramienta |

El evento de recuperación editorial de `roles/catalog.json` y los límites de cleanup de temporales se describen en los reportes de pruebas/seguridad. Ningún smoke demuestra la compatibilidad de los cuatro hosts como grupo completo.
