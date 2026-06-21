import type { AppCheck } from 'firebase/app-check';

// Firebase web config + reCAPTCHA v3 site key. All public values (safe in the
// client bundle) supplied at build time via Vite env vars. When they are absent
// — local dev, tests, or a build without App Check configured — initialisation
// is skipped and the API is called without a token (the backend only enforces
// tokens when APP_CHECK_ENFORCED is set, so this degrades gracefully).
//
// The Firebase SDK is loaded via dynamic import so it is code-split into its own
// chunk and only downloaded when App Check is actually configured.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let appCheck: AppCheck | null = null;

/**
 * Initialise Firebase App Check with the reCAPTCHA v3 provider. No-ops when the
 * config/site key are absent or when already initialised, so it is safe to call
 * unconditionally during bootstrap. Await it before issuing API requests so a
 * token is available on the first call when enforcement is enabled.
 */
export async function initAppCheck(): Promise<void> {
  if (appCheck || !recaptchaSiteKey || !firebaseConfig.apiKey) {
    return;
  }

  const [{ initializeApp }, { initializeAppCheck, ReCaptchaV3Provider }] =
    await Promise.all([import('firebase/app'), import('firebase/app-check')]);

  const app = initializeApp(firebaseConfig);
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Return the current App Check token, or null when App Check is not initialised
 * or a token cannot be obtained. Callers attach it as the X-Firebase-AppCheck
 * header; a null token simply means no header is sent.
 */
export async function getAppCheckToken(): Promise<string | null> {
  if (!appCheck) {
    return null;
  }

  try {
    const { getToken } = await import('firebase/app-check');
    const { token } = await getToken(appCheck);
    return token;
  } catch {
    return null;
  }
}
