# V4.1 — preparación para instalación opcional

Estado: **paquetes generados y probados estáticamente; no instalados en ningún perfil real**. El árbol editable único es `universal-agents/`; `dist/` se regenera con el generador. No se activó hook/MCP, no se instalaron dependencias globales y no se ejecutó componente externo.

## Recomendación

La instalación es **opcional para evaluación manual**, siempre después de revisar dry-run/colisiones por cada host. No afirmar compatibilidad runtime completa: Codex skill se probó en un proyecto temporal y devolvió la instrucción esperada; Codex delegation al subagente falló en el runtime con `collab spawn failed: no thread with id`. Antigravity IDE/CLI y OpenCode no disponibles; Claude CLI anterior no autenticado. Global install/discovery estático no equivale a verificación de aplicación real.

## Paquetes y hashes observados

Todos los manifests muestran `source_digest=4b3763c09129a0fe8c78ce6892aec254549dbed7343647185a10a0b8e4b18534`. `validate_dist.py` verificó hashes/tamaños de cada archivo declarado, sets exactos, sin symlink/cache/hook/MCP, seis agentes nativos por host y 23 skills cada uno.

| Paquete | Archivos listados | SHA-256 `manifest.json` |
|---|---:|---|
| `dist/codex` | 39 | `e8c247b0df655ef6d655bc989d5acaed1c04b7a13ef258bd41592e1bc141ba9a` |
| `dist/antigravity-ide` | 40 | `b5f5832623d37402b2f21eca03576b6b978f35bd915cc084bb441e059ab64f3a` |
| `dist/antigravity-cli` | 40 | `25a0cf39722e686e917988963bec16453968e5e0639d5f193c2a298033d69e14` |
| `dist/claude-code` | 39 | `a4b74c036d198ff57ccc224d31092b7c650e93e4b2aa1ae82943a04f3b752634` |
| `dist/opencode` | 39 | `5ecfb3b53c4aa72326037b8c4f89841cd155c7c14cb13bdc4a1ce02b438554ae` |

## Prueba / aplicación futura

Desde la carpeta `universal-agents/`, reemplaza `codex` por host elegido. La primera línea simula únicamente y no escribe. No uses `--apply` hasta revisar las colisiones y rutas impresas:

```powershell
python tooling/install/installer.py --host codex --scope global --dry-run --bundle ..\dist\codex
```

Se ejecutó el mismo dry-run en un proyecto temporal con espacios para los cinco hosts: Codex 38, Antigravity IDE 39, Antigravity CLI 39, Claude Code 38 y OpenCode 38 archivos mapeados; cada uno devolvió `exit=0`, `no files written`. El temporal se eliminó tras validar que el destino coincidía con la carpeta temporal creada para esta prueba.

Aplicación (ejemplo, **no se ejecutó**):

```powershell
python tooling/install/installer.py --host codex --scope global --apply --bundle ..\dist\codex
```

Para evaluación de proyecto, limita root y usa scope proyecto:

```powershell
python tooling/install/installer.py --host codex --scope project --project-root C:\ruta\al\proyecto --dry-run --bundle ..\dist\codex
```

Para restaurar instalaciones nuevas: `--rollback <operation-id>` o `--uninstall <operation-id>` (alias), sin necesitar bundle. Si se interrumpe una operación, `--list-recoverable` y `--recover <id>` sin el dist actual. Ledger V4 v1 se migró en pruebas temporales con validación de host/scope/path/hash/backup.

## Aprobaciones/limitaciones antes de distribución pública

- No instalar automáticamente, sin `--apply`, no descargar ni permitir scripts globales.
- JSON Schema semántico está SKIP porque no hay `jsonschema`; los 8 ficheros JSON sí pasan parseo. TOML pasó 6 agentes con Python 3.14. PyYAML se pasó en Python 3.9; parser YAML SKIP en 3.14.
- Symlink real de Windows SKIP (`WinError 1314`); marca junction se probó simulada. No hay prueba de energía/filesystem crash ni de Unix.
- Codex smoke fue en proyecto temporal independiente, no perfil global. La habilidad se cargó; delegación nombrada falló con error de thread de host.
- Antigravity IDE/CLI y OpenCode discovery NOT VERIFIED (programas ausentes). Claude Code no autenticado en smoke heredado. No snapshots visuales, lector de pantalla, A/B, calidad, costo, tokens o latencia. Dataset de evaluación sigue PENDING.
- La estructura y rutas se apoyan en documentación oficial vigente revisada por host; pueden cambiar con versiones/ajustes administrados y deben probarse tras instalación manual.

## Desinstalación segura

Usa el ID emitido tras aplicar; rollback valida drift y conserva archivos modificados después de la instalación. No borra carpetas enteras ni altera archivos que no estén registrados.

```powershell
python tooling/install/installer.py --host codex --scope global --rollback codex-global-ID
```

Consulta [`v4_1-migration.md`](v4_1-migration.md) para recovery y [`v4_1-test-results.md`](v4_1-test-results.md) para salidas reales.
