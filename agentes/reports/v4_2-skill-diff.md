# Cambios y hashes de skills V4.2

## Auditoría de los 23 roles

Todas las 23 skills canónicas se revisaron por activador positivo/negativo, proceso, evidencia, límites, calidad de salida y subdelegación. La inspección inicial comparó V4.1 y V4.2 antes de mejorar gates y encontró que los archivos generados eran byte por byte idénticos: no se presentó ese estado como mejora. Luego se añadieron dos `quality_gates` role-specific para cada una de 23 entradas en `roles/operations.json`, el generador los materializa como `## Role-specific quality gates`, y las pruebas exigen esa sección.

IDs cubiertos: `architect`, `implementer`, `debugger`, `api-engineer`, `db-engineer`, `performance-engineer`, `qa-strategist`, `test-engineer`, `code-reviewer`, `security-check`, `security-auditor`, `design-director`, `ui-engineer`, `ux-reviewer`, `motion-reviewer`, `docs-release`, `agent-evaluator`, `tech-lead`, `request-analyst`, `prompt-refiner`, `repo-explorer`, `planner`, `context-curator`.

Áreas específicas: preserve original/negations; prueba-before-fix y regression; routing API/DB por dominio, no conteo de archivos; contratos, migraciones/rollback; casos negativos, privacidad, accesibilidad y evidencia; observación visual separada de revisión estática; reduced motion; esquema A/B pareado; ownership/handoff y dependencias; límite entre configuración de host y permisos efectivos. No se añadieron agentes cosméticos.

## Catalog recovery

Durante la restauración de `roles/catalog.json` se produjo truncación del archivo por una llamada fallida con parámetro `newline` no soportado por Python 3.9. El catálogo se reconstruyó íntegramente desde las 23 skills del paquete V4.1 y la matriz de capabilities; el output reportó `RECOVERED 23 roles… bytes 29039`. Se comprobaron los 23 IDs, los aliases públicos, procedimiento, pruebas y generación antes de continuar. Después, `quality_gates` se escribió con `open(..., newline="\n")`. Los tests de catálogo/alias y la suite final pasan. No se tocó `archive/legacy`, `archive/received` ni fuentes recibidas V2/V3.1.

## Reproducibilidad y hashes

`generate_roles.py` y `generate_dist.py` escriben las skills y los paquetes; ninguna edición manual a `dist/`. Los manifests V4.2 tienen source digest `e15601a134110bd4b302e3ff7aa60f53a130308b61977891e0c7c52f2102f8a7` y hashes registrados en el README principal. Cada host incluye 23 skills, 6 agentes nativos y files enumerados/hash-checkeados. Pruebas `test_operational_profiles_cover_exact_role_set_and_aliases_remain`, `test_every_role_has_positive_negative_workflow_output_and_limits` y `test_all_host_manifests_reconcile_with_emitted_files`.

Los archivos de los distribuidores V4.1 fueron reemplazados por su salida generada V4.2; la evidencia de línea base de cada SKILL son los hashes observados antes de regenerar, prefijos `12` registrados en el historial de ejecución de esta tarea. No hay Git local para emitir diff binario, ni se presenta un inventario hash completo V4.1 como artifact firmado.
