import { readFile, writeFile } from 'node:fs/promises';

const gradlePath = 'android/app/build.gradle';
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const androidVariables = await readFile('android/variables.gradle', 'utf8');
if (!/targetSdkVersion\s*=\s*36/.test(androidVariables)) throw new Error('Capacitor Android project must target API 36 for current Play Store submissions.');
const runNumber = Number(process.env.GITHUB_RUN_NUMBER);
const versionCode = Number.isSafeInteger(runNumber) && runNumber > 0 ? runNumber : 1;
const versionName = String(packageJson.version || '1.0.0');
let gradle = await readFile(gradlePath, 'utf8');

if (!/\bversionCode\s+\d+/.test(gradle)) {
  throw new Error('Android defaultConfig versionCode was not found.');
}
if (!/\bversionName\s+['"][^'"]+['"]/.test(gradle)) {
  throw new Error('Android defaultConfig versionName was not found.');
}

gradle = gradle.replace(/\bversionCode\s+\d+/, 'versionCode ' + versionCode);
gradle = gradle.replace(/\bversionName\s+['"][^'"]+['"]/, 'versionName "' + versionName + '"');
await writeFile(gradlePath, gradle);
console.log('Android version set to ' + versionName + ' (' + versionCode + ').');
