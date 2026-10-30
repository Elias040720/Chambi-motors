# Guía de prompts y continuidad

## Brief compacto

Objetivo; contexto relevante; alcance; restricciones/permisos; aceptación; verificación; incertidumbres. Conserva petición original como fuente y marca inferencias.

## Ejemplos

- Codex: `$tech-lead Analiza por qué falla el filtro. Solo lectura; informa evidencia y causas probables.`
- Antigravity IDE o CLI: `/tech-lead Corrige el bug en el stack actual; respeta cambios locales y ejecuta las pruebas focalizadas disponibles.`
- Claude Code: `/tech-lead Implementa el formulario de perfil en los componentes existentes y cubre loading, error, éxito y teclado.`
- OpenCode: carga la skill con la herramienta `skill` y `tech-lead`; `@tech-lead` invoca el agente nativo distribuido, no un alias universal de skill.

## Progressive disclosure

El archivo breve de host solo declara límites esenciales. `SKILL.md` contiene activadores y pasos breves. Detalles extensos se cargan desde `references/` a demanda. Inspecciona símbolos y archivos pertinentes, no concatena todo el repo. El brief/continuidad guarda solo decisiones, restricciones, evidencia, siguiente paso y referencias; nunca sustituye solicitud original ni almacena secretos.

## Delegación

```
MISSION: resultado concreto
CONTEXT: hechos observados y rutas
INPUT: artefactos mínimos
LIMITS: permisos, ownership, prohibiciones
SUCCESS: criterios observables y checks
HANDOFF: cambios, evidencia, fallos, riesgos, pendientes
```

Dos intentos sin evidencia nueva/progreso requieren cambiar hipótesis o escalar. Tareas no independientes se quedan en agente principal.
