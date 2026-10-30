# Host matrix: skills, agents, tools and observed limits

Reviewed 2026-10-25 against official host documentation and local CLI builds. Static package checks and live host checks are shown separately. Project-scoped temporary smoke tests do not prove global installation/discovery.

| Host | Project skill / global skill | Skill invocation | Project agent / global agent | Agent invocation | Local result |
|---|---|---|---|---|---|
| Codex | `.agents/skills/<id>/SKILL.md` / `~/.agents/skills/<id>/SKILL.md` | `$<id>`; legacy alias must exist as supported name in the skill catalogue (no slash syntax claim) | `.codex/agents/<id>.toml` / `~/.codex/agents/<id>.toml` | Ask the Codex session to delegate to `<id>` and confirm the spawned thread/type. This is not a claim that `$<id>` or `@<id>` selects an agent. | Codex CLI 0.157.0 authenticated. V4.1 temporary project smoke had loaded `$architect`; V4.2 repeat: shell-disabled session could not inspect README; shell-enabled session hit local policy rejection reading skill and then `collab spawn failed: no thread with id`. Named role selection and fresh loading NOT VERIFIED in this CLI invocation. |
| Antigravity IDE | `.agents/skills/<id>/SKILL.md` / `~/.gemini/config/skills/<id>/SKILL.md` | `/<id>` through native skill picker | `.agents/agents/<id>.md` / `~/.gemini/config/agents/<id>.md` | Ask for native custom-agent delegation/`invoke_subagent`; `/id` selects a skill, not a subagent | Application not present/tested; NOT VERIFIED. |
| Antigravity CLI | `.agents/skills/<id>/SKILL.md` / `~/.gemini/antigravity-cli/skills/<id>/SKILL.md` | `/skills` to inspect discovery, then `/<id>` | `.agents/agents/<id>.md` / `~/.gemini/config/agents/<id>.md` | Delegate by name through native subagent planner; `/agents` opens the activity/agent panel, not a skill command | Executable not found; NOT VERIFIED. |
| Claude Code | `.claude/skills/<id>/SKILL.md` / `~/.claude/skills/<id>/SKILL.md` | `/<id>` | `.claude/agents/<id>.md` / `~/.claude/agents/<id>.md` | Ask parent to use the named Agent; inspect child/session result | CLI 2.1.304; auth status said logged in, but isolated smoke returned “organization has disabled Claude subscription access”; BLOCKED before agent result. |
| OpenCode | `.opencode/skills/<id>/SKILL.md` / `~/.config/opencode/skills/<id>/SKILL.md` (also host-supported shared skill roots) | Host `skill` tool; `@skill-id` where current frontend documents it | `.opencode/agents/<id>.md` / `~/.config/opencode/agents/<id>.md` | `@<id>` or native subagent selection | Executable not found; NOT VERIFIED. |

The build materializes a role's instructions into the corresponding host-native agent definition and/or role skill. This is package content, not runtime proof. Static second-project tests verify that global path maps and relative `core` references resolve independently of the active repository. Codex V4.1's earlier project-skill result is retained as a separate historical observation; this V4.2 turn could not repeat the real read because local execution was rejected.

## Read-only and tool boundaries

- **Codex:** official docs state custom agents inherit the parent turn's sandbox/approval; a custom file cannot independently set `sandbox_mode`. `features.shell_tool = false` removes the shell tool. In this Windows CLI smoke, it left no text-file reader/search surface, so these four inspect/review roles do **not** disable shell and must rely on the parent session's actual read-only permission. Prompts are guidance, not an enforcement boundary. Actual source read/delegation remains NOT VERIFIED in CLI 0.157.0 because the host returned a PowerShell policy rejection and `collab spawn failed: no thread with id`.
- **Antigravity:** generator tests enumerate only `off`, `auto`, `eager`, `sandbox`. Read-only definitions use `off`; write-capable agents use `sandbox`. Runtime invocation remains unverified here.
- **Claude Code:** inspector definitions allow `Read`, `Grep`, `Glob`, disallow `Write`, `Edit`, `Bash`, and `Agent`; actual CLI smoke was blocked by organization subscription policy.
- **OpenCode:** inspector frontmatter denies `edit`, `bash`, `webfetch`, and `task`; skill access is a separate permission. Actual effective rules depend on host configuration and remain unverified.

## Official references consulted

- Codex: [subagents, custom-agent files and inherited permissions](https://learn.chatgpt.com/docs/agent-configuration/subagents), [skills](https://developers.openai.com/codex/skills), [configuration reference](https://developers.openai.com/codex/config-reference).
- Antigravity: [skills and host-specific paths](https://www.antigravity.google/docs/skills?tab=ide), [subagents and commandExecutionPolicy enum](https://www.antigravity.google/docs/subagents/), [CLI `/agents` panel](https://www.antigravity.google/docs/cli/reference/), [CLI skills commands](https://www.antigravity.google/docs/cli/features), [rules](https://antigravity.google/docs/rules/).
- Claude Code: [subagents](https://code.claude.com/docs/en/sub-agents), [skills](https://code.claude.com/docs/en/skills), [CLI usage](https://docs.anthropic.com/en/docs/claude-code/cli-usage).
- OpenCode: [agents and permissions](https://docs.opencode.ai/docs/agents/), [skills](https://docs.opencode.ai/docs/skills/).
