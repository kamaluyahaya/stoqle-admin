export const memoryCache = new Map<string, any>();

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('StoqleAdminCache', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('api_cache')) {
                db.createObjectStore('api_cache', { keyPath: 'key' });
            }
        };
    });
};

export const setCache = async (key: string, data: any) => {
    memoryCache.set(key, data);
    try {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(['api_cache'], 'readwrite');
            const store = transaction.objectStore('api_cache');
            const request = store.put({ key, data, timestamp: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('IndexedDB set error:', error);
    }
};

export const getCacheSync = (key: string): any => {
    return memoryCache.get(key) || null;
};

export const getCache = async (key: string): Promise<any> => {
    if (memoryCache.has(key)) {
        return memoryCache.get(key);
    }
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['api_cache'], 'readonly');
            const store = transaction.objectStore('api_cache');
            const request = store.get(key);
            request.onsuccess = () => {
                if (request.result) {
                    memoryCache.set(key, request.result.data);
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.warn('IndexedDB get error:', error);
        return null;
    }
};
