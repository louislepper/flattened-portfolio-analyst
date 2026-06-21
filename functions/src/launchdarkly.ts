import { init, type LDClient } from "@launchdarkly/node-server-sdk";

// Three-state control for App Check on the securities API:
//   - "off":     do not verify tokens, do not reject (App Check disabled).
//   - "monitor": verify tokens and log the result, but never reject (rollout
//                observation mode — confirms real traffic carries valid tokens).
//   - "enforce": verify tokens and reject missing/invalid ones with 401.
export type AppCheckMode = "off" | "monitor" | "enforce";

const FLAG_KEY = "app-check-enforcement";

// Fail closed: any failure to evaluate the flag (no SDK key, init timeout,
// network error, unexpected variation) falls back to full enforcement.
const DEFAULT_MODE: AppCheckMode = "enforce";

const INIT_TIMEOUT_SECONDS = 5;

// The flag is a server-wide kill switch, not per-user, so a single static
// context is used for every evaluation.
const FLAG_CONTEXT = { kind: "service", key: "securities-api" } as const;

// LDClient must be a singleton per environment and reused across requests.
// Initialised lazily at module scope so a warm function instance keeps the
// streaming connection and evaluates flags from memory.
let clientPromise: Promise<LDClient | null> | null = null;

function getClient(): Promise<LDClient | null> {
  if (clientPromise) {
    return clientPromise;
  }

  const sdkKey = process.env.LAUNCHDARKLY_SDK_KEY;
  if (!sdkKey) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }

  const client = init(sdkKey);
  // Resolve to the client even if initialisation times out; variation() will
  // return the fallback default until the stream connects, which is the safe
  // (enforcing) direction.
  clientPromise = client
    .waitForInitialization({ timeout: INIT_TIMEOUT_SECONDS })
    .then(() => client)
    .catch(() => client);
  return clientPromise;
}

function isAppCheckMode(value: unknown): value is AppCheckMode {
  return value === "off" || value === "monitor" || value === "enforce";
}

export async function getAppCheckMode(): Promise<AppCheckMode> {
  try {
    const client = await getClient();
    if (!client) {
      return DEFAULT_MODE;
    }
    const value = await client.variation(FLAG_KEY, FLAG_CONTEXT, DEFAULT_MODE);
    return isAppCheckMode(value) ? value : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}
