# Contrato de delegación

Enviar al especialista solo el contexto suficiente y una misión acotada.

```text
MISSION: un resultado concreto
CONTEXT: hechos observados y rutas relevantes
INPUT: artefactos necesarios
LIMITS: permiso, archivos propios y cambios prohibidos
SUCCESS: criterios observables y checks aplicables
HANDOFF: resultado, archivos tocados, evidencia, riesgos y preguntas
```

El especialista separa hechos de inferencias y registra los checks según `evidence.schema.json`. El `verifier` determinista comprueba campos y consistencia del registro, pero no confirma por sí mismo que un comando o inspección visual haya ocurrido. El coordinador valida el traspaso contra el alcance y consolida discrepancias con evidencia. Una respuesta de especialista no equivale a aprobación.
