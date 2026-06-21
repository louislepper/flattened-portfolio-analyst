# LaunchDarkly Feature Flags

This project uses LaunchDarkly for feature flag management.

## SDK context (this repo)
- SDK: Node.js Server SDK (`@launchdarkly/node-server-sdk`), backend only
- Initialization: `functions/src/launchdarkly.ts` (consumed by `functions/src/handler.ts`)
- Key env var: `LAUNCHDARKLY_SDK_KEY` (server-side secret — never hardcode in source)

## Agent: use LaunchDarkly skills (required)

The LaunchDarkly agent skills below are installed under `.claude/skills/`. For any
substantive flag work, **open that skill's `SKILL.md` and follow it** — do not
improvise from generic flag advice alone.

| Skill | When to use it |
|-------|------------------|
| `launchdarkly-flag-create` | User wants a new flag, code wiring, feature toggle, or experiment setup. |
| `launchdarkly-flag-discovery` | User wants flag inventory, debt/stale-flag audit, health, or removal readiness. |
| `launchdarkly-flag-targeting` | User wants who sees a flag, rollouts, targeting rules, or environment promotion. |
| `launchdarkly-flag-cleanup` | User wants a flag removed from code safely, archive/cleanup workflows, or MCP-driven removal. |

**Invocation:** Match the user's request to the skill `description` in each skill's
frontmatter. The LaunchDarkly hosted MCP server is configured in `.mcp.json`.

**Tools:** When a skill lists LaunchDarkly MCP tools as required, use MCP; do not
skip validation steps.

## Conventions (summary)
- Prefer boolean flags unless multivariate is required; use descriptive kebab-case keys.
- Always pass a fallback when evaluating flags; fail in the safe direction (this
  repo's `app-check-enforcement` falls back to `enforce`).
- Use a meaningful evaluation context.
- Server-side SDK keys stay secret; client-side IDs may appear in browser code.
- Do not evaluate flags in tight loops without caching (the client is a singleton).
- Archive or remove flag code when a flag is fully rolled out — use
  `launchdarkly-flag-cleanup` (and `launchdarkly-flag-discovery` first).
