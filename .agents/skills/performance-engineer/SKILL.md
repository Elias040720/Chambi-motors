---
name: performance-engineer
description: Investiga y optimiza una hipótesis de rendimiento con medición comparable y criterio de regresión.
---

# performance-engineer

Investiga y optimiza una hipótesis de rendimiento con medición comparable y criterio de regresión.

## Use when

- Hay una métrica, presupuesto o síntoma de latencia/memoria/coste.
- Se solicita analizar un cuello de botella concreto.

## Do not use when

- Optimización especulativa sin síntoma ni objetivo.
- La mejora perjudica corrección, accesibilidad o mantenibilidad sin aprobación.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Define métrica, carga, entorno y línea base reproducible.
2. Localiza el cuello con perfilado/métricas disponibles y registra limitaciones.
3. Propón hipótesis medible y cambio acotado.
4. Compara antes/después con igual carga, repeticiones suficientes y dispersión.
5. Reporta mejora solo si la medición la respalda; conserva baseline.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Métrica y método, baseline, hipótesis, resultados comparables y límites de validez.

## Boundaries

- No inventes benchmarks ni afirmes porcentajes sin medición.
- No cambies carga o entorno entre comparaciones sin declararlo.

## Examples

Positive: Hay una métrica, presupuesto o síntoma de latencia/memoria/coste.

Negative: Optimización especulativa sin síntoma ni objetivo.

## Decision procedure

- Fija síntoma, métrica objetivo, población/carga y entorno comparable antes de optimizar.
- Perfila hotspot con tooling ya disponible y distingue CPU, memoria, red, DB, render y costo del modelo.
- Cambia una causa prioritaria y valida calidad/corrección junto con latencia/recursos.

## Evidence to collect

- Conserva baseline/repeticiones, percentiles o dispersión y versión de build/config.
- Mide web vitals/render/network, API latency, query plan o consumo móvil solo cuando aplica.
- Declara falta de muestras/herramienta como PENDING/NOT RUN.

## Stack-specific adaptation

- Evita benchmarks sintéticos no representativos para PHP/Node/Python/Java/.NET; calienta/cachea de forma igual.
- En móvil separa startup, frame jank, red, batería y memoria si hay profiler disponible.

## Common failure modes

- No reporta mejora por intuición ni usa mediciones antes/después de cargas distintas.
- No sacrifica accesibilidad, consistencia o seguridad por micro-optimización no requerida.

## Role-specific quality gates

- Establecer baseline reproducible de la métrica y entorno antes de optimizar; medir comparación tras el cambio.
- No afirmar velocidad/coste mejorados a partir de inspección estática o benchmark no comparable.

## Exit criteria

Resultado repetible mejora criterio objetivo sin regresión funcional demostrada, o la hipótesis queda falsada.

## Delegation handoff

Métrica, entorno/carga, baseline, cambio, medidas observadas/rango y límites de validez.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
