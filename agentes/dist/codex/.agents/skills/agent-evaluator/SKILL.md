---
name: agent-evaluator
description: Evalúa activación, comportamiento y coste de skills/agentes con fixtures versionados y métricas honestas.
---

# agent-evaluator

Evalúa activación, comportamiento y coste de skills/agentes con fixtures versionados y métricas honestas.

## Use when

- Se compara una versión del sistema o descripciones de skills.
- Hay tareas y modelos comparables con acceso legítimo a resultados/métricas.

## Do not use when

- Solo keywords o fixtures sin modelo se presentan como calidad real.
- No hay entorno/modelo comparable ni autorización de llamadas.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. Alias público: `eval-harness`.

## Workflow

1. Define hipótesis, baseline, tareas positivas/negativas y métricas.
2. Aísla modelo, prompt, repo, permisos y herramientas para A/B.
3. Registra activación, calidad, errores, coste y latencia observados; redacta datos sensibles.
4. Analiza falsos positivos/negativos y variabilidad.
5. Si solo se corre harness estático, etiqueta resultado FIXTURE/NOT MODEL EVAL.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Protocolo, muestras, métricas observadas, limitaciones y decisión pendiente.

## Boundaries

- No infiere activación real por solapamiento de palabras.
- No inventa tokens, latencia, calidad ni tasas de éxito.

## Examples

Positive: Se compara una versión del sistema o descripciones de skills.

Negative: Solo keywords o fixtures sin modelo se presentan como calidad real.

## Decision procedure

- Congela tareas, rubric, modelo/version/tooling, permisos, seeds y datasets antes de comparar.
- Separa contenido estático de behavior real; ciego/multiple repeats cuando sea feasible.
- Calcula solo métricas con telemetría: pass/rubric, failure, tool calls, latency, input/output tokens and cost.

## Evidence to collect

- Publica filas de corrida con source/model/setup IDs, score por rubric, fallos y missing measures.
- Resume n, mediana, rango/variabilidad por tarea y diferencia paired cuando same cases.
- Redacta prompts/outputs sensibles; no guarda raw secrets en trace.

## Stack-specific adaptation

- Evalua host behavior por separado: skill discovery/execution, subagent discovery/delegation, tools and global install.
- UI/mobile requieren browser/emulator evidence más código; harness estático no simula estas pruebas.

## Common failure modes

- No afirma ahorro/calidad por prompt size o un ejemplo aislado.
- No mezcla modelos/herramientas/versiones distintas sin estratificar ni usa tests de existencia como behavior.

## Role-specific quality gates

- Usar dataset versionado, mismas tareas/condiciones, baseline y rúbrica con evaluación ciega cuando sea posible.
- Comparar solo métricas medidas por ambos brazos; publicar cantidad, coste observado, variación y límites.

## Exit criteria

Reporte reproducible con muestras reales o PENDING si no hubo ejecución/telemetría.

## Delegation handoff

Dataset revision, run configuration, rubric, rows/summary, missing telemetry, cost and limitations.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
