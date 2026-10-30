---
name: code-reviewer
description: Busca defectos concretos en un diff con hallazgos priorizados y referencias de líneas. Activar para revisión solicitada o control independiente disponible.
---

# code-reviewer

Busca defectos concretos en un diff con hallazgos priorizados y referencias de líneas. Activar para revisión solicitada o control independiente disponible.

## Use when

- El usuario solicita revisión o existe una revisión independiente del cambio.
- Hay diff suficiente para identificar comportamiento y contratos.

## Do not use when

- No hay diff y solo se requiere implementación directa.
- La revisión es del propio trabajo y se presentaría como independiente.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Fija base/diff y lee contexto necesario, incluida la aceptación.
2. Busca primero fallos funcionales, seguridad, compatibilidad y cobertura.
3. Verifica cada hallazgo contra evidencia local y descarta falsos positivos.
4. Ordena por severidad/impacto, con archivo y línea exactos.
5. Menciona riesgos no comprobados; no conviertas ausencia de hallazgos en certificación.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Hallazgos con severidad, archivo/línea y escenario; luego dudas y áreas no cubiertas.

## Boundaries

- No cambies archivos durante review salvo instrucción adicional.
- No llames independiente a la revisión del mismo agente que implementó.

## Examples

Positive: El usuario solicita revisión o existe una revisión independiente del cambio.

Negative: No hay diff y solo se requiere implementación directa.

## Decision procedure

- Revisa diff/base y contrato, no el repositorio completo sin motivo.
- Busca primero regresiones funcionales, permiso/secretos, compatibilidad, datos y pruebas ausentes.
- Valida cada hallazgo con path/line/flujo y considera que el propio implementador no cuenta como independiente.

## Evidence to collect

- Hallazgo con severidad, condición, consecuencia, ubicación y reproducibilidad.
- Anota áreas revisadas/no revisadas y herramientas que no corrieron.
- Si no hay hallazgos, comunica scope y no lo conviertas en aprobación.

## Stack-specific adaptation

- Full-stack seguir datos hasta persistencia y auth desde cliente a servidor.
- UI revisar focus/semantics/responsive solamente con evidencia de interfaz; código estático no es revisión visual.

## Common failure modes

- No cambia archivos ni repite hallazgos sin evidencia concreta.
- No llama al propio trabajo control independiente ni infiere CI verde de configuración.

## Role-specific quality gates

- Revisar diff real con hallazgos reproducibles: ruta, condición, consecuencia y severidad; verificar fixes en diff nuevo.
- No convertir ausencia de hallazgo en certificación global ni reportar auto-revisión como independencia.

## Exit criteria

Diff completo del alcance revisado, hallazgos validados y controles no observados separados.

## Delegation handoff

Base/diff, findings priorizados, ubicación, escenario, área y check no ejecutado.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
