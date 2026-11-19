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
    const tx = this.db.transaction(storeName, 'readwrite');
    const done = transactionDone(tx);
    const result = await requestResult(tx.objectStore(storeName).put(clone(value)));
    await done;
    return result;
  }
  async delete(storeName, key) {
    this.#assertStore(storeName);
    const tx = this.db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    await transactionDone(tx);
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
  #assertStore(name) { if (!Object.hasOwn(STORES, name)) throw new Error(`Unknown AuraFit store: ${name}`); }
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
  });
}
