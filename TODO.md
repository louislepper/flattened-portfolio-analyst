# TODO

Backend cost-hardening and caching work. Architecture recap: the React frontend
(`src/`) fires **one `GET /api/v1/securities/{ticker}` per holding** (plus per ETF
constituent) at a single Cloud Functions v2 / Cloud Run handler. Firebase Hosting
rewrites `/api/**` → the `api` function (`firebase.json`) and its CDN caches `200`
responses by URL. Each invocation does one Firestore read; Finnhub is only called
when a doc exists **and** is >7 days stale. The cheap-to-run abuse vectors are
**uncached error responses** and **query-string cache-busting**, both of which
force function invocations + Firestore reads. Items below close those off and add
defense-in-depth.

---

- [x] **Error response caching** — set `Cache-Control` on 404/400/405/500 in `functions/src/handler.ts`
  - **Why:** Only the `200` path currently sets `Cache-Control` (line ~89). All
    error responses have no cache header, so Firebase's CDN never caches them and
    every junk/unknown-ticker request costs a function invocation (+ a Firestore
    read for the 404 path, which runs `getSecurityDoc` first). This is the cheapest
    attack to run against the app.
  - **Where:** the four `res.status(...)` branches in `handler.ts` — `405`
    (method not allowed), `400` (bad ticker), `404` (not found), `500` (catch).
  - **Do:** add `res.set("Cache-Control", "public, max-age=...")` to each error
    branch. Suggested: 404 → `3600` (1h), 400/405 → long (e.g. `86400`), 500 →
    short or `no-store` (don't cache transient server errors). Add a named constant
    per the existing style (file already defines `CACHE_MAX_AGE_*` constants).
  - **Test:** `functions/src/__tests__/handler.test.ts` already builds a mock
    `res` that records `headers` via `res.set`. Add assertions that error branches
    set `Cache-Control`. Run `cd functions && npm test`.

- [x] **Set `maxInstances`** on the `api` function in `functions/src/index.ts`
  - **Why:** No instance ceiling today, so under load/attack Cloud Run scales out
    and bills CPU+memory+invocations with no cap. A `maxInstances` bound puts a
    ceiling on the blast radius (and bill).
  - **Where:** `index.ts` — `onRequest({ secrets: [finnhubApiKey] }, handler)`.
  - **Do:** add `maxInstances: <N>` to the options object. Pick a number that
    covers real concurrency with headroom (e.g. 10–20 for a personal app) — note
    a low cap also throttles legitimate bursts, so don't set it to 1. Optionally
    also set `concurrency` (v2 default 80 req/instance) and trim `memory`/`cpu`.
  - **Test:** no unit test needed; `cd functions && npm run build` to confirm it
    compiles. Mention the chosen value in the commit message.

- [x] **Change partial-ETF `max-age` to 3 days** (`CACHE_MAX_AGE_PARTIAL_ETF` in `functions/src/handler.ts`)
  - **Why:** Partial ETFs (constituents summing ≤ `PARTIAL_ETF_THRESHOLD` = 0.95)
    currently get `max-age=60` (1 min), so they re-hit the function ~every minute.
    Bumping to 3 days cuts those repeat invocations dramatically.
  - **Where:** `const CACHE_MAX_AGE_PARTIAL_ETF = 60;` (line ~9).
  - **Do:** change to `3 * 24 * 60 * 60` (259200) and update the trailing comment
    from "1 minute" to "3 days". Confirm `isPartialEtf`/`PARTIAL_ETF_THRESHOLD`
    logic is unchanged.
  - **Caveat to flag:** partial ETFs are likely "partial" because constituent data
    is incomplete/being backfilled; a 3-day cache means stale/incomplete holdings
    persist longer for users. Confirm that trade-off is acceptable (it's the point
    of the change, but worth a sentence in the PR).
  - **Test:** update the partial-ETF case in `handler.test.ts` to expect the new
    `max-age`. `cd functions && npm test`.

- [x] **Add Firebase App Check (reCAPTCHA v3)** — register site, init on client, verify token in handler
  - **Implemented (code):** client init in `src/api/appCheck.ts` (dynamic-imported
    `firebase`, so it's code-split and tree-shaken out entirely when the
    `VITE_FIREBASE_*` / `VITE_RECAPTCHA_SITE_KEY` build vars are absent), wired
    into `src/main.tsx` `bootstrap()` and the `X-Firebase-AppCheck` header into
    `src/api/client.ts`. Server verifies in `functions/src/handler.ts` via
    `getAppCheck().verifyToken`, gated by the `APP_CHECK_ENFORCED` env flag so
    the verifying code ships **before** rejection is turned on (monitor → enforce).
  - **Deviation from the suggestion above:** the 401 is returned with
    `Cache-Control: no-store`, **not** a long-cached header. Firebase's CDN keys
    by URL and does not vary on the App Check header, so a cached 401 from a
    tokenless request would be served to legitimate token-bearing users for the
    same ticker. The 401 is placed after ticker validation and before the
    Firestore read, so it still saves the read cost for invalid tokens.
  - **Remaining manual steps (not codeable here — need the Firebase console):**
    1. Register the web app + reCAPTCHA v3 provider under App Check; copy the web
       config + site key into `.env` (see `.env.example`) for the production build.
    2. Deploy the client so it starts sending tokens.
    3. Watch App Check metrics in "unenforced" mode, then set `APP_CHECK_ENFORCED=true`
       on the `api` function (and enable enforcement in the console) once verified.
  - **Why:** Gates the API to traffic from the real frontend, the single biggest
    reducer of junk traffic. Verifying the token lets the handler reject before the
    Firestore read / Finnhub call — **but the function is still invoked** to do the
    verification, so this complements (not replaces) the error-caching + maxInstances
    items rather than preventing invocations.
  - **Client side (`src/`):**
    - There is currently **no** Firebase client SDK or `initializeApp` in `src/`
      (the app talks to `/api/v1` via Hosting rewrites with plain `fetch`). You'll
      need to add the `firebase` dependency (`npm i firebase`) and a small init
      module that calls `initializeApp(firebaseConfig)` + `initializeAppCheck(...,
      { provider: new ReCaptchaV3Provider(SITE_KEY), isTokenAutoRefreshEnabled:
      true })`. Wire it into `src/main.tsx` `bootstrap()` (before render).
    - Attach the App Check token to every API request: in `src/api/client.ts`
      (`fetchSecurity`), call `getToken(appCheck)` and send it as the
      `X-Firebase-AppCheck` header. This is the only place `fetch` is issued, so
      one change covers both the per-holding and per-constituent calls.
    - Keep MSW tests working: `src/api/client.test.ts` and the MSW handlers in
      `src/mocks/` don't know about App Check — guard init so it's skipped in
      DEV/test (mirror the existing `import.meta.env.DEV` MSW guard in `main.tsx`),
      or mock `getToken`.
  - **Server side (`functions/`):** in `handler.ts`, read `X-Firebase-AppCheck`,
    verify with `getAppCheck().verifyToken(token)` from `firebase-admin/app-check`
    (already have `firebase-admin`), and return `401` (with a `Cache-Control` per
    the first item) on missing/invalid token, before `getSecurityDoc`. Update
    `handler.test.ts` (mock the app-check verify like `firestore`/`finnhub` are
    mocked) so existing 200 tests still pass.
  - **Config/secrets:** needs the Firebase web config + reCAPTCHA v3 **site key**
    (public, fine in client bundle) registered in the Firebase console under App
    Check. Register the provider and enable enforcement on the function only after
    the client is shipping tokens (else you lock out real users).
  - **Sequencing:** do this **after** the error-caching item so the new 401 path
    is already cache-friendly, and roll out in "unenforced/monitor" mode first.

- [x] **Reject requests with query params** — early `400` in `functions/src/handler.ts` before `getSecurityDoc`
  - **Why:** Firebase's CDN includes the query string in the cache key, so
    `GET /securities/AAPL?x=<random>` bypasses the edge cache and forces a function
    invocation + Firestore read even for otherwise-cached tickers. The API takes no
    query params, so any query string is illegitimate. Rejecting early (before the
    Firestore read) removes the read cost. **The function is still invoked** —
    this only saves the DB read, not the invocation.
  - **Where:** top of `handler.ts`, after the method check, before/around the
    ticker parse. Check `req.query` (Express populates it) — if it has any keys,
    `res.status(400)` with a `Cache-Control` (see first item) and return.
  - **Deferred alternative if this is actually abused at volume:** front the
    function with Cloud CDN + a load balancer (or Cloudflare) and normalize the
    cache key with `includeQueryString: false` so query-busted requests collapse
    to one cached entry — stops the invocation entirely, not just the DB read.
    Bigger infra change; only worth it if query-busting becomes a real cost.
  - **Test:** add a `handler.test.ts` case: request with `query: { x: "1" }`
    returns `400` and does **not** call `getSecurityDoc` (assert the mock wasn't
    called). `cd functions && npm test`.

---

**General notes for whoever picks these up**
- Backend tests: `cd functions && npm test` (vitest). Build: `npm run build`.
- Frontend tests: `npm test` at repo root (vitest + MSW; mocks in `src/mocks/`).
- Branch per item (or per related pair); don't commit/push unless asked.
- Suggested order: error caching → maxInstances + partial-ETF (trivial) →
  query-param reject → App Check (largest, do last, roll out unenforced first).
