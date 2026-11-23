/* AuraFit AI Ultra — IndexedDB data layer
 * Version: 2.0.0 | Local-first | No network calls | No legacy LocalStorage writes
 * Load as: <script type="module" src="./aurafit-ultra-data-layer.js"></script>
 */

export const DB_NAME = 'aurafit_ultra_local';
export const DB_VERSION = 2;
export const STORES = Object.freeze({
  profile: { keyPath: 'id', indexes: [['updatedAt', 'updatedAt']] },
  weight_logs: { keyPath: 'id', indexes: [['dateISO', 'dateISO'], ['legacyDate', 'legacyDate'], ['createdAt', 'createdAt']] },
  daily_routines: { keyPath: 'id', indexes: [['time', 'time'], ['enabled', 'enabled']] },
  daily_water_totals: { keyPath: 'dateISO', indexes: [['updatedAt', 'updatedAt']] },
  meal_logs: { keyPath: 'id', indexes: [['dateISO', 'dateISO'], ['createdAt', 'createdAt']] },
  workout_logs: { keyPath: 'id', indexes: [['dateISO', 'dateISO'], ['createdAt', 'createdAt']] },
  sleep_logs: { keyPath: 'id', indexes: [['dateISO', 'dateISO']] },
  food_catalog: { keyPath: 'id', indexes: [['category', 'category'], ['name_en', 'name_en']] },
  nutrition_goals: { keyPath: 'id', indexes: [] },
  ai_history: { keyPath: 'id', indexes: [['createdAt', 'createdAt'], ['module', 'module']] },
  settings: { keyPath: 'key', indexes: [] },
  legacy_snapshots: { keyPath: 'id', indexes: [['createdAt', 'createdAt']] },
  migration_runs: { keyPath: 'id', indexes: [['sourceFingerprint', 'sourceFingerprint'], ['completedAt', 'completedAt']] },
  ai_cache: { keyPath: 'key', indexes: [] },
  app_cache: { keyPath: 'key', indexes: [] }
});

const nowISO = () => new Date().toISOString();
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
export const syncTombstoneKey = (storeName, recordId) => `__aurafit_deleted__:${storeName}:${encodeURIComponent(String(recordId))}`;

export function openAuraFitDB(indexedDBImpl = globalThis.indexedDB) {
  if (!indexedDBImpl) return Promise.reject(new Error('IndexedDB is not available in this browser context.'));
  return new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, definition] of Object.entries(STORES)) {
        const store = db.objectStoreNames.contains(name)
          ? request.transaction.objectStore(name)
          : db.createObjectStore(name, { keyPath: definition.keyPath });
        for (const [indexName, path] of definition.indexes) {
          if (!store.indexNames.contains(indexName)) store.createIndex(indexName, path, { unique: false });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open AuraFit IndexedDB.'));
    request.onblocked = () => reject(new Error('Database upgrade is blocked by another open AuraFit tab. Close other tabs and retry.'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

export class AuraFitStore {
  constructor(db) { this.db = db; }
  static async open() { return new AuraFitStore(await openAuraFitDB()); }
  close() { this.db.close(); }
  async get(storeName, key) {
    this.#assertStore(storeName);
    const tx = this.db.transaction(storeName, 'readonly');
    const done = transactionDone(tx);
    const value = await requestResult(tx.objectStore(storeName).get(key));
    await done;
    return value;
  }
  async getAll(storeName) {
    this.#assertStore(storeName);
    const tx = this.db.transaction(storeName, 'readonly');
    const done = transactionDone(tx);
    const value = await requestResult(tx.objectStore(storeName).getAll());
    await done;
    return value;
  }
  async put(storeName, value) {
    this.#assertStore(storeName);
    const names = storeName === 'settings' ? ['settings'] : [storeName, 'settings'];
    const tx = this.db.transaction(names, 'readwrite');
    const done = transactionDone(tx);
    const resultRequest = tx.objectStore(storeName).put(clone(value));
    if (storeName !== 'settings') {
      const keyPath = STORES[storeName].keyPath;
      const recordId = value?.[keyPath];
      if (recordId !== undefined && recordId !== null) {
        tx.objectStore('settings').delete(syncTombstoneKey(storeName, recordId));
      }
    }
    const result = await requestResult(resultRequest);
    await done;
    return result;
  }
  async delete(storeName, key) {
    this.#assertStore(storeName);
    const names = storeName === 'settings' ? ['settings'] : [storeName, 'settings'];
    const tx = this.db.transaction(names, 'readwrite');
    const done = transactionDone(tx);
    tx.objectStore(storeName).delete(key);
    if (storeName !== 'settings') {
      const deletedAt = nowISO();
      tx.objectStore('settings').put({
        key: syncTombstoneKey(storeName, key),
        syncTombstone: true,
        storeName,
        recordId: String(key),
        deletedAt,
        updatedAt: deletedAt
      });
    }
    await done;
  }
  async exportBackup() {
    const names = ['profile','weight_logs','daily_routines','daily_water_totals','meal_logs','workout_logs','sleep_logs','food_catalog','nutrition_goals','ai_history','settings'];
    const tx = this.db.transaction(names, 'readonly');
    const done = transactionDone(tx);
    const data = {};
    await Promise.all(names.map(async name => { data[name] = await requestResult(tx.objectStore(name).getAll()); }));
    await done;
    return {
      appName: 'AuraFit AI Ultra', backupFormat: 'aurafit-ultra-backup', backupVersion: 2,
      schemaVersion: DB_VERSION, exportedAt: nowISO(), recordCounts: Object.fromEntries(names.map(n => [n, data[n].length])), data
    };
  }
  async importBackup(backup) {
    if (!backup || backup.appName !== 'AuraFit AI Ultra' || backup.backupFormat !== 'aurafit-ultra-backup' || !backup.data || typeof backup.data !== 'object') {
      throw new Error('This file is not a valid AuraFit AI Ultra backup.');
    }
    if (Number(backup.backupVersion) > 2 || Number(backup.schemaVersion) > DB_VERSION) {
      throw new Error('This backup was created by a newer AuraFit version. Update the app before importing it.');
    }
    const names = ['profile','weight_logs','daily_routines','daily_water_totals','meal_logs','workout_logs','sleep_logs','food_catalog','nutrition_goals','ai_history','settings'];
    const counts = {};
    const tx = this.db.transaction(names, 'readwrite');
    const done = transactionDone(tx);
    for (const name of names) {
      const rows = Array.isArray(backup.data[name]) ? backup.data[name] : [];
      const target = tx.objectStore(name);
      counts[name] = 0;
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const key = row[STORES[name].keyPath];
        if (key === undefined || key === null) continue;
        target.put(clone(row));
        if (name !== 'settings') tx.objectStore('settings').delete(syncTombstoneKey(name, key));
        counts[name]++;
      }
    }
    await done;
    const stamp = row => row?.updatedAt || row?.updated_at || row?.createdAt || row?.created_at || '';
    const toTime = value => { const n = Date.parse(value || ''); return Number.isFinite(n) ? n : 0; };
    const restoredSettings = await this.getAll('settings');
    const tombstones = restoredSettings.filter(row => row?.syncTombstone === true && row.storeName !== 'settings' && row.recordId != null);
    const cachedRows = new Map();
    for (const tomb of tombstones) {
      const name = tomb.storeName;
      if (!Object.hasOwn(STORES, name)) continue;
      if (!cachedRows.has(name)) cachedRows.set(name, await this.getAll(name));
      const keyPath = STORES[name].keyPath;
      const existing = cachedRows.get(name).find(row => String(row?.[keyPath]) === String(tomb.recordId));
      if (!existing || toTime(tomb.deletedAt || tomb.updatedAt) >= toTime(stamp(existing))) {
        await this.delete(name, existing ? existing[keyPath] : tomb.recordId);
        if (existing) cachedRows.set(name, cachedRows.get(name).filter(row => String(row?.[keyPath]) !== String(tomb.recordId)));
      } else {
        await this.delete('settings', tomb.key);
      }
    }
    return { counts, restored: Object.values(counts).reduce((sum, count) => sum + count, 0), tombstones: tombstones.length };
  }
  #assertStore(name) { if (!Object.hasOwn(STORES, name)) throw new Error(`Unknown AuraFit store: ${name}`); }
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}
