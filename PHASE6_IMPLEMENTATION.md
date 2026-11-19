# AuraFit AI Ultra — Phase 6

## Delivered
- Smart Intelligence workspace with desktop and mobile navigation.
- Goal, experience, weekly availability, session duration and limitation preferences; saved locally in the existing `settings` store (`phase6_preferences`).
- On-device summaries of recent weight records, 7-day workout minutes, average logged sleep and average calories on days with food logs.
- Explicit per-request consent before Gemini submission; optional separate opt-in for recent weight/workout/sleep/nutrition summaries.
- New `personalized` AI task on the existing protected `/api/ai/generate` endpoint. Gemini API key remains server-side.
- AI output saved as plain text in existing `ai_history` store.
- PWA cache namespace v6 includes `aurafit-phase6.js`.

## Data and compatibility
- No IndexedDB version bump and no new object stores. Existing `settings` and `ai_history` stores are reused.
- Phase 1–5 records are not deleted or rewritten. Original `aurafit_app2.html` remains separate and unchanged.
- Context is not sent unless the user checks the include-context option. Preferences are included in the AI request after explicit consent.

## Safety and limitations
- General wellness guidance only; no diagnosis, treatment, medical scoring or guaranteed outcomes.
- Trend summaries are descriptive; sparse/incomplete logs are not interpreted as a prediction.
- AI requires a configured server-side `GEMINI_API_KEY` and a reachable backend. Live Gemini API call was not run in this build environment.
- Browser interaction/manual QA on target devices remains recommended before production deployment.
