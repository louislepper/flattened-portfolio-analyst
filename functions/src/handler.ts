import type { Request } from "firebase-functions/v2/https";
import type { Response } from "express";
import { getSecurityDoc } from "./firestore.js";
import { mapSecurityDocToResponse } from "./mapper.js";

const TICKER_PATTERN = /^[A-Z0-9._-]+$/;
const CACHE_MAX_AGE = 604800; // 1 week in seconds
const PATH_PREFIX = "/api/v1/securities/";

export async function handler(
  req: Request,
  res: Response
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({
      error: "METHOD_NOT_ALLOWED",
      message: "Only GET requests are supported",
    });
    return;
  }

  const path = req.path;
  const ticker = path.startsWith(PATH_PREFIX)
    ? path.slice(PATH_PREFIX.length)
    : "";

  if (!ticker || !TICKER_PATTERN.test(ticker.toUpperCase())) {
    res.status(400).json({
      error: "BAD_REQUEST",
      message: "Invalid ticker format",
    });
    return;
  }

  try {
    const doc = await getSecurityDoc(ticker);

    if (!doc) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Security not found",
      });
      return;
    }

    const response = mapSecurityDocToResponse(doc);
    res.set(
      "Cache-Control",
      `public, max-age=${CACHE_MAX_AGE}`
    );
    res.status(200).json(response);
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    });
  }
}
