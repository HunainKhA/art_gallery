// High-Performance Browser Caching for Mainframe Gallery
// Combines ultra-fast RAM memory cache with persistent IndexedDB storage
// Handles 10,000+ artworks (5MB+) without localStorage limits

const DB_NAME = 'MainframeArtGallery_v1';
const STORE_NAME = 'query_cache';
const MEMORY_CACHE = new Map();

// Open IndexedDB safely with fallback
function openCacheDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieves cached data by key.
 * Checks fast RAM first, then IndexedDB.
 * @param {string} key 
 * @param {number} maxAgeMs - Maximum age in milliseconds (default: 10 minutes)
 * @returns {Promise<any|null>}
 */
export async function getCachedData(key, maxAgeMs = 10 * 60 * 1000) {
  const now = Date.now();

  // 1. Check RAM Memory Cache (0ms latency)
  if (MEMORY_CACHE.has(key)) {
    const entry = MEMORY_CACHE.get(key);
    if (now - entry.timestamp < maxAgeMs) {
      return entry.data;
    }
  }

  // 2. Check Persistent IndexedDB (< 15ms latency)
  try {
    const db = await openCacheDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          const record = req.result;
          if (!record || !record.data) {
            return resolve(null);
          }
          if (now - record.timestamp > maxAgeMs) {
            return resolve(null); // expired
          }
          // Populate RAM for subsequent instant access
          MEMORY_CACHE.set(key, { data: record.data, timestamp: record.timestamp });
          resolve(record.data);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Stores data in both RAM Memory and persistent IndexedDB.
 * @param {string} key 
 * @param {any} data 
 */
export async function setCachedData(key, data) {
  if (!data) return;
  const now = Date.now();

  // 1. Store in RAM Memory
  MEMORY_CACHE.set(key, { data, timestamp: now });

  // 2. Store in IndexedDB
  try {
    const db = await openCacheDB();
    if (!db) return;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put({ data, timestamp: now }, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    // Fail silently
  }
}

/**
 * Clears all cached items from both memory and IndexedDB.
 */
export async function clearAllCache() {
  MEMORY_CACHE.clear();
  try {
    const db = await openCacheDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {}
}
