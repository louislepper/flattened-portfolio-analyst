import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { logger } from "firebase-functions";
import { getAppCheck } from "firebase-admin/app-check";
import { getSecurityDoc, updateSecurityPrice } from "./firestore.js";
import { mapSecurityDocToResponse } from "./mapper.js";
import { fetchQuote } from "./finnhub.js";
import { getAppCheckMode } from "./launchdarkly.js";

const TICKER_PATTERN = /^[A-Z0-9._-]+$/;
const APP_CHECK_HEADER = "x-firebase-appcheck";
const CACHE_MAX_AGE_DEFAULT = 604800; // 1 week in seconds
const CACHE_MAX_AGE_PARTIAL_ETF = 3 * 24 * 60 * 60; // 3 days in seconds
const CACHE_MAX_AGE_NOT_FOUND = 4 * 24 * 60 * 60; // 4 days in seconds
const CACHE_MAX_AGE_CLIENT_ERROR = 3 * 24 * 60 * 60; // 3 days in seconds
const CACHE_CONTROL_NO_STORE = "no-store";
const PARTIAL_ETF_THRESHOLD = 0.95;
// Staleness ramps in probabilistically between these two ages rather than
// flipping at a hard cutoff. Securities first fetched together would otherwise
// expire together and stampede Finnhub in one burst; spreading the refreshes
// over the window de-synchronises those cohorts.
const STALENESS_MIN_MS = 7 * 24 * 60 * 60 * 1000; // never refreshed before this
const STALENESS_MAX_MS = 28 * 24 * 60 * 60 * 1000; // always refreshed after this
const PATH_PREFIX = "/api/v1/securities/";

// App Check gates the API to traffic from the real frontend. The off/monitor/
// enforce mode comes from a LaunchDarkly flag (see ./launchdarkly.ts), so it can
// be rolled out without a redeploy and fails closed to "enforce". Verifying
// still requires a function invocation — it only saves the downstream Firestore
// read / Finnhub call.
async function hasValidAppCheckToken(req: Request): Promise<boolean> {
  const token = req.header(APP_CHECK_HEADER);
  if (!token) {
    return false;
  }
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decides whether to attempt a price refresh. Below STALENESS_MIN_MS never;
 * above STALENESS_MAX_MS always; in between with a probability that ramps
 * linearly from 0 to 1 across the window, so a given doc is refreshed on some
 * request during the window rather than on the first one past a fixed cutoff.
 *
 * A missing or unparseable timestamp counts as stale: we cannot tell how old
 * the price is, so refreshing is the safe direction.
 *
 * The random source is injectable so tests can pin the outcome.
 */
export function isStale(
  refreshedAt: string | undefined,
  random: () => number = Math.random
): boolean {
  const refreshedTime = new Date(refreshedAt ?? "").getTime();
  if (!Number.isFinite(refreshedTime)) {
    return true;
  }

  const age = Date.now() - refreshedTime;
  if (age <= STALENESS_MIN_MS) {
    return false;
  }
  if (age >= STALENESS_MAX_MS) {
    return true;
  }

  const rampProgress =
    (age - STALENESS_MIN_MS) / (STALENESS_MAX_MS - STALENESS_MIN_MS);
  return random() < rampProgress;
}

function isPartialEtf(
  type: string,
  compositeSecurities: { percentage: number }[]
): boolean {
  if (type !== "etf") {
    return false;
  }
  const totalPercentage = compositeSecurities.reduce(
    (sum, s) => sum + s.percentage,
    0
  );
  return totalPercentage <= PARTIAL_ETF_THRESHOLD;
}

export async function handler(
  req: Request,
  res: Response
): Promise<void> {
  if (req.method !== "GET") {
    res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_CLIENT_ERROR}`);
    res.status(405).json({
      error: "METHOD_NOT_ALLOWED",
      message: "Only GET requests are supported",
    });
    return;
  }

  if (req.query && Object.keys(req.query).length > 0) {
    res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_CLIENT_ERROR}`);
    res.status(400).json({
      error: "BAD_REQUEST",
      message: "Query parameters are not supported",
    });
    return;
  }

  const path = req.path;
  const ticker = path.startsWith(PATH_PREFIX)
    ? path.slice(PATH_PREFIX.length)
    : "";

  if (!ticker || !TICKER_PATTERN.test(ticker.toUpperCase())) {
    res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_CLIENT_ERROR}`);
    res.status(400).json({
      error: "BAD_REQUEST",
      message: "Invalid ticker format",
    });
    return;
  }

  const appCheckMode = await getAppCheckMode();
  if (appCheckMode !== "off") {
    const tokenValid = await hasValidAppCheckToken(req);
    if (appCheckMode === "monitor") {
      // Observe without rejecting: confirms real traffic carries valid tokens
      // before enforcement is turned on. tokenValid is low-cardinality.
      logger.info("App Check monitor", { tokenValid });
    } else if (!tokenValid) {
      // enforce. Not publicly cacheable: the CDN keys by URL and does not vary
      // on the App Check header, so a cached 401 from a tokenless request would
      // be served to legitimate token-bearing users for the same ticker.
      res.set("Cache-Control", CACHE_CONTROL_NO_STORE);
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Missing or invalid App Check token",
      });
      return;
    }
  }

  try {
    const doc = await getSecurityDoc(ticker);

    if (!doc) {
      res.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_NOT_FOUND}`);
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Security not found",
      });
      return;
    }

    if (isStale(doc.refreshedAt)) {
      const apiKey = process.env.FINNHUB_API_KEY;
      if (apiKey) {
        const priceCents = await fetchQuote(
          doc.ticker,
          apiKey
        );
        if (priceCents !== null) {
          doc.price = priceCents;
          doc.refreshedAt = new Date().toISOString();
          await updateSecurityPrice(doc.ticker, priceCents);
        }
      }
    }

    const maxAge = isPartialEtf(doc.type, doc.compositeSecurities)
      ? CACHE_MAX_AGE_PARTIAL_ETF
      : CACHE_MAX_AGE_DEFAULT;

    const response = mapSecurityDocToResponse(doc);
    res.set("Cache-Control", `public, max-age=${maxAge}`);
    res.status(200).json(response);
  } catch {
    res.set("Cache-Control", CACHE_CONTROL_NO_STORE);
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  }
}
