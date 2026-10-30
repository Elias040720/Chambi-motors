# Política de selección

El routing recomienda capacidades a partir de una solicitud ya interpretada; no es una clasificación semántica automática ni una orden de ejecutar herramientas.

1. Usa señales declaradas con referencias: dominio/impacto enlazan evidencia del repositorio; etapas/controles enlazan la frase o criterio que los solicita; contexto conocido enlaza rutas que el host aún debe comprobar. La salida marca estas señales como no verificadas. El tamaño de `scope` nunca sustituye complejidad o dominio. Si el usuario pidió solo lectura, no selecciones implementación.
2. Para una respuesta o cambio pequeño y claro, resuelve directamente. No crees un plan ni delegues por rutina.
3. Si el repo es desconocido o hay que localizar convenciones, usa `repo-explorer` con alcance de solo lectura.
4. Usa `request-analyst` solo cuando la ambigüedad afecta aceptación, alcance o permisos. Usa `prompt-refiner` para estructurar una solicitud larga/compuesta sin llamada independiente por defecto.
5. Usa `planner` para tareas de plan/implementación/release con al menos dos etapas declaradas o impacto explícito cross-component, contrato público, migración, seguridad o efecto externo. Para riesgo alto/crítico, informa los controles faltantes y detente antes de efectos externos o irreversibles no autorizados.
6. `context-curator` entra en tareas largas, contexto amplio o traspasos; conserva restricciones, fallos y evidencia.
7. La fase indica qué capacidades están implementadas aquí. Si el registro las marca como planificadas, el router no las presenta como agentes disponibles: el líder puede realizarlas si está dentro de sus medios o reportar el límite.
8. Skills son procedimientos cargables; agentes nativos son procesos con contexto/permisos propios; scripts son controles deterministas. No sustituyas uno por otro en el reporte.
9. Finaliza con estado y evidencia. `completed` no equivale a todos los checks aprobados; refleja la tarea. Cada check lleva su estado propio. El script `tools/verify_evidence.py` valida consistencia del registro, no la ejecución subyacente.
10. La salida del router separa `direct_action`, `available_capabilities`, `deferred_capabilities` y `verification_pending`. Un review directo del agente principal nunca cuenta como revisión independiente.
11. Los permisos efectivos pertenecen al host. El límite declarado en JSON solo puede estrechar la recomendación o bloquearla; nunca autoriza escribir, ejecutar o superar controles del host. Una herramienta marcada como esencial y ausente bloquea la ruta recomendada.

## Criterio de delegación

Delegar solo si hay una tarea independiente y acotada, aislamiento útil o paralelismo real. En caso contrario, ejecutar en el agente principal. Nunca dividir escrituras concurrentes sobre los mismos archivos.

## Perfiles adaptativos

| Perfil | Ruta mínima | Límite de salida |
|---|---|---|
| Consulta | Respuesta directa; sin subagente | Respuesta fundamentada en el contexto disponible |
| Cambio pequeño | Inspección puntual → cambio autorizado → comprobación focalizada | Diff acotado y resultado de la comprobación |
| Funcionalidad | Exploración si hace falta → plan corto → implementación → pruebas/revisión según riesgo | Criterios cumplidos, checks y regresiones relevantes |
| Refactor estructural | Exploración → arquitectura/impacto → plan y rollback → implementación → verificación independiente | Trade-offs, compatibilidad, reversión y evidencia |
| Seguridad o datos | Explorar → threat/risk review y plan → autoridad antes de efectos sensibles → pruebas/revisión | Evidencia, límites y decisiones pendientes; no prometer seguridad total |
| Diseño UI | Sistema visual existente → requisitos de producto → dirección → implementación → revisión UX/a11y; motion solo si sirve | Estados, responsive, accesibilidad y evidencia visual si el host la permite |
| Depuración | Síntoma observado → reproducción mínima → hipótesis medible → causa probada → fix autorizado → regresión | Separar causa confirmada de sospecha |
| Investigación técnica | Pregunta concreta → fuentes primarias/contexto repo → evidencia/versiones → respuesta con incertidumbre | No investigar de forma amplia si no cambia la decisión |
| Full-stack | Contrato UI/API → lógica → DB efímera → prueba de extremo a extremo → permisos/estados | No sustituir integración con mocks cuando aceptación exige persistencia |
| Móvil | Plataforma y lifecycle → navegación/permisos/offline/storage condicional → UI y pruebas de runtime disponibles | Distinguir viewport web móvil de app nativa; iOS requiere entorno autorizado compatible |
| Release | Cambio/versiones → compatibilidad → pruebas/artefactos → notas/migración/rollback → gates | Preparar no equivale a publicar |

La salida `execution_profile` resume una estrategia y nunca elige un equipo fijo. `parallelism` es solo oportunidad condicionada a trabajo independiente y ownership exclusivo; siempre se emite fallback al agente principal. Reintentos sin evidencia nueva se limitan a cero.

Los roles que aún no están implementados se informan como capacidad diferida. La falta de navegador, grafo, runner de tests u otra herramienta se registra como límite explícito y no como resultado satisfactorio. `sec` activa el security-check liviano; `security-audit` activa la auditoría profunda explícita. Coste y activación están en `docs/security-capabilities.md`.

## Conflicto entre instrucciones

Respetar jerarquía de instrucciones y permisos primero; luego solicitud explícita; luego reglas del repo y convenciones detectadas; luego preferencias de skills. Si persiste conflicto material, exponerlo, preservar lo existente y pedir decisión para la parte dependiente.
