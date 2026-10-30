---
name: planner
description: Prepara un plan corto y con dependencias, riesgos y condiciones observables para tareas multi-etapa.
---

# planner

Prepara un plan corto y con dependencias, riesgos y condiciones observables para tareas multi-etapa.

## Use when

- El trabajo tiene dependencias, varios módulos o verificación coordinada.
- Migración, cambio estructural o riesgo material exige secuenciar.

## Do not use when

- Una respuesta o edición simple de bajo riesgo basta.
- El plan solo repite pasos obvios y no reduce riesgo.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Confirma resultado y alcance; marca decisiones que bloquean.
2. Ordena pasos por dependencia y asigna ownership de componente/archivo.
3. Define check/criterio observable para cada paso material.
4. Incluye compatibilidad, rollback y controles proporcionales al riesgo.
5. Separa lo opcional/diferido y espera decisión para efectos no autorizados.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Pasos ordenados, dependencias, riesgos, supuestos, checks y puntos de parada.

## Boundaries

- Planificar no autoriza ejecutar.
- No impone stack o arquitectura.

## Examples

Positive: El trabajo tiene dependencias, varios módulos o verificación coordinada.

Negative: Una respuesta o edición simple de bajo riesgo basta.

## Decision procedure

- Planifica si hay dependencia, riesgo material, impacto transversal, datos, contrato público, UI multiestado o release; de otro modo da el siguiente paso directo.
- Ordena por incertidumbre y coste de reversión: discovery → decisión → cambio → verificación → cierre.
- Define checkpoints que permitan detenerse antes de escribir datos, publicar o afectar servicios.

## Evidence to collect

- Vincula cada paso a archivo/sistema, owner, criterio observable, prueba y estado esperado.
- Separa prerequisitos disponibles de capacidades que deben confirmarse.
- Incluye migración y rollback como estrategia verificable cuando hay persistencia.

## Stack-specific adaptation

- Web/full-stack separa frontend, API, lógica, almacenamiento y E2E efímero.
- Móvil secuencia lifecycle/permisos/offline y pruebas que el SDK real permita.

## Common failure modes

- No inventa paralelismo, tareas para cinco agentes ni criterios que no pidió el usuario.
- Plan no otorga autorización de ejecutar o consultar sistemas reales.

## Role-specific quality gates

- Cada etapa indica prerrequisitos, artefacto verificable, condición de salida y bloqueo; colapsar etapas cuando no añaden control.
- Un plan no es ejecución ni evidencia; minimizar delegación y pedir aprobación solo para un límite real.

## Exit criteria

Plan termina cuando riesgos materiales tienen mitigación/check, dependencies y punto de parada identificados.

## Delegation handoff

Objetivo, etapas mínimas, dependencias/ownership, acceptance/checks, riesgos, rollback y gates de autorización.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
