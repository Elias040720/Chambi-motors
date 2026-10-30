# PROGRESS V4.2.1 — hotfix de descubrimiento y detección

- Restauradas las 23 descripciones V4.1 recuperadas del paquete con digest coincidente; contenido operacional V4.2 preservado.
- El detector ahora poda `SKIP_DIRS` antes de descender y evita symlinks/reparse points; prueba de recorrido instrumentado añadida.
- Cinco dist regeneradas desde la fuente canónica; descripciones fuente, registry, skills y adaptadores host cubiertos por regresión.
- Python 3.14: 54 tests OK, 1 SKIP; Python 3.9: 54 tests OK, 2 SKIP (symlink WinError 1314 y tomllib ausente). Validadores: paquete y distribución PASS; Schema JSON y parseo YAML real SKIP por dependencias ausentes.
- Sin instalación global, hooks/MCP, descargas o ejecución de terceros. No se inició piloto ni evaluación de modelos.
- Evidencia e integridad: `reports/v4_2_1-hotfix.md`, `reports/v4_2_1-build-manifest.json`.
