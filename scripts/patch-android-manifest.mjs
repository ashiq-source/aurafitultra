import { readFile, writeFile } from 'node:fs/promises';
const path='android/app/src/main/AndroidManifest.xml';
let xml=await readFile(path,'utf8');
if(!xml.includes('android:scheme="com.aurafit.aiultra"')){
 const match=xml.match(/<activity\b[^>]*>[\s\S]*?<\/activity>/);
 if(!match)throw new Error('Capacitor MainActivity was not found in AndroidManifest.xml');
 const intent='\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="com.aurafit.aiultra" android:host="login-callback" />\n            </intent-filter>\n        ';
 xml=xml.replace(match[0],match[0].replace('</activity>',intent+'</activity>'));
 await writeFile(path,xml);
}
console.log('AuraFit Google OAuth deep link configured.');
