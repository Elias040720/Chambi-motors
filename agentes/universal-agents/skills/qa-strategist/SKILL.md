---
name: qa-strategist
description: Convierte riesgos y aceptación en una estrategia de pruebas proporcionada; distingue pruebas necesarias de pruebas ejecutadas.
---

# qa-strategist

Convierte riesgos y aceptación en una estrategia de pruebas proporcionada; distingue pruebas necesarias de pruebas ejecutadas.

## Use when

- La tarea tiene varios riesgos, interfaces o criterios de aceptación.
- Hace falta decidir cobertura antes de implementar.

## Do not use when

- Typo o respuesta simple con verificación obvia.
- No hay requisito de cambio y solo se pide review.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Extrae criterios de aceptación y riesgos desde el brief y el repo.
2. Asocia cada criterio a la capa de prueba más barata que lo demuestre.
3. Incluye límites, negativos, regresión y matriz de entornos si aplica.
4. Marca herramientas ausentes y evidencia que debería producir cada check.
5. Entrega una matriz; no ejecutes pruebas por el mero hecho de diseñarlas.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Tabla criterio→riesgo→prueba→evidencia esperada→estado, con gaps explícitos.

## Boundaries

- Estrategia QA no equivale a prueba ejecutada.
- No exijas cobertura porcentual arbitraria.

## Examples

Positive: La tarea tiene varios riesgos, interfaces o criterios de aceptación.

Negative: Typo o respuesta simple con verificación obvia.

## Decision procedure

- Mapea criterios a riesgos, usuarios/actores y capa más barata que demuestra comportamiento.
- Selecciona unit/integration/contract/E2E/security/perf/a11y/exploratory según fallo probable, no checklist fijo.
- Separa diseñada, automatizada, ejecutada por agente y validación humana manual.

## Evidence to collect

- Matriz criterio→caso positivo/negativo/límite→capa→dato sintético→evidencia requerida→estado.
- Web añade viewport, keyboard, load/empty/error/success y network; full-stack atraviesa frontend→API→domain→DB efímera.
- Móvil cubre navegación, lifecycle, permisos, offline/retry, persistencia y plataforma cuando el requisito los alcanza.

## Stack-specific adaptation

- Reusa framework, runner, browser/emulator y setup existentes; plan alternativo si faltan.
- Contratos dependen del stack; no exige cobertura porcentual ni E2E para un typo.

## Common failure modes

- Plan de test no se reporta como ejecución.
- Automatización exitosa no prueba ausencia de defectos ni sustituye juicio humano de marca/usabilidad.

## Role-specific quality gates

- Por criterio escoger evidencia proporcionada: contrato positivo/negativo, regresión, privacidad, accesibilidad y plataforma aplicable.
- Clasificar tests como diseñados, ejecutados, fallidos, omitidos o bloqueados; no aprobar por cobertura nominal.

## Exit criteria

Cada aceptación material tiene una demostración prevista y un estado honesto con gap/owner.

## Delegation handoff

Scope/matriz de riesgo, capas, comandos/pasos previstos, datos, setup, evidencia y gaps humanos/tooling.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
