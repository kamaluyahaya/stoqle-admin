'use client';

import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Bell, LogOut, User, ChevronDown, Search } from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

const ROUTE_LABELS: Record<string, string> = {
 dashboard: 'Dashboard',
 users: 'Users',
 vendors: 'Vendors',
 orders: 'Orders',
 products: 'Products',
 posts: 'Posts',
 riders: 'Riders',
 finance: 'Finance',
 reports: 'Reports',
 settings: 'Settings',
};

export default function AdminTopbar() {
 const pathname = usePathname();
 const { admin, logout } = useAdminAuth();
 const [dropOpen, setDropOpen] = useState(false);
 const dropRef = useRef<HTMLDivElement>(null);

 // Build breadcrumb from pathname
 const segments = pathname.split('/').filter(Boolean);
 const pageLabel = segments.map((s) => ROUTE_LABELS[s] ?? s).join(' / ') || 'Dashboard';

 useEffect(() => {
 function handle(e: MouseEvent) {
 if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
 setDropOpen(false);
 }
 }
 document.addEventListener('mousedown', handle);
 return () => document.removeEventListener('mousedown', handle);
 }, []);

 const initials = admin?.name
 ? admin.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
 : 'AD';

 const roleLabel: Record<string, string> = {
 super_admin: 'Super Admin',
 finance_admin: 'Finance Admin',
 support_admin: 'Support Admin',
 content_moderator: 'Content Moderator',
 };

 return (
 <header style={{
 height: 'var(--topbar-height)',
 background: 'var(--topbar-bg)',
 borderBottom: '1px solid var(--topbar-border)',
 display: 'flex',
 alignItems: 'center',
 padding: '0 24px',
 gap: 16,
 flexShrink: 0,
 }}>
 {/* Breadcrumb */}
 <div style={{ flex: 1 }}>
 <h1 style={{
 margin: 0, fontSize: 16, fontWeight: 700,
 color: 'var(--text-primary)', letterSpacing: '-0.2px',
 }}>
 {pageLabel}
 </h1>
 </div>

 {/* Search */}
 <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
 <Search size={14} style={{
 position: 'absolute', left: 10,
 color: 'var(--text-muted)', pointerEvents: 'none',
 }} />
 <input
 id="admin-global-search"
 placeholder="Search…"
 style={{
 paddingLeft: 32, paddingRight: 12,
 height: 36, width: 200, borderRadius: 8,
 border: '1px solid var(--card-border)',
 background: '#f8fafc',
 fontSize: 13, color: 'var(--text-primary)',
 outline: 'none', transition: 'all 0.15s',
 }}
 onFocus={(e) => {
 e.target.style.width = '260px';
 e.target.style.borderColor = 'var(--accent)';
 e.target.style.boxShadow = '0 0 0 3px var(--input-ring)';
 }}
 onBlur={(e) => {
 e.target.style.width = '200px';
 e.target.style.borderColor = 'var(--card-border)';
 e.target.style.boxShadow = 'none';
 }}
 />
 </div>

 {/* Notification bell */}
 <button
 id="admin-notifications-btn"
 aria-label="Notifications"
 style={{
 position: 'relative', background: 'none', border: '1px solid var(--card-border)',
 borderRadius: 8, padding: '7px', cursor: 'pointer',
 color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
 transition: 'all 0.15s',
 }}
 onMouseEnter={(e) => {
 (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
 (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
 }}
 onMouseLeave={(e) => {
 (e.currentTarget as HTMLElement).style.background = 'none';
 (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
 }}
 >
 <Bell size={16} />
 {/* Unread dot */}
 <span style={{
 position: 'absolute', top: 6, right: 6,
 width: 7, height: 7, borderRadius: '50%',
 background: 'var(--danger)', border: '1.5px solid #fff',
 }} />
 </button>

 {/* Admin avatar dropdown */}
 <div ref={dropRef} style={{ position: 'relative' }}>
 <button
 id="admin-profile-btn"
 onClick={() => setDropOpen((v) => !v)}
 style={{
 display: 'flex', alignItems: 'center', gap: 8,
 background: 'none', border: '1px solid var(--card-border)',
 borderRadius: 10, padding: '5px 10px 5px 5px',
 cursor: 'pointer', transition: 'all 0.15s',
 }}
 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
 >
 {/* Avatar circle */}
 <div style={{
 width: 30, height: 30, borderRadius: '50%',
 background: 'linear-gradient(135deg, #6366f1, #818cf8)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
 }}>
 {admin?.avatar
 ? <img src={admin.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
 : initials}
 </div>
 <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
 {admin?.name ?? 'Admin'}
 </div>
 <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
 {roleLabel[admin?.role ?? ''] ?? admin?.role ?? ''}
 </div>
 </div>
 <ChevronDown size={13} style={{
 color: 'var(--text-muted)',
 transform: dropOpen ? 'rotate(180deg)' : 'rotate(0)',
 transition: 'transform 0.15s',
 }} />
 </button>

 {/* Dropdown */}
 {dropOpen && (
 <div style={{
 position: 'absolute', top: 'calc(100% + 6px)', right: 0,
 background: '#fff', border: '1px solid var(--card-border)',
 borderRadius: 10, boxShadow: '0 8px 24px rgb(0 0 0 / 0.1)',
 width: 200, zIndex: 50, overflow: 'hidden',
 animation: 'fadeIn 0.15s ease',
 }}>
 <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--card-border)' }}>
 <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{admin?.name}</div>
 <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{admin?.email}</div>
 </div>
 <div style={{ padding: '6px 0' }}>
 <DropItem icon={<User size={14} />} label="Profile" onClick={() => setDropOpen(false)} />
 <DropItem
 icon={<LogOut size={14} />}
 label="Sign out"
 danger
 onClick={async () => { setDropOpen(false); await logout(); }}
 />
 </div>
 </div>
 )}
 </div>
 </header>
 );
}

function DropItem({ icon, label, danger, onClick }: {
 icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void;
}) {
 return (
 <button
 onClick={onClick}
 style={{
 display: 'flex', alignItems: 'center', gap: 9,
 width: '100%', padding: '8px 14px',
 background: 'none', border: 'none', cursor: 'pointer',
 fontSize: 13, color: danger ? 'var(--danger)' : 'var(--text-primary)',
 textAlign: 'left', transition: 'background 0.1s',
 }}
 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
 >
 {icon}
 {label}
 </button>
 );
}
