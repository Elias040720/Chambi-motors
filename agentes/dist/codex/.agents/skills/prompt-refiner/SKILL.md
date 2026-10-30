---
name: prompt-refiner
description: Reestructura prompts complejos con fidelidad semántica verificable, manteniendo texto original y límites de autorización.
---

# prompt-refiner

Reestructura prompts complejos con fidelidad semántica verificable, manteniendo texto original y límites de autorización.

## Use when

- El prompt tiene objetivos compuestos o contradicciones que dificultan ejecución.
- Se solicita estructurar o hacer más claro un encargo.

## Do not use when

- La solicitud directa ya es clara y corta.
- La reescritura sustituiría un requerimiento o reduciría una restricción.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Retén el texto fuente completo junto al refinado.
2. Extrae meta, contexto, alcance, restricciones/negaciones, criterios y verificaciones.
3. Detecta conflicto entre intención y instrucciones sin resolverlo por cuenta propia.
4. Reescribe sin agregar funciones, stack, permisos o resultados inferidos.
5. Lista cada inferencia y cualquier ambigüedad que siga pendiente.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Original, refinado breve, cambios de estructura e inferencias/conflictos explícitos.

## Boundaries

- No elimina negaciones, prioridades ni permisos.
- No cambia 'analiza' a 'edita', ni inventa acceptance criteria.

## Examples

Positive: El prompt tiene objetivos compuestos o contradicciones que dificultan ejecución.

Negative: La solicitud directa ya es clara y corta.

## Decision procedure

- Si el pedido es simple y claro, respóndelo directamente sin reescritura.
- Para encargo compuesto, agrupa por objetivo, contexto, entregables, restricciones, aceptación y verificación sin cambiar su prioridad.
- Compara original/refinado por intención, scope, permisos, negaciones, criterios y riesgo; cualquier diferencia material queda explícita.

## Evidence to collect

- Conserva original palabra por palabra y produce versión derivada aparte.
- Anota qué se reordenó y qué inferencias se hicieron, con ubicación en el texto fuente.
- Declara ambigüedad irresuelta en vez de redactar una instrucción silenciosa.

## Stack-specific adaptation

- Mantén nombres de plataformas, versiones y términos técnicos literales; marca datos cambiantes para verificación primaria.
- No conviertas ejemplos de stack en requisito general.

## Common failure modes

- No agregues herramientas, presupuesto, permisos, pruebas, tareas ni resultado garantizado.
- No comprimas eliminando negaciones, condicionantes o criterios de excepción.

## Role-specific quality gates

- Adjuntar mapa de cobertura que relacione cada restricción y negación del original con la versión refinada.
- No añadir permisos, objetivos, datos sensibles, herramientas ni tareas a la solicitud refinada.

## Exit criteria

Refinado solo listo si una comparación campo por campo muestra equivalencia, o las diferencias están claramente aprobadas por el usuario.

## Delegation handoff

Original intacto, refinado opcional, tabla de cambios semánticos/inferencias y preguntas abiertas.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
