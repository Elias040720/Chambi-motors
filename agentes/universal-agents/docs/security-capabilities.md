# Capacidades de seguridad y aliases

Estas capacidades están implementadas como skills de análisis, no como verificaciones automáticas. Los aliases públicos se conservan literalmente:

| ID V3 | Alias V2 | Alcance | Activación | Coste esperado |
|---|---|---|---|---|
| `security-check` | `sec` | Revisión ligera del cambio y controles adyacentes; no es auditoría completa | Auth/datos sensibles, riesgo alto/critical, o control explícito `security_check` | Bajo/medio: lectura focalizada y controles locales disponibles |
| `security-auditor` | `security-audit` | Auditoría profunda con alcance definido, hipótesis adversariales, validación y reporte estructurado | Control explícito `security_audit` / petición clara de auditoría con alcance y autorización adecuados | Alto: más contexto y análisis; nunca autoactivarlo por cambio cosmético |

`sec` no es alias de la auditoría profunda. El router puede seleccionar una skill, pero no ejecuta el análisis ni prueba resultados. Reporta verificación pendiente hasta que el host observe el trabajo. Ninguna de las dos promete seguridad total.
