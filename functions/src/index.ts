import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { handler } from "./handler.js";

initializeApp();

const finnhubApiKey = defineSecret("FINNHUB_API_KEY");
const launchDarklySdkKey = defineSecret("LAUNCHDARKLY_SDK_KEY");

export const api = onRequest(
  { secrets: [finnhubApiKey, launchDarklySdkKey], maxInstances: 10 },
  handler
);
