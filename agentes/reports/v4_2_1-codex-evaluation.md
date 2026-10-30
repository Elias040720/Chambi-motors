# Evaluación Codex + Universal Agents V4.2.1

Fecha: 2026-10-26, America/Lima  
Distribución evaluada sin reconstruir: dist/codex  
SHA-256 dist/codex/manifest.json: 6c8af9058583401f7e634d3ebef29ac1eb91daac7dd84066e1bc65c03f53e401  
Alcance ejecutado: preflight, ocho pruebas individuales de skills, un intento de delegación, pruebas de contrato del fixture web. A/B no autorizado y no ejecutado.  
Estado: **BLOCKED para cerrar la evaluación completa** — skills PASS; delegación BLOCKED; A/B NOT RUN por alcance autorizado; QA visual PARTIAL.

## 1. Resumen ejecutivo

- Codex descubrió y leyó las ocho skills solicitadas desde .agents/skills del proyecto temporal. Los streams JSONL registran lectura explícita de cada SKILL.md.
- Las respuestas fueron pertinentes para los casos sintéticos. Cada una respetó el sandbox read-only; los checks no escribieron ni cambiaron archivos del proyecto.
- El test-engineer y debugger observaron correctamente una prueba de puerto que falla. Suite: **1 PASS / 1 FAIL**, por aceptación indebida de 70000.
- El code-reviewer se detuvo porque no existía un diff revisable. Ese es el comportamiento esperado para su criterio de activación.
- No se inició un subagente nativo. El CLI local y su interfaz de colaboración disponible no ofrecen un selector del agente definido por .codex/agents/architect.toml. No se reprodujo el error histórico «collab spawn failed: no thread with id» porque no hubo llamada de creación de un agente seleccionado.
- Las tres pruebas del fixture web full-stack pasaron. Se cargó la página local en el navegador integrado y se observó su árbol accesible inicial; los submits e inspección visual manual quedaron NOT RUN.
- Las nueve respuestas autorizadas usaron **791,823 tokens de entrada y 12,987 de salida**, medidos en los eventos turn.completed del CLI. El contador agregado de Codex pasó de 16% a 27% de la ventana de cinco horas durante la evaluación. Es cuota de cuenta agregada, no una factura atribuible exactamente a estos turnos.
- No ejecuté el A/B. La autorización recibida cubrió skills y delegación, no las seis respuestas adicionales A/B.
- No se reconstruyó ni instaló el paquete y no se modificó V2/V3.1, los backups, las skills ni las distribuciones.

## 2. Fase 1 — preflight

### Versiones observadas

| Superficie | Evidencia | Resultado |
|---|---|---|
| CLI en PATH | codex --version | codex-cli 0.157.0 |
| CLI runtime de la sesión desktop | CODEX_APP_RUNTIME_CLI_PATH --version | codex-cli 0.164.0-alpha.11.1 |
| Codex desktop | check_app_update | build 26.1021.31345 / 21828, canal prod, up_to_date |
| Config local filtrada | ~/.codex/config.toml | model gpt-6.1-sol; sandbox_mode danger-full-access; approval_policy y multi_agent sin establecer |

El CLI de PATH no coincide con el runtime que utilizó esta evaluación. Cada resultado aquí reportado proviene del runtime 0.164.0-alpha.11.1.

### Capacidades, herramientas y permisos

codex features list mostró stable/true para skill_search, shell_tool, multi_agent, browser_use, in_app_browser y computer_use. Las features describen capacidad disponible, no prueban por sí mismas la carga de un rol ni la creación de subagente.

En las invocaciones se usó el CLI desktop con --sandbox read-only, --ephemeral y el modelo gpt-6.1-sol. No se pasó --ask-for-approval never; se fijó on-request. El contenedor/perfil de la sesión principal era danger-full-access, así que la restricción read-only se fijó explícitamente para cada prueba. No se solicitó elevación ni se intentó eludir políticas.

El shell ejecutó PowerShell mediante command_execution. La lectura, los tests y los comandos git estuvieron limitados al repo sintético. El CLI registró que no puede crear snapshots de shell para PowerShell; aun así los comandos observados se ejecutaron y devolvieron sus códigos/resultados. No se usaron hooks, MCP ni plugins del usuario.

### Descubrimiento estático de la distribución

La distribución Codex existente contiene 23 carpetas de skills en .agents/skills y 6 definiciones TOML bajo .codex/agents: tech-lead, architect, debugger, implementer, code-reviewer y security-auditor. planner, test-engineer, prompt-refiner y context-curator son skills, no agentes nativos separados en esta distribución.

La copia candidate estaba en:
%TEMP%/universal-agents-codex-eval-16e13630071345e5a3d2c057b20ed690/with-universal-agents/

La copia baseline, con el mismo src/catalog.py y tests/test_catalog.py pero sin Universal Agents, estaba en el mismo directorio temporal bajo normal/. Un cotejo SHA-256 de los dos archivos del proyecto dio 0 diferencias. Git se inicializó solo en ambas carpetas temporales; no se hizo commit.

### Diagnósticos y errores exactos

- codex doctor --json: overallStatus warning. Checks con warning: mcp.config (issues opcionales); security.endpoint (protección de endpoint detectada, exclusiones Codex no verificadas); state.rollout_db_parity (inventario local de sesiones distinto de archivos rollout); terminal.env (TERM=dumb). No apliqué recomendaciones ni cambié configuración.
- La primera llamada CLI falló antes de inferencia por usar --ask-for-approval después del subcomando: error “unexpected argument '--ask-for-approval' found”. Corregí su posición global y reintenté.
- En la primera invocación de ayuda que investigó la delegación, Codex informó: “WARNING: proceeding, even though we could not create PATH aliases: Acceso denegado. (os error 5)” bajo ~/.codex/tmp/arg0. El comando de ayuda acabó con código 0; este aviso no fue un error de creación de subagente.
- El runtime repitió warnings de icon_small/icon_large con rutas '..' y de shell snapshot no disponible para PowerShell. No se localizó en el paquete una interfaz de icono asociada a esas advertencias; no las atribuyo a una skill V4.2.1 sin evidencia adicional.
- codex debug prompt-input terminó con código 0 pero presentó 86,042 caracteres del contexto de la tarea actual. No lo usé para afirmar descubrimiento del proyecto: la prueba válida fue la lectura por herramienta de los SKILL.md del proyecto en los streams de cada invocación.
- El CLI help confirma que codex agents sirve para listar sesiones del daemon. No listé sesiones, ya que el doctor señala inconsistencia en ese inventario y no era necesario consultar conversaciones.

## 3. Fase 2 — resultados de las ocho skills

El campo “lectura observada” se verificó en el stream de la ejecución (PowerShell Get-Content dirigido al SKILL.md del rol), no por una afirmación de la respuesta.

| Skill | Descubierta / leída | Activación, herramientas y resultado | Calidad/pertinencia observada |
|---|---|---|---|
| $tech-lead | PASS; leyó tech-lead/SKILL.md y core asociado. Cargó además repo-explorer para el repo desconocido. | Usó PowerShell para inspeccionar código/config; ejecutó la suite propia con python -B y Git status. Reportó 2 pruebas, 1 PASS / 1 FAIL; no escribió. Eligió ejecución directa y no intentó delegar una consulta de inspección. | Adecuada: señaló el bug de rango y el TODO; diferenció capacidades declaradas de agentes activos. |
| $architect | PASS; leyó architect/SKILL.md. | Lectura estática de módulo y tests; no editó ni ejecutó pruebas. | Adecuada: recomendó conservar el módulo pequeño, documentó contratos y dejó las ambigüedades explícitas. |
| $planner | PASS; leyó planner/SKILL.md. | Plan estático, sin edición ni ejecución. | Adecuada: separó hechos, supuestos, criterios, secuencia y decisiones sobre el rango/duplicados. |
| $debugger | PASS; leyó debugger/SKILL.md. | Ejecutó solo test_port_above_range_is_rejected con python -B; exit 1, ValueError no lanzado. Python observado por ese comando: 3.9.11. | Adecuada: reprodujo el fallo y lo relacionó con la conversión sin chequeo; limitó la conclusión a la evidencia del caso. |
| $test-engineer | PASS; leyó test-engineer/SKILL.md. | Ejecutó python -B -m unittest discover -s tests -v; 2 pruebas: 1 PASS / 1 FAIL, exit 1. No añadió pruebas por read-only. | Adecuada: separó la cobertura diseñada de la ejecutada y enumeró decisiones de contrato sin inventar resultados. |
| $code-reviewer | PASS; leyó code-reviewer/SKILL.md. | Revisó git status, git diff y git diff --cached. Todo el contenido estaba sin seguimiento; no había diff ni HEAD para una base revisable. No editó ni amplió la revisión. | Adecuada: reportó BLOCKED y no inventó hallazgos ni emitió aprobación. |
| $prompt-refiner | PASS; leyó prompt-refiner/SKILL.md. | Procesó únicamente el texto sintético; no usó herramientas de edición ni tests. | Adecuada: preservó el original verbatim, señaló que “ejecuta tests” contradice “no ejecutes pruebas” y no resolvió el choque aumentando autorización. |
| $context-curator | PASS; leyó context-curator/SKILL.md. | Lectura selectiva del código/tests, sin editar ni ejecutar. | Adecuada: preparó un brief con hechos/inferencias/pendientes y secuencia de carga progresiva acotada al bug. |

Estos son juicios cualitativos sobre una respuesta por skill en un único proyecto sintético; no constituyen benchmark de calidad comparativa ni estimación de mejora respecto a Codex normal.

## 4. Fase 3 — delegación

Resultado: **BLOCKED; cero subagentes iniciados**.

En una sola invocación de tech-lead pedí delegar a la definición nativa architect para una misión read-only, explícitamente sin simular resultado. La respuesta comprobó los siguientes puntos:

1. Leyó tech-lead/SKILL.md y .codex/agents/architect.toml. La definición existe y contiene instrucciones.
2. Consultó codex --help, codex exec --help y codex agents --help; todos terminaron con código 0. No encontró una opción CLI que seleccione la definición nativa.
3. La interfaz collaboration.spawn_agent del contexto no expone un selector para cargar architect.toml. Nombrar la tarea “architect” no demostraría que se usaron esas instrucciones.
4. No hubo operación create/spawn, ID de subagente ni resultado de architect. El error histórico “collab spawn failed: no thread with id” no se reprodujo; no hay un error de creación que transcribir.

Esto demuestra una limitación de la interfaz/configuración de esta integración en el contexto probado, no la causa histórica exacta. El feature flag multi_agent aparece habilitado como capacidad, pero multi_agent no está configurado en ~/.codex/config.toml. No modifiqué esa configuración ni habilité otra forma de delegación para forzar un PASS.

## 5. Fase 4 — tareas y A/B

Las carpetas temporales normal/ y with-universal-agents/ tienen los mismos dos archivos fuente y prueba (hashes coincidentes). La segunda suma las instrucciones y adaptadores V4.2.1. Se inicializó Git en ambas; no se hizo commit. Ninguna corrida A/B ocurrió.

### A. Analizar arquitectura

- Esperado: describir el módulo pequeño, flujo y contratos, sin proponer capas no justificadas.
- Aceptación: citar src/catalog.py y tests/test_catalog.py; distinguir estado observado de inferencia; no editar ni ejecutar pruebas.
- Defectos conocidos: find_by_name lanza NotImplementedError; parse_port no valida rango.
- Evidencia: archivos/símbolos leídos, criterio de activación y diff vacío.

### B. Diagnosticar el error conocido

- Esperado: explicar por qué la prueba de 70000 espera ValueError pero la conversión lo acepta.
- Aceptación: reproducir test_port_above_range_is_rejected, identificar la ausencia del chequeo, separar evidencia de hipótesis, no aplicar fix.
- Defecto conocido: parse_port solo hace int(value.strip()).
- Evidencia: comando exacto, runtime Python, salida/exit code y archivos consultados.

### C. Implementar y probar una funcionalidad pequeña

- Esperado: implementar find_by_name(items, name) en la copia temporal.
- Aceptación definida para el benchmark (no existente íntegramente en el código actual): comparación tras strip + casefold; devolver el primer registro original coincidente; devolver None si no hay coincidencia; no mutar la lista; tests para coincidencia, mayúsculas/espacios, no-match, duplicados e identidad del objeto.
- Defecto conocido: TODO con NotImplementedError y sin tests.
- Evidencia: diff acotado, tests añadidos y ejecutados, códigos de salida y hashes antes/después.

### Control y rúbrica de comparación

Mismo runtime desktop 0.164.0-alpha.11.1, modelo gpt-6.1-sol, prompt, timeout, estado sintético y herramientas; A y B read-only, C workspace-write solo dentro de cada temporal. Única variable independiente: ausencia/presencia de Universal Agents. Seis respuestas (tres tareas por dos variantes), outputs etiquetados y evaluados con la misma rúbrica.

Rúbrica de 0–4 por criterio: exactitud; cobertura de aceptación; evidencia/reproducibilidad; respeto de alcance/permisos; claridad del handoff. Para C se agregan corrección funcional, calidad de tests, regresiones y límites del diff. Sin varias parejas comparables no se afirma superioridad ni ahorro.

**NOT RUN** conforme al alcance autorizado (“solo skills y delegación”). No se consumieron las seis respuestas A/B y no se puede concluir diferencia de calidad entre Codex normal y V4.2.1.
## 6. Fase 5 — QA visual/funcional

### Pruebas propias del fixture

Comando:
py -3.14 -m unittest discover -s tests -p test_product_contract.py -v

Resultado real: **Ran 3 tests … OK**:
- contrato HTML básico: labels, foco visible, tokens de contraste, viewport;
- GET/POST/PATCH, estado vacío y persistencia SQLite sintética;
- inputs inválidos, ID desconocido y ruta desconocida.

### Navegador

La app copiada a web-ui/ utilizó solo localhost y una SQLite sintética. El navegador integrado abrió http://127.0.0.1:61713 y el árbol accesible mostró Product name, Quantity, Add product y No products yet. El servidor se detuvo al acabar; el puerto ya no escuchaba.

No se verificaron submits en el navegador, mensajes de error visuales, foco con Tab/Shift+Tab, consola, screenshots útiles ni tamaños 390×844/768×1024/1440×900. Brave no estaba disponible como backend de browser CUA. La ventana ChatGPT inspeccionada inicialmente mostraba otra conversación activa; no se operó esa conversación ni las ventanas Brave existentes.

Estado de QA visual: **PARTIAL**. La suite HTTP/HTML pasa; no equivale a revisión visual humana ni a certificación de accesibilidad.

## 7. Consumo medido

| Invocación | Entrada | Salida |
|---|---:|---:|
| tech-lead | 127,137 | 2,433 |
| architect | 62,688 | 2,016 |
| planner | 60,724 | 1,195 |
| debugger | 106,104 | 1,158 |
| test-engineer | 94,855 | 1,758 |
| code-reviewer | 60,452 | 706 |
| prompt-refiner | 39,746 | 1,003 |
| context-curator | 82,387 | 1,157 |
| delegación tech-lead → architect | 157,730 | 1,561 |
| **Total reportado por CLI** | **791,823** | **12,987** |

El contador de la cuenta, que es agregado, pasó de 16% a 27% de la ventana de 300 minutos entre la lectura previa y la lectura posterior. El plan observado fue Plus, con 0 créditos comprados y ordinary usage allowed. No hubo cotización monetaria por invocación; no convertir tokens ni porcentaje de cuota en precio.

## 8. Problemas y acciones antes de un despliegue global

### P0 — integración de delegación nativa

El paquete declara agentes en .codex/agents, pero la herramienta de delegación observada no permite seleccionar uno de esos TOML y la sesión no tiene multi_agent configurado. Antes del despliegue debe existir un mecanismo documentado y un test real tech-lead → architect con evento de creación y resultado. Hasta entonces marcar subagentes como NOT VERIFIED/BLOCKED y mantener la ruta directa; no afirmar que el error histórico está corregido.

### P1 — fijar y documentar runtime efectivo

El CLI de PATH 0.157.0 y el runtime desktop 0.164.0-alpha.11.1 no son iguales. Fijar un runtime estable/aprobado en el procedimiento de instalación y evaluación, y registrar versión más sandbox por corrida.

### P1 — no inferir permisos desde la skill

Las skills no impusieron permisos. La sesión general era danger-full-access; el test los limitó explícitamente mediante --sandbox read-only. Las distribuciones deben seguir explicando que los TOML no garantizan sandbox read-only y que el host determina permisos efectivos.

### P1 — completar evidencia antes de calificar

La invocación de code-reviewer fue útil como caso negativo, pero para probar hallazgos se necesita un diff sintético rastreado y una base commit. No presentar el bloqueo como revisión aprobada.

### P2 — completar QA visual

Completar en una ventana/browser nuevo y claramente aislado: submit válido, inválido, recuperación, teclado/foco, consola y tres viewports con evidencia visual guardada. No instalar otro navegador como parte de esta evaluación.

### P2 — vigilar advertencias locales

El host reportó endpoint protection no verificada y discrepancia del inventario de sesiones. Consultar al administrador del host; no cambiar Defender, permisos o estado de sesiones como parte de este benchmark. El aviso de iconos ignorados tampoco se atribuyó a V4.2.1 sin localizar su archivo de origen.

## 9. Integridad y límites

- Manifest de Codex no cambió: SHA-256 6c8af9058583401f7e634d3ebef29ac1eb91daac7dd84066e1bc65c03f53e401.
- Los SHA-256 de src/catalog.py y tests/test_catalog.py coincidieron entre baseline y candidate después de la evaluación.
- No se escribió en el perfil global, no se instaló, no se reconstruyó dist, no se editaron skills, no se tocaron backups/V2/V3.1, no se habilitaron hooks ni MCP.
- Los logs JSONL con instrucciones y tool events quedaron solo dentro del directorio temporal indicado. Las rutas/documentos leídos fueron sintéticos y el paquete.
- La ventana server de fixture quedó detenida. El proyecto temporal se conserva para inspección y no contiene datos reales.

## Estado final

**BLOCKED para cerrar la evaluación completa.** El preflight pasó con advertencias, las 8 skills pasaron su prueba individual y el fixture HTTP pasó. La delegación nativa está bloqueada por falta de selector/integración observable. QA visual está parcial y el A/B no se ejecutó porque no estuvo dentro de la autorización concedida. No hay evidencia comparativa que permita afirmar superioridad, eficiencia de tokens ni preparación para despliegue global.

## 10. Diagnóstico definitivo de delegación (2026-10-25)

Esta sección amplía el diagnóstico anterior. Corrige la frase ambigua “cero subagentes iniciados”: sí hubo una delegación real mediante la herramienta de colaboración disponible en esta sesión; lo que sigue sin verificarse es la carga/selección del perfil nativo personalizado `architect` desde TOML.

### Preflight del runtime y configuración

| Dato | Evidencia observada |
|---|---|
| Runtime Codex Desktop usado aquí | `CODEX_APP_RUNTIME_CLI_PATH` = `C:\Users\ABEL\AppData\Local\OpenAI\Codex\bin\2993767bd1dfb009\codex.exe`; `--version` = `codex-cli 0.164.0-alpha.11.1` |
| CLI de PATH | `C:\Users\ABEL\AppData\Local\Programs\OpenAI\Codex\bin\codex.exe`; `--version` = `codex-cli 0.157.0`. No se usó para la delegación. |
| Feature flags del runtime | `multi_agent stable true`, `skill_search stable true`, `shell_tool stable true`; `multi_agent_v2 stable false`. Son capacidades del runtime, no evidencia de que TOML se haya aplicado. |
| Config personal relevante | En `~/.codex/config.toml` no se encontró tabla `[agents]` ni un valor local `agents.enabled`, `max_concurrent_threads_per_session`, `max_threads` o `max_depth`; la tabla `[features]` observada solo declara `apps = false` y `plugins = false`. No se imprimieron otros campos. |
| Interfaz disponible en esta sesión | La colaboración expone `spawn_agent(task_name, message, fork_turns)`; no expone un argumento para `agent_type`, `agent_name`, `agent_path` ni TOML de rol. |
| Definición distribuida | `dist/codex/.codex/agents/architect.toml` existe y en la lectura contiene los tres campos requeridos por la documentación oficial: `name`, `description`, `developer_instructions`. SHA-256 observado: `4A236F9408C65052E3F42ACDEECC0A2ADB00DBF506668222C278C53CB663A49F`. La skill empaquetada `dist/codex/.agents/skills/architect/SKILL.md` existe; SHA-256: `5D17BC4C4134AF4507537C9E904A69B78E7B36B9F2E1BA8FCB6B7B1D286F6685`. |

La documentación oficial vigente indica que los agentes locales de Codex se definen como TOML bajo `~/.codex/agents/` o `.codex/agents/` del proyecto; que los tres campos anteriores son obligatorios; que `agents.enabled` por defecto es `true`; y que los agentes heredan los permisos del padre. También aclara que las instrucciones de un agente para evitar escrituras no crean por sí solas una sandbox de solo lectura. [Documentación oficial de subagentes de Codex](https://developers.openai.com/codex/multi-agent). La guía oficial de Responses Multi-agent describe una API diferente y no se tomó como evidencia de carga de archivos TOML locales. [Guía oficial de Multi-agent para Responses API](https://developers.openai.com/api/docs/guides/responses-multi-agent).

La ruta distribuida es una definición de agente de proyecto solo cuando esa distribución ocupa realmente la raíz del proyecto de Codex (o sus archivos se copian a `.codex/agents/` del proyecto). Estar debajo de `dist/codex/` no registra por sí mismo un agente global. No se instaló ni movió nada.

### Prueba real acotada

- Se inició exactamente un subagente real `/root/architect` usando la herramienta de colaboración de esta sesión y se esperó a que completara.
- Misión: leer exclusivamente el fixture sintético preexistente `...\universal-agents-codex-eval-16e13630071345e5a3d2c057b20ed690\with-universal-agents`, cargar la skill `architect` distribuida, no editar/ejecutar, y devolver tres observaciones con referencias.
- Evidencia de ciclo completo: la herramienta devolvió el identificador `/root/architect`; `list_agents` lo mostró como `completed`; el agente retornó tres observaciones con rutas y hechos del fixture.
- El agente leyó la skill del paquete y observó `.codex/agents/architect.toml` en el fixture, pero dejó explícito que el mecanismo no le entregó ni cargó ese TOML automáticamente. Su instrucción de solo lectura se cumplió: solo lecturas/listados; no ejecutó pruebas ni editó.
- Resultado: **delegación genérica real PASS**; **selección/carga del agente personalizado nativo `architect` BLOCKED / NOT VERIFIED**. La delegación satisface creación, ejecución y retorno de un subagente, pero no el criterio de aceptación de identidad configurada desde TOML.
- El fallo histórico `collab spawn failed: no thread with id` no se produjo. No existe evidencia para declararlo corregido en general.
- Tokens/latencia de esta llamada no se expusieron en el registro visible de colaboración; **NO MEDIDOS**. No se estima ni inventa una cifra.

### Clasificación y causa raíz limitada a lo observado

**BLOCKED — superficie de integración de esta sesión.** El runtime informa capacidad `multi_agent`, la herramienta genérica de colaboración creó y completó un subagente, y el fixture contiene una definición TOML en la ruta de proyecto que corresponde con los tres campos obligatorios presentes. No se completó una validación sintáctica independiente del TOML: el Python disponible es 3.9.11 y el intento local de usar `tomllib` terminó con `ModuleNotFoundError: No module named 'tomllib'`. La superficie disponible aquí tampoco tiene un parámetro para seleccionar ese perfil. Por tanto, no se puede distinguir o probar que el rol TOML haya sido aplicado; pedir al agente genérico que siga la skill `architect` no equivale a cargar el perfil nativo.

La lectura estática confirma los campos obligatorios, pero la sintaxis TOML no quedó validada por parser en esta sesión. Tampoco se probó el descubrimiento de esa distribución como raíz activa del cliente CLI/TUI, ni se reprodujo el error histórico. No se atribuye el bloqueo a una política de permisos: la tarea de lectura fue posible y las instrucciones de no escritura fueron respetadas; la limitación observada es de selección/integración del perfil. No hay corrección del paquete justificada por esta evidencia.

### Repetición manual pendiente

Para comprobar el perfil nativo sin instalar globalmente: abre el fixture `with-universal-agents` como proyecto raíz en el cliente local Codex CLI/TUI o IDE que soporte agentes de proyecto; confirma que `.codex/agents/architect.toml` y `.codex/skills`/skills del proyecto están en la raíz adecuada; desde una sesión nueva pide la misión de lectura de tres observaciones con el nombre exacto `architect`; en TUI interactiva usa `/subagents` para revisar creación y estado; confirma en la ejecución que el perfil/rol `architect` y sus instrucciones aparecen cargados, que el subagente devuelve el resultado y que no escribe. Si la sesión ofrece solo un selector genérico sin rol personalizado, conserva `BLOCKED` y registra la versión/cliente, sin usar un perfil global ni forzar configuración.

### Eficiencia de tokens: observaciones, no refactor

- **Medido en la evaluación previa:** 791,823 tokens de entrada y 12,987 de salida en nueve turnos, incluyendo las ocho skills y el intento de delegación previo. No es una medida aislada del costo de delegar.
- **Esta prueba:** no se expuso conteo de tokens ni latencia; no medidos.
- **Estimaciones cualitativas:** el `architect.toml` materializa dentro de `developer_instructions` una copia extensa de `SKILL.md`, mientras la skill canónica contiene referencias adicionales. Si el host carga ambos, podría haber solapamiento; este test no mide tokens ni confirma la carga simultánea. Mantener el test acotado y leer una sola fuente por invocación evita relectura manual; la mejora cuantitativa queda pendiente de telemetría real.
- Sin cambios de contenido, generadores, distribuciones o configuración. No se repitieron las ocho skills ni se ejecutó A/B.

**Estado de este diagnóstico: BLOCKED para aceptación de `tech-lead` → perfil nativo `architect`; PASS únicamente para creación/completado de subagente genérico con skill `architect` indicada explícitamente.**


