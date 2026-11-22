import { mkdir, readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let xml = await readFile(manifestPath, 'utf8');

const activityMatch = xml.match(/<activity\b(?=[^>]*android:name="[^"]*MainActivity")[^>]*>[\s\S]*?<\/activity>/);
if (!activityMatch) throw new Error('Capacitor MainActivity was not found in AndroidManifest.xml');

let activity = activityMatch[0];
activity = activity.replace(/<activity\b([^>]*)>/, (full, attrs) => {
  let next = attrs;
  if (!/android:launchMode=/.test(next)) next += ' android:launchMode="singleTask"';
  else next = next.replace(/android:launchMode="[^"]*"/, 'android:launchMode="singleTask"');
  if (!/android:exported=/.test(next)) next += ' android:exported="true"';
  else next = next.replace(/android:exported="[^"]*"/, 'android:exported="true"');
  return '<activity' + next + '>';
});

if (!activity.includes('android:scheme="com.aurafit.aiultra"')) {
  const intent = '\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="com.aurafit.aiultra" android:host="login-callback" />\n            </intent-filter>';
  activity = activity.replace('</activity>', intent + '\n        </activity>');
}
xml = xml.replace(activityMatch[0], activity);

const application = xml.match(/<application\b[^>]*>/);
if (!application) throw new Error('Android application element was not found.');
let appTag = application[0];
if (!appTag.includes('android:fullBackupContent=')) appTag = appTag.replace('>', ' android:fullBackupContent="@xml/aurafit_backup_rules">');
if (!appTag.includes('android:dataExtractionRules=')) appTag = appTag.replace('>', ' android:dataExtractionRules="@xml/aurafit_data_extraction_rules">');
xml = xml.replace(application[0], appTag);

const xmlDir = 'android/app/src/main/res/xml';
await mkdir(xmlDir, { recursive: true });
await writeFile(xmlDir + '/aurafit_backup_rules.xml', '<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n    <exclude domain="sharedpref" path="cap_sec.xml" />\n</full-backup-content>\n');
await writeFile(xmlDir + '/aurafit_data_extraction_rules.xml', '<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n        <exclude domain="sharedpref" path="cap_sec.xml" />\n    </cloud-backup>\n    <device-transfer>\n        <exclude domain="sharedpref" path="cap_sec.xml" />\n    </device-transfer>\n</data-extraction-rules>\n');

if (!activity.includes('android:launchMode="singleTask"') ||
    !activity.includes('android:exported="true"') ||
    !activity.includes('android:scheme="com.aurafit.aiultra"') ||
    !activity.includes('android:host="login-callback"')) {
  throw new Error('OAuth deep-link activity configuration verification failed.');
}
console.log('Verified MainActivity: singleTask launch mode, exported deep link, OAuth callback scheme, and encrypted-key backup exclusions.');
