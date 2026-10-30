# Referencias portables de skills

El formato canónico mantiene una raíz única:

```text
<bundle-root>/
  core/
  skills/<skill-id>/SKILL.md
```

Los enlaces `../../core/...` desde `skills/<skill-id>/SKILL.md` resuelven a `<bundle-root>/core/...`. Al empaquetar en cada perfil, el adaptador debe copiar **`core/` junto al directorio global `skills/`**, conservando ambos niveles:

| Host | Directorio global de skills | `<bundle-root>` para el paquete |
|---|---|---|
| Codex | `~/.agents/skills` | `~/.agents` |
| Antigravity IDE | `~/.gemini/config/skills` | `~/.gemini/config` |
| Antigravity CLI | `~/.gemini/antigravity-cli/skills` | `~/.gemini/antigravity-cli` |
| Claude Code | `~/.claude/skills` | `~/.claude` |
| OpenCode | `~/.config/opencode/skills` | `~/.config/opencode` |

La ruta de Antigravity IDE y CLI no es la misma. Codex y OpenCode también descubren skills compatibles en `~/.agents/skills`; la tabla elige el directorio nativo global de cada host. Los directorios globales pueden depender de sistema operativo, configuración administrada o versión, por lo que cualquier adaptador futuro debe detectar/documentar el perfil objetivo en vez de asumirlo silenciosamente.

## Invariantes de empaquetado

- Copiar el árbol canónico completo (`core/` y `skills/` como hermanos); nunca copiar solo `skills/`.
- Mantener los `SKILL.md` intactos y usar rutas relativas, no rutas absolutas de usuario.
- Antes de instalar, previsualizar destinos, conflictos y hashes; después, comprobar cada enlace resuelto dentro del bundle.
- Si un host exige otro layout, generar una copia local `references/core/` y transformar los enlaces de manera determinista y reversible. No publicar soporte sin probar el artefacto transformado.
- No instalar nada en Fase 1.1.

La suite verifica directamente los cinco árboles reales de `dist/`: cada referencia `../../core/...` existe y se mantiene dentro del bundle. Los dry-runs del instalador confirman además que los layouts globales de cada host mantienen `core/` junto a `skills/`. Esto comprueba resolución estática del paquete, no descubrimiento real, activación de skills ni compatibilidad certificada del host.

## Fuentes de rutas documentadas

- [Codex: ubicaciones de skills locales](https://developers.openai.com/codex/skills)
- [Antigravity IDE: ubicaciones de skills](https://antigravity.google/docs/skills?app=antigravity-ide)
- [Antigravity CLI: migración y rutas globales](https://antigravity.google/docs/cli/gcli-migration)
- [Claude Code: ubicaciones de skills](https://code.claude.com/docs/en/skills)
- [OpenCode: ubicaciones de skills](https://docs.opencode.ai/docs/skills/)
