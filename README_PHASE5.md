# AuraFit AI Ultra — Phase 5

This is the Phase 5 continuation of the Phase 4 bundle. It adds nutrition, workout, sleep and progress-reporting features.

## Run locally

1. Keep a backup of the existing AuraFit data before replacing the deployed files.
2. Extract this ZIP.
3. Run `npm install` if dependencies are not already installed.
4. Configure `.env` as described in `README_PHASE4.md` if using Gemini.
5. Run `npm start` and open `http://localhost:3000/aurafit-ultra.html`.

The app upgrades the existing IndexedDB database to schema version 2. Existing records are retained; the upgrade adds only `food_catalog` and `nutrition_goals` stores. Close other AuraFit tabs if the upgrade is blocked.

## Phase 5 highlights

- Meal log with approximate calories and macros for 20 starter foods.
- Editable calorie/protein/carbohydrate/fat goals.
- Workout history and duration tracking.
- Sleep duration and self-rated quality tracking.
- 7/30-day report with daily calorie bars and CSV meal export.
- Bengali/English labels for the Phase 5 workspace and food names.

See `PHASE5_IMPLEMENTATION.md` and `PHASE5_TEST_REPORT.md` for scope and limitations.
