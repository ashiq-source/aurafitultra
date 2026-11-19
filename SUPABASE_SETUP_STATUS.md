# Supabase configuration status

- Project URL is configured in `aurafit-config.js` and `public/aurafit-config.js`.
- The Supabase publishable key supplied by the owner is configured as a browser-safe key.
- No service-role key is present in the project.
- RLS policies were previously created by the owner in the Supabase dashboard.
- Email confirmation is enabled; after confirming an email, sign in from Settings.
- Live authentication and sync still require a browser/device session test.

Before production Android sign-in, verify the exact redirect URLs for the installed app and the web origin in Supabase Authentication URL Configuration.
