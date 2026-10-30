# Universal Agents V4.2.1

Paquete universal para Codex, Antigravity IDE/CLI, Claude Code y OpenCode. Mantiene una fuente editable en [`universal-agents/`](universal-agents/) y cinco distribuciones reproducibles en [`dist/`](dist/). Este hotfix restaura las descripciones originales de descubrimiento de los 23 roles y hace que el detector pode directorios excluidos antes de recorrerlos. No hubo instalación global, hooks/MCP ni incorporación de runtime de terceros.

## Estado

La suite propia final pasa: **54 tests en Python 3.14 (1 SKIP) y Python 3.9 (2 SKIP)**; symlink real no disponible en Windows y Python 3.9 no incluye `tomllib`. Validadores de paquete y distribución pasan dentro de sus alcances reportados. JSON Schema real y parser YAML real quedaron SKIP porque las librerías no estaban instaladas. Esta versión queda lista para revisión e instalación manual opcional; los smoke tests de hosts y piloto de modelo no están validados por este hotfix.

## Construir y probar

En PowerShell, desde `universal-agents/`:

```powershell
python tooling/build/generate_roles.py
python tooling/build/generate_dist.py
py -3.14 -m unittest discover -s tests -v
python tools/validate_package.py
py -3.14 tooling/validate/validate_dist.py
```

Consulta [instalación/recovery](universal-agents/docs/install-and-rollback.md), [readiness V4.2](reports/v4_2-install-readiness.md) y [reporte del hotfix](reports/v4_2_1-hotfix.md). La simulación del instalador sigue siendo el modo predeterminado. No ejecutar `--apply` global sin una decisión posterior del propietario.

## Integridad

Source digest: `fb8eccfb881550f552d89e80db4f9a070a06ed883d726bd46855cc6e166c6b5c`.

| Dist | SHA-256 de `manifest.json` | Archivos |
|---|---|---:|
| codex | 6c8af9058583401f7e634d3ebef29ac1eb91daac7dd84066e1bc65c03f53e401 | 39 |
| antigravity-ide | fd2252bb6acd8afd4632a60b5f4d2e7b589cb92b7797209453f7f9a4733b565a | 40 |
| antigravity-cli | 40c9a4cc4cadfab1c45b0f438fe0eaa68dc4923153882a3295c834efce1fda3f | 40 |
| claude-code | 97647eb53bfdbef4e742265630a5c14872e75f528aecf82d32dddba905d854fb | 39 |
| opencode | 4df587e93ed190a86df8c4c3138b2c86d76c4444c6f27ffc13fa88b0556f23df | 39 |

Detalle: [manifest V4.2.1](reports/v4_2_1-build-manifest.json). Los reportes `v4_2-*` y V4.1 se conservan como registros históricos. `archive/legacy/`, `archive/received/` y fuentes recibidas V2/V3.1 se dejaron intactas.
