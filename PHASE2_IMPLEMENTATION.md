# AuraFit AI Ultra — Phase 2 Implementation

## Included
- `aurafit-ultra-data-layer.js`: IndexedDB v1 schema, typed store wrapper, safe Ultra backup export.
- `aurafit-migration-engine.js`: read-only LocalStorage snapshot capture, v2.5 backup parsing, normalization, quarantine, fingerprint/idempotency, preview and transactional commit.
- `migration-console.html`: standalone review/confirm UI for same-origin browser migration.
- `PHASE2_TEST_REPORT.md`: static and automated checks.

## Database
Name: `aurafit_ultra_local`, version 1. Stores: `profile`, `weight_logs`, `daily_routines`, `daily_water_totals`, `meal_logs`, `workout_logs`, `sleep_logs`, `ai_history`, `settings`, `legacy_snapshots`, `migration_runs`, plus optional `ai_cache` and `app_cache`.

## Safe execution
1. Deploy these three files under the same HTTPS origin as the legacy app (or test with a local web server). Do not open the console with `file://`.
2. Keep the old app and its existing LocalStorage. Export a legacy v2.5 JSON backup first if available.
3. Open `migration-console.html` in the same browser profile and same origin. Choose **Read this origin’s LocalStorage** or upload the backup.
4. Review record counts, warnings and quarantined rows. Download the redacted snapshot as an additional offline record.
5. Tick the authorization checkbox. If quarantine exists, review it and separately authorize valid-only import.
6. Click **Confirm & Import**. Verify the completion report and inspect the new app before any legacy cleanup.

## Data mapping and conservative rules
- Legacy weight dates are preserved verbatim as `legacyDate`; only strict ISO dates are promoted to `dateISO`.
- Legacy schedule objects preserve their original payload and fields; the new record receives a deterministic key and keeps `legacyOriginalId`.
- Water total is retained with the original date marker. If the date cannot be safely normalized, a clearly labelled `legacy-unknown-*` key is used with `datePrecision: "unknown"`.
- Alarm dedupe state and emergency snapshots are retained in `legacy_snapshots`; they are not treated as new user activity.
- No historical water/meal/workout/sleep/chat records are fabricated.
- Gemini key is redacted from the archive and excluded from IndexedDB and new backup exports. Rotate any key previously shared in a backup.
- Existing IndexedDB records are never overwritten; collisions are imported under a deterministic alternate key.

## Important boundary
The migration console can only read LocalStorage belonging to its own browser origin and profile. This build does not access the user's browser remotely. A migration is not considered complete until the user runs the console against their real legacy origin and verifies the result.
