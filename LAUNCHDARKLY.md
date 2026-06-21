# LaunchDarkly Setup

This project uses [LaunchDarkly](https://launchdarkly.com) for feature flag
management. It is used **only in the backend** Firebase Function (`functions/`),
not in the React frontend.

## SDK Details

- **SDK**: Node.js Server SDK (`@launchdarkly/node-server-sdk`)
- **SDK Type**: server-side
- **Key Type**: SDK Key (server-side — secret)
- **Installed via**: `npm install @launchdarkly/node-server-sdk` (in `functions/`)
- **Initialization file**: `functions/src/launchdarkly.ts` (singleton client,
  consumed by `functions/src/handler.ts`)

## Configuration

The SDK key is configured via the `LAUNCHDARKLY_SDK_KEY` environment variable.

- **Do not hardcode** the SDK key — it is a server-side secret.
- **Production:** stored in **Google Secret Manager** as `LAUNCHDARKLY_SDK_KEY`
  and bound to the `api` function via `defineSecret(...)` in
  `functions/src/index.ts`. Set/rotate it with:
  ```bash
  printf '<sdk-key>' | npx firebase-tools functions:secrets:set LAUNCHDARKLY_SDK_KEY --data-file=-
  ```
  The deployed function uses the **production** environment's SDK key.
- **Local (emulator):** add `LAUNCHDARKLY_SDK_KEY=<test-env-sdk-key>` to
  `functions/.secret.local` (gitignored) if you need flag evaluation locally;
  otherwise the SDK fails closed (see below).

## The flag: `app-check-enforcement`

Three-state control over Firebase App Check on the securities API
(`GET /api/v1/securities/{ticker}`):

| Variation | Behaviour in `handler.ts` |
|-----------|---------------------------|
| `off`     | Do not verify tokens, do not reject. App Check disabled. |
| `monitor` | Verify the `X-Firebase-AppCheck` token and log the result, but **never reject**. Rollout-observation mode. |
| `enforce` | Verify the token; reject missing/invalid with `401` before the Firestore read. |

**Fail-closed:** if the flag cannot be evaluated (no SDK key, init timeout,
network error, unexpected value) the SDK returns the fallback default
**`enforce`** — see `DEFAULT_MODE` in `functions/src/launchdarkly.ts`.

**Current state:** flag is **on** in `production` and `test`, default rule serving
**`monitor`**. Flip the production default rule to `enforce` (dashboard or
`launchdarkly-flag-targeting` skill) once monitor logs confirm real traffic
carries valid tokens.

## Where to Find Things

| What | Where |
|------|-------|
| The flag | https://app.launchdarkly.com/projects/default/flags/app-check-enforcement |
| Feature flags dashboard | https://app.launchdarkly.com/projects/default/flags |
| Environments / SDK keys | https://app.launchdarkly.com/projects/default/settings/environments |
| API access tokens | https://app.launchdarkly.com/settings/authorization |
| SDK documentation | https://launchdarkly.com/docs/sdk/server-side/node-js |
| LaunchDarkly docs | https://launchdarkly.com/docs |

## How Feature Flags Work in This Project

1. A singleton `LDClient` is initialised lazily at module scope in
   `functions/src/launchdarkly.ts` and reused across requests while the function
   instance is warm (streaming updates from LaunchDarkly).
2. `handler.ts` calls `getAppCheckMode()` per request; the flag is evaluated
   against a static `service` context (it's a server-wide kill switch, not
   per-user).
3. Changes in the dashboard take effect within seconds (server-side streaming),
   with no redeploy.

### Example: Evaluating the flag

```ts
const client = await getClient();              // singleton, may be null without a key
const value = await client.variation(
  "app-check-enforcement",
  { kind: "service", key: "securities-api" },
  "enforce",                                    // fallback — fail closed
);
```

## Next Steps / Advanced Capabilities

- **[Targeting Rules](https://launchdarkly.com/docs/home/targeting-flags/targeting-rules)** — e.g. serve `enforce` everywhere but `monitor` from a debug context.
- **[Percentage Rollouts](https://launchdarkly.com/docs/home/targeting-flags/rollouts)** — ramp `enforce` gradually if desired.
- **[Guarded Rollouts](https://launchdarkly.com/docs/home/guarded-rollouts)** — auto-rollback on metric regressions.
- **[Experimentation](https://launchdarkly.com/docs/home/about-experimentation)** and **[Observability](https://launchdarkly.com/docs/home/observability)**.

### Agent Integration (MCP Server)

This repo is wired to the [LaunchDarkly hosted MCP server](https://launchdarkly.com/docs/home/getting-started/mcp-hosted)
(`.mcp.json`, OAuth — no tokens in config). With it the agent can create/toggle
flags, set targeting, and run cleanup directly. The companion skills
(`launchdarkly-flag-create`, `-discovery`, `-targeting`, `-cleanup`) are
installed under `.claude/skills/`.
