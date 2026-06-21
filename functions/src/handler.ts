import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { getSecurityDoc, updateSecurityPrice } from "./firestore.js";
import { mapSecurityDocToResponse } from "./mapper.js";
import { fetchQuote } from "./finnhub.js";

const TICKER_PATTERN = /^[A-Z0-9._-]+$/;
const CACHE_MAX_AGE_DEFAULT = 604800; // 1 week in seconds
const CACHE_MAX_AGE_PARTIAL_ETF = 3 * 24 * 60 * 60; // 3 days in seconds
const CACHE_MAX_AGE_NOT_FOUND = 4 * 24 * 60 * 60; // 4 days in seconds
const CACHE_MAX_AGE_CLIENT_ERROR = 3 * 24 * 60 * 60; // 3 days in seconds
const CACHE_CONTROL_NO_STORE = "no-store";
const PARTIAL_ETF_THRESHOLD = 0.95;
const STALENESS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PATH_PREFIX = "/api/v1/securities/";

function isStale(refreshedAt: string): boolean {
  const refreshedTime = new Date(refreshedAt).getTime();
  return Date.now() - refreshedTime > STALENESS_MS;
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
