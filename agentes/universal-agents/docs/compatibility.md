# Compatibilidad y estado honesto

| Capa | Estado | Evidencia |
|---|---|---|
| Skills canónicas | PASS estructural sujeto a salida final de validador | Frontmatter, nombres, secciones, aliases, activadores positivos/negativos y enlaces bajo prueba. |
| Dist Codex / Antigravity IDE / Antigravity CLI / Claude / OpenCode | Generadas; manifests y rutas estáticas en pruebas propias | Validación de carpetas emitidas y preflight del instalador en temporales; sin instalar en perfiles reales. |
| Descubrimiento/invocación de host | NO PROBADO | No se ejecutaron CLIs ni se instalaron skills. |
| Agentes nativos separados | Formatos empaquetados, disponibilidad por host no observada | El procedimiento skill sigue utilizable por agente principal; no afirmar aislamiento. |
| Instalador | Aplicación, repetición, colisión, backup, rollback y drift probados en `TemporaryDirectory` | Symlink real SKIP por privilegio Windows; detección de junction se ejercita con marca reparse simulada. Nunca ejecutado sobre perfil global. |
| JSON Schema | PASS solo si un validador Draft 2020-12 ya está disponible; de otro modo SKIP explícito | No instalar una dependencia para convertir SKIP en PASS. |
| Modelo/evaluación de calidad y coste | PENDIENTE | El harness prepara casos; no se hicieron llamadas a modelos ni se inventaron tokens/latencia. |
| UI visual | Fixtures/checklists solamente, no prueba visual | No hubo browser/screenshot de app. |

Los nombres de cada host y su semántica se documentan en `host-matrix.md`. Un skill incorporado al paquete no implica que el host lo cargue ni que el agente especializado se invoque automáticamente.
