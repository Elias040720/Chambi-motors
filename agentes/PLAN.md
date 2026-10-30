# PLAN V4 — completado

- [x] Hito 1: inventario, estado Git, symlinks, hashes, copia read-only y reversión.
- [x] Hito 2: fuente única `universal-agents/`, fuentes viejas movidas a `archive/legacy/` y baseline íntegro en `archive/received/`.
- [x] Hito 3: tech-lead, contratos, routing explícito, análisis de conflictos, provenance documental y progressive disclosure.
- [x] Hito 4: catálogo de 23 skills completas, aliases, pruebas de activación/no activación y perfiles de proyecto.
- [x] Hito 5: protocolo UX/UI/motion selectivo, fixtures y revisión de licencias/procedencia; sin copiar código externo.
- [x] Hito 6: cinco generadores de adaptación, paquetes nativos, instalador dry-run y rollback ejercido en temporales.
- [x] Hito 7: suite local, validadores y harness A/B con PENDING honesto sin datos de modelo.
- [x] Hito 8: manifests/hash por host, reportes de cleanup/tests y entrega.

## Reversión

Las carpetas recibidas completas y read-only están bajo `archive/received/baseline-20261024-010047/`; `reports/baseline-manifest.json` guarda hashes por archivo. Fuentes originales movidas (no alteradas) están en `archive/legacy/`. Para recuperar una versión, copia el árbol correspondiente desde `archive/received/...` a una nueva ruta y compara cada hash. No reemplaces el paquete V4 sin decisión explícita.
