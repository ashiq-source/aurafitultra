import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');

test('Pro Coaching writes records with the correct IndexedDB value argument', () => {
  const source = read('./aurafit-phase8.js');
  assert.match(source, /async function save8\(store,value\)/);
  assert.match(source, /objectStore\(store\)\.put\(value\)/);
});

test('Daily summaries use the device local calendar date, not UTC date slicing', () => {
  const app = read('./aurafit-ultra-app.js');
  const p5 = read('./aurafit-phase5.js');
  const p6 = read('./aurafit-phase6.js');
  const p8 = read('./aurafit-phase8.js');
  assert.match(app, /const todayISO = \(\) => \{ const d = new Date\(\)/);
  assert.doesNotMatch(app, /oldUnknown/);
  assert.match(p5, /const localISO=d=>/);
  assert.doesNotMatch(p5, /toISOString\(\)\.slice\(0,\s*10\)/);
  assert.doesNotMatch(p6, /toISOString\(\)\.slice\(0,\s*10\)/);
  assert.doesNotMatch(p8, /toISOString\(\)\.slice\(0,\s*10\)/);
});

test('Local record deletions create tombstones and cloud sync propagates them', () => {
  const layer = read('./aurafit-ultra-data-layer.js');
  const p5 = read('./aurafit-phase5.js');
  const cloud = read('./aurafit-cloud.js');
  assert.match(layer, /syncTombstoneKey/);
  assert.match(layer, /syncTombstone: true/);
  assert.match(p5, /syncTombstone:true/);
  assert.match(cloud, /__aurafit_deleted/);
  assert.match(cloud, /deleteRows\(db,store,uniqueDeletes\)/);
  assert.match(cloud, /\.range\(offset,offset\+999\)/);
  assert.match(cloud, /restoredSettings/);
  assert.match(cloud, /deleteRows\(db,store,deletes\)/);
});

test('Cloud buttons have one event owner to protect the PKCE verifier', () => {
  const android = read('./aurafit-android.js');
  const app = read('./aurafit-ultra-app.js');
  const cloud = read('./aurafit-cloud.js');
  assert.doesNotMatch(android, /addEventListener\(['"]click/);
  assert.match(app, /function bindCloudActions\(\)/);
  assert.match(app, /cloudGoogleSignIn/);
  assert.match(cloud, /oauthInFlight/);
  assert.match(cloud, /callbackInFlight/);
  assert.match(cloud, /already in progress/);
});

test('Local JSON backup can be restored without losing deletion tombstones', () => {
  const layer = read('./aurafit-ultra-data-layer.js');
  const app = read('./aurafit-ultra-app.js');
  const html = read('./aurafit-ultra.html');
  assert.match(layer, /async importBackup\(backup\)/);
  assert.match(layer, /backupFormat: 'aurafit-ultra-backup'/);
  assert.doesNotMatch(layer, /data\.settings = data\.settings\.filter/);
  assert.match(app, /store\.importBackup\(backup\)/);
  assert.match(app, /aurafit:data-imported/);
  assert.match(html, /id="importBackup"/);
  assert.match(html, /id="importBackupFile"/);
});

test('Offline cache includes Gemini and all eight feature modules', () => {
  const sw = read('./service-worker.js');
  assert.match(sw, /aurafit-ultra-v11-bundled-android/);
  assert.match(sw, /bundles\/aurafit-gemini\.js/);
  assert.match(sw, /aurafit-phase8\.js/);
});

test('Android bundles do not depend on uncached split chunks', () => {
  const build = read('./scripts/build-android-web.mjs');
  assert.match(build, /splitting: false/);
  assert.match(build, /bundle: true/);
});

test('Web content security policy permits only the required cloud APIs', () => {
  const server = read('./server.js');
  assert.match(server, /loqndxqwvhdhtujpneup\.supabase\.co/);
  assert.match(server, /www\.googleapis\.com/);
  assert.match(server, /auth\.getUser\(bearer\[1\]\)/);
  assert.match(server, /A valid AuraFit sign-in session is required/);
});
