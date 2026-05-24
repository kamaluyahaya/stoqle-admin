import { useState, useEffect, useCallback } from 'react';
import { getCache, setCache } from './cache';
import api from './api';

export function useQuery<T>(url: string, params: any = {}, skip: boolean = false) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<any>(null);

    const cacheKey = `${url}?${JSON.stringify(params)}`;

    const fetchData = useCallback(async (background = false) => {
        if (skip) return;
        if (!background) setLoading(true);
        
        try {
            const response = await api.get(url, { params });
            setData(response.data);
            setCache(cacheKey, response.data);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(err);
        } finally {
            if (!background) setLoading(false);
        }
    }, [url, JSON.stringify(params), skip]);

    useEffect(() => {
        if (skip) return;
        
        let isMounted = true;
        
        const init = async () => {
            // Try to get from cache first
            const cachedData = await getCache(cacheKey);
            if (cachedData && isMounted) {
                setData(cachedData);
                setLoading(false);
                // Background sync
                fetchData(true);
            } else {
                fetchData(false);
            }
        };
        
        init();
        
        return () => {
            isMounted = false;
        };
    }, [fetchData, skip]);

    return { data, loading, error, refetch: () => fetchData(false) };
}
