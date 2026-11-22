import { mkdir, readFile, writeFile } from 'node:fs/promises';
const path='android/app/src/main/AndroidManifest.xml';
let xml=await readFile(path,'utf8');
if(!xml.includes('android:scheme="com.aurafit.aiultra"')){
 const match=xml.match(/<activity\b[^>]*>[\s\S]*?<\/activity>/);
 if(!match)throw new Error('Capacitor MainActivity was not found in AndroidManifest.xml');
 const intent='\n            <intent-filter>\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="com.aurafit.aiultra" android:host="login-callback" />\n            </intent-filter>\n        ';
 xml=xml.replace(match[0],match[0].replace('</activity>',intent+'</activity>'));
}
const application=xml.match(/<application\b[^>]*>/);
if(!application)throw new Error('Android application element was not found.');
let appTag=application[0];
if(!appTag.includes('android:fullBackupContent='))appTag=appTag.replace('>', ' android:fullBackupContent="@xml/aurafit_backup_rules">');
if(!appTag.includes('android:dataExtractionRules='))appTag=appTag.replace('>', ' android:dataExtractionRules="@xml/aurafit_data_extraction_rules">');
xml=xml.replace(application[0],appTag);
const xmlDir='android/app/src/main/res/xml';
await mkdir(xmlDir,{recursive:true});
await writeFile(xmlDir+'/aurafit_backup_rules.xml','<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n    <exclude domain="sharedpref" path="cap_sec.xml" />\n</full-backup-content>\n');
await writeFile(xmlDir+'/aurafit_data_extraction_rules.xml','<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n    <cloud-backup>\n        <exclude domain="sharedpref" path="cap_sec.xml" />\n    </cloud-backup>\n    <device-transfer>\n        <exclude domain="sharedpref" path="cap_sec.xml" />\n    </device-transfer>\n</data-extraction-rules>\n');
console.log('AuraFit OAuth deep link configured; encrypted Gemini key storage excluded from Android backups.');
