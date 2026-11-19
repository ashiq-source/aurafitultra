# AuraFit AI Ultra — শুরু করার নির্দেশনা

## এই প্যাকেজে যা আছে
- Phase 1–7-এর অ্যাপ ও ডেটা-লেয়ার
- Phase 8 Pro Coaching Studio (পূর্ববর্তী scope অনুযায়ী reconstructed)
- Capacitor 7 Android configuration (`com.aurafit.aiultra`)
- Supabase Auth ও opt-in cloud record sync foundation
- পুরোনো LocalStorage/backup data migration tools
- Android build-এর GitHub Actions workflow

## কম্পিউটারে ওয়েব প্রিভিউ
Node.js 20+ ইনস্টল থাকা কম্পিউটারে:

```bash
npm install
npm start
```

তারপর ব্রাউজারে `http://localhost:3000` খুলুন। শুধু UI দ্রুত দেখতে চাইলে project folder থেকে `python -m http.server 8080 --directory public` চালিয়ে `http://localhost:8080/aurafit-ultra.html` খুলতে পারেন।

## APK/AAB তৈরি
1. ZIP extract করে সম্পূর্ণ project GitHub repository-তে upload করুন।
2. GitHub-এর **Actions** tab খুলুন।
3. **AuraFit Android Build** workflow নির্বাচন করে **Run workflow** চাপুন।
4. Workflow সফল হলে run-এর **Artifacts** অংশ থেকে APK ও AAB নিন।

Workflow debug APK এবং release AAB তৈরি করে। Release AAB এখানে unsigned থাকবে; Play Store-এ প্রকাশের আগে Android Studio/নিজস্ব secure keystore দিয়ে sign করতে হবে। Debug APK Android ফোনে test করার জন্য।

## Supabase
- Project URL ও publishable key `public/aurafit-config.js`-এ আছে। এগুলো client-side public config; service-role key ব্যবহার করা হয়নি।
- `supabase-schema.sql` হলো RLS schema reference। আপনার Supabase dashboard-এ আগে table ও চারটি RLS policy তৈরি করা হয়ে থাকলে আবার চালানোর প্রয়োজন নেই।
- Sign-up-এ email confirmation চালু থাকলে ইমেইল confirm করে তারপর sign in করুন।
- Cloud sync Settings থেকে নিজে sign in করে **Sync now** চাপলে শুরু হবে। Local IndexedDB ডেটা ডিভাইসে থাকবে।

## গুরুত্বপূর্ণ সীমাবদ্ধতা
- Phase 8 অনুপস্থিত মূল ZIP থেকে byte-for-byte উদ্ধার নয়; project notes অনুযায়ী reconstructed।
- এই build-এ live Supabase sign-in/sync, real-device UI, email deep-link callback এবং Gemini production endpoint end-to-end যাচাই করা হয়নি।
- Cloud sync opt-in foundation; delete tombstones, robust simultaneous-edit conflict resolution, retry/backoff ও background sync এখনো production-hardening বাকি।
- Supabase Auth email confirmation redirect URL Android app-এর deep-link configuration-এর সঙ্গে মিলিয়ে নিতে হবে।
- Gemini secret কখনো `public/` বা browser config-এ রাখবেন না; server environment variable-এ রাখতে হবে।
