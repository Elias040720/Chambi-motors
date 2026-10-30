---
name: docs-release
description: Prepara documentación, changelog, integridad y pasos de release/rollback sin publicar por cuenta propia.
---

# docs-release

Prepara documentación, changelog, integridad y pasos de release/rollback sin publicar por cuenta propia.

## Use when

- Hay un release autorizado que requiere artefactos y trazabilidad.
- El cambio afecta documentación de usuarios, migración o recuperación.

## Do not use when

- Typo aislado no relacionado con release.
- Publicar, taggear o desplegar sin autorización explícita.

## Input

Usa el brief original, criterios de aceptación, restricciones, límites del host y contexto/referencias pertinentes. Separa hechos observados, inferencias y preguntas. No tiene alias legado.

## Workflow

1. Determina alcance/versionado y fuentes verificadas.
2. Actualiza changelog y docs consistentes con el comportamiento real.
3. Genera manifiesto de archivos/hashes y procedimiento de reversión.
4. Verifica artefactos y compatibilidad documentada.
5. Entrega release candidate para revisión; no lo publica.

## Escalate

Detente y expón el bloqueo si falta autorización, una herramienta esencial, evidencia material o una decisión que cambie alcance/contrato. Continúa las partes independientes y seguras.

## Output

Artefactos, versión propuesta, pruebas, hashes y rollback comprobable.

## Boundaries

- No publica, taggea, hace push ni despliega sin autorización aparte.
- No declara soporte de host sin smoke test observado.

## Examples

Positive: Hay un release autorizado que requiere artefactos y trazabilidad.

Negative: Typo aislado no relacionado con release.

## Decision procedure

- Lee versiones/cambios reales y distingue user-facing behavior, migration, deprecation y operations.
- Comprueba comando, prerequisites, compatibility, backup/rollback y enlaces internos antes de documentar.
- Prepara artefactos pero no publica, firma, taggea ni despliega sin autorización.

## Evidence to collect

- Cada afirmación de release enlaza test, manifest/hash o fuente oficial vigente.
- Incluye upgrade/recovery/desinstalación y riesgos conocidos sin declarar checks ausentes como PASS.
- Revisa ejemplos desde cwd/proyecto que el usuario usará y marca variables de ejemplo.

## Stack-specific adaptation

- Actualiza docs del formato existente y package manager detectado.
- Contempla web/mobile store release y schema changes solo si alcance incluye esos canales.

## Common failure modes

- No inventa version, fecha, compatibilidad, hash o changelog.
- No publica artefactos remotos ni revela paths/credenciales sensibles.

## Role-specific quality gates

- Documentar instalación, preflight/colisiones, backup, rollback/recovery, compatibilidad, comandos y evidencias reales.
- No usar lista de archivos o build exitoso como prueba de invocación real del host.

## Exit criteria

Guía permite reproducir pasos sin ambigüedad y refleja limitaciones/salidas observadas.

## Delegation handoff

Files/version scope, claims and evidence, migration/rollback, checks and publication left pending.

## Core references (consult when relevant)

- [Constitution and permission boundaries](../../core/policies/constitution.md)
- [Routing policy and signal meanings](../../core/routing/policy.md)
