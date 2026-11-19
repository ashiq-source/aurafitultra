# AuraFit AI Ultra — Phase 6

Phase 6 adds a Smart Intelligence page. It uses the existing local IndexedDB data layer; no DB upgrade is required.

## Run
1. Replace the deployed app with the Phase 6 package contents.
2. Run `npm install` if dependencies are not installed.
3. Configure `GEMINI_API_KEY` in the server environment (never in browser code).
4. Run `npm start` and open `http://localhost:3000/aurafit-ultra.html`.

AI planning requires explicit consent on each request. Sharing activity summaries is a separate opt-in checkbox. The API key is never included in the client bundle. Production use should be served over HTTPS.
