# Capabilities V4.2 por host

Resultados reunidos 2026-10-25. `PASS` de paquete solo significa que el artefacto cumple el contrato estático, no que el host haya cargado la skill/agent.

| Capacidad | Codex 0.157.0 | Antigravity IDE | Antigravity CLI | Claude Code 2.1.304 | OpenCode |
|---|---|---|---|---|---|
| Generar definición/paquete | PASS | PASS | PASS | PASS | PASS |
| Validar esquema/frontmatter estático y hashes | PASS | PASS | PASS | PASS | PASS |
| Enumeración/política de tools estática | PASS; agentes heredan sandbox | PASS; `off` / `sandbox` | PASS; `off` / `sandbox` | PASS; allow/deny tools frontmatter | PASS; deny permissions frontmatter |
| Skill discovery en repo temporal | V4.1 smoke histórico: `$architect` respondió; V4.2 repeat NOT VERIFIED (reader bloqueado) | NOT RUN: app ausente | NOT RUN: CLI ausente | BLOCKED por acceso de organización | NOT RUN: CLI ausente |
| Custom role discovery/load | No verificado en CLI | NOT RUN | NOT RUN | BLOCKED antes de spawn | NOT RUN |
| Subagente real | FAIL: `collab spawn failed: no thread with id` | NOT RUN | NOT RUN | BLOCKED antes de spawn | NOT RUN |
| Solo-lectura efectiva | Config requiere sandbox read-only en padre; `shell_tool=false` quitó reader; pruebas CLI de lectura bloqueadas | Config estática únicamente | Config estática únicamente | Herramientas restringidas en spec, runtime no probado | Reglas estáticas únicamente |
| Global skill desde segundo proyecto real | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED |
| Instalación global | No realizada | No realizada | No realizada | No realizada | No realizada |

## Observaciones de smoke real

- Codex: `codex-cli 0.157.0`; `codex login status` indicó logged in. Smoke aislado de proyecto con agente/skill Copiados a `%TEMP%`, `--ignore-user-config --ephemeral --skip-git-repo-check --sandbox read-only --disable apps --disable plugins`. Con `-c features.shell_tool=false`, el CLI contestó que no tiene lector/search no-shell y que `spawn_agent` no selecciona el agente `architect`. Con shell activo: PowerShell `Get-Content` rechazado por policy; la siguiente spawn falló `no thread with id: <current-session>`. No hubo writes. El smoke V4.1 de `$architect` sigue como evidencia independiente, no como V4.2 pass.
- Claude: `claude --version` = `2.1.304`; `claude auth status` dijo logged in, pero request mínima protegida (solo Read/Grep/Glob/Agent, `--setting-sources project,local --strict-mcp-config`, temp project) retornó: `Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access`. No result de skill/agent.
- Antigravity IDE/CLI, OpenCode: `Get-Command` / inventario del entorno anterior no encontró ejecutables; ningún intento de login/instalación.

Acción mínima de Abel para completar host validation: abrir una copia de dist en un proyecto vacío por host, usar su invocación nativa documentada para listar/cargar una skill y delegar un brief de solo lectura; confirmar en el host el nombre de rol/herramientas y resultado. Codex debe permitir un `shell_tool` de lectura bajo sandbox read-only o exponer un lector de archivos alternativo. Claude requiere resolver política de acceso de la organización antes de smoke. Sin acciones de instalación hechas por esta sesión.
