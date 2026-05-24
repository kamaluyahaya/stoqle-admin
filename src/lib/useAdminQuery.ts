/**
 * useAdminQuery.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * GraphQL-style cache-first data-fetching hook for the Stoqle Admin frontend.
 *
 * Strategy (Stale-While-Revalidate):
 *   1. On mount  → read from IndexedDB immediately → set state (instant UI)
 *   2. Always    → fire network fetch in the background
 *   3. On fresh  → update IndexedDB + push new state → UI reflects silently
 *   4. Cross-tab → BroadcastChannel propagates updates to all open admin tabs
 *
 * Usage:
 *   const { data, isLoading, isSyncing, refetch } = useAdminQuery({
 *     queryKey: 'users:page:1',
 *     fetcher:  () => api.get('/users').then(r => r.data.data),
 *     ttl:      2 * 60 * 1000,   // optional, default 5 min
 *     onSuccess: (data) => {},    // optional side-effect
 *   });
 *
 *  isLoading  → true only when there is NO cached data at all (first visit)
 *  isSyncing  → true while the background refetch is in flight (even if we
 *               already showed cached data)
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import adminDB from './adminDB';

// ─── BroadcastChannel (cross-tab sync) ───────────────────────────────────────

const CHANNEL_NAME = 'stoqle_admin_sync';

interface SyncMessage {
  type:     'INVALIDATE' | 'UPDATE';
  queryKey: string;
  payload?: unknown;
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

/** Broadcast a cache update to all other admin tabs. */
export function broadcastUpdate(queryKey: string, payload: unknown): void {
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncMessage = { type: 'UPDATE', queryKey, payload };
  ch.postMessage(msg);
  ch.close();
}

/** Broadcast a cache invalidation (forces refetch in other tabs). */
export function broadcastInvalidate(queryKey: string): void {
  const ch = getChannel();
  if (!ch) return;
  const msg: SyncMessage = { type: 'INVALIDATE', queryKey };
  ch.postMessage(msg);
  ch.close();
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminQueryOptions<T> {
  /** Unique key — used as IndexedDB cache key. */
  queryKey:    string;
  /** Async function that fetches fresh data from the API. */
  fetcher:     () => Promise<T>;
  /**
   * Cache TTL in milliseconds.
   * Default 5 minutes. Use `Infinity` to cache forever.
   */
  ttl?:        number;
  /** Called once when fresh data arrives (either from cache or network). */
  onSuccess?:  (data: T) => void;
  /** Disable automatic background refetch — only serves from cache. */
  cacheOnly?:  boolean;
  /** If true, disables caching entirely — always fetches. */
  noCache?:    boolean;
}

export interface AdminQueryResult<T> {
  data:       T | null;
  isLoading:  boolean;    // no cached data, waiting for first fetch
  isSyncing:  boolean;    // background refetch in flight
  error:      Error | null;
  refetch:    () => void; // manually trigger a fresh fetch + cache update
  invalidate: () => void; // wipe cache + refetch
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAdminQuery<T = unknown>({
  queryKey,
  fetcher,
  ttl       = 5 * 60 * 1000,
  onSuccess,
  cacheOnly = false,
  noCache   = false,
}: AdminQueryOptions<T>): AdminQueryResult<T> {
  const [data,      setData]      = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error,     setError]     = useState<Error | null>(null);

  // Prevent state updates after unmount
  const mounted    = useRef(true);
  const fetchingRef = useRef(false);

  // Keep latest callbacks in refs to avoid recreating fetchFromNetwork on every render
  const fetcherRef = useRef(fetcher);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    fetcherRef.current = fetcher;
    onSuccessRef.current = onSuccess;
  });

  // ── 1. Load from IndexedDB cache ────────────────────────────────────────
  const loadFromCache = useCallback(async (): Promise<T | null> => {
    if (noCache) return null;
    const cached = await adminDB.get<T>('cache', queryKey);
    return cached;
  }, [queryKey, noCache]);

  // ── 2. Fetch from network + write to cache ───────────────────────────────
  const fetchFromNetwork = useCallback(async (): Promise<void> => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (mounted.current) setIsSyncing(true);

    try {
      const fresh = await fetcherRef.current();
      if (!mounted.current) return;

      // Update state immediately
      setData(fresh);
      setError(null);
      setIsLoading(false);

      // Persist to IndexedDB
      if (!noCache) {
        await adminDB.set('cache', queryKey, fresh, ttl);
        // Broadcast to other tabs
        broadcastUpdate(queryKey, fresh);
      }

      onSuccessRef.current?.(fresh);
    } catch (err) {
      if (!mounted.current) return;
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      // Don't wipe existing cached data on error
    } finally {
      if (mounted.current) setIsSyncing(false);
      fetchingRef.current = false;
    }
  }, [queryKey, ttl, noCache]);

  // ── 3. Main orchestration ────────────────────────────────────────────────
  const run = useCallback(async () => {
    // Step 1: try cache
    const cached = await loadFromCache();

    if (cached !== null && mounted.current) {
      setData(cached);
      setIsLoading(false);      // instant display from cache
      onSuccessRef.current?.(cached);
    }

    // Step 2: background refetch (unless cacheOnly)
    if (!cacheOnly) {
      await fetchFromNetwork();
    } else if (cached === null && mounted.current) {
      // cacheOnly but nothing in cache — show empty state
      setIsLoading(false);
    }
  }, [loadFromCache, fetchFromNetwork, cacheOnly]);

  // ── 4. Initial load ──────────────────────────────────────────────────────
  useEffect(() => {
    mounted.current = true;
    run();
    return () => { mounted.current = false; };
  }, [run]);

  // ── 5. BroadcastChannel listener (cross-tab updates) ────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(CHANNEL_NAME);
      ch.onmessage = (e: MessageEvent<SyncMessage>) => {
        if (e.data.queryKey !== queryKey) return;
        if (!mounted.current) return;

        if (e.data.type === 'UPDATE' && e.data.payload !== undefined) {
          setData(e.data.payload as T);
          setIsLoading(false);
        } else if (e.data.type === 'INVALIDATE') {
          run(); // re-run the full strategy
        }
      };
    } catch {}

    return () => { ch?.close(); };
  }, [queryKey, run]);

  // ── 6. Public API ────────────────────────────────────────────────────────
  const refetch = useCallback(() => {
    fetchingRef.current = false; // reset lock
    fetchFromNetwork();
  }, [fetchFromNetwork]);

  const invalidate = useCallback(async () => {
    await adminDB.del('cache', queryKey);
    broadcastInvalidate(queryKey);
    fetchingRef.current = false;
    setData(null);
    setIsLoading(true);
    run();
  }, [queryKey, run]);

  return { data, isLoading, isSyncing, error, refetch, invalidate };
}

// ─── Convenience multi-query hook ────────────────────────────────────────────

export interface MultiQuerySpec<T> {
  queryKey: string;
  fetcher:  () => Promise<T>;
  ttl?:     number;
}

/**
 * useAdminQueries — runs multiple queries in parallel, each with their own
 * cache key, serving cached data immediately while syncing all in background.
 *
 * Returns an array matching the order of specs, each with the same shape
 * as useAdminQuery.
 */
export function useAdminQueries<T extends unknown[]>(
  specs: { [K in keyof T]: MultiQuerySpec<T[K]> }
): { [K in keyof T]: AdminQueryResult<T[K]> } {
  // We implement this by composing individual useState/useEffect per spec.
  // Because React hooks count must be static, we pre-allocate 10 slots.
  // Any spec beyond slot 10 silently returns a no-op (practical limit).
  const MAX = 10;
  const padded = [...specs, ...Array(MAX - specs.length).fill(null)].slice(0, MAX) as (MultiQuerySpec<unknown> | null)[];

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const results = padded.map((spec) => useAdminQuery({
    queryKey: spec?.queryKey ?? '__noop__',
    fetcher:  spec?.fetcher  ?? (() => Promise.resolve(null)),
    ttl:      spec?.ttl,
    cacheOnly: spec === null,
  }));

  return results.slice(0, specs.length) as { [K in keyof T]: AdminQueryResult<T[K]> };
}
