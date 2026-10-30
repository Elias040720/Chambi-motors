# Catálogo funcional de roles

Cada entrada tiene una skill con instrucciones operativas; eso no crea por sí solo un subproceso aislado. Los adaptadores solo exponen subagentes nativos donde el host los soporta y la tarea gana aislamiento. Procedimientos v2 se cargan solo al activar la skill.

| ID | Alias | Grupo | Activación positiva | No activar para |
|---|---|---|---|---|
| `architect` | `arch` | direction | Se crean o cambian límites entre módulos, contratos o persistencia. | Cambio local pequeño sin decisiones estructurales. |
| `implementer` | — | engineering | El usuario autorizó cambios y el brief tiene alcance suficiente. | Review, diagnóstico o análisis sin autorización de escritura. |
| `debugger` | — | engineering | Existe un error, regresión, crash o comportamiento inesperado. | La tarea es una nueva funcionalidad sin fallo diagnosticable. |
| `api-engineer` | `api-core` | engineering | Cambian endpoints, esquema, validación, autenticación o compatibilidad de API. | Dos archivos arbitrarios o documentación sin dominio API confirmado. |
| `db-engineer` | `db-master` | engineering | Se toca esquema, migración, consulta, transacción o integridad de datos. | Cambios sin señales de base de datos o solo texto/UI. |
| `performance-engineer` | — | engineering | Hay una métrica, presupuesto o síntoma de latencia/memoria/coste. | Optimización especulativa sin síntoma ni objetivo. |
| `qa-strategist` | — | quality | La tarea tiene varios riesgos, interfaces o criterios de aceptación. | Typo o respuesta simple con verificación obvia. |
| `test-engineer` | — | quality | Existe una implementación autorizada que necesita pruebas. | Review/plan sin autorización de escritura o ejecución. |
| `code-reviewer` | — | quality | El usuario solicita revisión o existe una revisión independiente del cambio. | No hay diff y solo se requiere implementación directa. |
| `security-check` | `sec` | security | El diff toca autenticación, datos sensibles, entradas externas o autorización. | Cambio cosmético sin superficie sensible. |
| `security-auditor` | `security-audit` | security | Se pide explícitamente auditoría profunda con alcance autorizado. | No se especificó alcance o autorización de prueba. |
| `design-director` | — | design | Se diseña una experiencia nueva o se pide dirección/critique visual. | Trabajo de backend o ajuste funcional sin decisión visual. |
| `ui-engineer` | `ui-expert` | design | La solicitud modifica una interfaz o componente visual. | Backend puro o petición de crítica sin cambio. |
| `ux-reviewer` | — | design | Se solicita revisión UX/a11y o un flujo tiene fricción conocida. | No existe interfaz/flujo que inspeccionar. |
| `motion-reviewer` | — | design | Hay motion intencional o se solicita crítica de animación. | UI estática sin motion solicitada. |
| `docs-release` | — | release | Hay un release autorizado que requiere artefactos y trazabilidad. | Typo aislado no relacionado con release. |
| `agent-evaluator` | `eval-harness` | evaluation | Se compara una versión del sistema o descripciones de skills. | Solo keywords o fixtures sin modelo se presentan como calidad real. |
| `tech-lead` | `caio` | direction | La tarea requiere clasificación, coordinación, controles de riesgo o cierre verificable. | Una respuesta o cambio pequeño puede resolverse directamente y con seguridad. |
| `request-analyst` | — | understanding | Hay ambigüedad material de objetivo, alcance, aceptación o autoridad. | Una pregunta o cambio pequeño está claro. |
| `prompt-refiner` | — | understanding | El prompt tiene objetivos compuestos o contradicciones que dificultan ejecución. | La solicitud directa ya es clara y corta. |
| `repo-explorer` | — | understanding | El contexto del repo es desconocido o hay que ubicar un comportamiento. | Una pregunta conceptual no depende del repo. |
| `planner` | — | direction | El trabajo tiene dependencias, varios módulos o verificación coordinada. | Una respuesta o edición simple de bajo riesgo basta. |
| `context-curator` | — | understanding | El repo o traspaso tiene contexto amplio que excede el trabajo actual. | La respuesta depende de un archivo pequeño conocido. |

## Decisiones de catálogo

`caio` queda como alias de `tech-lead`; `sec` y `security-audit` apuntan a skills distintas. `devops-ops` y `observability` no se agregan como roles genéricos: despliegue, operación y métricas se activan dentro de `implementer`, `performance-engineer` o `tech-lead` solo cuando el producto y la solicitud muestran un flujo propio. Esto evita crear subagentes sin activador ni contrato diferenciado.
