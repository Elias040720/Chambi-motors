# Matriz de consolidación V4

## Fuentes

| Fuente inicial | Hallazgo | Destino V4 | Disposición |
|---|---|---|---|
| `agentes/` (46 archivos) | Copia byte-identical de `release_v2/release_v2/` verificada por hashes | `universal-agents/` como fuente única | Mover a `archive/legacy/template-agentes/`; baseline read-only también conservado |
| `release_v2/release_v2/` (49 archivos) | Plantilla con hooks avisadores, MCP GitNexus con versión flotante, scripts de sincronización y bundle de security-audit sin cadena verificable de procedencia en los archivos recibidos | Roles y políticas reescritos en `universal-agents/` | Mover como datos a `archive/legacy/release_v2/`; nada ejecutado ni copiado literal |
| `release_v3_1/` (29 archivos, cuatro cachés) | Fuente de routing, contracts, seis skills, docs y tests; 31 casos de routing | Se amplía a 23 skills y contratos nuevos | Mover a `archive/legacy/release_v3_1/`; baseline read-only conserva byte original incluidas cachés |
| Alias `caio` | Coordinación equivalente al líder | `tech-lead` | Alias legado exacto, sin permisos adicionales |
| `sec` / `security-audit` | V2 usaba “sec” para un alcance más profundo y mezclaba activadores | `security-check` / `security-auditor` | Mantener aliases exactos y separar por coste y activación explícita |
| Archify / bridge | Motor no presente; bridge no verificaba ni generaba resultado confiable | Sin integración activa | Documentar descarte; no instalar ni simular éxito |
| GitNexus | Instrucción remota flotante y binario/índice ausentes | Sin integración activa | Documentar como opcional no incluido; fallback es exploración focalizada local |
| V2 Cloudflare-attributed security bundle | No se pudo validar fuente, commit, LICENSE/NOTICE en material local | Auditoría propia concisa por rol | No redistribuir ni atribuir contenido de procedencia no probada |

## Cambios en selección y verificación

| Antes | Después |
|---|---|
| `len(scope)` aproximaba complejidad y disparaba especialistas | Dominio/impacto/etapas/contexto/controles explícitos, cada señal con referencias de evidencia; cantidad de paths no decide especialistas |
| Revisar podía insinuar otro reviewer | `code-reviewer` es una capacidad seleccionable; revisión independiente permanece pendiente si no se observó un proceso separado |
| Validador documental podía parecer PASS/aprobación | Registro documental se etiqueta `valid/invalid`; ejecución `unverified`; no hay campo ni resultado `approval` |
| Evidencia de comandos/cadenas podía usarse como ejecución | Shape de provenance no autentica runner, firma, tiempo ni ejecución; evidencia vacía/fabricada no demuestra PASS |
| JSON de tarea podía aparentar permisos del agente | Permisos efectivos identificados como propiedad del host; conflicto bloquea recomendación; payload no incrementa permisos |
| Alias `sec` solapaba auditoría profunda | Security-check ligera de bajo/medio coste frente a security-audit explícita de coste alto |
| Referencias relativas válidas solo en canónico | `core/` y `skills/` quedan como hermanos en cada paquete; tests revisan los cinco `dist/` y los mapeos globales |
| Estilo genérico de UI/framework podía imponerse | Precedencia: intención/a11y, sistema existente, producto/usuarios, dirección visual, implementación y motion selectivo |
