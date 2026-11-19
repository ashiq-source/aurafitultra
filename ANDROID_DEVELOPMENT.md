# AuraFit AI Ultra — Android + Cloud Foundation

## Current implementation
- Capacitor 7 configuration (`com.aurafit.aiultra`, `public/` webDir).
- Existing Phase 7 web features retained; Phase 8 Pro Coaching Studio reconstructed from the Phase 8 implementation notes available in the project history.
- Local IndexedDB remains available and is not replaced by cloud storage.
- Supabase Auth and opt-in record sync foundation added. Cloud data is isolated by `auth.uid()` using RLS.
- Runtime config is in `public/aurafit-config.js`; it contains only public project URL/anon key and API base URL. Never put Supabase service-role or Gemini keys in client files.
- Gemini requests continue to use the existing protected Express backend. Set `apiBaseUrl` to the HTTPS backend origin for Android builds.

## Create the Supabase project
1. Create a new project at https://supabase.com/dashboard.
2. In SQL Editor, run `supabase-schema.sql`.
3. In Project Settings → API, copy Project URL and the `anon` / publishable key.
4. Put those two public values in `public/aurafit-config.js` (`supabaseUrl`, `supabaseAnonKey`).
5. Set `apiBaseUrl` to the HTTPS origin where the existing Express API is deployed. Configure `GEMINI_API_KEY` only on that server.
6. Configure Supabase Auth email confirmation / redirect URLs for your production domain.

## Install and create native Android project
Requirements: Node.js 20+, Java 17, Android Studio, Android SDK Platform + Build Tools, Android SDK Command-line Tools.

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, build a debug APK for device testing. For release, configure a private signing keystore in Android Studio (never commit it), then Build → Generate Signed Bundle / APK to create APK and AAB. The package scripts `android:build:debug` and `android:build:release` are convenience commands after `npx cap add android`.

## Data safety / known limitations
- The original IndexedDB schema (v2) is retained. No database version bump is made by this Android foundation.
- Cloud sync is opt-in and requires authentication. It currently performs record upsert + pull for existing stores. Deletion tombstones, multi-device conflict UX, encryption-at-rest policy review, and automated sync scheduling still need implementation before calling cloud sync production-complete.
- Current conflict handling is last-write-wins by timestamp and should be reviewed for simultaneous edits.
- Supabase URL/anon key are public client configuration; RLS is the security boundary. Never use a service-role key in the app.
- Capacitor's Android WebView and PWA service worker are separate mechanisms. Native offline behavior must be device-tested; service-worker cache does not guarantee native asset caching.
- APK/AAB have not yet been built or device-tested in this environment. Android SDK / signing credentials are not included.
