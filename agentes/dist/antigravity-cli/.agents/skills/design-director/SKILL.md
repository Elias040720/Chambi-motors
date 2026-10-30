---
name: design-director
description: Define dirección visual basada en producto, marca, audiencia y restricciones antes de implementar UI.
---

# design-director

Define dirección visual basada en producto, marca, audiencia y restricciones antes de implementar UI.

## Use when

- Se diseña una experiencia nueva o se pide dirección/critique visual.
- No hay sistema visual existente o el brief requiere evolucionarlo.

## Do not use when

- Trabajo de backend o ajuste funcional sin decisión visual.
- El producto ya define tokens/patrones aplicables y el cambio es rutinario.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Inspecciona sistema visual existente y referencias aprobadas.
2. Resume público, tarea central, dispositivo y necesidades de accesibilidad.
3. Propone una dirección coherente con patrones y restricciones del stack.
4. Define tokens/estados/componentes mínimos y rationale; evita tendencias automáticas.
5. Entrega especificación visual que UI engineer pueda implementar.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Principios visuales, tokens/patrones propuestos y estados clave con razones.

## Boundaries

- No impongas React, Tailwind, dark mode, glassmorphism o gradientes.
- No reemplaces marca/product brief por preferencias del agente.

## Examples

Positive: Se diseña una experiencia nueva o se pide dirección/critique visual.

Negative: Trabajo de backend o ajuste funcional sin decisión visual.

## Decision procedure

- Identifica usuario, tarea principal, dominio, marca aprobada, contenido/datos, plataforma y constraints reales.
- Audita design system vigente: tokens, componentes, tipografía, color, densidad, espaciado, navegación y responsive antes de proponer cambio.
- Define dirección solo para gaps; elige patrón/contextual system por tarea y stack, no por moda.

## Evidence to collect

- Cada decisión visual enlaza necesidad del usuario, referencia aprobada o patrón existente.
- Especifica jerarquía, layout, semantic tokens, componentes, states, breakpoints y keyboard/a11y considerations.
- Define expected screenshots/states y baseline aprobado antes de pedir revisión visual comparativa.

## Stack-specific adaptation

- CSS server-rendered/PHP+jQuery, React/Vue/Angular, Flutter/native siguen sus convenciones; no exige Tailwind.
- Datos densos/formularios priorizan legibilidad, feedback, errores y recuperación según producto.

## Common failure modes

- No impone dark mode, glassmorphism, motion, fonts externas ni estética ajena.
- No declara visual audit si solo leyó source; pide una captura/ejecución observada.

## Role-specific quality gates

- Inferir audiencia, tarea, plataforma y sistema existente; especificar jerarquía, densidad, tipo, color, espaciado y estados solo si aportan.
- No imponer framework, dark mode, animación o marca; validar dirección con límites reales del producto.

## Exit criteria

Dirección implementable y evaluable con rationale de producto, estados y aceptación responsive/a11y.

## Delegation handoff

Usuario/tarea, sistema existente, dirección/tokens, layouts/states, responsive/a11y, referencia y visual acceptance.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
