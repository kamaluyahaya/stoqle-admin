'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import { useAdminQuery } from '@/lib/useAdminQuery';
import {
  Search,
  Filter,
  MoreHorizontal,
  UserPlus,
  Shield,
  Ban,
  Eye,
  CheckCircle2,
  Loader2,
  Users,
  Mail,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Unlock,
  Store,
  Package,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ClipboardList,
  Clock,
  UserCheck,
  Check,
  XCircle,
  X,
  MessageSquare,
  ArrowUpRight,
  Wallet,
  ShoppingBag,
  Heart,
  MessageCircle,
  User,
  Image,

} from 'lucide-react';
import { toast } from 'sonner';
import { FullscreenImageViewer } from '@/components/mediaViewer';
import Link from 'next/link';

const BLOCK_REASONS = [
  "Violation of terms of service",
  "Fraudulent or suspicious activity",
  "Spamming or harassment of other users",
  "Inappropriate content or hate speech",
  "Fake or misleading vendor profile/products",
  "Payment issues or chargeback risk",
  "Other (custom reason)"
];

const REJECT_VENDOR_REASONS = [
  "Incomplete or unreadable documents",
  "Incorrect legal name or business address",
  "Invalid phone number or email information",
  "Suspicious or unverified business entity",
  "Mismatch between document and profile details",
  "Other (custom reason)"
];

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  avatar?: string;
  phone?: string;
  total_posts?: number;
  last_login?: string;
  last_active?: string;
  active_duration?: number | string;
  total_orders?: number;
  total_followers?: number;
  total_following?: number;
  available_balance?: number;
  pending_balance?: number;
}

interface Vendor {
  business_id: number;
  business_name: string;
  business_status: string;
  business_address?: string;
  user_id: string;
  owner_name: string;
  email: string;
  account_status: string;
  avatar?: string;
  logo?: string;
  phone?: string;
  created_at: string;
  total_orders: number;
  total_products: number;
  total_revenue?: number;
  total_followers?: number;
  total_following?: number;
  total_posts?: number;
  available_balance?: number;
  pending_balance?: number;
  new_orders_count?: number;
  processing_orders_count?: number;
  completed_orders_count?: number;
  disputed_orders_count?: number;
}

interface Request {
  business_id: number;
  business_name: string;
  business_category: string;
  business_address?: string;
  phone?: string;
  business_email?: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  owner_avatar?: string;
  logo?: string;
  created_at: string;
  business_status: string;
  account_type?: string;
  nin_image?: string;
  cac_image?: string;
  doc_status?: string;
  rejection_reason?: string;
  submission_attempts?: number;
  total_followers?: number;
  total_following?: number;
  total_posts?: number;
}

interface Appeal {
  appeal_id: number;
  user_id: string;
  reason: string;
  status: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  email: string;
  phone_no?: string;
  avatar?: string;
  account_status: string;
  suspended_until?: string;
  status_reason?: string;
}

const formatLastActive = (lastActiveStr?: string) => {
  if (!lastActiveStr) return 'Never Active';
  try {
    const lastActive = new Date(lastActiveStr);
    if (isNaN(lastActive.getTime())) return 'Never Active';

    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    const formattedDate = lastActive.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let relativeStr = '';
    if (diffSecs < 60) {
      relativeStr = 'Active just now';
    } else if (diffMins < 60) {
      relativeStr = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relativeStr = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      relativeStr = `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    } else if (diffWeeks < 4) {
      relativeStr = `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diffMonths < 12) {
      relativeStr = `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    } else {
      relativeStr = `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
    }

    return relativeStr;
  } catch (e) {
    return 'Never Active';
  }
};

const formatAddress = (addressStr?: string) => {
  if (!addressStr) return 'Not Provided';
  try {
    const addr = typeof addressStr === 'string' ? JSON.parse(addressStr) : addressStr;
    if (typeof addr === 'object' && addr !== null) {
      const parts = [
        addr.address_line_1,
        addr.address_line_2,
        addr.city,
        addr.state,
        addr.postal_code,
        addr.country
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : 'Not Provided';
    }
  } catch (e) {
    // Return original string if not valid JSON
  }
  return addressStr;
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white border border-gray-100 rounded-[0.5rem] p-4 flex items-center gap-4">

    <div>
      <p className="text-[11px] font-bold text-gray-400">{title}</p>
      <h3 className="text-xl font-extrabold text-gray-900 mt-0.5">{value}</h3>
    </div>
  </div>
);

interface AnimatedModalProps<T = undefined> {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  zIndex?: string;
  activeItem?: T | null;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

function AnimatedModal<T = undefined>({
  isOpen,
  onClose,
  className = "relative bg-white w-full max-w-md rounded-[1rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]",
  zIndex = "z-[10000]",
  activeItem,
  children
}: AnimatedModalProps<T>) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animate, setAnimate] = useState(isOpen);

  const cachedItemRef = useRef<T | null>(activeItem || null);

  if (activeItem) {
    cachedItemRef.current = activeItem;
  }

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        setAnimate(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setAnimate(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender || typeof document === 'undefined') return null;

  const renderedContent = typeof children === 'function'
    ? (children as (item: T) => React.ReactNode)(cachedItemRef.current as T)
    : children;

  return createPortal(
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 sm:p-6 md:p-10`}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300 ease-in-out ${animate ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={onClose}
      />
      {/* Modal Card */}
      <div
        className={`transition-all duration-300 ease-in-out ${className} ${animate
          ? 'opacity-100 scale-100 translate-y-0'
          : 'opacity-0 scale-95 translate-y-4'
          }`}
      >
        {renderedContent}
      </div>
    </div>,
    document.body
  );
}

const sortOptions = [
  { value: 'recent', label: 'Recent Activity' },
  { value: 'followers', label: 'Top Followers' },
  { value: 'new_account', label: 'New Accounts' },
  { value: 'active', label: 'Active Users' },
  { value: 'never_active', label: 'Never Active' },
  { value: 'oldest', label: 'Oldest Accounts' },
];

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'customers' | 'vendors' | 'appeals' | 'partner-requests'>('customers');
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isBlockReasonOpen, setIsBlockReasonOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [selectedBlockReasonOption, setSelectedBlockReasonOption] = useState('');
  const [customBlockReason, setCustomBlockReason] = useState('');
  const [accountActionType, setAccountActionType] = useState<'blocked' | 'suspended' | 'banned'>('blocked');
  const [suspensionUntil, setSuspensionUntil] = useState('');
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [pendingReactivateUserId, setPendingReactivateUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [currentRequestPage, setCurrentRequestPage] = useState(1);
  const [requestsLimit, setRequestsLimit] = useState(3);
  const [limit, setLimit] = useState(10);
  const [isApproving, setIsApproving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [pendingApprovalId, setPendingApprovalId] = useState<number | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectReasonOption, setSelectedRejectReasonOption] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [pendingBlockUserId, setPendingBlockUserId] = useState<string | null>(null);
  const [isBlocking, setIsBlocking] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'recent' | 'followers' | 'new_account' | 'active' | 'oldest'>('recent');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Detail modal tabs
  type DetailTab = 'profile' | 'finance' | 'orders' | 'social' | 'products';
  const [userModalTab, setUserModalTab] = useState<DetailTab>('profile');
  const [vendorModalTab, setVendorModalTab] = useState<DetailTab>('profile');
  const [tabData, setTabData] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [socialSubTab, setSocialSubTab] = useState<'posts' | 'followers' | 'following'>('posts');

  // Reset page and limit when active tab changes
  useEffect(() => {
    setPage(1);
    setLimit(10);
  }, [activeTab]);

  // Reset page and limit when search query changes
  useEffect(() => {
    setPage(1);
    setLimit(10);
  }, [searchQuery]);

  // Reset page when sortBy changes
  useEffect(() => {
    setPage(1);
  }, [sortBy]);

  // Reset tabs when modal closes/opens
  useEffect(() => {
    setUserModalTab('profile');
    setSocialSubTab('posts');
    setTabData(null);
  }, [selectedUser?.user_id]);

  useEffect(() => {
    setVendorModalTab('profile');
    setSocialSubTab('posts');
    setTabData(null);
  }, [selectedVendor?.business_id]);

  // Fetch tab data
  useEffect(() => {
    const activeTab = selectedUser ? userModalTab : selectedVendor ? vendorModalTab : null;
    if (!activeTab || activeTab === 'profile') {
      setTabData(null);
      return;
    }
    const userId = selectedUser?.user_id || selectedVendor?.user_id;
    const ownerType = selectedUser ? 'customer' : 'vendor';
    const vendorBusinessId = selectedVendor?.business_id;
    if (!userId) return;
    setTabLoading(true);
    setTabData(null);
    const doFetch = async () => {
      try {
        let res: any;
        if (activeTab === 'finance') {
          res = await api.get(`/users/${userId}/${ownerType}/wallet-transactions`);
        } else if (activeTab === 'orders') {
          res = await api.get(`/users/${userId}/${ownerType}/orders`);
        } else if (activeTab === 'social') {
          if (socialSubTab === 'posts') {
            res = await api.get(`/users/${userId}/posts`);
          } else {
            res = await api.get(`/users/${userId}/follow-network`, { params: { tab: socialSubTab } });
          }
        } else if (activeTab === 'products' && vendorBusinessId) {
          res = await api.get('/products', { params: { business_id: vendorBusinessId } });
        }
        setTabData(res?.data?.data || null);
      } catch (e) {
        setTabData(null);
      } finally {
        setTabLoading(false);
      }
    };
    doFetch();
  }, [selectedUser, selectedVendor, userModalTab, vendorModalTab, socialSubTab]);

  // ─── 1. Stats Query ──────────────────────────────────────────────────────────
  const { data: statsData, refetch: refetchStats } = useAdminQuery({
    queryKey: 'users:overview',
    fetcher: () => api.get('/users/overview').then(r => r.data.data),
  });

  const stats = statsData || {
    totalUsers: 0,
    customers: 0,
    activeVendors: 0,
    pendingRequests: 0,
    rejectedRequests: 0,
    totalProducts: 0,
    totalSocialPosts: 0
  };

  // ─── 2. Business Requests Query ──────────────────────────────────────────────
  const { data: requestsData, refetch: refetchRequests } = useAdminQuery<Request[]>({
    queryKey: 'users:requests',
    fetcher: () => api.get('/users/requests').then(r => r.data.data.requests),
  });

  const requests = requestsData || [];

  // ─── 3. Customers List Query ─────────────────────────────────────────────────
  const {
    data: customersData,
    isLoading: isCustomersLoading,
    refetch: refetchCustomers
  } = useAdminQuery<{ users?: User[]; pagination?: any }>({
    queryKey: `users:list:tab:customers:page:${page}:search:${searchQuery}:limit:${limit}:sortBy:${sortBy}`,
    fetcher: () => api.get('/users', {
      params: {
        page,
        search: searchQuery,
        limit,
        sortBy
      }
    }).then(r => r.data.data)
  });

  // ─── 4. Vendors List Query ───────────────────────────────────────────────────
  const {
    data: vendorsData,
    isLoading: isVendorsLoading,
    refetch: refetchVendors
  } = useAdminQuery<{ vendors?: Vendor[]; pagination?: any }>({
    queryKey: `users:list:tab:vendors:page:${page}:search:${searchQuery}:limit:${limit}:sortBy:${sortBy}`,
    fetcher: () => api.get('/users/vendors', {
      params: {
        page,
        search: searchQuery,
        limit,
        sortBy
      }
    }).then(r => r.data.data)
  });

  // ─── 5. Appeals List Query ────────────────────────────────────────────────────
  const {
    data: appealsData,
    isLoading: isAppealsLoading,
    refetch: refetchAppeals
  } = useAdminQuery<{ appeals?: Appeal[] }>({
    queryKey: `users:list:tab:appeals:page:${page}:search:${searchQuery}:limit:${limit}`,
    fetcher: () => api.get('/users/appeals').then(r => r.data),
  });

  // ─── 6. Partner Requests Query ────────────────────────────────────────────────
  const {
    data: partnerRequestsData,
    isLoading: isPartnerRequestsLoading,
    refetch: refetchPartnerRequests
  } = useAdminQuery<{ success: boolean; data: any[] }>({
    queryKey: `users:list:tab:partner-requests:page:${page}:search:${searchQuery}:limit:${limit}`,
    fetcher: () => api.get('/users/partner-requests').then(r => r.data),
  });

  const partnerRequests = partnerRequestsData?.data || [];

  const items = activeTab === 'customers'
    ? (customersData?.users || [])
    : activeTab === 'vendors'
      ? (vendorsData?.vendors || [])
      : activeTab === 'appeals'
        ? (appealsData?.appeals || [])
        : partnerRequests;

  const isTableLoading = activeTab === 'customers'
    ? isCustomersLoading
    : activeTab === 'vendors'
      ? isVendorsLoading
      : activeTab === 'appeals'
        ? isAppealsLoading
        : isPartnerRequestsLoading;

  const pagination = activeTab === 'customers'
    ? (customersData?.pagination || { total: 0, pages: 1 })
    : activeTab === 'vendors'
      ? (vendorsData?.pagination || { total: 0, pages: 1 })
      : activeTab === 'appeals'
        ? { total: (appealsData?.appeals || []).length, pages: 1 }
        : { total: partnerRequests.length, pages: 1 };

  const handleUpdateAppealStatus = async (appealId: number, status: 'approved' | 'rejected') => {
    toast.success(`Updating appeal status to ${status}...`);
    setSelectedAppeal(null);

    try {
      const res = await api.patch(`/users/appeals/${appealId}/status`, { status });
      if (res.data.success) {
        toast.success(`Appeal ${status} successfully!`);
        refetchAppeals();
        refetchCustomers();
        refetchVendors();
        refetchStats();
      }
    } catch (err) {
      toast.error('Failed to update appeal status');
    }
  };

  const handleUpdatePartnerRequestStatus = async (requestId: number, status: 'approved' | 'rejected') => {
    toast.success(`Updating partner request to ${status}...`);
    try {
      const res = await api.patch(`/users/partner-requests/${requestId}/status`, { status });
      if (res.data.success) {
        toast.success(`Partner request ${status} successfully!`);
        refetchPartnerRequests();
      }
    } catch (err) {
      toast.error('Failed to update partner request status');
    }
  };

  const handleApproveVendor = async (businessId: number) => {
    // Show toast and close modals/reset states immediately to prevent block
    toast.success('Approve request sent. Updating vendor status...');
    setIsConfirmOpen(false);
    setPendingApprovalId(null);
    setSelectedRequest(null);
    setSelectedVendor(null);

    try {
      const res = await api.patch(`/users/requests/${businessId}/status`, { status: 'active' });
      if (res.data.success) {
        toast.success('Business request approved successfully!');
        new Audio('/sound/credited.mp3').play().catch(() => { });
        refetchRequests();
        refetchCustomers();
        refetchVendors();
        refetchStats();
      }
    } catch (err) {
      toast.error('Failed to approve business request');
    }
  };

  const handleRejectVendor = async (businessId: number) => {
    // Show toast and close modals/reset states immediately to prevent block
    toast.error('Reject request sent. Updating vendor status...');
    setIsRejectOpen(false);
    setPendingRejectId(null);
    const reasonSent = rejectReason;
    setRejectReason('');
    setSelectedRejectReasonOption('');
    setCustomRejectReason('');
    setSelectedRequest(null);

    try {
      const res = await api.patch(`/users/requests/${businessId}/status`, {
        status: 'rejected',
        reason: reasonSent
      });
      if (res.data.success) {
        toast.success('Application rejected successfully');
        new Audio('/sound/beep.mp3').play().catch(() => { });
        refetchRequests();
        refetchCustomers();
        refetchVendors();
        refetchStats();
      }
    } catch (err) {
      toast.error('Failed to reject request');
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: string, reason?: string, suspendedUntil?: string) => {
    // Show toast and close details modal immediately to prevent block
    toast.success(`Updating user access to ${newStatus}...`);
    setSelectedUser(null);
    setSelectedVendor(null);

    try {
      const response = await api.patch(`/users/${userId}/status`, {
        status: newStatus,
        reason,
        suspended_until: suspendedUntil || undefined
      });
      if (response.data.success) {
        toast.success(`User access updated to ${newStatus}`);
        if (newStatus === 'blocked' || newStatus === 'banned' || newStatus === 'suspended') {
          new Audio('/sound/warning.mp3').play().catch(() => { });
        }
        refetchCustomers();
        refetchVendors();
        refetchAppeals();
        refetchStats();
      }
    } catch (error) {
      toast.error('Failed to update permissions');
    }
  };

  const triggerBlockConfirm = (userId: string) => {
    setPendingBlockUserId(userId);
    setBlockReason('');
    setSelectedBlockReasonOption('');
    setCustomBlockReason('');
    setAccountActionType('blocked');
    setSuspensionUntil('');
    setIsBlockReasonOpen(true);
  };

  const triggerReactivateConfirm = (userId: string) => {
    setPendingReactivateUserId(userId);
    setIsReactivateModalOpen(true);
  };

  const formatActiveDuration = (secondsVal: number | string | undefined) => {
    if (secondsVal === undefined || secondsVal === null) return 'N/A';
    const totalSecs = parseInt(secondsVal.toString(), 10);
    if (isNaN(totalSecs) || totalSecs <= 0) return '0 seconds';
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  };

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status).toLowerCase();
    if (['active', 'verified'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold  tracking-tight border border-emerald-100">
          <CheckCircle2 className="w-3 h-3" /> Active
        </span>
      );
    }
    if (['blocked', 'banned', 'rejected'].includes(s)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold  tracking-tight border border-rose-100">
          <Ban className="w-3 h-3" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold  tracking-tight border border-amber-100">
        <Clock className="w-3 h-3" /> {status}
      </span>
    );
  };

  const normalUsersCount = customersData?.pagination?.total ?? stats.customers ?? 0;
  const vendorsCount = vendorsData?.pagination?.total ?? stats.activeVendors ?? 0;
  const appealsCount = (appealsData?.appeals || []).length;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Client management </h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-gray-100 hover:bg-gray-50 text-gray-900 px-6 py-3 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]">
            <Users className="w-4 h-4 text-gray-400" />
            <span>Staff Directory</span>
          </button>
          <button className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-rose-100 transition-all active:scale-[0.98]">
            <Shield className="w-4 h-4" />
            <span>Admin Control</span>
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard title="Total Customers" value={stats.customers} icon={UserCheck} color="rose" />
        <StatCard title="Active Vendors" value={stats.activeVendors} icon={Store} color="emerald" />
        <StatCard title="Total Products" value={stats.totalProducts} icon={Package} color="blue" />
        <StatCard title="Pending Requests" value={stats.pendingRequests} icon={ClipboardList} color="amber" />
        <StatCard title="Rejected Requests" value={stats.rejectedRequests} icon={XCircle} color="rose" />
        <StatCard title="Total Social Posts" value={stats.totalSocialPosts} icon={MessageSquare} color="indigo" />
      </div>

      {/* Business Requests Section */}
      {requests.length > 0 && (() => {
        const totalPages = Math.ceil(requests.length / requestsLimit);
        const paginated = requests.slice((currentRequestPage - 1) * requestsLimit, currentRequestPage * requestsLimit);

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-gray-900 flex items-center gap-3">
                New Business Account Requests
              </h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-extrabold">
                  {requests.filter(r => r.business_status === 'pending').length} Pending
                </span>
                {requests.filter(r => r.business_status === 'rejected').length > 0 && (
                  <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold">
                    {requests.filter(r => r.business_status === 'rejected').length} Rejected
                  </span>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[0.75rem] shadow-sm relative">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Business</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Owner</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Reg. Status</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((req) => (
                      <tr
                        key={req.business_id}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedRequest(req)}
                      >
                        {/* Business */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                              <Store className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-xs leading-tight">{req.business_name}</p>
                              <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">{req.business_category}</p>
                            </div>
                          </div>
                        </td>

                        {/* Owner */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-800 text-xs">{req.owner_name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{req.owner_email}</p>
                        </td>

                        {/* Registration Status */}
                        <td className="px-4 py-3">
                          {req.business_status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Registered
                            </span>
                          ) : req.business_status === "pending" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRequest(req);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
                              title="Ignore"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-gray-50">
                {paginated.map((req) => (
                  <div key={req.business_id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs leading-tight">{req.business_name}</p>
                          <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">{req.business_category}</p>
                        </div>
                      </div>
                      <div>
                        {req.business_status === "active" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Registered
                          </span>
                        ) : req.business_status === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-semibold text-gray-800 text-xs">{req.owner_name}</p>
                        <p className="text-[10px] text-gray-400">{req.owner_email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-505 text-rose-505 hover:text-white transition-all text-xs font-bold"
                          title="View Details"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>
                        <button
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-202 text-gray-400 hover:text-gray-600 transition-all"
                          title="Ignore"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="relative flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100 gap-3">
                <p className="text-[10px] text-gray-400 font-medium">
                  Showing {(currentRequestPage - 1) * requestsLimit + 1}–{Math.min(currentRequestPage * requestsLimit, requests.length)} of {requests.length}
                </p>

                {requestsLimit < requests.length && (
                  <button
                    onClick={() => setRequestsLimit(prev => prev + 5)}
                    className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10 px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] tracking-wide transition-all border border-amber-600 shadow-sm active:scale-[0.98] select-none hover:shadow-md whitespace-nowrap cursor-pointer"
                  >
                    View More Requests (+5 batch)
                  </button>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentRequestPage((p) => Math.max(1, p - 1))}
                    disabled={currentRequestPage === 1}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentRequestPage(page)}
                      className={`w-6 h-6 flex items-center justify-center rounded-md text-[10px] font-bold transition-all ${currentRequestPage === page
                        ? "bg-amber-500 text-white border border-amber-500"
                        : "border border-gray-200 bg-white text-gray-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentRequestPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentRequestPage === totalPages}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Content Area */}
      <div className="bg-white border border-gray-100 rounded-[0.75rem] shadow-sm relative mb-12">
        {/* Tabs & Search */}
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-t-[0.75rem]">
          <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-[20px]">
            <button
              onClick={() => { setActiveTab('customers'); setPage(1); }}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-bold transition-all ${activeTab === 'customers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Normal Users{activeTab === 'customers' ? ` (${normalUsersCount})` : ''}
            </button>
            <button
              onClick={() => { setActiveTab('vendors'); setPage(1); }}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-bold transition-all ${activeTab === 'vendors' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Registered Vendors{activeTab === 'vendors' ? ` (${vendorsCount})` : ''}
            </button>
            <button
              onClick={() => { setActiveTab('appeals'); setPage(1); }}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-bold transition-all ${activeTab === 'appeals' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Appeals{activeTab === 'appeals' ? ` (${appealsCount})` : ''}
            </button>
            <button
              onClick={() => { setActiveTab('partner-requests'); setPage(1); }}
              className={`px-8 py-2.5 rounded-[16px] text-xs font-bold transition-all ${activeTab === 'partner-requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Partner Requests{activeTab === 'partner-requests' ? ` (${partnerRequests.length})` : ''}
            </button>
          </div>

          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-gray-50 border border-transparent rounded-[20px] py-3 pl-12 pr-4 text-sm font-medium focus:bg-white focus:border-rose-100 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-[20px] border border-transparent hover:border-gray-200 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">
                  {sortOptions.find(o => o.value === sortBy)?.label || 'Sort By'}
                </span>
              </button>

              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    <p className="px-4 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Sort & Filter By</p>
                    <div className="h-px bg-gray-50 my-1" />
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as any);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors flex items-center justify-between ${sortBy === option.value
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        {option.label}
                        {sortBy === option.value && (
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">
                  {activeTab === 'customers' ? 'Customer Identity' : activeTab === 'vendors' ? 'Business & Owner' : activeTab === 'appeals' ? 'Appeal Identity' : 'Partner Candidate'}
                </th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">
                  {activeTab === 'customers' ? 'Last Active' : activeTab === 'vendors' ? 'Inventory & Activity' : activeTab === 'appeals' ? 'Reason / Details' : 'Contact Details'}
                </th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">
                  {activeTab === 'customers' ? 'Member Since' : activeTab === 'vendors' ? 'Store Metrics' : activeTab === 'appeals' ? 'Submitted At' : 'Applied At'}
                </th>
                <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isTableLoading ? (
                <>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[0.5rem] bg-gray-100 border border-gray-100 shrink-0" />
                          <div className="space-y-1.5">
                            <div className="h-3 w-28 bg-gray-100/80 rounded" />
                            <div className="h-2 w-40 bg-gray-50 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-24 bg-gray-50 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-16 bg-gray-50 rounded-full" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-3 w-20 bg-gray-50 rounded" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gray-50 rounded-lg" />
                          <div className="w-7 h-7 bg-gray-50 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ) : items.length > 0 ? (
                items.map((item) => {
                  if (activeTab === 'customers') {
                    const user = item as User;
                    return (
                      <tr
                        key={user.user_id}
                        className="group hover:bg-gray-50/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[0.5rem] bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-[10px] border border-rose-100 shadow-sm overflow-hidden shrink-0">
                              {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-tight">{user.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] font-medium text-gray-400">{user.email}</p>
                                {user.phone && (
                                  <>
                                    <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                    <p className="text-[10px] font-medium text-gray-400">{user.phone}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold">
                          {!user.last_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[10px] border border-amber-100">
                              Never active
                            </span>
                          ) : (
                            <span className="text-gray-700">
                              {formatLastActive(user.last_active)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-500">
                          {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-404 hover:text-gray-600 transition-all"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {['blocked', 'suspended', 'banned'].includes(user.status) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerReactivateConfirm(user.user_id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                                title="Reactivate Account"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerBlockConfirm(user.user_id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all"
                                title="Restrict Account"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  } else if (activeTab === 'vendors') {
                    const vendor = item as Vendor;
                    return (
                      <tr
                        key={`${vendor.business_id}-${vendor.user_id}`}
                        className="group hover:bg-gray-50/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedVendor(vendor)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[0.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 font-extrabold text-[10px] border border-emerald-100 shadow-sm overflow-hidden shrink-0">
                              {vendor.logo ? (
                                <img src={vendor.logo} className="w-full h-full object-cover" />
                              ) : vendor.avatar ? (
                                <img src={vendor.avatar} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-tight">{vendor.business_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] font-semibold text-gray-400">{vendor.owner_name}</p>
                                <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                <p className="text-[10px] font-semibold text-gray-400 lowercase">{vendor.email}</p>
                                {vendor.phone && (
                                  <>
                                    <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                    <p className="text-[10px] font-semibold text-gray-400">{vendor.phone}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3 text-gray-400" />
                              <span className="text-[10px] font-bold text-gray-700">{vendor.total_products} Products</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-600">{vendor.total_orders} Orders</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(vendor.business_status)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-gray-400">Registered</span>
                            <span className="text-xs font-bold text-gray-700">
                              {new Date(vendor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 mt-0.5">
                              ₦{Number(vendor.total_revenue || 0).toLocaleString()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedVendor(vendor);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-202 text-gray-500 hover:text-gray-900 transition-all animate-in fade-in"
                              title="View Vendor Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {['blocked', 'suspended', 'banned'].includes(vendor.business_status?.toLowerCase()) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerReactivateConfirm(vendor.user_id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                                title="Reactivate Vendor"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerBlockConfirm(vendor.user_id);
                                }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all"
                                title="Block Vendor"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  } else if (activeTab === 'appeals') {
                    const appeal = item as Appeal;
                    return (
                      <tr
                        key={appeal.appeal_id}
                        className="group hover:bg-gray-50/60 transition-colors cursor-pointer"
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[0.5rem] bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-[10px] border border-rose-100 shadow-sm overflow-hidden shrink-0">
                              {appeal.avatar ? <img src={appeal.avatar} className="w-full h-full object-cover" /> : appeal.full_name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-tight">{appeal.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <p className="text-[10px] font-medium text-gray-400">{appeal.email}</p>
                                {appeal.phone_no && (
                                  <>
                                    <div className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                                    <p className="text-[10px] font-medium text-gray-400">{appeal.phone_no}</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-700 max-w-xs truncate">
                          {appeal.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${appeal.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : appeal.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                            {appeal.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-500">
                          {new Date(appeal.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAppeal(appeal);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-all"
                              title="View Appeal Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {appeal.status === 'pending' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateAppealStatus(appeal.appeal_id, 'approved');
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                                  title="Approve Appeal"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateAppealStatus(appeal.appeal_id, 'rejected');
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white transition-all"
                                  title="Reject Appeal"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const partner = item as any;
                    return (
                      <tr
                        key={partner.id}
                        className="group hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-[0.5rem] bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-[10px] border border-rose-100 shadow-sm overflow-hidden shrink-0">
                              {partner.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 leading-tight">{partner.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-700">
                          <div>
                            <p>{partner.email}</p>
                            {partner.phone && <p className="text-[10px] text-gray-400 mt-0.5">{partner.phone}</p>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${partner.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : partner.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                            {partner.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-gray-500">
                          {new Date(partner.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {partner.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleUpdatePartnerRequestStatus(partner.id, 'approved')}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all"
                                  title="Approve Partner"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleUpdatePartnerRequestStatus(partner.id, 'rejected')}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-500 text-rose-600 hover:text-white transition-all"
                                  title="Reject Partner"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <XCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No Matches Found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search term or tab.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="block md:hidden">
          {isTableLoading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[1rem] p-5 space-y-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[0.5rem] bg-gray-100 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-28 bg-gray-100 rounded" />
                      <div className="h-2 w-40 bg-gray-50 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="p-4 space-y-4">
              {items.map((item) => {
                if (activeTab === 'customers') {
                  const user = item as User;
                  return (
                    <div
                      key={user.user_id}
                      className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      {/* Customer Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-xs border border-rose-100 shadow-sm overflow-hidden shrink-0">
                            {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : user.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 text-xs leading-tight">{user.name}</h4>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-rose-50/50 text-rose-600 text-[9px] font-bold mt-1 border border-rose-100/50">
                              Standard Customer
                            </span>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(user.status)}
                        </div>
                      </div>

                      {/* Customer Details Box */}
                      <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Email Address</span>
                          <span className="font-semibold text-gray-700 break-all text-right">{user.email}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Phone Number</span>
                          <span className="font-semibold text-gray-700">{user.phone || 'Not Provided'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Last Active</span>
                          <span className="font-semibold text-[11px]">
                            {!user.last_active ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-extrabold text-[9px] border border-amber-100">
                                Never active
                              </span>
                            ) : (
                              <span className="text-gray-700">
                                {formatLastActive(user.last_active)}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Member Since</span>
                          <span className="font-bold text-gray-800">
                            {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all text-xs font-bold border border-gray-200"
                        >
                          <Eye className="w-4 h-4" /> View Details
                        </button>
                        {['blocked', 'suspended', 'banned'].includes(user.status) ? (
                          <button
                            onClick={() => triggerReactivateConfirm(user.user_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all border border-emerald-100"
                            title="Reactivate Account"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerBlockConfirm(user.user_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all border border-rose-100"
                            title="Restrict Account"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const vendor = item as Vendor;
                  return (
                    <div
                      key={`${vendor.business_id}-${vendor.user_id}`}
                      className="bg-white border border-gray-100 rounded-[1rem] p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                    >
                      {/* Vendor Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-extrabold text-xs border border-emerald-100 shadow-sm overflow-hidden shrink-0">
                            {vendor.logo ? (
                              <img src={vendor.logo} className="w-full h-full object-cover" />
                            ) : vendor.avatar ? (
                              <img src={vendor.avatar} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-gray-900 text-xs leading-tight">{vendor.business_name}</h4>
                            <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">Owner: {vendor.owner_name}</p>
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(vendor.business_status)}
                        </div>
                      </div>

                      {/* Store Metrics Grid (Row) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Products</span>
                          <span className="text-sm font-extrabold text-gray-700 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-gray-400" /> {vendor.total_products}
                          </span>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Orders</span>
                          <span className="text-sm font-extrabold text-emerald-600 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {vendor.total_orders}
                          </span>
                        </div>
                      </div>

                      {/* Revenue and Registered Date Row */}
                      <div className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Total Revenue</span>
                          <span className="font-extrabold text-emerald-600">
                            ₦{Number(vendor.total_revenue || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                          <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px]">Registered Since</span>
                          <span className="font-bold text-gray-700">
                            {new Date(vendor.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedVendor(vendor)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-all text-xs font-bold border border-gray-200"
                        >
                          <Eye className="w-4 h-4" /> View Details
                        </button>
                        {['blocked', 'suspended', 'banned'].includes(vendor.business_status?.toLowerCase()) ? (
                          <button
                            onClick={() => triggerReactivateConfirm(vendor.user_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 hover:bg-emerald-500 text-emerald-600 hover:text-white transition-all border border-emerald-100"
                            title="Reactivate Vendor"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => triggerBlockConfirm(vendor.user_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-500 hover:text-white transition-all border border-rose-100"
                            title="Block Vendor"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-[1rem] border border-gray-100 shadow-sm mx-4">
              <XCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-400">No Matches Found</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/20 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-b-[0.75rem]">
          <p className="text-[12px] font-bold text-gray-400 tracking-tight">
            Displaying <span className="text-gray-900">{items.length}</span> of <span className="text-gray-900">{pagination.total || items.length}</span> {activeTab}
          </p>

          {items.length < (pagination.total || 0) && (
            <button
              onClick={() => setLimit(prev => prev + 10)}
              className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10 px-6 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-xs tracking-wider transition-all border border-rose-600 shadow-md active:scale-[0.98] select-none hover:shadow-lg whitespace-nowrap"
            >
              View More (+10 batch)
            </button>
          )}

          <div className="flex items-center gap-4">
            <button
              disabled={page === 1}
              onClick={() => {
                setPage(p => Math.max(1, p - 1));
                setLimit(10);
              }}
              className="p-2 rounded-xl border border-gray-100 hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-extrabold">{page} / {pagination.pages || 1}</span>
            <button
              disabled={page >= (pagination.pages || 1)}
              onClick={() => {
                setPage(p => p + 1);
                setLimit(10);
              }}
              className="p-2 rounded-xl border border-gray-100 hover:bg-white disabled:opacity-30 transition-all cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Detail Modal for Business Request - Rendered via AnimatedModal */}
            <AnimatedModal<Request>
              isOpen={!!selectedRequest}
              onClose={() => setSelectedRequest(null)}
              activeItem={selectedRequest}
              zIndex="z-[9999]"
              className="relative bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-5xl sm:rounded-[0.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {(selectedRequest) => (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4  flex-shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Business Request Details</span>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
                    >
                      <XCircle className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {/* Centered Profile Section */}
                    <div className="flex flex-col items-center justify-center text-center pb-6 border-b border-gray-100 mb-8">
                      <div
                        onClick={() => {
                          const imgUrl = selectedRequest.logo || selectedRequest.owner_avatar;
                          if (imgUrl) setPreviewImage(imgUrl);
                        }}
                        className={`w-24 h-24 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border-4 border-rose-100/50 shadow-md overflow-hidden shrink-0 font-extrabold text-3xl mb-3 ${(selectedRequest.logo || selectedRequest.owner_avatar) ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`}
                      >
                        {selectedRequest.logo ? (
                          <img src={selectedRequest.logo} className="w-full h-full object-cover" />
                        ) : selectedRequest.owner_avatar ? (
                          <img src={selectedRequest.owner_avatar} className="w-full h-full object-cover" />
                        ) : (
                          selectedRequest.business_name.charAt(0)
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">{selectedRequest.business_name}</h2>
                      <p className="text-xs font-bold text-rose-500 uppercase tracking-wider mt-1">{selectedRequest.business_category}</p>

                      {/* Followers, Following & Posts Stats */}
                      <div className="flex items-center gap-6 mt-4 bg-gray-50 px-6 py-2 rounded-full border border-gray-100">
                        <div className="text-center">
                          <span className="text-sm font-extrabold text-gray-900 block">{selectedRequest.total_followers || 0}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Followers</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="text-center">
                          <span className="text-sm font-extrabold text-gray-900 block">{selectedRequest.total_following || 0}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Following</span>
                        </div>
                        <div className="w-px h-6 bg-gray-200" />
                        <div className="text-center">
                          <span className="text-sm font-extrabold text-gray-900 block">{selectedRequest.total_posts || 0}</span>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Posts</span>
                        </div>
                      </div>
                    </div>

                    {/* Rejection Alert Banner */}
                    {selectedRequest.business_status === 'rejected' && (
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 mb-6 text-left flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wider">Application Rejected</h4>
                          <p className="text-sm font-semibold text-rose-800 mt-1 leading-relaxed">
                            {selectedRequest.rejection_reason || 'No specific rejection reason was provided.'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                      {/* Left Column: Business & Owner Info */}
                      <div className="space-y-8">
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-4 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Core Information
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-6 space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500">Business Approval Status</span>
                              <span>{getStatusBadge(selectedRequest.business_status || 'pending')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500">Account Type</span>
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold">
                                {selectedRequest.account_type || 'Individual'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500">Registration Date</span>
                              <span className="text-sm font-bold text-gray-900">
                                {new Date(selectedRequest.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-gray-500">Submission Attempts</span>
                              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                                {selectedRequest.submission_attempts || 1} {selectedRequest.submission_attempts === 1 ? 'attempt' : 'attempts'}
                              </span>
                            </div>
                            <div className="flex flex-col pt-2">
                              <span className="text-xs font-bold text-gray-500 mb-1">Business Address</span>
                              <p className="text-sm font-semibold text-gray-800 leading-relaxed">
                                {formatAddress(selectedRequest.business_address)}
                              </p>
                            </div>
                          </div>
                        </section>

                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-4 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> Contact Details
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-6 space-y-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                <Mail className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold text-gray-400">Email Address</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{selectedRequest.business_email || selectedRequest.owner_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm">
                                <TrendingUp className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-gray-400">Phone Number</p>
                                <p className="text-sm font-bold text-gray-900">{selectedRequest.phone || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </section>

                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-4 flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5" /> Legal Owner
                          </h4>
                          <div className="flex items-center gap-4 p-2 bg-rose-50/30 rounded-[0.5rem]">
                            <div className="w-12 h-12 rounded-[0.5rem] bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-sm border border-rose-200 overflow-hidden shadow-sm">
                              {selectedRequest.owner_avatar ? (
                                <img src={selectedRequest.owner_avatar} className="w-full h-full object-cover" />
                              ) : selectedRequest.owner_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-md font-bold text-gray-900 truncate">{selectedRequest.owner_name}</p>
                              <p className="text-xs font-medium text-gray-500 truncate">{selectedRequest.owner_email}</p>
                              {selectedRequest.owner_phone && (
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{selectedRequest.owner_phone}</p>
                              )}
                            </div>
                          </div>
                        </section>
                      </div>

                      {/* Right Column: Uploaded Documents */}
                      <div className="space-y-8">
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-4 flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" /> Verification Documents
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6">
                            {/* NIN Image */}
                            <div className="space-y-3">
                              <p className="text-[10px] font-bold text-gray-400 ml-1">Identity Document (NIN)</p>
                              <div
                                onClick={() => {
                                  if (selectedRequest.nin_image) setPreviewImage(selectedRequest.nin_image);
                                }}
                                className={`bg-gray-100 border-2 border-dashed border-gray-200 rounded-[0.5rem] overflow-hidden aspect-[16/10] group relative shadow-inner ${selectedRequest.nin_image ? 'cursor-zoom-in' : ''}`}
                              >
                                {selectedRequest.nin_image ? (
                                  <>
                                    <img src={selectedRequest.nin_image} alt="NIN" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewImage(selectedRequest.nin_image!);
                                        }}
                                        className="bg-white text-gray-900 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform hover:scale-105 active:scale-95 transition-all"
                                      >
                                        View Document
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                    <AlertCircle className="w-8 h-8 mb-2" />
                                    <span className="text-xs font-bold">No Image Provided</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CAC Image - Only show if not individual */}
                            {(selectedRequest.account_type || 'individual').toLowerCase() !== 'individual' && (
                              <div className="space-y-3">
                                <p className="text-[10px] font-bold text-gray-400 ml-1">Business Registration (CAC)</p>
                                <div
                                  onClick={() => {
                                    if (selectedRequest.cac_image) setPreviewImage(selectedRequest.cac_image);
                                  }}
                                  className={`bg-gray-100 border-2 border-dashed border-gray-200 rounded-[0.5rem] overflow-hidden aspect-[16/10] group relative shadow-inner ${selectedRequest.cac_image ? 'cursor-zoom-in' : ''}`}
                                >
                                  {selectedRequest.cac_image ? (
                                    <>
                                      <img src={selectedRequest.cac_image} alt="CAC" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewImage(selectedRequest.cac_image!);
                                          }}
                                          className="bg-white text-gray-900 px-6 py-2.5 rounded-2xl text-xs font-bold shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform hover:scale-105 active:scale-95 transition-all"
                                        >
                                          View Document
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                                      <AlertCircle className="w-8 h-8 mb-2" />
                                      <span className="text-xs font-bold">No Image Provided</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col sm:flex-row gap-4 bg-white mt-8 border-t border-gray-50 pt-6">
                      {((selectedRequest.business_status || 'pending') === 'pending' || selectedRequest.business_status === 'rejected') && (
                        <button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-8 rounded-[0.5rem] font-extrabold text-sm shadow-xl shadow-emerald-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                          onClick={() => {
                            setPendingApprovalId(selectedRequest.business_id);
                            setIsConfirmOpen(true);
                          }}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Approve Business
                        </button>
                      )}
                      {(selectedRequest.business_status || 'pending') === 'pending' && (
                        <button
                          className="flex-1 bg-rose-500 hover:bg-rose-600 text-white py-4 px-8 rounded-[0.5rem] font-extrabold text-sm shadow-xl shadow-rose-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                          onClick={() => {
                            setPendingRejectId(selectedRequest.business_id);
                            setSelectedRejectReasonOption('');
                            setCustomRejectReason('');
                            setRejectReason('');
                            setIsRejectOpen(true);
                          }}
                        >
                          <XCircle className="w-5 h-5" />
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </AnimatedModal>

            {/* Detail Modal for Customer Details - Rendered via AnimatedModal */}
            <AnimatedModal<User>
              isOpen={!!selectedUser}
              onClose={() => setSelectedUser(null)}
              activeItem={selectedUser}
              zIndex="z-[9999]"
              className="relative bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-[0.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {(selectedUser) => (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">User Details</span>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
                    >
                      <XCircle className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-6">
                    {/* Centered Profile Section */}
                    <div className="flex flex-col items-center justify-center text-center pb-4">
                      <div
                        onClick={() => {
                          if (selectedUser.avatar) setPreviewImage(selectedUser.avatar);
                        }}
                        className={`w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border-4 border-rose-100/50 shadow-md overflow-hidden shrink-0 font-extrabold text-2xl mb-3 ${selectedUser.avatar ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`}
                      >
                        {selectedUser.avatar ? (
                          <img src={selectedUser.avatar} className="w-full h-full object-cover" />
                        ) : (
                          selectedUser.name.charAt(0)
                        )}
                      </div>
                      <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{selectedUser.name}</h2>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-1">Standard User</p>
                    </div>

                    {/* Sticky Tabs Navigation */}
                    <div className="sticky top-0 bg-white z-20 py-2 border-b border-gray-100 flex items-center justify-start gap-1 overflow-x-auto select-none no-scrollbar flex-shrink-0">
                      {[
                        { id: 'profile', label: 'Profile', icon: User },
                        { id: 'finance', label: 'Finance', icon: Wallet },
                        { id: 'orders', label: 'Order', icon: ShoppingBag },
                        { id: 'social', label: 'Social post', icon: MessageSquare }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = userModalTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setUserModalTab(tab.id as DetailTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all shrink-0 active:scale-95 ${isActive
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Contents */}
                    {userModalTab === 'profile' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Session Information */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Session Statistics
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Last Login</span>
                              <span className="font-bold text-gray-800">{formatDateTime(selectedUser.last_login)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Last Active</span>
                              <span className="font-bold text-gray-800">{formatDateTime(selectedUser.last_active)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Account ID</span>
                              <span className="font-bold text-gray-800">{selectedUser.user_id}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Member Since</span>
                              <span className="font-bold text-gray-800">
                                {new Date(selectedUser.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Account Status</span>
                              <span>{getStatusBadge(selectedUser.status)}</span>
                            </div>
                          </div>
                        </section>

                        {/* Contact Information */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> Contact Information
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Email Address</span>
                              <span className="font-bold text-gray-800">{selectedUser.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Phone Number</span>
                              <span className="font-bold text-gray-800">{selectedUser.phone || 'Not Provided'}</span>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {userModalTab === 'finance' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Wallet Summary */}
                        <section>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5" /> Wallet Balances
                            </h4>
                            <Link
                              href={`/dashboard/finance?view=wallets&search=${selectedUser.email}`}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                            >
                              View Ledger <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-xs font-bold text-emerald-500 mb-1">Available</span>
                              <span className="text-xl font-extrabold text-emerald-600">
                                ₦{(Number(selectedUser.available_balance) || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="bg-amber-50/50 border border-amber-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-xs font-bold text-amber-500 mb-1">Pending Escrow</span>
                              <span className="text-xl font-extrabold text-amber-600">
                                ₦{(Number(selectedUser.pending_balance) || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Transaction History */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" /> Transaction History
                          </h4>
                          <div className="max-h-[250px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 space-y-2 no-scrollbar">
                            {tabLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : tabData?.transactions && tabData.transactions.length > 0 ? (
                              tabData.transactions.map((tx: any) => {
                                const isCredit = tx.transaction_type === 'credit' || tx.transaction_type?.toLowerCase().includes('deposit') || tx.transaction_type?.toLowerCase().includes('refund');
                                return (
                                  <Link
                                    key={tx.id}
                                    href={`/dashboard/finance?view=wallets&search=${tx.reference || tx.id}`}
                                    className="block bg-white border border-gray-100 rounded-[0.5rem] p-3 flex justify-between items-center text-xs hover:border-rose-300 hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all duration-200 shadow-sm"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-bold text-gray-800 capitalize">{tx.transaction_type?.replace('_', ' ')}</p>
                                      <p className="text-[10px] text-gray-500 leading-normal max-w-[250px]">{tx.description || 'No description'}</p>
                                      <p className="text-[9px] text-gray-400 font-mono">Ref: {tx.reference || 'N/A'}</p>
                                      <p className="text-[9px] text-gray-400">{formatDateTime(tx.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className={`font-extrabold block text-sm ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isCredit ? '+' : '-'} ₦{Number(tx.amount || 0).toLocaleString()}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold block mt-0.5 capitalize bg-gray-100/80 px-1.5 py-0.5 rounded text-center inline-block">
                                        {tx.status || 'Success'}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                                No transactions found
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    {userModalTab === 'orders' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Order & Active Duration Metrics */}
                        <section>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                              <ClipboardList className="w-3.5 h-3.5" /> Order Summary
                            </h4>
                            <Link
                              href={`/dashboard/order?search=${encodeURIComponent(selectedUser.email)}`}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                            >
                              Go to Orders Page <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-rose-50/50 border border-rose-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-xs font-bold text-rose-500 mb-1">Total Orders</span>
                              <span className="text-2xl font-extrabold text-rose-600">
                                {selectedUser.total_orders || 0}
                              </span>
                            </div>
                            <div className="bg-blue-50/50 border border-blue-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-xs font-bold text-blue-500 mb-1">Active Duration</span>
                              <span className="text-lg font-extrabold text-blue-600">
                                {formatActiveDuration(selectedUser.active_duration)}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Recent Orders List */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5" /> Recent Orders History
                          </h4>
                          <div className="max-h-[250px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 space-y-2 no-scrollbar">
                            {tabLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : tabData?.orders && tabData.orders.length > 0 ? (
                              tabData.orders.map((order: any) => (
                                <Link
                                  key={order.order_id}
                                  href={`/dashboard/order?search=${order.order_id || order.id || order.sale_id}`}
                                  className="block bg-white border border-gray-100 rounded-[0.5rem] p-3 flex justify-between items-center text-xs hover:border-rose-300 hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all duration-200 shadow-sm"
                                >
                                  <div className="space-y-1">
                                    <p className="font-bold text-gray-800">Order #{order.order_id || order.sale_id}</p>
                                    <p className="text-[10px] text-gray-500">Vendor: <span className="font-semibold text-gray-700">{order.vendor_name || 'N/A'}</span></p>
                                    <p className="text-[9px] text-gray-400">{formatDateTime(order.created_at)}</p>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <span className="font-extrabold block text-sm text-gray-900">
                                      ₦{Number(order.total || 0).toLocaleString()}
                                    </span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded inline-block capitalize ${order.status === 'completed' || order.status === 'delivered' || order.status === 'released'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : order.status === 'cancelled' || order.status === 'disputed'
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                                      }`}>
                                      {order.status || 'Pending'}
                                    </span>
                                  </div>
                                </Link>
                              ))
                            ) : (
                              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                                No orders found
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    {userModalTab === 'social' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Sub-tab Navigation */}
                        <div className="bg-gray-100/80 p-1 rounded-lg flex items-center justify-between gap-1">
                          {[
                            { id: 'posts', label: `Posts (${selectedUser.total_posts || 0})` },
                            { id: 'followers', label: `Followers (${selectedUser.total_followers || 0})` },
                            { id: 'following', label: `Following (${selectedUser.total_following || 0})` }
                          ].map((subTab) => (
                            <button
                              key={subTab.id}
                              onClick={() => setSocialSubTab(subTab.id as any)}
                              className={`flex-1 text-center py-1.5 rounded-md font-bold text-[11px] transition-all select-none active:scale-[0.98] ${socialSubTab === subTab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                              {subTab.label}
                            </button>
                          ))}
                        </div>

                        {/* Sub-tab content */}
                        <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 no-scrollbar">
                          {tabLoading ? (
                            <div className="flex items-center justify-center py-10">
                              <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                            </div>
                          ) : socialSubTab === 'posts' ? (
                            tabData?.posts && tabData.posts.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {tabData.posts.map((post: any) => (
                                  <div key={post.post_id} className="bg-white border border-gray-100 rounded-[0.75rem] overflow-hidden flex flex-col hover:border-gray-200 transition-all shadow-sm">
                                    {post.media_url && (
                                      <div className="w-full h-24 bg-gray-100 overflow-hidden relative group">
                                        <img
                                          src={post.media_url}
                                          alt="Post media"
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          onClick={() => setPreviewImage(post.media_url)}
                                        />
                                      </div>
                                    )}
                                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                      <p className="text-[11px] text-gray-700 leading-relaxed break-words font-medium">
                                        {post.content}
                                      </p>
                                      <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-50 pt-2 shrink-0">
                                        <span>{formatDateTime(post.created_at)}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="flex items-center gap-0.5 text-rose-500 font-semibold">
                                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> {post.likes_count || 0}
                                          </span>
                                          <span className="flex items-center gap-0.5 text-blue-500 font-semibold">
                                            <MessageCircle className="w-3 h-3 text-blue-500" /> {post.comments_count || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-xs text-gray-400 font-medium">
                                No posts found
                              </div>
                            )
                          ) : (
                            /* Followers & Following Lists */
                            tabData?.users && tabData.users.length > 0 ? (
                              <div className="divide-y divide-gray-50 space-y-2.5">
                                {tabData.users.map((netUser: any) => (
                                  <div
                                    key={netUser.user_id}
                                    onClick={() => {
                                      // Traverse network: set active user details
                                      setSelectedUser({
                                        user_id: netUser.user_id,
                                        name: netUser.name,
                                        email: netUser.email,
                                        avatar: netUser.avatar,
                                        status: netUser.status || 'active',
                                        created_at: netUser.followed_at || new Date().toISOString(),
                                        role: 'customer'
                                      });
                                    }}
                                    className="flex items-center justify-between py-2.5 px-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-sm shrink-0 overflow-hidden">
                                        {netUser.avatar ? (
                                          <img src={netUser.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                          netUser.name?.charAt(0) || 'U'
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-bold text-gray-800 text-xs leading-tight group-hover:text-rose-600 transition-colors">{netUser.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{netUser.email}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="inline-block shrink-0">
                                        {getStatusBadge(netUser.status || 'active')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-xs text-gray-400 font-medium">
                                {socialSubTab === 'followers' ? 'No followers found' : 'Not following anyone'}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      {['blocked', 'suspended', 'banned'].includes(selectedUser.status) ? (
                        <button
                          onClick={() => triggerReactivateConfirm(selectedUser.user_id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-[0.5rem] font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                        >
                          Reactivate User
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerBlockConfirm(selectedUser.user_id)}
                          className="bg-rose-500 hover:bg-rose-600 text-white py-3 px-6 rounded-[0.5rem] font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                        >
                          Restrict Account
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-[0.5rem] font-bold text-xs transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </AnimatedModal>

            {/* Detail Modal for Registered Vendor - Rendered via AnimatedModal */}
            <AnimatedModal<Vendor>
              isOpen={!!selectedVendor}
              onClose={() => setSelectedVendor(null)}
              activeItem={selectedVendor}
              zIndex="z-[9999]"
              className="relative bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-[0.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {(selectedVendor) => (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-shrink-0">
                    <span className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Vendor Details</span>
                    <button
                      onClick={() => setSelectedVendor(null)}
                      className="p-2 hover:bg-gray-50 rounded-full text-gray-400 transition-colors"
                    >
                      <XCircle className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                  </div>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto p-6 md:p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] space-y-6">
                    {/* Centered Profile Section */}
                    <div className="flex flex-col items-center justify-center text-center pb-4">
                      <div
                        onClick={() => {
                          const imgUrl = selectedVendor.logo || selectedVendor.avatar;
                          if (imgUrl) setPreviewImage(imgUrl);
                        }}
                        className={`w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 border-4 border-rose-100/50 shadow-md overflow-hidden shrink-0 font-extrabold text-2xl mb-3 ${(selectedVendor.logo || selectedVendor.avatar) ? 'cursor-zoom-in hover:opacity-90 transition-opacity' : ''}`}
                      >
                        {selectedVendor.logo ? (
                          <img src={selectedVendor.logo} className="w-full h-full object-cover" />
                        ) : selectedVendor.avatar ? (
                          <img src={selectedVendor.avatar} className="w-full h-full object-cover" />
                        ) : (
                          selectedVendor.business_name.charAt(0)
                        )}
                      </div>
                      <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">{selectedVendor.business_name}</h2>
                      <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-1">Registered Vendor</p>
                    </div>

                    {/* Sticky Tabs Navigation */}
                    <div className="sticky top-0 bg-white z-20 py-2 border-b border-gray-100 flex items-center justify-start gap-1 overflow-x-auto select-none no-scrollbar flex-shrink-0">
                      {[
                        { id: 'profile', label: 'Profile', icon: User },
                        { id: 'finance', label: 'Finance', icon: Wallet },
                        { id: 'orders', label: 'Order', icon: ShoppingBag },
                        { id: 'social', label: 'Social post', icon: MessageSquare },
                        { id: 'products', label: 'Product', icon: Package }
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = vendorModalTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setVendorModalTab(tab.id as DetailTab)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-xs transition-all shrink-0 active:scale-95 ${isActive
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                              }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Contents */}
                    {vendorModalTab === 'profile' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Approval Status & Info */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <Shield className="w-3.5 h-3.5" /> Approval Status & Info
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Business Approval Status</span>
                              <span>{getStatusBadge(selectedVendor.business_status)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Account Status</span>
                              <span>{getStatusBadge(selectedVendor.account_status)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-500">Registered Since</span>
                              <span className="font-bold text-gray-800">
                                {new Date(selectedVendor.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Contact Information */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" /> Business & Contact Details
                          </h4>
                          <div className="bg-gray-50 rounded-[0.5rem] p-5 space-y-3">
                            <div className="flex justify-between items-start text-xs gap-4">
                              <span className="font-bold text-gray-500 min-w-[100px]">Legal Owner</span>
                              <span className="font-bold text-gray-800 text-right">{selectedVendor.owner_name}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs gap-4">
                              <span className="font-bold text-gray-500 min-w-[100px]">Email Address</span>
                              <span className="font-bold text-gray-800 text-right break-all">{selectedVendor.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs gap-4">
                              <span className="font-bold text-gray-500 min-w-[100px]">Phone Number</span>
                              <span className="font-bold text-gray-800 text-right">{selectedVendor.phone || 'Not Provided'}</span>
                            </div>
                            <div className="flex justify-between items-start text-xs gap-4 border-t border-gray-200/50 pt-3">
                              <span className="font-bold text-gray-500 min-w-[100px]">Business Address</span>
                              <span className="font-bold text-gray-800 text-right">{formatAddress(selectedVendor.business_address)}</span>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {vendorModalTab === 'finance' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Wallet Section */}
                        <section>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5" /> Wallet & Balances
                            </h4>
                            <Link
                              href={`/dashboard/finance?view=wallets&search=${selectedVendor.email}`}
                              className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors"
                            >
                              View Ledger <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-emerald-50/60 border border-emerald-100/60 rounded-[0.5rem] p-4 flex flex-col justify-between shadow-sm">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Available Balance</span>
                              <span className="text-xl font-extrabold text-emerald-700">
                                ₦{Number(selectedVendor.available_balance || 0).toLocaleString()}
                              </span>
                            </div>

                            <div className="bg-amber-50/60 border border-amber-100/60 rounded-[0.5rem] p-4 flex flex-col justify-between shadow-sm">
                              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Pending Balance</span>
                              <span className="text-xl font-extrabold text-amber-700">
                                ₦{Number(selectedVendor.pending_balance || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Transaction History */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" /> Transaction History
                          </h4>
                          <div className="max-h-[250px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 space-y-2 no-scrollbar">
                            {tabLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : tabData?.transactions && tabData.transactions.length > 0 ? (
                              tabData.transactions.map((tx: any) => {
                                const isCredit = tx.transaction_type === 'credit' || tx.transaction_type?.toLowerCase().includes('deposit') || tx.transaction_type?.toLowerCase().includes('refund');
                                return (
                                  <Link
                                    key={tx.id}
                                    href={`/dashboard/finance?view=wallets&search=${tx.reference || tx.id}`}
                                    className="block bg-white border border-gray-100 rounded-[0.5rem] p-3 flex justify-between items-center text-xs hover:border-emerald-300 hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all duration-200 shadow-sm"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-bold text-gray-800 capitalize">{tx.transaction_type?.replace('_', ' ')}</p>
                                      <p className="text-[10px] text-gray-500 leading-normal max-w-[250px]">{tx.description || 'No description'}</p>
                                      <p className="text-[9px] text-gray-400 font-mono">Ref: {tx.reference || 'N/A'}</p>
                                      <p className="text-[9px] text-gray-400">{formatDateTime(tx.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className={`font-extrabold block text-sm ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {isCredit ? '+' : '-'} ₦{Number(tx.amount || 0).toLocaleString()}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-bold block mt-0.5 capitalize bg-gray-100/80 px-1.5 py-0.5 rounded text-center inline-block">
                                        {tx.status || 'Success'}
                                      </span>
                                    </div>
                                  </Link>
                                );
                              })
                            ) : (
                              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                                No transactions found
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    {vendorModalTab === 'orders' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Store Metrics & Activity */}
                        <section>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                              <ClipboardList className="w-3.5 h-3.5" /> Store Metrics & Activity
                            </h4>
                            <Link
                              href={`/dashboard/order?search=${encodeURIComponent(selectedVendor.email)}`}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                            >
                              Go to Orders Page <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-rose-50/50 border border-rose-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[10px] font-bold text-rose-500 mb-1">Total Products</span>
                              <span className="text-xl font-extrabold text-rose-600">
                                {selectedVendor.total_products || 0}
                              </span>
                            </div>

                            <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[10px] font-bold text-emerald-500 mb-1">Total Orders</span>
                              <span className="text-xl font-extrabold text-emerald-600">
                                {selectedVendor.total_orders || 0}
                              </span>
                            </div>

                            <div className="bg-blue-50/50 border border-blue-100/50 rounded-[0.5rem] p-4 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[10px] font-bold text-blue-500 mb-1">Total Revenue</span>
                              <span className="text-sm font-extrabold text-blue-600">
                                ₦{Number(selectedVendor.total_revenue || 0).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Order Status Breakdown */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" /> Order Status Breakdown
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-indigo-50/40 border border-indigo-100/40 rounded-[0.5rem] p-3 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-1">New Orders</span>
                              <span className="text-lg font-extrabold text-indigo-600">
                                {selectedVendor.new_orders_count || 0}
                              </span>
                            </div>

                            <div className="bg-amber-50/40 border border-amber-100/40 rounded-[0.5rem] p-3 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider mb-1">Processing Orders</span>
                              <span className="text-lg font-extrabold text-amber-600">
                                {selectedVendor.processing_orders_count || 0}
                              </span>
                            </div>

                            <div className="bg-emerald-50/40 border border-emerald-100/40 rounded-[0.5rem] p-3 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Completed Orders</span>
                              <span className="text-lg font-extrabold text-emerald-600">
                                {selectedVendor.completed_orders_count || 0}
                              </span>
                            </div>

                            <div className="bg-red-50/40 border border-red-100/40 rounded-[0.5rem] p-3 flex flex-col justify-center items-center text-center shadow-sm">
                              <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider mb-1">Disputed Orders</span>
                              <span className="text-lg font-extrabold text-red-600">
                                {selectedVendor.disputed_orders_count || 0}
                              </span>
                            </div>
                          </div>
                        </section>

                        {/* Recent Orders List */}
                        <section>
                          <h4 className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-2">
                            <ShoppingBag className="w-3.5 h-3.5" /> Recent Orders History
                          </h4>
                          <div className="max-h-[250px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 space-y-2 no-scrollbar">
                            {tabLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : tabData?.orders && tabData.orders.length > 0 ? (
                              tabData.orders.map((order: any) => (
                                <Link
                                  key={order.order_id}
                                  href={`/dashboard/order?search=${order.order_id || order.id || order.sale_id}`}
                                  className="block bg-white border border-gray-100 rounded-[0.5rem] p-3 flex justify-between items-center text-xs hover:border-emerald-300 hover:scale-[1.01] hover:shadow-md cursor-pointer transition-all duration-200 shadow-sm"
                                >
                                  <div className="space-y-1">
                                    <p className="font-bold text-gray-800">Order #{order.order_id || order.sale_id}</p>
                                    <p className="text-[10px] text-gray-500">Customer: <span className="font-semibold text-gray-700">{order.customer_name || 'N/A'}</span></p>
                                    <p className="text-[9px] text-gray-400">{formatDateTime(order.created_at)}</p>
                                  </div>
                                  <div className="text-right space-y-1">
                                    <span className="font-extrabold block text-sm text-gray-900">
                                      ₦{Number(order.total || 0).toLocaleString()}
                                    </span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded inline-block capitalize ${order.status === 'completed' || order.status === 'delivered' || order.status === 'released'
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                      : order.status === 'cancelled' || order.status === 'disputed'
                                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                        : 'bg-amber-50 text-amber-600 border border-amber-100'
                                      }`}>
                                      {order.status || 'Pending'}
                                    </span>
                                  </div>
                                </Link>
                              ))
                            ) : (
                              <div className="text-center py-8 text-xs text-gray-400 font-medium">
                                No orders found
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    {vendorModalTab === 'social' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Sub-tab Navigation */}
                        <div className="bg-gray-100/80 p-1 rounded-lg flex items-center justify-between gap-1">
                          {[
                            { id: 'posts', label: `Posts (${selectedVendor.total_posts || 0})` },
                            { id: 'followers', label: `Followers (${selectedVendor.total_followers || 0})` },
                            { id: 'following', label: `Following (${selectedVendor.total_following || 0})` }
                          ].map((subTab) => (
                            <button
                              key={subTab.id}
                              onClick={() => setSocialSubTab(subTab.id as any)}
                              className={`flex-1 text-center py-1.5 rounded-md font-bold text-[11px] transition-all select-none active:scale-[0.98] ${socialSubTab === subTab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                              {subTab.label}
                            </button>
                          ))}
                        </div>

                        {/* Sub-tab content */}
                        <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 no-scrollbar">
                          {tabLoading ? (
                            <div className="flex items-center justify-center py-10">
                              <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                            </div>
                          ) : socialSubTab === 'posts' ? (
                            tabData?.posts && tabData.posts.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {tabData.posts.map((post: any) => (
                                  <div key={post.post_id} className="bg-white border border-gray-100 rounded-[0.75rem] overflow-hidden flex flex-col hover:border-gray-200 transition-all shadow-sm">
                                    {post.media_url && (
                                      <div className="w-full h-24 bg-gray-100 overflow-hidden relative group">
                                        <img
                                          src={post.media_url}
                                          alt="Post media"
                                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          onClick={() => setPreviewImage(post.media_url)}
                                        />
                                      </div>
                                    )}
                                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                                      <p className="text-[11px] text-gray-700 leading-relaxed break-words font-medium">
                                        {post.content}
                                      </p>
                                      <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-gray-50 pt-2 shrink-0">
                                        <span>{formatDateTime(post.created_at)}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="flex items-center gap-0.5 text-rose-500 font-semibold">
                                            <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> {post.likes_count || 0}
                                          </span>
                                          <span className="flex items-center gap-0.5 text-blue-500 font-semibold">
                                            <MessageCircle className="w-3 h-3 text-blue-500" /> {post.comments_count || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-xs text-gray-400 font-medium">
                                No posts found
                              </div>
                            )
                          ) : (
                            /* Followers & Following Lists */
                            tabData?.users && tabData.users.length > 0 ? (
                              <div className="divide-y divide-gray-50 space-y-2.5">
                                {tabData.users.map((netUser: any) => (
                                  <div
                                    key={netUser.user_id}
                                    onClick={() => {
                                      // Traverse network: set active user details
                                      setSelectedUser({
                                        user_id: netUser.user_id,
                                        name: netUser.name,
                                        email: netUser.email,
                                        avatar: netUser.avatar,
                                        status: netUser.status || 'active',
                                        created_at: netUser.followed_at || new Date().toISOString(),
                                        role: 'customer'
                                      });
                                    }}
                                    className="flex items-center justify-between py-2.5 px-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-extrabold text-sm shrink-0 overflow-hidden">
                                        {netUser.avatar ? (
                                          <img src={netUser.avatar} className="w-full h-full object-cover" />
                                        ) : (
                                          netUser.name?.charAt(0) || 'U'
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-bold text-gray-800 text-xs leading-tight group-hover:text-rose-600 transition-colors">{netUser.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{netUser.email}</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <span className="inline-block shrink-0">
                                        {getStatusBadge(netUser.status || 'active')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-xs text-gray-400 font-medium">
                                {socialSubTab === 'followers' ? 'No followers found' : 'Not following anyone'}
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {vendorModalTab === 'products' && (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Products list */}
                        <section>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[11px] font-bold text-gray-400 flex items-center gap-2">
                              <Package className="w-3.5 h-3.5" /> Vendor Products ({selectedVendor.total_products || 0})
                            </h4>
                            <Link
                              href={`/dashboard/products?search=${encodeURIComponent(selectedVendor.business_name)}`}
                              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded transition-colors"
                            >
                              Go to Products Page <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          </div>

                          <div className="max-h-[300px] overflow-y-auto border border-gray-100 rounded-[0.5rem] bg-gray-50/30 p-3 space-y-2.5 no-scrollbar">
                            {tabLoading ? (
                              <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : tabData?.products && tabData.products.length > 0 ? (
                              <div className="divide-y divide-gray-50 space-y-2.5">
                                {tabData.products.map((product: any) => (
                                  <div
                                    key={product.id}
                                    className="flex items-center justify-between py-2 px-1 hover:bg-white rounded-lg border border-transparent hover:border-gray-100 transition-all text-xs"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-extrabold text-sm shrink-0 overflow-hidden">
                                        {product.image ? (
                                          <img src={product.image} className="w-full h-full object-cover" />
                                        ) : (
                                          <Package className="w-5 h-5" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="font-bold text-gray-800 text-xs leading-tight">{product.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-1 capitalize">{product.category}</p>
                                      </div>
                                    </div>
                                    <div className="text-right space-y-1">
                                      <span className="font-extrabold block text-gray-900 text-xs">
                                        ₦{Number(product.price || 0).toLocaleString()}
                                      </span>
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <span className={`text-[9px] font-bold ${product.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          Stock: {product.stock}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${product.status === 'active'
                                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                          : 'bg-gray-50 text-gray-600 border border-gray-100'
                                          }`}>
                                          {product.status || 'Active'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-10 text-xs text-gray-400 font-medium">
                                No products found for this vendor
                              </div>
                            )}
                          </div>
                        </section>
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                      {['blocked', 'suspended', 'banned'].includes(selectedVendor.account_status?.toLowerCase()) ? (
                        <button
                          onClick={() => triggerReactivateConfirm(selectedVendor.user_id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-[0.5rem] font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                        >
                          Reactivate Vendor
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerBlockConfirm(selectedVendor.user_id)}
                          className="bg-rose-500 hover:bg-rose-600 text-white py-3 px-6 rounded-[0.5rem] font-bold text-xs shadow-md transition-all active:scale-[0.98]"

                        >
                          Restrict Account
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVendor(null)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-[0.5rem] font-bold text-xs transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </>
              )}
            </AnimatedModal>

            {/* Confirmation Modal for Approving Business */}
            <AnimatedModal
              isOpen={isConfirmOpen}
              onClose={() => {
                if (!isApproving) {
                  setIsConfirmOpen(false);
                  setPendingApprovalId(null);
                }
              }}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-md rounded-[1rem] shadow-2xl p-6 md:p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-sm">
                <Shield className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">Approve Business?</h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                  Are you sure you want to approve this business? The vendor will receive an approval email and gain access to vendor business features.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  disabled={isApproving}
                  onClick={() => {
                    setIsConfirmOpen(false);
                    setPendingApprovalId(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-3.5 px-6 rounded-[0.75rem] font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isApproving}
                  onClick={() => {
                    if (pendingApprovalId) {
                      handleApproveVendor(pendingApprovalId);
                    }
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3.5 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Confirm Approval'
                  )}
                </button>
              </div>
            </AnimatedModal>

            {/* Confirmation Modal for Rejecting Business */}
            <AnimatedModal
              isOpen={isRejectOpen}
              onClose={() => {
                if (!isRejecting) {
                  setIsRejectOpen(false);
                  setPendingRejectId(null);
                  setRejectReason('');
                  setSelectedRejectReasonOption('');
                  setCustomRejectReason('');
                }
              }}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-lg rounded-[1rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Fixed Header */}
              <div className="p-6 pb-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-bounce text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-md font-extrabold text-gray-900 tracking-tight">Reject Application?</h3>
                    <p className="text-[11px] font-semibold text-gray-400">
                      Select the reason for rejecting this vendor request. An email will notify them.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsRejectOpen(false);
                    setPendingRejectId(null);
                    setRejectReason('');
                    setSelectedRejectReasonOption('');
                    setCustomRejectReason('');
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Reasons List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[55vh] custom-scrollbar">
                <div className="space-y-2">
                  {REJECT_VENDOR_REASONS.map((r) => (
                    <div
                      key={r}
                      onClick={() => {
                        setSelectedRejectReasonOption(r);
                        if (r !== "Other (custom reason)") {
                          setRejectReason(r);
                        } else {
                          setRejectReason(customRejectReason);
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-[12px] border transition-all cursor-pointer group ${selectedRejectReasonOption === r ? 'bg-white border-rose-200 shadow-sm' : 'bg-white/50 border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <span className={`text-xs font-bold ${selectedRejectReasonOption === r ? 'text-gray-900 font-extrabold' : 'text-gray-400'}`}>{r}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedRejectReasonOption === r ? "bg-rose-500 border-rose-500 shadow-lg shadow-rose-200" : "bg-white border-gray-200"}`}>
                        {selectedRejectReasonOption === r && <Check className="text-white w-3 h-3 stroke-[3] animate-in zoom-in duration-200" />}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRejectReasonOption === 'Other (custom reason)' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Custom Reason Details</label>
                    <textarea
                      placeholder="e.g. Identity document uploaded is blurry or invalid. Please upload a clear copy of your NIN."
                      className="w-full bg-gray-50 border border-transparent rounded-[12px] p-3 text-xs font-semibold focus:bg-white focus:border-rose-100 transition-all outline-none min-h-[100px] resize-none"
                      value={customRejectReason}
                      onChange={(e) => {
                        setCustomRejectReason(e.target.value);
                        setRejectReason(e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex gap-3 shrink-0">
                <button
                  disabled={isRejecting}
                  onClick={() => {
                    setIsRejectOpen(false);
                    setPendingRejectId(null);
                    setRejectReason('');
                    setSelectedRejectReasonOption('');
                    setCustomRejectReason('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-3.5 px-6 rounded-[0.75rem] font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isRejecting || !selectedRejectReasonOption || (selectedRejectReasonOption === 'Other (custom reason)' && !customRejectReason.trim())}
                  onClick={() => {
                    if (pendingRejectId) {
                      handleRejectVendor(pendingRejectId);
                    }
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3.5 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isRejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Confirm Reject'
                  )}
                </button>
              </div>
            </AnimatedModal>

            {/* Reactivate Confirmation Modal */}
            <AnimatedModal
              isOpen={isReactivateModalOpen && !!pendingReactivateUserId}
              onClose={() => {
                setIsReactivateModalOpen(false);
                setPendingReactivateUserId(null);
              }}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-md rounded-[1rem] shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                  <Unlock className="w-5 h-5 text-emerald-500" /> Reactivate Account
                </h3>
                <button
                  onClick={() => {
                    setIsReactivateModalOpen(false);
                    setPendingReactivateUserId(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-600 leading-relaxed">
                  Are you sure you want to reactivate this user's account?
                </p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Restoring the account will give the user full access to log in, search, post, and interact with the Stoqle platform. Associated businesses and staff profiles will also be reactivated.
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-50">
                <button
                  onClick={() => {
                    setIsReactivateModalOpen(false);
                    setPendingReactivateUserId(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-[0.75rem] font-bold text-xs transition-all flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsReactivateModalOpen(false);
                    if (pendingReactivateUserId) {
                      await handleUpdateUserStatus(pendingReactivateUserId, 'active');
                    }
                    setPendingReactivateUserId(null);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Confirm Reactivate
                </button>
              </div>
            </AnimatedModal>

            {/* Reason for Blocking Modal */}
            {/* Reason for Blocking Modal */}
            <AnimatedModal
              isOpen={isBlockReasonOpen}
              onClose={() => {
                setIsBlockReasonOpen(false);
                setPendingBlockUserId(null);
              }}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-lg rounded-[0.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Fixed Header */}
              <div className="p-6 pb-4 border-b border-gray-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 border border-rose-100 shadow-sm shrink-0">
                    <Ban className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-md font-extrabold text-gray-900 tracking-tight">Reason for Blocking</h3>
                    <p className="text-[11px] font-semibold text-gray-400">
                      Select a block reason. This will be sent to the user.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsBlockReasonOpen(false);
                    setPendingBlockUserId(null);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Reasons List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[55vh] custom-scrollbar">
                {/* Action Selector: Block, Suspend, Ban */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Account Action</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'blocked', label: 'Block', desc: 'Temporary block' },
                      { value: 'suspended', label: 'Suspend', desc: 'Temporary suspension' },
                      { value: 'banned', label: 'Ban', desc: 'Permanent ban' }
                    ].map((act) => (
                      <div
                        key={act.value}
                        onClick={() => setAccountActionType(act.value as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-[12px] border transition-all cursor-pointer text-center ${accountActionType === act.value ? 'bg-rose-50 border-rose-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                      >
                        <span className={`text-xs font-bold ${accountActionType === act.value ? 'text-rose-600' : 'text-gray-600'}`}>{act.label}</span>
                        <span className="text-[9px] text-gray-400 font-medium mt-0.5">{act.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {accountActionType === 'suspended' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Suspension End Date</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-gray-50 border border-gray-200 rounded-[12px] p-3 text-xs font-semibold focus:bg-white focus:border-rose-300 focus:ring-2 focus:ring-rose-500/20 transition-all outline-none text-gray-800"
                      value={suspensionUntil}
                      min={new Date().toISOString().slice(0, 16)}
                      onChange={(e) => setSuspensionUntil(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-gray-50">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Reason for Action</label>
                  {BLOCK_REASONS.map((r) => (
                    <div
                      key={r}
                      onClick={() => {
                        setSelectedBlockReasonOption(r);
                        if (r !== "Other (custom reason)") {
                          setBlockReason(r);
                        } else {
                          setBlockReason(customBlockReason);
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-[12px] border transition-all cursor-pointer group ${selectedBlockReasonOption === r ? 'bg-white border-rose-200 shadow-sm' : 'bg-white/50 border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <span className={`text-xs font-bold ${selectedBlockReasonOption === r ? 'text-gray-900 font-extrabold' : 'text-gray-400'}`}>{r}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedBlockReasonOption === r ? "bg-rose-500 border-rose-500 shadow-lg shadow-rose-200" : "bg-white border-gray-200"}`}>
                        {selectedBlockReasonOption === r && <Check className="text-white w-3 h-3 stroke-[3] animate-in zoom-in duration-200" />}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedBlockReasonOption === 'Other (custom reason)' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Custom Reason Details</label>
                    <textarea
                      placeholder="Please specify the reason for blocking this user..."
                      className="w-full bg-gray-50 border border-transparent rounded-[12px] p-3 text-xs font-semibold focus:bg-white focus:border-rose-100 transition-all outline-none min-h-[100px] resize-none"
                      value={customBlockReason}
                      onChange={(e) => {
                        setCustomBlockReason(e.target.value);
                        setBlockReason(e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="p-6 bg-gray-50/50 border-t border-gray-50 flex gap-3 shrink-0">
                <button
                  onClick={() => {
                    setIsBlockReasonOpen(false);
                    setPendingBlockUserId(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 px-6 rounded-[0.75rem] font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedBlockReasonOption || (selectedBlockReasonOption === 'Other (custom reason)' && !customBlockReason.trim()) || (accountActionType === 'suspended' && !suspensionUntil)}
                  onClick={() => {
                    setIsBlockReasonOpen(false);
                    setIsBlockConfirmOpen(true);
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3.5 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  Next
                </button>
              </div>
            </AnimatedModal>

            {/* Confirmation Modal for Blocking User */}
            {/* Confirmation Modal for Blocking User */}
            <AnimatedModal
              isOpen={isBlockConfirmOpen}
              onClose={() => {
                if (!isBlocking) {
                  setIsBlockConfirmOpen(false);
                  setPendingBlockUserId(null);
                }
              }}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-md rounded-[1rem] shadow-2xl p-6 md:p-8 text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-sm">
                <Ban className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  {accountActionType === 'blocked' ? 'Block Account?' : accountActionType === 'suspended' ? 'Suspend Account?' : 'Ban Account?'}
                </h3>
                <p className="text-sm font-medium text-gray-500 leading-relaxed">
                  Are you sure you want to {accountActionType === 'blocked' ? 'block' : accountActionType === 'suspended' ? 'suspend' : 'ban'} this user?
                </p>

                {accountActionType === 'suspended' && suspensionUntil && (
                  <div className="bg-rose-50 border border-rose-100 rounded-[12px] p-3 text-xs font-bold text-rose-700">
                    Suspension until: {new Date(suspensionUntil).toLocaleString()}
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-100 rounded-[12px] p-3 mt-2 text-xs font-semibold text-gray-600 italic">
                  Reason: "{blockReason}"
                </div>
                <p className="text-[11px] font-bold text-gray-400 mt-2">
                  They will lose access to the platform immediately.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  disabled={isBlocking}
                  onClick={() => {
                    setIsBlockConfirmOpen(false);
                    setPendingBlockUserId(null);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 py-3.5 px-6 rounded-[0.75rem] font-bold text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isBlocking}
                  onClick={async () => {
                    if (pendingBlockUserId) {
                      setIsBlocking(true);
                      await handleUpdateUserStatus(pendingBlockUserId, accountActionType, blockReason, suspensionUntil);
                      setIsBlocking(false);
                      setIsBlockConfirmOpen(false);
                      setPendingBlockUserId(null);
                    }
                  }}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white py-3.5 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isBlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Confirm ${accountActionType === 'blocked' ? 'Block' : accountActionType === 'suspended' ? 'Suspend' : 'Ban'}`
                  )}
                </button>
              </div>
            </AnimatedModal>

            {/* Appeal Detail Modal */}
            {/* Appeal Detail Modal */}
            <AnimatedModal<Appeal>
              isOpen={!!selectedAppeal}
              onClose={() => setSelectedAppeal(null)}
              activeItem={selectedAppeal}
              zIndex="z-[10000]"
              className="relative bg-white w-full max-w-lg rounded-[1rem] shadow-2xl  md:p-8 space-y-6"
            >
              {(selectedAppeal) => (
                <>
                  <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                    <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Appeal Details</h3>
                    <button
                      onClick={() => setSelectedAppeal(null)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-[0.5rem] bg-rose-50 flex items-center justify-center text-rose-600 font-extrabold text-sm border border-rose-100 shadow-sm overflow-hidden shrink-0">
                        {selectedAppeal.avatar ? <img src={selectedAppeal.avatar} className="w-full h-full object-cover" /> : selectedAppeal.full_name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{selectedAppeal.full_name}</h4>
                        <p className="text-xs font-semibold text-gray-400">{selectedAppeal.email}</p>
                        {selectedAppeal.phone_no && (
                          <p className="text-xs font-semibold text-gray-400">{selectedAppeal.phone_no}</p>
                        )}
                      </div>
                    </div>

                    {selectedAppeal.status_reason && (
                      <div className="space-y-1 bg-rose-50/40 border border-rose-100/40 rounded-[12px] p-3">
                        <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Original Penalty Reason</label>
                        <p className="text-xs font-semibold text-rose-700 leading-relaxed italic">
                          "{selectedAppeal.status_reason}"
                        </p>
                      </div>
                    )}

                    <div className="space-y-1 bg-gray-50 rounded-[12px] p-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reason for Appeal</label>
                      <p className="text-xs font-semibold text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedAppeal.reason}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account Status</label>
                        <p className="text-xs font-extrabold text-rose-600 mt-0.5 uppercase">
                          {selectedAppeal.account_status}
                          {selectedAppeal.account_status === 'suspended' && selectedAppeal.suspended_until && (
                            <span className="block text-[9px] font-semibold text-gray-400 normal-case mt-0.5 leading-tight">
                              Until: {new Date(selectedAppeal.suspended_until).toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Submitted On</label>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">
                          {new Date(selectedAppeal.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedAppeal.status === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-50">
                      <button
                        onClick={() => handleUpdateAppealStatus(selectedAppeal.appeal_id, 'rejected')}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 py-3 px-6 rounded-[0.75rem] font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                      >
                        <X className="w-4 h-4" /> Reject Appeal
                      </button>
                      <button
                        onClick={() => handleUpdateAppealStatus(selectedAppeal.appeal_id, 'approved')}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-6 rounded-[0.75rem] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Approve Appeal
                      </button>
                    </div>
                  )}
                </>
              )}
            </AnimatedModal>

            <FullscreenImageViewer
              isOpen={!!previewImage}
              onClose={() => setPreviewImage(null)}
              src={previewImage || undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
