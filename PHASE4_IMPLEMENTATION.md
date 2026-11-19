# AuraFit AI Ultra — Phase 4

## Delivered
- Installable PWA manifest, app icon, service worker and offline app-shell caching.
- Optional foreground reminder notifications. Browser notification permission is requested only after a user click.
- Gemini AI Coach: chat, meal plan, workout plan, recovery guide and progress review.
- Explicit per-request consent; selected fitness context is included only when separately checked.
- AI answers are rendered as text (not HTML) and saved to the local `ai_history` IndexedDB store.
- Node/Express Gemini proxy. API key is read only from the server environment; it is never sent to the browser or returned by the health endpoint.
- Request validation, payload limits, rate limiting, timeouts, security headers and optional origin allowlist.

## Start locally
1. Install Node.js 20+.
2. `npm install`
3. Copy `.env.example` to `.env`; set `GEMINI_API_KEY` from Google AI Studio. Never commit `.env`.
4. `npm start`
5. Open `http://localhost:3000/aurafit-ultra.html`.

`GEMINI_MODEL` defaults to `gemini-2.5-flash`; change it to a model enabled for your Google project if needed. `GET /api/health` reports only whether a key is configured and the model name, never the key.

## AI privacy flow
- User must check the AI consent box for each request.
- Fitness context is excluded unless the separate context checkbox is checked.
- Only a small summary (latest/recent weights, goals, today's water and enabled routine labels/times) is sent. No name, email, full record database, backup, legacy archive or API key is sent.
- AI responses are stored locally in `ai_history`; no automatic cloud history is enabled.
- Clear consent after each request. Avoid submitting sensitive personal/medical data.

## PWA and notifications
- HTTPS is required for production service workers and installation (localhost is allowed for development).
- Shell assets are cached; `/api/*` is never cached. The app shell can open offline, but Gemini requires internet.
- Reminders can notify while the app is open and the browser is permitted to run it. This is not push delivery and does not guarantee alarms after the browser/app is closed or suspended. True background push needs a push service, VAPID keys, subscription storage and a deployed worker endpoint; not included.

## Deployment
- Deploy the Node app behind HTTPS.
- Configure `GEMINI_API_KEY`, `GEMINI_MODEL`, `NODE_ENV=production`, `ALLOWED_ORIGINS` (exact origin(s)), and `TRUST_PROXY=1` only behind one trusted proxy.
- Use platform secret management, not a committed `.env`.
- Configure billing/quotas in Google AI Studio/Cloud; monitor upstream usage.
- The current endpoint is rate-limited by IP but has no user authentication. Before broad public deployment, add authentication or an abuse-control layer (e.g. CAPTCHA/edge rate limits), stricter per-user quotas and monitoring.
- The static frontend and API are same-origin by default. If split across domains, implement explicit CORS and CSRF protections before use; do not simply wildcard CORS.

## Data compatibility
- Phase 2 IndexedDB schema and migration engine remain unchanged.
- Phase 3 dashboard data remains local-first.
- Original `aurafit_app2.html` and legacy LocalStorage keys are not modified or cleared.
