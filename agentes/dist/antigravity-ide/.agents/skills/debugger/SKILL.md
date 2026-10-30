---
name: debugger
description: Reproduce un fallo, prueba hipótesis y separa causa confirmada de sospecha. Activar ante comportamiento incorrecto o error reproducible.
---

# debugger

Reproduce un fallo, prueba hipótesis y separa causa confirmada de sospecha. Activar ante comportamiento incorrecto o error reproducible.

## Use when

- Existe un error, regresión, crash o comportamiento inesperado.
- Hace falta aislar un cambio o una ruta de ejecución.

## Do not use when

- La tarea es una nueva funcionalidad sin fallo diagnosticable.
- No hay evidencia disponible y el usuario pidió solo una explicación general.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Captura síntoma, entorno y resultado esperado sin secretos.
2. Busca la ruta mínima y el primer punto donde divergen expectativa y observación.
3. Formula hipótesis ordenadas por evidencia y coste de comprobación.
4. Reproduce con el menor caso seguro; cambia una variable por intento.
5. Si está autorizado, corrige causa raíz y añade una regresión; si no, entrega diagnóstico.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Síntoma, reproducción observada, causa confirmada o hipótesis, evidencia y próximo paso.

## Boundaries

- No conviertas correlación en causa raíz.
- No cambies datos reales ni reproduzcas efectos externos sin autorización.

## Examples

Positive: Existe un error, regresión, crash o comportamiento inesperado.

Negative: La tarea es una nueva funcionalidad sin fallo diagnosticable.

## Decision procedure

- Formula síntoma esperado/actual, entorno, frecuencia y paso mínimo antes de editar.
- Ordena hipótesis por evidencia y prueba una variable cada vez; busca la primera divergencia causal.
- Modifica solo tras reproducir causa suficiente y tener autorización; conserva regresión del mismo límite.

## Evidence to collect

- Aporta comando/paso, versión, datos sintéticos y salida segura que reproducen.
- Diferencia causa reproducida, altamente probable y no confirmada.
- Compara resultado antes/después y vuelve a ejecutar caso original más regresión.

## Stack-specific adaptation

- Web sigue console/network/state/API; mobile separa lifecycle, offline, permisos y versión OS; backend/DB reproduce con fixture efímero.
- No lee ni imprime valores de entorno/secretos; en logs conserva IDs sintéticos y contexto mínimo.

## Common failure modes

- No arregla síntomas por silenciamiento de errores ni cambia varias hipótesis a la vez.
- No afecta producción/servicios externos ni altera datos reales para reproducir.

## Role-specific quality gates

- Registrar reproducción y señal de fallo previa; proponer causa con evidencia; corregir y repetir el caso además de regresión.
- No cambiar múltiples hipótesis simultáneamente ni confundir que desaparezca el error con raíz resuelta.

## Exit criteria

Causa declarada confirmada solo si el repro falla antes, pasa después y la regresión conserva esa conducta.

## Delegation handoff

Síntoma, repro, hipótesis probada/descartada, evidencia, fix, regresión y aspectos aún inconclusos.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
