# AuraFit AI Ultra — Phase 4 package

## Quick start (Node.js 20+)
```bash
npm install
cp .env.example .env
# Edit .env and set your Gemini key from Google AI Studio.
npm start
```
Open `http://localhost:3000/aurafit-ultra.html` (or `http://localhost:3000/`). For PWA installation on production, use HTTPS. `localhost` is treated as a secure context for development.

## Server secret
Set `GEMINI_API_KEY` only in the backend environment / hosting provider's secret manager. Never put it in HTML, JavaScript, LocalStorage, IndexedDB, or a committed `.env` file. The browser calls same-origin `/api/ai/generate`; only `server.js` calls Gemini.

## Production essentials
- Set `NODE_ENV=production` and `ALLOWED_ORIGINS` to the exact site origin(s).
- Keep the app and API same-origin unless you intentionally configure CORS/CSRF protections.
- Configure `TRUST_PROXY=1` only behind one trusted reverse proxy.
- Add user authentication or stronger anti-abuse controls before making an unauthenticated AI endpoint broadly public.
- Monitor Google AI usage and set quotas/budget alerts.

## Tests
```bash
npm test
npm run check
```

## Data safety
The original legacy HTML and legacy LocalStorage are not changed. Phase 2 IndexedDB/migration files are included. PWA shell caching does not cache API responses. AI data is sent only after per-request consent; the separate context checkbox controls whether the selected fitness summary is included.
