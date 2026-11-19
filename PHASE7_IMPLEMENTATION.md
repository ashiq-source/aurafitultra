# AuraFit AI Ultra — Phase 7 Implementation

## Summary
Phase 7 adds a local-first fitness automation workspace to the Phase 6 application. It does not replace the legacy application, reset user data, change the IndexedDB schema version, or introduce a new database store.

## Delivered features

- **Adaptive weekly schedule:** creates a 7-day structure from goal, training-days-per-week and session-length preferences. Preferences, schedule and day-completion state are saved in the existing `settings` store (`phase7_preferences`, `phase7_plan`, `phase7_done`).
- **Smart meal ideas:** surfaces protein-rich options from the existing local `food_catalog` and summarizes today's logged calories/protein against the saved nutrition goal. Food values remain estimates.
- **Workout progression:** exercise library and a set/reps/load logger. Exercise entries are stored in the existing `workout_logs` store with additive fields (`exerciseName`, `sets`, `reps`, `loadKg`). Existing Phase 5/6 workout rows remain readable.
- **Advanced dashboard:** 7-day workout minutes, meal logging days, average logged sleep, activity streak, and a compact daily workout chart.
- **Achievements:** locally computed milestones for workouts, hydration, meal logging, sleep, streaks and strength entries.
- **Reports:** browser Print / Save PDF workflow and workout CSV export.
- **PWA shell:** new `aurafit-ultra-v7-shell` cache namespace and Phase 7 module precache.
- **Responsive and print styles:** desktop/mobile layout and a print stylesheet for report output.

## Storage and privacy

- Existing IndexedDB database: `aurafit_ultra_local`.
- Existing schema: version 2. No upgrade is requested.
- Existing stores reused: `settings`, `workout_logs`, `meal_logs`, `food_catalog`, `sleep_logs`, `weight_logs`, `daily_routines`, `daily_water_totals`, and `nutrition_goals`.
- No new cloud sync or AI upload is added in Phase 7. Phase 6 Gemini consent/proxy flow is unchanged.
- Workout, nutrition and sleep summaries are descriptive records, not medical assessments or predictions.

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000/aurafit-ultra.html`. For production, serve over HTTPS and configure `GEMINI_API_KEY` on the server for the existing Phase 6 AI features. Phase 7 itself does not require Gemini.

## Notes / limitations

- PDF output uses the browser's print dialog; select **Save as PDF**. No server-side PDF engine is bundled.
- Meal ideas are ranked from the existing seeded food catalog by protein amount, not a clinical diet plan.
- Exercise progression compares logged sets/reps/load against earlier entries for the same exercise. It does not automatically increase training loads.
- Reminder behavior remains subject to browser/PWA permissions and background execution limits; reliable scheduled push delivery is not claimed.
- Visual QA in a live browser and production deployment were not performed in this build environment.
