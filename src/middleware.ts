import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
 process.env.ADMIN_JWT_SECRET || 'change-this-secret-in-production',
);

const PUBLIC_PATHS = ['/login', '/unauthorized'];

export async function middleware(request: NextRequest) {
 const { pathname } = request.nextUrl;

 // Allow public paths
 if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
 return NextResponse.next();
 }

 // Allow Next.js internals
 if (
 pathname.startsWith('/_next') ||
 pathname.startsWith('/api') ||
 pathname === '/favicon.ico'
 ) {
 return NextResponse.next();
 }

 // Read the httpOnly admin token cookie
 const token = request.cookies.get('admin_token')?.value;

 if (!token) {
 const loginUrl = new URL('/login', request.url);
 loginUrl.searchParams.set('from', pathname);
 return NextResponse.redirect(loginUrl);
 }

 try {
 const { payload } = await jwtVerify(token, JWT_SECRET);

 // Inject admin identity into request headers for downstream use
 const requestHeaders = new Headers(request.headers);
 requestHeaders.set('x-admin-id', String(payload.admin_id ?? ''));
 requestHeaders.set('x-admin-role', String(payload.role ?? ''));

 return NextResponse.next({ request: { headers: requestHeaders } });
 } catch {
 // Token invalid or expired → redirect to login
 const loginUrl = new URL('/login', request.url);
 loginUrl.searchParams.set('from', pathname);
 const response = NextResponse.redirect(loginUrl);
 // Clear stale cookie
 response.cookies.delete('admin_token');
 return response;
 }
}

export const config = {
 matcher: [
 '/((?!_next/static|_next/image|favicon.ico|login|unauthorized).*)',
 ],
};
