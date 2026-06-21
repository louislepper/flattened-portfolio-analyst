/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_REMOTE_API?: string;
  // Firebase App Check (reCAPTCHA v3) — all public, set at build time.
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_RECAPTCHA_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
