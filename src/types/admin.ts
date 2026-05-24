export type AdminRole =
 | 'super_admin'
 | 'finance_admin'
 | 'support_admin'
 | 'content_moderator';

export type AdminPermission =
 | '*'
 | 'view:finance'
 | 'manage:payouts'
 | 'view:orders'
 | 'view:users'
 | 'manage:users'
 | 'manage:reports'
 | 'view:posts'
 | 'manage:posts'
 | 'view:products'
 | 'manage:products'
 | 'view:riders'
 | 'manage:riders';

export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
 super_admin: ['*'],
 finance_admin: ['view:finance', 'manage:payouts', 'view:orders'],
 support_admin: ['view:users', 'manage:users', 'view:orders', 'manage:reports'],
 content_moderator: ['view:posts', 'manage:posts', 'view:products', 'manage:products'],
};

export interface AdminUser {
 id: string;
 name: string;
 email: string;
 role: AdminRole;
 avatar?: string;
 permissions: AdminPermission[];
 createdAt: string;
}

export interface AdminSession {
 admin: AdminUser;
 accessToken?: string; // Only used if NOT using httpOnly cookies
}

/* ── Platform entity types ──────────────────────────────────────── */
export interface PlatformUser {
 _id: string;
 username: string;
 email: string;
 firstName: string;
 lastName: string;
 avatar?: string;
 role: 'user' | 'vendor' | 'rider';
 isSuspended: boolean;
 isVerified: boolean;
 createdAt: string;
 ordersCount?: number;
 postsCount?: number;
}

export interface Vendor {
 _id: string;
 businessName: string;
 businessEmail: string;
 owner: PlatformUser;
 isVerified: boolean;
 isSuspended: boolean;
 productsCount: number;
 ordersCount: number;
 totalRevenue: number;
 createdAt: string;
 logo?: string;
 category?: string;
}

export interface PlatformOrder {
 _id: string;
 orderNumber: string;
 buyer: Pick<PlatformUser, '_id' | 'username' | 'email'>;
 vendor: Pick<Vendor, '_id' | 'businessName'>;
 total: number;
 status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
 paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
 createdAt: string;
 items: OrderItem[];
}

export interface OrderItem {
 product: string;
 name: string;
 price: number;
 quantity: number;
 image?: string;
}

export interface PlatformPost {
 _id: string;
 author: Pick<PlatformUser, '_id' | 'username' | 'avatar'>;
 caption?: string;
 media: { url: string; type: 'image' | 'video' }[];
 likesCount: number;
 commentsCount: number;
 isFlagged: boolean;
 flagReason?: string;
 createdAt: string;
}

export interface Rider {
 _id: string;
 user: PlatformUser;
 isActive: boolean;
 isSuspended: boolean;
 deliveriesCount: number;
 rating: number;
 earnings: number;
 createdAt: string;
}

export interface DashboardStats {
 totalUsers: number;
 totalVendors: number;
 totalOrders: number;
 totalRevenue: number;
 activeRiders: number;
 pendingReports: number;
 userGrowth: number; // % change from last period
 revenueGrowth: number;
 ordersGrowth: number;
}

export interface RevenueDataPoint {
 date: string;
 revenue: number;
 orders: number;
}

export interface UserGrowthPoint {
 date: string;
 users: number;
 vendors: number;
}
