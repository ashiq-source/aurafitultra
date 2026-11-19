# AuraFit AI Ultra — Phase 7

Phase 7 extends the Phase 6 app with adaptive schedules, smart meal ideas, exercise progression, an advanced dashboard, achievements, print-to-PDF reports and workout CSV export.

## Quick start

1. Extract the complete ZIP package.
2. Install Node.js 20 or newer.
3. In the extracted folder run `npm install`.
4. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` only if you use Phase 6 Gemini AI features.
5. Run `npm start`.
6. Visit `http://localhost:3000/aurafit-ultra.html`.
7. Open **Fitness Automation** from the sidebar.

Phase 7 is local-first and reuses the existing IndexedDB v2 stores. Keep a current backup before replacing an older deployed package. Deploy the complete folder, not just the HTML file.

See `PHASE7_IMPLEMENTATION.md` and `PHASE7_TEST_REPORT.md` for details and limitations.
