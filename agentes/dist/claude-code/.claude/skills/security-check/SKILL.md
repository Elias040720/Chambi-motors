---
name: security-check
description: Realiza una revisión ligera y contextual de cambios sensibles: límites, autorización, validación, secretos y controles adyacentes.
---

# security-check

Realiza una revisión ligera y contextual de cambios sensibles: límites, autorización, validación, secretos y controles adyacentes.

## Use when

- El diff toca autenticación, datos sensibles, entradas externas o autorización.
- Se pide sec-check breve o el riesgo del cambio lo requiere.

## Do not use when

- Cambio cosmético sin superficie sensible.
- El usuario solicita auditoría profunda, pentest o cobertura adversarial amplia.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. Alias público: `sec`.

## Workflow

1. Identifica superficie modificada, actor, activo y límite de confianza.
2. Comprueba autorización, validación, exposición de secretos y efecto lateral en el diff.
3. Busca controles vecinos solo lo necesario para el riesgo identificado.
4. Separa hallazgos confirmados de preguntas/needs-validation.
5. Entrega scope y checks omitidos, sin emitir aprobación.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Alcance, hallazgos priorizados, evidencia local, no cubierto y próximos checks.

## Boundaries

- No es auditoría profunda ni garantía de seguridad.
- No ejecutes escáneres ni acciones ofensivas sin autorización expresa.

## Examples

Positive: El diff toca autenticación, datos sensibles, entradas externas o autorización.

Negative: Cambio cosmético sin superficie sensible.

## Decision procedure

- Limita revisión ligera a superficie cambiada, actor, activo y frontera de confianza.
- Comprueba permiso/authz, validación/encoding, manejo de secreto y efectos laterales directamente conectados.
- Escala a security-auditor si alcance pide modelo de amenazas/adversarial o cruza varias fronteras críticas.

## Evidence to collect

- Vincula candidato a línea/flujo y control existente, separando confirmado de requiere validación.
- Incluye seguridad positiva/negativa pertinente con datos no reales.
- Nombra superficie y clases no examinadas; ninguna conclusión de 'seguro'.

## Stack-specific adaptation

- Backend/API: authz en servidor, input/output, errores; DB: parámetros e integridad; web: DOM, CSRF y almacenamiento según stack.
- Móvil: intents/deep links, permisos, storage/logging/offline solo cuando la app los usa.

## Common failure modes

- No es pentest ni análisis de dependencia integral; no corre herramientas externas sin autorización.
- No filtra secretos/logs ni recomienda ampliar permisos para facilitar QA.

## Role-specific quality gates

- Ejecutar chequeos livianos declarados y permitidos, indicando rutas/controles concretos y omisiones.
- No es un threat model profundo ni una auditoría exhaustiva; escalar por riesgo/inyección/secretos/acceso.

## Exit criteria

Revisión ligera deja evidencia, riesgo residual y escalación si clase queda fuera del límite.

## Delegation handoff

Scope del diff, actor/asset, hallazgos y evidencia, mitigación y exclusiones.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
