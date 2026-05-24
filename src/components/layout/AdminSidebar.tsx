'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
 LayoutDashboard, Users, Store, ShoppingBag, Package,
 FileText, Bike, DollarSign, Flag, Settings,
 ChevronLeft, ChevronRight, Shield,
} from 'lucide-react';
import { useAdminAuth } from '@/context/AdminAuthContext';

const ICON_MAP = {
 LayoutDashboard, Users, Store, ShoppingBag, Package,
 FileText, Bike, DollarSign, Flag, Settings,
};

const NAV_ITEMS = [
 { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard', permission: null },
 { href: '/users', label: 'Users', icon: 'Users', permission: 'view:users' },
 { href: '/vendors', label: 'Vendors', icon: 'Store', permission: 'view:users' },
 { href: '/orders', label: 'Orders', icon: 'ShoppingBag', permission: 'view:orders' },
 { href: '/products', label: 'Products', icon: 'Package', permission: 'view:products' },
 { href: '/posts', label: 'Posts', icon: 'FileText', permission: 'view:posts' },
 { href: '/riders', label: 'Riders', icon: 'Bike', permission: 'view:users' },
 { href: '/finance', label: 'Finance', icon: 'DollarSign', permission: 'view:finance' },
 { href: '/reports', label: 'Reports', icon: 'Flag', permission: 'manage:reports' },
 { href: '/settings', label: 'Settings', icon: 'Settings', permission: null },
] as const;

interface Props {
 collapsed: boolean;
 onToggle: () => void;
}

export default function AdminSidebar({ collapsed, onToggle }: Props) {
 const pathname = usePathname();
 const { hasPermission } = useAdminAuth();

 const visibleItems = NAV_ITEMS.filter((item) => {
 if (!item.permission) return true;
 return hasPermission(item.permission as Parameters<typeof hasPermission>[0]);
 });

 return (
 <aside
 style={{
 width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
 background: 'var(--sidebar-bg)',
 borderRight: '1px solid var(--sidebar-border)',
 display: 'flex',
 flexDirection: 'column',
 flexShrink: 0,
 transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
 overflow: 'hidden',
 position: 'relative',
 zIndex: 10,
 }}
 >
 {/* ── Logo ── */}
 <div style={{
 height: 'var(--topbar-height)',
 display: 'flex',
 alignItems: 'center',
 padding: collapsed ? '0 18px' : '0 20px',
 borderBottom: '1px solid var(--sidebar-border)',
 gap: 10,
 flexShrink: 0,
 overflow: 'hidden',
 }}>
 <div style={{
 width: 32, height: 32, borderRadius: 8, flexShrink: 0,
 background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 }}>
 <Shield size={18} color="#fff" />
 </div>
 {!collapsed && (
 <span style={{
 fontWeight: 700, fontSize: 15, color: '#fff',
 letterSpacing: '-0.3px', whiteSpace: 'nowrap',
 animation: 'fadeIn 0.2s ease',
 }}>
 Stoqle Admin
 </span>
 )}
 </div>

 {/* ── Nav ── */}
 <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
 {visibleItems.map((item) => {
 const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
 const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

 return (
 <Link
 key={item.href}
 href={item.href}
 title={collapsed ? item.label : undefined}
 style={{
 display: 'flex',
 alignItems: 'center',
 gap: 10,
 padding: collapsed ? '10px 14px' : '9px 12px',
 borderRadius: 8,
 marginBottom: 2,
 color: isActive ? '#fff' : 'var(--sidebar-text)',
 background: isActive ? 'var(--accent)' : 'transparent',
 textDecoration: 'none',
 fontWeight: isActive ? 600 : 400,
 fontSize: 13.5,
 transition: 'all 0.15s ease',
 whiteSpace: 'nowrap',
 overflow: 'hidden',
 boxShadow: isActive ? '0 2px 8px rgb(99 102 241 / 0.35)' : 'none',
 }}
 onMouseEnter={(e) => {
 if (!isActive) {
 (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-active-bg)';
 (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text-hover)';
 }
 }}
 onMouseLeave={(e) => {
 if (!isActive) {
 (e.currentTarget as HTMLElement).style.background = 'transparent';
 (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
 }
 }}
 >
 <Icon size={17} style={{ flexShrink: 0 }} />
 {!collapsed && <span style={{ animation: 'fadeIn 0.15s ease' }}>{item.label}</span>}
 </Link>
 );
 })}
 </nav>

 {/* ── Collapse toggle ── */}
 <button
 onClick={onToggle}
 aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
 style={{
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 height: 44, margin: '8px', borderRadius: 8,
 background: 'var(--sidebar-active-bg)',
 border: '1px solid var(--sidebar-border)',
 color: 'var(--sidebar-text)',
 cursor: 'pointer',
 transition: 'all 0.15s ease',
 flexShrink: 0,
 }}
 onMouseEnter={(e) => {
 (e.currentTarget as HTMLElement).style.color = '#fff';
 (e.currentTarget as HTMLElement).style.background = '#252a3a';
 }}
 onMouseLeave={(e) => {
 (e.currentTarget as HTMLElement).style.color = 'var(--sidebar-text)';
 (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-active-bg)';
 }}
 >
 {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
 </button>
 </aside>
 );
}
