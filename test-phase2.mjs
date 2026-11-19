import assert from 'node:assert/strict';
import { prepareMigration, readLegacyLocalStorageSnapshot, redactLegacySecrets } from './aurafit-migration-engine.js';

const values = new Map([
  ['aurafit_lang','bn'],['aurafit_gemini_key','AIza-DO-NOT-STORE'],
  ['aurafit_start_weight','78.5'],['aurafit_target_weight','70'],
  ['aurafit_weight_logs',JSON.stringify([{date:'Nov 17, 2026',weight:78.5,note:'first'},{date:'Nov 18, 2026',weight:77.9,note:'second'}])],
  ['gymSchedule_v3',JSON.stringify([{id:7,time:'07:30',title:'হাঁটা',title_en:'Walk',desc:'সকাল',desc_en:'Morning',enabled:true,customField:'keep'}])],
  ['waterIntake_v3','1250'],['savedDate_v3','Tue Nov 17 2026'],
  ['triggeredToday_v3',JSON.stringify({'Tue Nov 17 2026_7_07:30':true})],
  ['aurafit_auto_snapshot',JSON.stringify({reason:'test',timestamp:'x',startWeight:'78.5'})],
  ['unrecognized_future_key','preserve me']
]);
const mockStorage={get length(){return values.size;},key(i){return [...values.keys()][i]??null;},getItem(k){return values.get(k)??null;}};
const snapshot=readLegacyLocalStorageSnapshot(mockStorage);
assert.equal(snapshot.aurafit_gemini_key,'AIza-DO-NOT-STORE');
const redacted=redactLegacySecrets(snapshot);
assert.equal(redacted.aurafit_gemini_key,'[REDACTED — NOT MIGRATED]');
const p1=await prepareMigration(snapshot);
const p2=await prepareMigration(snapshot);
assert.equal(p1.sourceFingerprint,p2.sourceFingerprint,'fingerprint must be stable');
assert.equal(p1.counts.weight_logs,2);
assert.equal(p1.counts.daily_routines,1);
assert.equal(p1.counts.daily_water_totals,1);
assert.equal(p1.records.weight_logs[0].legacyDate,'Nov 17, 2026');
assert.equal(p1.records.weight_logs[0].dateISO,null,'ambiguous legacy date must not be guessed');
assert.equal(p1.records.daily_routines[0].legacyPayload.customField,'keep');
assert.equal(p1.records.daily_water_totals[0].datePrecision,'unknown');
assert.equal(p1.records.profile[0].startWeightKg,78.5);
const serialized=JSON.stringify(p1.records)+JSON.stringify(p1.quarantine);
assert.ok(!serialized.includes('AIza-DO-NOT-STORE'),'API key must not enter migration records');
assert.ok(!serialized.includes('AIza-DO-NOT-STORE'),'credential value must not be persisted in records');
assert.ok(p1.records.legacy_snapshots.find(x=>x.kind==='redacted-legacy-source').payload.aurafit_gemini_key==='[REDACTED — NOT MIGRATED]');
assert.ok(p1.records.legacy_snapshots.some(x=>x.kind==='redacted-legacy-source'));
assert.ok(p1.records.legacy_snapshots.some(x=>x.kind==='emergency-snapshot'));
assert.ok(p1.records.legacy_snapshots.some(x=>x.kind==='alarm-runtime-state'));
const backup=await prepareMigration({appName:'AuraFit AI',backupVersion:'2.5',startWeight:'80',targetWeight:'68',weightLogs:[],schedule:[],waterIntake:'1000',lang:'en',apiKey:'SECRET',bodyMetrics:{age:'25',feet:'5',inches:'6'}});
assert.equal(backup.records.settings[0].value,'en');
assert.equal(backup.records.profile[0].ageYears,25);
assert.ok(!JSON.stringify(backup.records).includes('SECRET'));
assert.equal(backup.records.legacy_snapshots.find(x=>x.kind==='redacted-legacy-source').payload.apiKey,'[REDACTED — NOT MIGRATED]');
console.log('PASS: LocalStorage snapshot is read-only and captures unknown keys.');
console.log('PASS: Stable source fingerprint; legacy dates preserved without guessing.');
console.log('PASS: Schedule unknown fields, water marker, alarm state and emergency snapshot preserved.');
console.log('PASS: Gemini key excluded from migration records and redacted archive.');
console.log('PASS: Legacy v2.5 backup parsing and profile metrics mapping.');
