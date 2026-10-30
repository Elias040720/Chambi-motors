# Arquitectura de distribución V4

## Una fuente, adaptadores explícitos

1. `universal-agents/core/` define política, contratos, routing y catálogo.
2. `universal-agents/skills/` mantiene instrucciones portables y sus referencias.
3. `universal-agents/adapters/<host>/` contiene reglas específicas y el mapeo de rutas/formatos.
4. `tooling/build/generate_dist.py` ensambla árboles en `dist/<host>/` con los archivos que descubre cada host y una copia local de `core/` donde las referencias relativas la necesitan.
5. `tooling/install/installer.py` calcula diff y hashes, y aplica solo con `--apply`; no se ejecuta durante la generación.

Skills son instrucciones cargables por demanda. Un subagente nativo tiene contexto/proceso separado dentro del host, pero hereda la autoridad de sesión y depende de que ese host lo descubra. Las reglas se cargan por mecanismo del host; no son scripts de enforcement. MCP conecta herramientas externas; V4 no configura MCP. Un script determinista solo acredita sus propios checks.

## Orquestación

`tech-lead` define INTAKE → DISCOVER → ASSESS → ROUTE → PLAN → EXECUTE → VERIFY → REPORT. La ruta puede ser directa. El nivel de dificultad procede de dominio/impacto/etapas/contexto/controles con referencias, incertidumbre y riesgo; nunca del número de archivos solamente.

Roles se cargan solo con activador positivo. Las tareas sin dependencia o propiedad independiente no se paralelizan. Delegaciones contienen misión, contexto mínimo, límites, criterio de éxito y handoff. Reintentar requiere nueva evidencia o progreso; tras dos intentos sin cambio de hipótesis, diagnosticar/escalar.

## Fuentes de verdad

- Permisos efectivos: host/sesión. El JSON de un modelo no los concede.
- Intención: petición original y jerarquía de instrucciones aplicable.
- Disponibilidad de skills: contenido generado; descubrimiento real requiere smoke test por host.
- Estado de checks: salida observada, código de salida y artefacto redactado, no un claim del modelo.
- Contexto: proyecto consumidor; no adoptar preferencias de stack del paquete.
