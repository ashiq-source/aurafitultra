# AuraFit AI Ultra — Phase 3

## Deliverable
A new, standalone premium responsive web application is added without modifying `aurafit_app2.html` or the Phase 2 migration tools.

Files:
- `aurafit-ultra.html` — application shell and views.
- `aurafit-ultra.css` — dark purple/blue responsive design system.
- `aurafit-ultra-app.js` — UI logic and IndexedDB integration.
- `aurafit-ultra-data-layer.js` — Phase 2 IndexedDB layer (unchanged).
- `aurafit-migration-engine.js` and `migration-console.html` — Phase 2 migration tools (unchanged).

## Implemented views and interactions
- Overview dashboard with current weight, water progress, active reminders, and next reminder.
- Routine manager: add, edit, enable/disable and delete reminders.
- Weight tracker: add and delete entries, weight history, trend chart.
- Hydration tracker: quick-add 150/250/500 ml, custom amount, daily total and progress.
- Settings: start/target weight, configurable daily water goal, language, secure backup export, refresh and migration-console link.
- Bengali/English UI toggle.
- AI Coach information view explaining why Gemini is not yet connected.
- First-install starter reminders are seeded only when the database has no routines and no migration history. Existing migrated data is never replaced.

## Data behavior
- Uses `aurafit_ultra_local` IndexedDB through the Phase 2 `AuraFitStore`.
- Weight entries, routines, water totals, language and preferences are written to their corresponding stores.
- Backup uses the Phase 2 `exportBackup()` method, which excludes credentials and internal migration archives.
- No LocalStorage writes, no automatic cloud sync, and no Gemini API requests.
- Existing `aurafit_app2.html` is not edited.

## Security boundary
Gemini is intentionally shown as not configured. The legacy app stored an API key in LocalStorage and sent it from the browser. Phase 3 does not repeat that pattern. Gemini features should be enabled only after a server-side proxy is deployed with the API key stored as a server secret and explicit user consent for sending selected context.

## Run locally
Serve this folder from localhost or HTTPS (ES modules and IndexedDB require an origin), for example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/aurafit-ultra.html`.

For a real migration, serve the migration console on the same origin as the legacy app's LocalStorage. Do not delete old keys or replace the old HTML until the user verifies migrated records and the new app.

## Known limitations
- This is a responsive web app, not yet an installable PWA (manifest/service worker/push notification support are not included).
- Browser reminders are displayed in the app; background alarms are not implemented in this phase.
- Gemini server proxy is not implemented; AI Coach remains safely gated.
- Automated browser testing was performed only in the current Chromium build; cross-browser and mobile-device acceptance is still required.
