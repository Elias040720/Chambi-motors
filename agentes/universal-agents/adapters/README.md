# Adaptadores nativos

`tooling/build/generate_dist.py` transforma `roles/catalog.json`, `skills/`, `core/` y estos contratos de formato en paquetes bajo `dist/`. El skill es el mecanismo común; los seis subagentes empaquetados solo exponen los flujos donde el formato nativo tiene valor. Los agentes de revisión declaran restricciones del host disponibles, no una garantía de aislamiento independiente.

No hay hooks ni MCP configurados. Las rutas de perfil global son destino documentado para una instalación posterior y nunca se escriben desde el proceso de build.
