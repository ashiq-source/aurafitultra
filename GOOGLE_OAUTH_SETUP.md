# Google Sign-In, AuraFit Cloud Sync and Google Drive Backup

## What the app now supports

- Google sign-in through Supabase Auth (OAuth + PKCE).
- Per-account AuraFit Cloud Sync in `public.aurafit_records`, protected by Supabase Row Level Security.
- Manual Google Drive JSON backup and latest-backup restore using the Google Drive API.
- Local IndexedDB remains available. Cloud sync and Drive backup happen only after the user presses the relevant button.
- Restore merges records by their existing IDs; unrelated local records are not deleted.

## Required one-time provider setup

The app code cannot create OAuth credentials for your Google Cloud or Supabase projects. Complete these steps before Google sign-in / Drive API can work:

1. Open Google Cloud Console and select/create the project used for AuraFit.
2. In **APIs & Services → Library**, enable **Google Drive API**.
3. In **Google Auth Platform / OAuth consent screen**, configure the app. During testing, choose External and add the Google accounts that will test the app as test users.
4. Add the OAuth scopes: `openid`, `email`, `profile`, and `https://www.googleapis.com/auth/drive.file`.
5. In **APIs & Services → Credentials**, create an OAuth Client ID of type **Web application**.
6. Add this exact Authorized redirect URI to that OAuth client:
   `https://loqndxqwvhdhtujpneup.supabase.co/auth/v1/callback`
7. In Supabase Dashboard → **Authentication → Providers → Google**, enable Google and paste the Google OAuth Client ID and Client Secret. Save.
8. In Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**, add:
   - `com.aurafit.aiultra://login-callback`
   - The exact HTTPS origin/path where the browser version of AuraFit is hosted (use a wildcard path if required by your hosting URL).
9. Keep the existing `aurafit_records` table and its RLS policies. Do not put the Google Client Secret, Google refresh token, or Supabase service-role key in the app repository.

## First test

1. Install the newest Android build.
2. Open Settings → Google account & private backup → Continue with Google.
3. Complete Google's consent screen and return to AuraFit.
4. Press **Sync with AuraFit Cloud** to upload/download the signed-in user's private records.
5. Press **Back up to Drive**. Confirm a file named `AuraFit-AI-Ultra-Backup-YYYY-MM-DD.json` appears in the user's Google Drive.
6. On a second device signed into the same Google account, use **Sync with AuraFit Cloud** or **Restore latest backup**.

## Important limitations

- Google OAuth must be configured in Google Cloud and Supabase before the buttons can complete sign-in.
- Google Drive API access uses the `drive.file` scope: AuraFit can create and read the backup files it creates, not browse the user's entire Drive.
- Drive access tokens are held in memory by the app. If they expire or the app restarts, sign in with Google again before a Drive action.
- Cloud Sync is manual in this release. It does not yet run continuously in the background.
- Record deletion tombstones and conflict-resolution UI are not implemented; do not treat this as a multi-device database replication service.
- Test Google sign-in and Drive restore on a real Android device before production release.
