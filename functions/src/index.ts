import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { handler } from "./handler.js";

initializeApp();

export const api = onRequest(handler);
