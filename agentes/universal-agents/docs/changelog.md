# Changelog V4

## 4.2.1 — 2026-10-25

- Restaura las 23 descripciones breves de descubrimiento V4.1 verificadas desde el paquete histórico con digest de fuente coincidente; conserva procesos, límites y gates V4.2.
- Cambia la detección a recorrido top-down con poda antes de descender en directorios ignorados; omite enlaces y reparse points.
- Agrega regresión del baseline semántico en catálogo, registry, skills y cinco distribuciones; agrega verificación instrumental de la poda.
- Regenera cinco dist; suite Python 3.14: 54 tests OK, 1 SKIP; Python 3.9: 54 tests OK, 2 SKIP (privilegio de symlink y tomllib ausente). JSON Schema real / parser YAML quedan SKIP por librerías ausentes.
- No se ejecutaron pilotos, CLIs de host, instalación, hooks/MCP ni código tercero.


## 4.2.0 — 2026-10-25

- Añade quality gates específicos de cada uno de los 23 roles y los genera desde `roles/operations.json`.
- Preserva routing de ejecución directa, propiedad/criterios, revisión verdaderamente independiente y tool fallback sin confundir skills con subagentes.
- Arregla quoting YAML de descripciones con puntuación estructural y valida la enumeración host Antigravity.
- Añade fixture full-stack web Python/SQLite, aceptación visual responsive/teclado limitada y fixture Flutter offline que queda NOT RUN sin SDK.
- Congela 10 escenarios y harness A/B pareado; comportamiento, calidad, tokens y coste continúan PENDING sin salidas/telemetría.
- Smoke real Codex y Claude registra límites observados; Antigravity/OpenCode no presentes. Ninguna instalación global, hooks/MCP o descarga.
- Suite de 52 pruebas propia pasa en Python 3.9 y 3.14 con skips por parser/privilegios del entorno.

## 4.0.0 — 2026-10-24

- Consolidación de V2 y V3.1 en fuente canónica portable, sin activar integraciones.
- Skills completas por rol, router con señales explícitas y permisos efectivos del host.
- Separación security-check/security-audit y claims de evidencia/provenance observada.
- Adaptadores por host, dist reproducible, simulación de instalación y rollback acotado.
- Referencias de terceros documentadas; código y contenido de esos repos no copiados.
- Smoke tests reales de host/modelo quedan NO PROBADO/PENDIENTE.
