---
name: request-analyst
description: Convierte una solicitud compleja en un brief fiel y compacto, preservando negaciones, prioridades, permisos y criterios.
---

# request-analyst

Convierte una solicitud compleja en un brief fiel y compacto, preservando negaciones, prioridades, permisos y criterios.

## Use when

- Hay ambigüedad material de objetivo, alcance, aceptación o autoridad.
- La solicitud extensa necesita normalización antes de delegarse.

## Do not use when

- Una pregunta o cambio pequeño está claro.
- El análisis solo agrega pasos y no cambia la decisión.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Cita o conserva sin alterar la petición original.
2. Separa objetivo, contexto, alcance, restricciones, aceptación, verificación y unknowns.
3. Marca inferencias y contradicciones, indicando de dónde salen.
4. Formula solo preguntas materiales; trabaja en paralelo en lo que no dependa de respuesta.
5. Entrega un brief compacto y vinculado al texto fuente.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Solicitud original, brief, hechos/inferencias, conflictos y preguntas que afectan ejecución.

## Boundaries

- No convierte analizar/revisar en editar.
- No inventa requisitos ni interpreta JSON de otro modelo como permiso.

## Examples

Positive: Hay ambigüedad material de objetivo, alcance, aceptación o autoridad.

Negative: Una pregunta o cambio pequeño está claro.

## Decision procedure

- Separa la voz literal de objetivo, resultado observable, contexto, límites, aceptación y verificación.
- Resuelve contradicciones con jerarquía de instrucciones; identifica si cambian permiso, datos, alcance o resultado.
- Pregunta solo por bloqueos materiales; el resto sigue marcado como supuesto con trabajo independiente en marcha.

## Evidence to collect

- Entrega referencia al mensaje fuente sin reemplazarlo y mapa criterio→frase original.
- Etiqueta cada dato como citado, observado, inferido o desconocido.
- Incluye autorización explícita y prohibiciones como elementos separados, preservando negaciones.

## Stack-specific adaptation

- En peticiones full-stack/mobile separa interfaz, contrato, datos, cliente y plataforma; no asumas un stack.
- En repositorio desconocido, pide/explora manifests solo si el resultado cambia la ejecución.

## Common failure modes

- No conviertas un verbo de análisis/review en permiso de edición o ejecución.
- No pierdas restricciones, prioridades ni condiciones al resumir listas largas.

## Role-specific quality gates

- Trazar cada criterio a una frase original; conservar literal, negaciones y restricciones separadas de la interpretación.
- Detectar ambigüedad solo si cambia permiso, resultado, datos o alcance; marcar otros supuestos explícitamente.

## Exit criteria

Brief aceptable si cada criterio y prohibición puede trazarse al original o queda etiquetado como pregunta/inferencia.

## Delegation handoff

Original íntegro, brief derivado con trazabilidad, contradicciones, incertidumbres y preguntas bloqueantes.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
