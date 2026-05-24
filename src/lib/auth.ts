import { ADMIN_COOKIE_NAME } from './constants';

// These helpers run client-side only.
// The real auth token lives in an httpOnly cookie set by the backend.
// We only store a lightweight "session hint" in localStorage for
// UI-layer checks (name, role, avatar) that don't need to be secure.

const SESSION_KEY = 'admin_session_hint';

export interface SessionHint {
 id: string;
 name: string;
 email: string;
 role: string;
 avatar?: string;
}

export function saveSessionHint(hint: SessionHint): void {
 if (typeof window === 'undefined') return;
 localStorage.setItem(SESSION_KEY, JSON.stringify(hint));
}

export function getSessionHint(): SessionHint | null {
 if (typeof window === 'undefined') return null;
 try {
 const raw = localStorage.getItem(SESSION_KEY);
 return raw ? (JSON.parse(raw) as SessionHint) : null;
 } catch {
 return null;
 }
}

export function clearSession(): void {
 if (typeof window === 'undefined') return;
 localStorage.removeItem(SESSION_KEY);
}

/** Read a cookie by name (client-side only, works for non-httpOnly) */
export function getCookie(name: string): string | undefined {
 if (typeof document === 'undefined') return undefined;
 return document.cookie
 .split('; ')
 .find((row) => row.startsWith(`${name}=`))
 ?.split('=')[1];
}

/** Quick UI-layer check: does an admin token cookie exist? */
export function hasAdminCookie(): boolean {
 // httpOnly cookies are not readable by JS.
 // We instead check a non-httpOnly presence cookie set alongside the httpOnly one.
 return !!getCookie(`${ADMIN_COOKIE_NAME}_present`);
}
