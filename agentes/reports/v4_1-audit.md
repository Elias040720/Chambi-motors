# Auditoría y cambios V4.1

Fecha: 2026-10-24. Carpeta inspeccionada: `C:\Users\ABEL\Downloads\agentes`. No hay metadata Git en la raíz (`git status` devolvió “not a git repository”); por ello se comparó contra los manifests V4 existentes y se conservaron los paquetes previos generados en `archive/builds/previous/`. `archive/legacy/`, `archive/received/` y los orígenes V2/V3.1 no se modificaron. Instrucciones del workspace: la fuente activa es `universal-agents/`, `dist/` generado, no ejecutar scripts V2/V3.1 ni instalar global durante pruebas.

## Hallazgos priorizados

| Severidad | Hallazgo observado antes de cambios | Riesgo / evidencia | V4.1 |
|---|---|---|---|
| Crítica | Instalador solo escribía ledger después de todos los copies; rollback necesitaba el `dist` actual | Caída intermedia dejaba archivos parciales sin registro/recovery; alteración/actualización del dist impedía rollback. Evidencia V4 preservada: `archive/builds/previous/antigravity-ide-2f5fa4dab127/` y código anterior en `archive/received/baseline-20261024-010047/` | Reemplazado por journal v2 y stage de payload/backups antes de mutar; recovery/rollback sin bundle; migración v1 anterior verificada |
| Alta | `commandExecutionPolicy: ask` en roles Antigravity con edición | El valor no pertenece al enum oficial `off`, `auto`, `eager`, `sandbox`. Se observó en los paquetes V4 previos, por ejemplo `archive/builds/previous/antigravity-ide-2f5fa4dab127/.agents/agents/implementer.md:7` | Emitir `sandbox` para ejecutores y `off` para inspectores; tests que rechazan otros valores |
| Alta | Definiciones nativas decían abrir `.agents/skills/<role>/SKILL.md` desde agente global | Desde rutas globales separadas, path relativo dependía del cwd/ubicación del paquete. En Codex ahora se materializa el cuerpo skill en instructions; Claude usa `skills:`; Antigravity usa `skills:`; OpenCode usa herramienta skill. Tests y smoke Codex temporal, límites abajo. |
| Alta | `AGENTS.md`/`CLAUDE.md` enlazaban a core relativo al paquete | Ese enlace deja de ser válido si el contexto es global en otro repositorio. | Eliminado el enlace al core de instrucciones globales; las referencias bajo skills preservan estructura y tests resuelven ubicaciones globales por host. |
| Alta | `features.shell_tool=false` en inspectores Codex | Deshabilitaba el canal de lectura/búsqueda que el rol requiere; no es una restricción equivalente a “solo lectura”. | No se emite `shell_tool=false`; TOML conserva inspección. Codex documenta que subagentes heredan el sandbox de la sesión: el prompt del rol no crea aislamiento. |
| Media | Skills, agente y uso de `@`/slash no estaban diferenciados por host | Riesgo de documentar falsa equivalencia y rol que no carga procedimiento. | Tabla por host y método nativo en `universal-agents/docs/host-matrix.md`, cada mecanismo diferenciado. |
| Media | Aliases `security-check` y `security-auditor` podían confundirse | Alias `sec` para revisión breve y `security-audit` para auditoría profunda no son el mismo alcance/coste. | Preservados nombres/aliases exactos y documentados activadores y límites. |
| Media | Parseo JSON se podía presentar como validación de schema | 8 JSON válidos no prueban que 3 esquemas sean válidos ni que instancias cumplanlos. | Reportes separan sintaxis JSON y JSON Schema; sin `jsonschema` real el estado es SKIP. |
| Media | Pruebas de referencias solo cubrían dentro del bundle | No representaban perfil global con proyecto externo. | Mapeo global de cinco hosts y links a core se verifican usando perfiles/proyectos temporales; Codex hizo smoke real de skill en repo temporal. |
| Baja | Paquete UI era una dirección estática/brief sin pipeline por riesgo | Riesgo de imponer estilos/herramientas y afirmar visual review desde lectura estática. | Flujo condicionado design-director → UI → UX review; motion condicional; se documentan casos y evidencia visual requerida. |

## Matriz antes / después

| Área | V4 antes | V4.1 después | Verificación y límite |
|---|---|---|---|
| Fuente/distribución | Fuente única y cinco dist V4 | Fuente única y cinco dist regeneradas: Codex, Ant IDE, Ant CLI, Claude, OpenCode | Manifests verifican archivos/hashes; segundo build se debe confirmar con `UNCHANGED` |
| Antigravity | valor no documentado `ask` | `sandbox` ejecutores; `off` inspectores | Enum chequeado estáticamente; no CLI/app real en equipo |
| Codex skills/roles | Path relativo y shell deshabilitado a inspectores | Skill inline derivada de fuente canónica; búsqueda posible; límites de escritura heredados del host | Skill real cargó en proyecto temporal. Delegación nativa falló por `collab spawn failed: no thread with id`; no PASS de subagente. |
| Instalador | Ledger post hoc, rollback depende del dist | Journal persistente/staging/backups/hash, rollback compensatorio, recovery sin dist y migración V4 ledger v1 | 43 tests; 4 inyecciones de fallo y migración a journal. Simulado solo en temporales. |
| Skills globales | Rutas relativas con supuestos | Adaptadores y mappings host-specific | Antigravity/Claude/OpenCode verificación estática, no ejecución del host. |
| UI | Briefs y checks declarados | Procedimientos roles, matriz de escenarios, reduced motion/estados/a11y | No browser/capturas ni UI render en esta sesión; visual review NOT RUN. |
| Evidencia | JSON parse y documentación | Sintaxis JSON y schema real diferenciados; evidencia no aprueba | JSON Schema SKIP; benchmark PENDING. |

## Alcance del rediseño de instalador

La operación guarda un journal dentro del root elegido (`.universal-agents/operations/<id>/journal.json`) y bytes staged `payload/*.new`/`*.old` con SHA-256. Antes de cambiar archivos de usuario los entries contienen `target` relativo, mapeo host/scope, estado anterior y esperado. Un fallo o drift bloquea con conservación de datos; recuperación examina target y hash, acepta solo estado previo/nuevo, preflight de todas las entradas y restaura en orden inverso. Una interrupción de rollback puede reintentarse. Ledger antiguo se importa solo desde su instalación guardada y se restringe a familias de ruta autorizadas y backups del ID.

Costes/límites: journals/backups ocupan espacio hasta su limpieza manual; no hay firma criptográfica local del journal; `fsync`/replace aportan durabilidad de archivos pero el filesystem/controlador determina garantías frente a pérdida de energía. `README.md` de distribución y `manifest.json` no se instalan. La prueba de symlink real quedó SKIP por Windows `WinError 1314`; marcador junction simulado pasó.
