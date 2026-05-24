export const API_BASE_URL = '';

export const ADMIN_COOKIE_NAME = 'admin_token';
export const ADMIN_REFRESH_COOKIE = 'admin_refresh_token';

export const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { href: '/users', label: 'Users', icon: 'Users' },
    { href: '/vendors', label: 'Vendors', icon: 'Store' },
    { href: '/orders', label: 'Orders', icon: 'ShoppingBag' },
    { href: '/products', label: 'Products', icon: 'Package' },
    { href: '/posts', label: 'Posts', icon: 'FileText' },
    { href: '/riders', label: 'Riders', icon: 'Bike' },
    { href: '/finance', label: 'Finance', icon: 'DollarSign' },
    { href: '/reports', label: 'Reports', icon: 'Flag' },
    { href: '/settings', label: 'Settings', icon: 'Settings' },
] as const;

export const STATUS_COLORS = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
    refunded: 'badge-neutral',
    active: 'badge-success',
    suspended: 'badge-danger',
    verified: 'badge-success',
    unverified: 'badge-warning',
    paid: 'badge-success',
    failed: 'badge-danger',
} as const;
