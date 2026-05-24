'use client';

import React, {
 createContext,
 useCallback,
 useContext,
 useEffect,
 useMemo,
 useState,
} from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
 clearSession,
 getSessionHint,
 saveSessionHint,
 SessionHint,
} from '@/lib/auth';
import type { AdminRole, AdminPermission, ROLE_PERMISSIONS } from '@/types/admin';

/* ── Types ──────────────────────────────────────────────────────── */
interface AdminAuthState {
 admin: SessionHint | null;
 isLoading: boolean;
 isAuthenticated: boolean;
 login: (email: string, password: string) => Promise<void>;
 logout: () => Promise<void>;
 hasPermission: (permission: AdminPermission | '*') => boolean;
}

/* ── Context ────────────────────────────────────────────────────── */
const AdminAuthContext = createContext<AdminAuthState | null>(null);

/* ── Provider ───────────────────────────────────────────────────── */
export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
 const router = useRouter();
 const [admin, setAdmin] = useState<SessionHint | null>(null);
 const [isLoading, setIsLoading] = useState(true);

 // Rehydrate from localStorage hint on mount
 useEffect(() => {
 const hint = getSessionHint();
 setAdmin(hint);
 setIsLoading(false);
 }, []);

 const login = useCallback(async (email: string, password: string) => {
 const res = await api.post('/auth/login', { email, password });
 const { admin: adminData } = res.data.data as {
 admin: { id: string; name: string; email: string; role: AdminRole; avatar?: string };
 };

 const hint: SessionHint = {
 id: adminData.id,
 name: adminData.name,
 email: adminData.email,
 role: adminData.role,
 avatar: adminData.avatar,
 };
 saveSessionHint(hint);
 setAdmin(hint);
 router.push('/dashboard');
 }, [router]);

 const logout = useCallback(async () => {
 try {
 await api.post('/auth/logout');
 } catch {/* ignore */}
 clearSession();
 setAdmin(null);
 router.push('/login');
 }, [router]);

 const hasPermission = useCallback(
 (permission: AdminPermission | '*'): boolean => {
 if (!admin) return false;
 if (admin.role === 'super_admin') return true;
 // Lazily import role permissions map
 const { ROLE_PERMISSIONS } = require('@/types/admin') as { ROLE_PERMISSIONS: typeof import('@/types/admin').ROLE_PERMISSIONS };
 const perms = ROLE_PERMISSIONS[admin.role as AdminRole] ?? [];
 return perms.includes(permission as AdminPermission);
 },
 [admin],
 );

 const value = useMemo<AdminAuthState>(
 () => ({
 admin,
 isLoading,
 isAuthenticated: !!admin,
 login,
 logout,
 hasPermission,
 }),
 [admin, isLoading, login, logout, hasPermission],
 );

 return (
 <AdminAuthContext.Provider value={value}>
 {children}
 </AdminAuthContext.Provider>
 );
}

/* ── Hook ───────────────────────────────────────────────────────── */
export function useAdminAuth(): AdminAuthState {
 const ctx = useContext(AdminAuthContext);
 if (!ctx) throw new Error('useAdminAuth must be used inside AdminAuthProvider');
 return ctx;
}
