# Evaluación conductual V4.2

`v4_2-scenarios.json` congela diez escenarios de consulta, cambio pequeño, refactor, full-stack, móvil, seguridad, visual, ambigüedad y review. Pruebas unitarias verifican señales/ruta/expectativas deterministas y la estructura del dataset, pero no llaman un modelo y no prueban la calidad generada.

Para A/B real, usar la misma tarea/fixture/prompt, model+version, host+version, permisos, herramientas y estado de login; cambiar únicamente baseline (distribución V4.1 registrada en `reports/v4_1-install-readiness.md`) frente a V4.2. Aleatorizar etiquetas si se puede, hacer al menos tres pares por tarea, rubricar salida sin conocer la variante, y registrar solo métricas que el host exponga. `evaluate_records.py` resume telemetría que ya existe; no ejecuta modelos. No guardar prompts con secretos, outputs privados ni trazas crudas.

Estado actual: **PENDING**; no hay muestras de salida, modelo/version fijados, ejecuciones, tokens/coste o scores comparables. No anunciar mejoras hasta tener esa evidencia.
