# Preparación de instalación V4.2

Estado: **paquete reproducible para revisión e instalación manual opcional; no declarar compatibilidad runtime completa ni listo para piloto**.

## Build

Fuente única editable: `universal-agents/`. Construcción: desde esa carpeta, `python tooling/build/generate_roles.py` seguido de `python tooling/build/generate_dist.py`. Los cinco manifests incluyen 23 skills/6 agentes por host, no hooks/MCP, checks de hashes/sets y digest `e15601a134110bd4b302e3ff7aa60f53a130308b61977891e0c7c52f2102f8a7`. Manifests SHA256: ver raíz README. No editar `dist/`.

## Estado por prerrequisito

- Tests propios: PASS 52; Python 3.14 PASS con un skip de symlink real; salida exacta en test-results.
- Dist hashes/esquemas estructurales: PASS. YAML parser PASS Python 3.9; TOML parser PASS 3.14. JSON Schema real SKIP (`jsonschema` ausente).
- Paquete global de 5 hosts: archivos y rutas estáticas presentes. Global install y host discovery: no hechos.
- Codex/Claude: smoke limitado fallido/bloqueado. Antigravity IDE/CLI y OpenCode ausentes. Flutter runtime ausente.
- A/B modelo, calidad, coste, tokens y latencia: pendiente; no se anuncian métricas.
- Windows symlink privilegiado: SKIP `WinError 1314`; junction marker test pasa.
- No hay Git en la raíz; no se afirma clean diff preexistente.

## Acción manual segura al decidir instalar

Primero simular el host/scope destino. La simulación no escribe:

```powershell
python tooling/install/installer.py --host codex --scope global --dry-run --bundle ..\dist\codex
```

Revisar rutas, colisiones y contenido ajeno; default bloquea reemplazo. La simulación global puede mostrar destinos bajo perfil, pero no los toca. Después de inspección humana, el usuario decide si quiere `--apply`; esta sesión no lo hizo.

Recovery de operación interrumpida desde `universal-agents/`:

```powershell
python tooling/install/installer.py --host codex --scope global --list-recoverable
python tooling/install/installer.py --host codex --scope global --recover codex-global-ID
```

Recovery se ata al host/scope/manifest original y hashes/backups del journal; no depende del `dist` mutable. Usa el ID original impreso por el instalador; no inventar paths. Rollback/desinstalación y paths autorizados se explican en [install-and-rollback](../universal-agents/docs/install-and-rollback.md).

## Conclusión

Solo apta para revisión y dry-run manual ahora. Para un piloto, quedan primero: completar smoke de Codex cuando el host de lectura/delegación funcione, resolver política Claude; ejecutar skills/agentes nativos Antigravity/OpenCode en instalaciones elegidas por Abel; Flutter tests con SDK/equipo; validar JSON Schema con validador presente; y correr evaluación A/B pareada. No instalar globalmente ni activar hooks/MCP hasta que Abel lo decida.
