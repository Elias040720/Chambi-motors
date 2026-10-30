# Instalación y rollback

No instalar globalmente durante esta construcción. `dist/` contiene paquetes revisables. El instalador permite simular con `--dry-run` (predeterminado); solo `--apply` puede escribir. Siempre indicar host y scope.

```powershell
# Simulación; imprime destino relativo, colisiones y hashes sin escribir.
python tooling/install/installer.py --host codex --scope global --dry-run --bundle ..\dist\codex

# Aplicar solo después de revisar el plan.
python tooling/install/installer.py --host codex --scope global --apply --bundle ..\dist\codex

# Ver operaciones interrumpidas sin modificar archivos de destino.
python tooling/install/installer.py --host codex --scope global --list-recoverable

# Recuperar una instalación interrumpida; no necesita el bundle original ni el dist actual.
python tooling/install/installer.py --host codex --scope global --recover codex-global-ID_DE_SALIDA

# Restaurar/desinstalar una instalación completa por el ID de INSTALLED (no requiere bundle).
python tooling/install/installer.py --host codex --scope global --rollback codex-global-ID_DE_SALIDA
python tooling/install/installer.py --host codex --scope global --uninstall codex-global-ID_DE_SALIDA
```

Para un proyecto, añade `--project-root <ruta-del-proyecto>` y usa `--scope project`. Conserva el paquete exacto empleado para instalar mientras quieras poder revertirlo. `--target-root` es solo para pruebas y solo acepta rutas bajo la carpeta temporal del sistema.

Preflight requerido antes de aplicar:

1. Resolver la ruta final desde una lista cerrada por host/scope; no aceptar una ruta arbitraria del manifest.
2. Confirmar que cae bajo perfil del usuario o raíz de proyecto solicitado; rechazar path traversal, root/drive, UNC y symlink/junction en destino/ancestros.
3. Leer el manifest del paquete y recalcular hashes; listar colisiones y archivos no administrados.
4. Sin sobrescritura por defecto. La opción de reemplazo requiere backup exacto por archivo, hash antes/después y revisión de diff.
5. Staging de payloads nuevos y backups, verificación SHA-256 y journal durable antes de cambiar destinos. El journal guarda paths relativos, hashes y bytes de recovery; no secretos ni salida de comandos.
6. Rollback/recovery valida todas las rutas contra el mapeo cerrado original host/scope y hashes, y preflight de drift antes de mutar. Cada archivo se cambia atómicamente; ante interrupción se reanuda desde el journal. Archivos nuevos se eliminan solo si aún coinciden con el hash instalado; si hay drift, se detiene.
7. Desinstalación solo afecta entradas en el manifest del instalador; jamás elimina la raíz de host ni archivos ajenos.

El instalador V4.1 conserva el paquete fuente original en el journal y no depende del `dist` actual para recovery/rollback. El ledger v2 limita cada destino al mapeo del package path registrado, host y scope. El journal es un control local; quien pueda escribirlo puede alterar datos, por lo que la recuperación valida consistencia y rutas pero no es una firma criptográfica de autoría. En Windows la persistencia usa `fsync` de los archivos y reemplazo atómico, pero las garantías ante pérdida eléctrica/controlador dependen del filesystem y no se afirman como transaccionalidad de hardware. Pruebas deterministas de fallos y todas las instalaciones simuladas se ejecutan exclusivamente contra directorios temporales. Windows no permitió crear symlink real sin privilegio adicional; esa prueba es SKIP y el control de atributo junction se simula unitariamente. El perfil real no se toca.
