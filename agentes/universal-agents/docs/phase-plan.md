# Plan de fases 2–6

## Fase 2 — Ingeniería y calidad

Implementar `architect`, `implementer`, `debugger`, `qa-strategist`, `test-engineer`, `code-reviewer`, `security-auditor`, `performance-engineer`, `db-engineer` y `api-engineer`. Preservar aliases; separar estrategia QA, ejecución de pruebas, revisión independiente y estado verificable. Definir triggers positivos/negativos y límites por rol.

## Fase 3 — UX y diseño

Preparar `design-director`, `ui-engineer`, `ux-reviewer` y `motion-reviewer`. Primero respetar marca y sistema visual existentes; luego requisitos de producto; después consultar patrones optativos. Antes de adoptar fuentes externas, revisar commit/versión, licencia, NOTICE, scripts y permisos. Validar accesibilidad, responsive, estados, teclado y reduced motion.

## Fase 4 — Adaptadores e instalación

Diseñar archivos nativos para cada host solo después de comprobar sus esquemas y rutas por versión. Construir manifiesto, preview dry-run, detección de colisiones, backup y rollback en directorios efímeros. Nunca borrar carpetas globales ni activar hooks/MCP por defecto. Smoke test por host; marcar como no probado hasta ver descubrimiento e invocación reales.

## Fase 5 — Evaluación y release candidata

Crear fixtures variados y evaluaciones de activación/modelo observadas, incluyendo negativos, conflictos y herramientas ausentes. Comparar V2 y V3 con el mismo modelo, tarea, repo, permisos y entorno; medir éxito funcional, regresiones, seguridad, UX, tokens totales, latencia, llamadas y reintentos cuando el host exponga esos datos. No prometer ahorro previo a medición. Generar trazabilidad de licencia, hash, changelog y rollback.

## Fase 6 — Instalación global

Presentar el artefacto y el resultado de pruebas para revisión. Instalar solo con autorización explícita posterior, host y scope definidos, tras preflight y backup. La Fase 1 no hace ninguna instalación.
