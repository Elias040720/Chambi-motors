# Universal Agents V4.1 — fuente canónica

Sistema global, reutilizable y agnóstico al stack. Esta es la única fuente editable; `../dist/` contiene paquetes regenerables. Conserva 23 skills y sus aliases anteriores, incluidos `caio` para `tech-lead` y `tech-lead` como rol. El alias no implica una sintaxis común entre hosts.

## Invocación por host

- **Codex:** invoca una skill con `$tech-lead`; subagentes se delegan con el nombre nativo registrado, según la configuración Codex. No se genera un alias como archivo de skill `caio`. La skill y el agente son mecanismos distintos.
- **Antigravity IDE y CLI:** `/<skill-id>` invoca skill. Para el agente usa `invoke_subagent` o el selector `/agents`; no equivale a la slash skill.
- **Claude Code:** `/<skill-id>` invoca la skill. Para el subagente, solicita `Agent` con el nombre registrado. El adaptador precarga `skills:` en su contexto.
- **OpenCode:** skill nativa `skill({name: "tech-lead"})`; el agente puede invocarse como `@tech-lead`. Son entradas diferentes.

Los alias de rol son compatibles en la resolución del catálogo; no se presentan como shortcut de CLI en los hosts si la documentación de ese host no lo define.

## Flujo y garantías

Una solicitud simple usa ruta directa; routing especializado usa señales explícitas de dominio/impacto/etapas/contexto/controles, no cantidad de archivos. `security-check`/`sec` es ligero; `security-audit`/`security-auditor` es profundo y explícito. Un reviewer directo no se anuncia como independiente. Schemas documentales y pruebas observadas se reportan separadamente.

Skills cargan bajo demanda, no aplican permisos. El host conserva su autorización real. Revisa las ubicaciones y estado de prueba en `docs/host-matrix.md`. `architect`, `debugger`, `code-reviewer` y `security-auditor` preservan lectura/búsqueda/diff; Codex puede heredar la capacidad de escritura de la sesión, por lo que su instrucción de no escribir necesita sandbox del host en lectura para hacerse cumplir.

Para UI nueva: `design-director → ui-engineer → ux-reviewer`; añade `motion-reviewer` solo si hay motion o solicitud explícita. Para UI existente definida, el implementador puede ir directo. La revisión visual solo se afirma cuando se observó navegador/captura.

## Build y checks propios

Desde esta carpeta:

```powershell
python tooling/build/generate_roles.py
python tooling/build/generate_dist.py
python -m unittest discover -s tests -v
python tools/validate_package.py
python tooling/validate/validate_dist.py
python tooling/eval/evaluate_records.py tests/fixtures/eval/empty-dataset.json
```

El build es reproducible desde esta fuente, preserva la salida previa reconocida y no instala. El instalador queda en dry-run salvo `--apply` explícito y requiere manifiesto/hash correctos.

## Límites

- No instalar en perfil global, activar hooks/MCP o descargar/extender componentes de terceros durante la validación.
- JSON Schema real depende de `jsonschema`; si no existe, el reporte marca SKIP y solo valida sintaxis JSON aparte.
- Las smoke de Antigravity/OpenCode están pendientes; Claude requiere autenticación; Codex skill del proyecto se probó temporalmente, pero la delegación al subagente falló con error interno de ejecución.
- A/B, calidad, coste/token, latencia, pantalla y accesibilidad asistiva requieren evidencia de ejecución; el dataset vacío permanece PENDING.

Ver `docs/install-and-rollback.md`, `docs/host-matrix.md`, `docs/security-and-trust.md`, `docs/third-party.md`.
