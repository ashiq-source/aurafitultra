/* AuraFit AI Ultra — non-destructive legacy migration engine.
 * Accepts a read-only LocalStorage snapshot {key: rawString} OR AuraFit AI backup v2.5.
 * Never writes/removes legacy LocalStorage keys. Never persists API credentials.
 */
import { DB_NAME, DB_VERSION, STORES, openAuraFitDB } from './aurafit-ultra-data-layer.js';

const LEGACY_KEYS = Object.freeze([
  'aurafit_lang','aurafit_gemini_key','aurafit_fast_model','aurafit_cached_ai_tip',
  'aurafit_auto_snapshot','aurafit_start_weight','aurafit_target_weight','aurafit_weight_logs',
  'gymSchedule_v3','triggeredToday_v3','savedDate_v3','waterIntake_v3'
]);
const SECRET_KEYS = new Set(['aurafit_gemini_key']);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = s => ISO_DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0,10) === s;
const stamp = () => new Date().toISOString();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const isObject = x => !!x && typeof x === 'object' && !Array.isArray(x);
const finite = x => x !== '' && x !== null && x !== undefined && Number.isFinite(Number(x));
const safeNumber = x => finite(x) ? Number(x) : null;
const safeJson = (raw, fallback, label, warnings) => {
  if (raw == null || raw === '') return fallback;
  try { return JSON.parse(raw); } catch { warnings.push(`${label}: invalid JSON; preserved in quarantine archive.`); return fallback; }
};
const stableStringify = value => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
function fnv1a(text) {
  let h = 0x811c9dc5;
  for (let i=0; i<text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8,'0');
}
async function fingerprint(value) {
  const text = stableStringify(value);
  if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2,'0')).join('');
  }
  return `fnv1a-${fnv1a(text)}`;
}
function parseLocalSnapshot(input, warnings, quarantine) {
  const raw = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (SECRET_KEYS.has(key)) { raw[key] = '[REDACTED — NOT MIGRATED]'; continue; }
    raw[key] = value;
  }
  const read = key => input?.[key] ?? null;
  const json = (key, fallback) => safeJson(read(key), fallback, key, warnings);
  const weightLogs = json('aurafit_weight_logs', []);
  const schedule = json('gymSchedule_v3', []);
  const triggered = json('triggeredToday_v3', {});
  const emergency = json('aurafit_auto_snapshot', null);
  const tip = json('aurafit_cached_ai_tip', null);
  if (!Array.isArray(weightLogs)) { quarantine.push({field:'aurafit_weight_logs', value:weightLogs, reason:'Expected an array.'}); }
  if (!Array.isArray(schedule)) { quarantine.push({field:'gymSchedule_v3', value:schedule, reason:'Expected an array.'}); }
  if (!isObject(triggered)) quarantine.push({field:'triggeredToday_v3', value:triggered, reason:'Expected an object.'});
  return {
    sourceType:'localStorage-snapshot', rawArchive:raw,
    lang:read('aurafit_lang'), startWeight:read('aurafit_start_weight'), targetWeight:read('aurafit_target_weight'),
    weightLogs:Array.isArray(weightLogs)?weightLogs:[], schedule:Array.isArray(schedule)?schedule:[],
    waterIntake:read('waterIntake_v3'), savedDate:read('savedDate_v3'), triggered:isObject(triggered)?triggered:{},
    emergency, tip, fastModel:read('aurafit_fast_model'), quarantine
  };
}
function parseLegacyBackup(input, warnings, quarantine) {
  if (input.appName !== 'AuraFit AI' || String(input.backupVersion) !== '2.5') {
    warnings.push('Backup header differs from the audited AuraFit AI v2.5 format; fields will be inspected conservatively.');
  }
  const weightLogs = input.weightLogs ?? [];
  const schedule = input.schedule ?? [];
  if (!Array.isArray(weightLogs)) quarantine.push({field:'weightLogs',value:weightLogs,reason:'Expected an array.'});
  if (!Array.isArray(schedule)) quarantine.push({field:'schedule',value:schedule,reason:'Expected an array.'});
  return {
    sourceType:'legacy-backup-v2.5', rawArchive:{...input,apiKey: input.apiKey ? '[REDACTED — NOT MIGRATED]' : undefined},
    lang:input.lang, startWeight:input.startWeight, targetWeight:input.targetWeight,
    weightLogs:Array.isArray(weightLogs)?weightLogs:[], schedule:Array.isArray(schedule)?schedule:[],
    waterIntake:input.waterIntake, savedDate:null, triggered:{}, emergency:null, tip:null, fastModel:null,
    bodyMetrics:isObject(input.bodyMetrics)?input.bodyMetrics:{}, quarantine
  };
}
function normalizeSource(input) {
  const warnings = [], quarantine = [];
  if (!isObject(input)) throw new TypeError('Migration input must be an object.');
  const looksLikeSnapshot = LEGACY_KEYS.some(k => Object.hasOwn(input,k));
  const source = looksLikeSnapshot ? parseLocalSnapshot(input,warnings,quarantine) : parseLegacyBackup(input,warnings,quarantine);
  return {source,warnings,quarantine};
}
function validWeight(v) { return finite(v) && Number(v) > 0 && Number(v) <= 500; }
function deterministicId(prefix, fp, index, item) { return `${prefix}-${fp.slice(0,12)}-${index}-${fnv1a(stableStringify(item))}`; }
function normalizeDate(raw) {
  if (typeof raw !== 'string') return {dateISO:null, datePrecision:'unknown'};
  const s = raw.trim();
  if (validDay(s)) return {dateISO:s, datePrecision:'day'};
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso && validDay(iso[1])) return {dateISO:iso[1], datePrecision:'day'};
  return {dateISO:null, datePrecision:'unknown'};
}
function makeRecords(source, fp, quarantine, warnings) {
  const createdAt = stamp();
  const records = Object.fromEntries(['profile','weight_logs','daily_routines','daily_water_totals','settings','legacy_snapshots','ai_cache','app_cache'].map(k=>[k,[]]));
  const profile = {id:'primary', createdAt, updatedAt:createdAt, schemaVersion:DB_VERSION, source:'legacy', legacyPayload:{}};
  if (source.startWeight != null && source.startWeight !== '') {
    if (validWeight(source.startWeight)) profile.startWeightKg = Number(source.startWeight);
    else quarantine.push({field:'startWeight',value:source.startWeight,reason:'Weight must be a finite number greater than 0 and at most 500 kg.'});
    profile.legacyPayload.startWeightRaw = source.startWeight;
  }
  if (source.targetWeight != null && source.targetWeight !== '') {
    if (validWeight(source.targetWeight)) profile.targetWeightKg = Number(source.targetWeight);
    else quarantine.push({field:'targetWeight',value:source.targetWeight,reason:'Weight must be a finite number greater than 0 and at most 500 kg.'});
    profile.legacyPayload.targetWeightRaw = source.targetWeight;
  }
  for (const [key,value] of Object.entries(source.bodyMetrics || {})) {
    if (value !== '' && value != null) profile.legacyPayload[`bodyMetrics_${key}_raw`] = value;
    if (key === 'weightKg' && validWeight(value)) profile.currentWeightKg = Number(value);
    if (key === 'age' && finite(value) && Number(value)>0 && Number(value)<=120) profile.ageYears = Number(value);
    if (key === 'feet' && finite(value) && Number(value)>=0 && Number(value)<=8) profile.heightFeet = Number(value);
    if (key === 'inches' && finite(value) && Number(value)>=0 && Number(value)<12) profile.heightInches = Number(value);
  }
  if (Object.keys(profile).some(k=>!['id','createdAt','updatedAt','schemaVersion','source','legacyPayload'].includes(k))) records.profile.push(profile);

  source.weightLogs.forEach((item,index)=>{
    if (!isObject(item) || !validWeight(item.weight)) { quarantine.push({field:'weightLogs',index,value:item,reason:'Expected an object with a valid weight (0–500 kg).'}); return; }
    const date = normalizeDate(item.date);
    records.weight_logs.push({id:deterministicId('legacy-weight',fp,index,item), weightKg:Number(item.weight), note:typeof item.note==='string'?item.note:'',
      legacyDate:item.date == null ? null : String(item.date), legacyIndex:index, ...date,
      createdAt, updatedAt:createdAt, schemaVersion:DB_VERSION, source:'legacy', legacyPayload:clone(item)});
  });
  source.schedule.forEach((item,index)=>{
    if (!isObject(item) || typeof item.time!=='string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time)) {
      quarantine.push({field:'schedule',index,value:item,reason:'Expected a schedule object with a valid 24-hour HH:MM time.'}); return;
    }
    const originalId = item.id == null ? `row-${index}` : String(item.id);
    records.daily_routines.push({...clone(item), id:`legacy-routine-${fp.slice(0,8)}-${index}-${fnv1a(originalId)}`,
      legacyOriginalId:item.id ?? null, createdAt, updatedAt:createdAt, schemaVersion:DB_VERSION, source:'legacy', legacyPayload:clone(item)});
  });
  if (source.lang != null) {
    if (['bn','en'].includes(source.lang)) records.settings.push({key:'language',value:source.lang,updatedAt:createdAt,source:'legacy'});
    else { quarantine.push({field:'language',value:source.lang,reason:'Only bn or en is supported.'}); warnings.push('Unsupported language preference was quarantined.'); }
  }
  const water = source.waterIntake;
  if (water != null && water !== '') {
    if (finite(water) && Number(water)>=0 && Number(water)<=20000) {
      const marker = typeof source.savedDate==='string' ? source.savedDate : null;
      const date = normalizeDate(marker);
      records.daily_water_totals.push({dateISO:date.dateISO || `legacy-unknown-${fp.slice(0,16)}`, totalMl:Number(water),
        datePrecision:date.datePrecision, legacyDateMarker:marker, createdAt, updatedAt:createdAt, schemaVersion:DB_VERSION, source:'legacy'});
      if (!date.dateISO) warnings.push('Legacy water total imported with an unknown date marker; no historical day was guessed.');
    } else quarantine.push({field:'waterIntake',value:water,reason:'Water total must be between 0 and 20,000 ml.'});
  }
  if (source.emergency != null) records.legacy_snapshots.push({id:`legacy-emergency-${fp.slice(0,16)}`,kind:'emergency-snapshot',payload:clone(source.emergency),createdAt,source:'legacy'});
  if (source.triggered && Object.keys(source.triggered).length) records.legacy_snapshots.push({id:`legacy-alarm-state-${fp.slice(0,16)}`,kind:'alarm-runtime-state',payload:clone(source.triggered),createdAt,source:'legacy'});
  if (source.rawArchive) records.legacy_snapshots.push({id:`legacy-raw-${fp.slice(0,16)}`,kind:'redacted-legacy-source',payload:source.rawArchive,createdAt,source:'legacy',secretsRedacted:true});
  if (source.tip && isObject(source.tip) && typeof source.tip.text==='string' && source.tip.text.length<10000) {
    records.ai_cache.push({key:'legacy-daily-tip',value:source.tip,updatedAt:createdAt,source:'legacy'});
  }
  if (source.fastModel) records.app_cache.push({key:'legacy-model-hint',value:String(source.fastModel),needsRevalidation:true,updatedAt:createdAt,source:'legacy'});
  return records;
}

export async function prepareMigration(input) {
  const {source,warnings,quarantine} = normalizeSource(input);
  // Fingerprint is computed over secret-redacted raw input; the actual API key is never stored.
  const fingerprintInput = source.rawArchive ?? {sourceType:source.sourceType, weightLogs:source.weightLogs, schedule:source.schedule};
  const sourceFingerprint = await fingerprint(fingerprintInput);
  const records = makeRecords(source,sourceFingerprint,quarantine,warnings);
  const counts = Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v.length]));
  return Object.freeze({
    id:`migration-${sourceFingerprint.slice(0,20)}`, sourceType:source.sourceType, sourceFingerprint,
    preparedAt:stamp(), counts, totalValid:Object.values(counts).reduce((a,b)=>a+b,0),
    quarantinedCount:quarantine.length, quarantine:clone(quarantine), warnings:[...warnings], records,
    secretPolicy:'Gemini API key excluded from IndexedDB, migration archive, and Ultra backups.'
  });
}

export async function inspectMigration(preview, db = null) {
  if (!preview?.sourceFingerprint || !preview.records) throw new TypeError('A valid migration preview is required.');
  const ownDb = !db;
  const database = db || await openAuraFitDB();
  try {
    const tx = database.transaction(['migration_runs',...Object.keys(preview.records)],'readonly');
    const txDone = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    const prior = await new Promise((resolve,reject)=>{const r=tx.objectStore('migration_runs').index('sourceFingerprint').get(preview.sourceFingerprint);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
    const existing = {};
    await Promise.all(Object.keys(preview.records).map(async name=>{
      existing[name] = await new Promise((resolve,reject)=>{const r=tx.objectStore(name).count();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    }));
    await txDone;
    return {alreadyMigrated:!!prior, priorRun:prior, existingCounts:existing, previewCounts:preview.counts};
  } finally { if (ownDb) database.close(); }
}

export async function commitMigration(preview, {confirmed=false, allowQuarantined=false, db=null}={}) {
  if (!confirmed) throw new Error('Explicit confirmation is required before writing to IndexedDB.');
  if (preview.quarantinedCount && !allowQuarantined) throw new Error(`Migration contains ${preview.quarantinedCount} quarantined item(s). Review them before allowing import.`);
  const ownDb = !db;
  const database = db || await openAuraFitDB();
  try {
    const checkTx = database.transaction('migration_runs','readonly');
    const previous = await new Promise((resolve,reject)=>{const r=checkTx.objectStore('migration_runs').index('sourceFingerprint').get(preview.sourceFingerprint);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
    if (previous) return {status:'already-migrated',run:previous};

    const recordStoreNames = Object.keys(preview.records);
    // Read collision state before opening the write transaction. This keeps the
    // write transaction free of awaited requests and avoids auto-commit races.
    const existingKeys = {};
    if (recordStoreNames.length) {
      const readTx = database.transaction(recordStoreNames,'readonly');
      const readDone = new Promise((resolve,reject)=>{readTx.oncomplete=resolve;readTx.onerror=()=>reject(readTx.error);readTx.onabort=()=>reject(readTx.error);});
      await Promise.all(recordStoreNames.map(async name => {
        const keys = await new Promise((resolve,reject)=>{const r=readTx.objectStore(name).getAllKeys();r.onsuccess=()=>resolve(new Set(r.result));r.onerror=()=>reject(r.error);});
        existingKeys[name] = keys;
      }));
      await readDone;
    }
    const storeNames = [...recordStoreNames,'migration_runs'];
    const tx = database.transaction(storeNames,'readwrite');
    const writeDone = new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Migration transaction failed.'));tx.onabort=()=>reject(tx.error||new Error('Migration transaction aborted.'));});
    const put = (name,value) => tx.objectStore(name).put(value);
    const report = {id:preview.id,sourceFingerprint:preview.sourceFingerprint,sourceType:preview.sourceType,
      startedAt:stamp(),completedAt:null,status:'committing',counts:clone(preview.counts),quarantinedCount:preview.quarantinedCount,
      quarantine:clone(preview.quarantine),warnings:[...preview.warnings],schemaVersion:DB_VERSION};
    try {
      for (const [storeName,items] of Object.entries(preview.records)) {
        const keyPath = STORES[storeName].keyPath;
        const seen = existingKeys[storeName] || new Set();
        for (const original of items) {
          const record = clone(original);
          const key = record[keyPath];
          if (seen.has(key)) {
            // Never overwrite pre-existing user data. A deterministic alternate key preserves the legacy row.
            if (storeName==='profile') { record.id=`legacy-${preview.sourceFingerprint.slice(0,16)}`; record.legacyCollisionWith='primary'; }
            else if (storeName==='settings' || storeName==='ai_cache' || storeName==='app_cache') { record.key=`legacy-import:${preview.sourceFingerprint.slice(0,16)}:${record.key}`; record.legacyCollisionWith=key; }
            else if (storeName==='daily_water_totals') { record.dateISO=`legacy-import-${preview.sourceFingerprint.slice(0,16)}`; record.legacyCollisionWith=key; }
            else { record.id=`${String(key).slice(0,100)}-import-${preview.sourceFingerprint.slice(0,12)}`; record.legacyCollisionWith=key; }
          }
          const finalKey = record[keyPath];
          if (seen.has(finalKey)) throw new Error(`A destination key collision could not be resolved in ${storeName}: ${finalKey}`);
          seen.add(finalKey);
          put(storeName,record);
        }
      }
      report.completedAt=stamp(); report.status='completed';
      put('migration_runs',report);
    } catch (error) { try { tx.abort(); } catch {} throw error; }
    await writeDone;
    return {status:'completed',run:report};
  } finally { if (ownDb) database.close(); }
}

export async function migrateLegacyData(input, options={}) {
  const preview = await prepareMigration(input);
  const inspection = await inspectMigration(preview,options.db||null);
  if (inspection.alreadyMigrated) return {preview,inspection,result:{status:'already-migrated',run:inspection.priorRun}};
  if (!options.confirmed) return {preview,inspection,result:{status:'preview-only'}};
  const result = await commitMigration(preview,options);
  return {preview,inspection,result};
}

export function readLegacyLocalStorageSnapshot(storage = globalThis.localStorage) {
  if (!storage) throw new Error('LocalStorage is unavailable.');
  const snapshot = {};
  // Capture all current keys, including unknown future keys; do not mutate storage.
  for (let i=0; i<storage.length; i++) {
    const key = storage.key(i);
    if (key != null) snapshot[key] = storage.getItem(key);
  }
  return snapshot;
}

export function redactLegacySecrets(snapshot) {
  const copy = {...snapshot};
  for (const key of SECRET_KEYS) if (Object.hasOwn(copy,key)) copy[key] = '[REDACTED — NOT MIGRATED]';
  return copy;
}
