/**
 * adminDB.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * General-purpose IndexedDB layer for the Stoqle Admin frontend.
 *
 * Database : stoqle_admin  (version 1)
 * Stores   :
 *   • cache    — key/value entries with TTL (used by all admin queries)
 *   • queue    — offline mutation queue (POST/PATCH/DELETE that failed)
 *   • meta     — ETags, last-sync timestamps, schema versions
 *
 * API surface:
 *   adminDB.get(store, key)               → Promise<T | null>
 *   adminDB.set(store, key, value, ttlMs) → Promise<void>
 *   adminDB.del(store, key)               → Promise<void>
 *   adminDB.clear(store)                  → Promise<void>
 *   adminDB.isStale(store, key)           → Promise<boolean>
 *   adminDB.enqueue(mutation)             → Promise<void>
 *   adminDB.flushQueue()                  → Promise<QueuedMutation[]>
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME    = 'stoqle_admin';
const DB_VERSION = 1;

export type StoreName = 'cache' | 'queue' | 'meta';

interface CacheEntry<T = unknown> {
  key:       string;
  value:     T;
  storedAt:  number;   // Unix ms
  expiresAt: number;   // Unix ms — Infinity means no expiry
}

export interface QueuedMutation {
  id:         string;
  method:     'POST' | 'PATCH' | 'PUT' | 'DELETE';
  endpoint:   string;
  body:       unknown;
  queuedAt:   number;
  retries:    number;
}

// ─── Singleton DB promise ────────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('expiresAt', 'expiresAt');
      }

      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    req.onsuccess  = (e) => { _db = (e.target as IDBOpenDBRequest).result; resolve(_db); };
    req.onerror    = () => reject(req.error);
    req.onblocked  = () => reject(new Error('IndexedDB blocked'));
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tx(
  db:    IDBDatabase,
  store: StoreName,
  mode:  IDBTransactionMode = 'readonly',
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function req2p<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror   = () => rej(r.error);
  });
}

// ─── Core API ────────────────────────────────────────────────────────────────

/** Read an entry from a store (returns null if missing or expired). */
async function get<T = unknown>(store: StoreName, key: string): Promise<T | null> {
  try {
    const db    = await openDB();
    const entry = await req2p<CacheEntry<T> | undefined>(tx(db, store).get(key));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      // expired — evict lazily
      await del(store, key);
      return null;
    }
    return entry.value;
  } catch {
    return null; // never throw — cache miss is not a critical error
  }
}

/** Write an entry with optional TTL (milliseconds). Default: 5 min. */
async function set<T = unknown>(
  store:  StoreName,
  key:    string,
  value:  T,
  ttlMs:  number = 5 * 60 * 1000,
): Promise<void> {
  try {
    const db  = await openDB();
    const now = Date.now();
    const entry: CacheEntry<T> = {
      key,
      value,
      storedAt:  now,
      expiresAt: ttlMs === Infinity ? Infinity : now + ttlMs,
    };
    await req2p(tx(db, store, 'readwrite').put(entry));
  } catch {
    // silent fail — cache write failure must not break the UI
  }
}

/** Delete a single entry. */
async function del(store: StoreName, key: string): Promise<void> {
  try {
    const db = await openDB();
    await req2p(tx(db, store, 'readwrite').delete(key));
  } catch {}
}

/** Clear all entries in a store. */
async function clear(store: StoreName): Promise<void> {
  try {
    const db = await openDB();
    await req2p(tx(db, store, 'readwrite').clear());
  } catch {}
}

/** Returns true if the cached entry is missing or has expired. */
async function isStale(store: StoreName, key: string): Promise<boolean> {
  const val = await get(store, key);
  return val === null;
}

// ─── Mutation Queue ───────────────────────────────────────────────────────────

/** Enqueue a mutation to be replayed when network is available. */
async function enqueue(mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'retries'>): Promise<void> {
  const entry: QueuedMutation = {
    ...mutation,
    id:       `mq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    queuedAt: Date.now(),
    retries:  0,
  };
  await set('queue', entry.id, entry, Infinity);
}

/** Read and clear the entire mutation queue. */
async function flushQueue(): Promise<QueuedMutation[]> {
  try {
    const db    = await openDB();
    const store = tx(db, 'queue');
    const all   = await req2p<QueuedMutation[]>(store.getAll() as IDBRequest<QueuedMutation[]>);
    await clear('queue');
    return all;
  } catch {
    return [];
  }
}

// ─── Exported singleton ───────────────────────────────────────────────────────

const adminDB = { get, set, del, clear, isStale, enqueue, flushQueue };
export default adminDB;
