import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { handler } from "./handler.js";

initializeApp();

const finnhubApiKey = defineSecret("FINNHUB_API_KEY");

export const api = onRequest(
  { secrets: [finnhubApiKey], maxInstances: 10 },
  handler
);
