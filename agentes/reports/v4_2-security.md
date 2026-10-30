# Revisión de seguridad V4.2

La sesión respetó el alcance: solo `universal-agents/`, salida generada `dist/`, README y reportes `reports/v4_2-*`; no instaló globalmente, no habilitó hooks/MCP, no ejecutó V2/V3.1 ni terceros. Los smoke de host y navegador usaron datos sintéticos en proyecto/temp separado. Ningún secreto se incluyó en prompts de host, traces de evaluación o journal de instalación.

## Controles observados

- Tests de `core` rechazan evidencia vacía o fabricada y separan claims, provenance documental y ejecución observada. Ver [evidence provenance](../universal-agents/docs/evidence-provenance.md).
- La solicitud del usuario no puede elevar los permisos efectivos, que son los del host/sesión; `test_json_request_cannot_expand_host_permissions` pasa.
- El instalador usa dry-run default, staging y journal durable previo a mutación, hashes y recovery compensatorio; pruebas deterministas incluyen interrupción antes de primer write, tras nuevo/reemplazo y durante rollback. No se aplicó a perfiles reales. Recuperar por ID: `python tooling/install/installer.py --host codex --scope global --recover codex-global-ID` desde `universal-agents/`.
- Distribuciones validan manifiestos/hashes, path sets, no symlinks, cachés, hooks ni MCP añadidos. Antigravity `ask` queda fuera de enum; roles de inspección `off`.
- Codex inspectores no desactivan shell, pues `features.shell_tool=false` impidió lectura durante el smoke. Solo una sesión host `read-only` contiene writes; las instrucciones de agente no reemplazan sandbox.
- Claude smoke usó herramientas explícitas `Read,Grep,Glob,Agent`, fuentes `project,local`, MCP estricto; fue bloqueado por el tenant antes de respuesta.

## Incidentes y riesgo residual

1. **Restauración de catálogo:** la API de escritura falló con `newline` y dejó catalog truncado; se recuperó reconstruyendo 23 entradas del dist existente y validando aliases/tests antes de seguir. Se documenta en `v4_2-skill-diff.md`. No existe Git para un diff pre/post y esto reduce certeza de provenance histórica.
2. **Limpieza temporal:** dos procesos web se detuvieron, pero el ejecutor bloqueó explícitamente `Remove-Item` recursivo y la eliminación de archivos. Permanecen dos carpetas temp con metadatos/SQLite sintéticos y dos proyectos smoke (README sintético + agente/skill copiados); no contienen secretos ni datos del repositorio. Paths exactos en `v4_2-web-mobile.md`.
3. **Symlink real:** Windows negó creación sin privilegio (`WinError 1314`); el control real de junction se modela. No afirmar prueba de symlink real.
4. **JSON Schema:** parser de `jsonschema` no instalado; no declarar schema válido, solo sintaxis JSON y chequeos estructurales existentes.
5. **Host runtime:** Codex spawn/read falló; Claude bloqueado; Antigravity y OpenCode ausentes. No se afirma que el paquete haya creado agente independiente o reducido permisos.
6. **A/B:** sin respuestas reales baseline/V4.2 ni telemetría; los resultados de quality/cost/tokens siguen desconocidos.

## Prueba en sesión

Los comandos propios comprobados, salidas y SKIP figuran en `v4_2-test-results.md`. No se ejecutó scanner de terceros, dependencia ni installer contra perfiles. Riesgos de instalar manualmente: rutas efectivas dependen de setup del host; revisar colisiones/hash con `--dry-run`, recuperar solo ID del journal, y fijar sandbox global/session por host antes de subdelegar.
