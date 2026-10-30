# Migración y recovery V4 → V4.1

No se cambió configuración ni perfil global. V4.1 se conserva en `universal-agents/` y los cinco bundles regenerados en `dist/`. Los backups previos de dist quedaron bajo `archive/builds/previous/`; `archive/legacy/`, `archive/received/` y los originales V2/V3.1 permanecen intactos.

## Probar sin aplicar

`dry-run` es el valor por defecto. Cada destino se imprime relativo a root, evita revelar ruta de perfil:

```powershell
python universal-agents/tooling/install/installer.py --host codex --scope global --dry-run --bundle dist/codex
```

Sustituye `--host` por `codex`, `antigravity-ide`, `antigravity-cli`, `claude-code` u `opencode`. Para proyecto, usa `--scope project --project-root <ruta>`. `--target-root` solo funciona bajo temporal del sistema para pruebas.

## Aplicar manualmente cuando se decida

Antes de instalar, inspecciona el manifiesto/hash, la matriz de host y todas las colisiones. `--apply` explícito crea operación con ID. Las colisiones bloquean por defecto; `--replace` hace backup byte a byte dentro del ID de operación.

```powershell
python universal-agents/tooling/install/installer.py --host codex --scope global --apply --bundle dist/codex
```

No es una instrucción para instalar ahora. Repite el host y bundle elegido; el paquete no activa hooks/MCP ni instala dependencias.

## Recuperación y rollback

Encuentra operaciones incompletas en el mismo scope/root:

```powershell
python universal-agents/tooling/install/installer.py --host codex --scope global --list-recoverable
python universal-agents/tooling/install/installer.py --host codex --scope global --recover codex-global-ID
```

`--recover ID` no requiere el bundle actual ni una copia antigua de `dist/`. El journal guarda payload nuevo y backup previo por hash y path relativo dentro del control de la instalación. Antes de compensar verifica todos los destinos y detecta drift; cualquier estado fuera del hash anterior/nuevo aborta antes de mutar.

Rollback/desinstalación después de una instalación completa:

```powershell
python universal-agents/tooling/install/installer.py --host codex --scope global --rollback codex-global-ID
# --uninstall ID es alias exacto de --rollback ID
```

## Migrar ledger de V4

V4 usaba `.universal-agents/manifests/<id>.json`, schema 1. Si rollback busca un journal v2 y no lo encuentra, lee el ledger v1 del mismo ID. Comprueba host/scope, estado, IDs, targets contra familias de rutas cerradas por host, hash actual de cada archivo, backup bajo `.universal-agents/backups/<id>/` y hash del backup. Después materializa journal v2 `migrated_from: v4-ledger-v1` y ejecuta el rollback con preflight completo. No necesita el `dist` actual. El ledger viejo se conserva; no se convierte en una autoridad arbitraria para borrar/restaurar otras rutas. Prueba real del fixture temporal: `test_v4_ledger_migrates_to_journal_without_current_bundle` pasó.

## Compatibilidad / límites / desinstalación

- Codex, Ant IDE/CLI, Claude, OpenCode mantienen sus rutas de host descritas en `universal-agents/docs/host-matrix.md`; las de perfil global se calculan desde el home del proceso y no contienen nombre de usuario hardcodeado.
- Los archivos de skill/core mantienen el relativo `../../core/...` y pruebas verifican el destino esperado para cada root global.
- Si los archivos fueron editados después de instalar, rollback/recovery se detiene y preserva los cambios. Resuelve manualmente y crea una nueva operación con plan revisado; no edites el journal para forzar rollback.
- Las carpetas vacías que deja un rollback no se borran recursivamente. Journals/backups permanecen para auditoría; su limpieza debe hacerse manualmente solo después de confirmar el cierre.
- No se probó en el perfil real, symlink/junction real, UNIX ni caída de energía. Las garantías atómicas se limitan al comportamiento de archivos observado en Windows/NTFS de esta prueba y la semántica `os.replace`/`fsync`; hardware/filesystem determinan persistencia real.
- `--rollback` valida el ledger V4 heredado; no se afirma migración de datos ajenos o manifiestos no reconocidos.
