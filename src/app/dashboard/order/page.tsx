'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import StoqleLoader from '@/components/StoqleLoader';
import { io } from 'socket.io-client';
import {
    Search,
    Filter,
    Package,
    Truck,
    Clock,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Phone,
    User,
    MapPin,
    MessageSquare,
    AlertTriangle,
    ShieldCheck,
    RefreshCw,
    Calendar,
    ArrowUpRight,
    Eye,
    Check,
    X,
    FileText,
    DollarSign,
    Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminQuery } from '@/lib/useAdminQuery';

interface OrderItem {
    order_item_id: number;
    product_id: number;
    product_name: string;
    product_image: string | null;
    variant_info: string | null;
    quantity: number;
    unit_price: number;
    total_item_price: number;
    status: string;
    item_cancel_reason?: string | null;
    dispute_reason?: string | null;
    dispute_status?: string | null;
    dispute_explanation?: string | null;
    delivered_at?: string | null;
    customer_confirmed?: boolean | number;
}

interface Shipment {
    shipment_id: number;
    status: string;
    shipping_promise: string | null;
    delivery_code: string | null;
    cancel_reason?: string | null;
    delivery_review_reason?: string | null;
    delivery_review_explanation?: string | null;
    delivery_review_images?: string[];
    rider_name?: string | null;
    rider_phone?: string | null;
    escrow_status?: string | null;
    delivered_at?: string | null;
    admin_resolution?: string | null;
    admin_resolution_notes?: string | null;
    items: OrderItem[];
}

interface VendorGroup {
    sale_id: number;
    vendor_id: number;
    vendor_name: string;
    vendor_logo: string | null;
    reference_no: string;
    total: number;
    status: string;
    shipments: Shipment[];
}

interface MasterOrder {
    master_order_id: number;
    stoqle_order_id: string | null;
    display_id: string;
    customer_id: number | null;
    full_name: string;
    email: string;
    phone: string;
    customer_profile_pic: string | null;
    payment_reference: string | null;
    payment_status: string;
    combined_total: number;
    total_items: number;
    delivery_address: any;
    status: string;
    created_at: string;
    vendors: VendorGroup[];
}

interface OrderStats {
    total_orders: number;
    pending_review: number;
    disputed: number;
    today_orders: number;
    total_revenue: number;
}

export default function OrderManagementPage() {
    // Tabs matching requirements: All, Awaiting Payment, Processing, To Receive/Use, Review, Dispute
    const tabs = [
        { key: 'all', label: 'All' },
        { key: 'processing', label: 'Processing' },
        { key: 'to_receive', label: 'To Receive/Use' },
        { key: 'dispute', label: 'Dispute' }
    ];

    const searchParams = useSearchParams();
    const initialSearch = searchParams?.get('search') || '';

    const [activeTab, setActiveTab] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>(initialSearch);
    const [debouncedSearch, setDebouncedSearch] = useState<string>(initialSearch);
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [limit] = useState<number>(8);

    // Details panel states
    const [selectedOrder, setSelectedOrder] = useState<MasterOrder | null>(null);
    const [activeVendorIdx, setActiveVendorIdx] = useState<number>(0);
    const [activeShipmentIdx, setActiveShipmentIdx] = useState<number>(0);

    // Modal / Image Viewer States
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showSnapshotItem, setShowSnapshotItem] = useState<OrderItem | null>(null);

    // Administrative action states
    const [isResolving, setIsResolving] = useState<boolean>(false);
    const [isOverriding, setIsOverriding] = useState<boolean>(false);
    const [resolution, setResolution] = useState<'approve_vendor' | 'refund_customer'>('approve_vendor');
    const [resolutionNotes, setResolutionNotes] = useState<string>('');
    const [overrideStatus, setOverrideStatus] = useState<string>('delivered');
    const [overrideNotes, setOverrideNotes] = useState<string>('');

    const [mounted, setMounted] = useState<boolean>(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch Stats using IndexedDB cache + background sync
    const { data: statsData, isSyncing: statsSyncing, refetch: refetchStats } = useAdminQuery({
        queryKey: 'admin_order_stats',
        fetcher: async () => {
            const res = await api.get('/orders/stats');
            return res.data?.data;
        }
    });

    const stats = statsData || null;
    const statsLoading = statsData === null && statsSyncing;

    // Fetch Orders using IndexedDB cache + background sync
    const queryKey = `admin_orders:${activeTab}:${currentPage}:${limit}:${debouncedSearch}:${dateFrom}:${dateTo}`;

    const { data: ordersData, isSyncing: ordersSyncing, refetch: refetchOrders } = useAdminQuery({
        queryKey,
        fetcher: async () => {
            const params: any = {
                tab: activeTab,
                page: currentPage,
                limit,
                search: debouncedSearch
            };
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const res = await api.get('/orders', { params });
            return res.data?.data; // { orders: [], pagination: { pages: 1 } }
        }
    });

    const orders = ordersData?.orders || [];
    const totalPages = ordersData?.pagination?.pages || 1;
    const loading = ordersData === null && ordersSyncing;

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset pagination and selection on tab / date change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedOrder(null);
    }, [activeTab, dateFrom, dateTo, debouncedSearch]);

    // Sync search query from URL search parameters on change
    useEffect(() => {
        const search = searchParams?.get('search') || '';
        setSearchQuery(search);
        setDebouncedSearch(search);
        setSelectedOrder(null);
    }, [searchParams]);

    // Combined effect for auto-select and background sync
    useEffect(() => {
        if (!orders || orders.length === 0) {
            if (selectedOrder) setSelectedOrder(null);
            return;
        }

        if (!selectedOrder) {
            // Auto-select the first order if none is selected
            setSelectedOrder(orders[0]);
            setActiveVendorIdx(0);
            setActiveShipmentIdx(0);
            setResolutionNotes('');
            setOverrideNotes('');
        } else {
            // Update selected order if data changed in background
            const updated = orders.find((o: MasterOrder) => o.master_order_id === selectedOrder.master_order_id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedOrder)) {
                setSelectedOrder(updated);
            }
        }
    }, [orders]);

    // Background polling for real-time reflection of order updates
    useEffect(() => {
        const interval = setInterval(() => {
            refetchStats();
            refetchOrders();
        }, 20000); // Check every 20 seconds
        return () => clearInterval(interval);
    }, [refetchStats, refetchOrders]);

    // Real-time WebSocket synchronization
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
            transports: ['websocket', 'polling']
        });

        socket.on('admin_order_update', (data) => {
            console.log('Real-time admin update received:', data);
            refetchStats();
            refetchOrders();
            if (data?.message) {
                toast.success(data.message, { icon: '📦' });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [refetchStats, refetchOrders]);

    const handleSelectOrder = (order: MasterOrder) => {
        setSelectedOrder(order);
        setActiveVendorIdx(0);
        setActiveShipmentIdx(0);
        setResolutionNotes('');
        setOverrideNotes('');
    };

    // Resolve Dispute Action
    const handleResolveDispute = async (shipmentId: number) => {
        if (!resolutionNotes.trim()) {
            toast.warning('Please enter resolution notes');
            return;
        }

        setIsResolving(true);
        try {
            const res = await api.post(`/orders/shipments/${shipmentId}/resolve-dispute`, {
                resolution,
                notes: resolutionNotes
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Dispute resolved successfully');
                setResolutionNotes('');
                // Refresh list and stats
                refetchStats();
                refetchOrders();
            } else {
                toast.error(res.data?.message || 'Failed to resolve dispute');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error occurred while resolving dispute');
        } finally {
            setIsResolving(false);
        }
    };

    // Override Status Action
    const handleOverrideStatus = async (shipmentId: number) => {
        setIsOverriding(true);
        try {
            const res = await api.patch(`/orders/shipments/${shipmentId}/status`, {
                status: overrideStatus,
                notes: overrideNotes
            });

            if (res.data?.success) {
                toast.success(res.data.message || 'Order status overridden successfully');
                setOverrideNotes('');
                // Refresh list and stats
                refetchStats();
                refetchOrders();
            } else {
                toast.error(res.data?.message || 'Failed to override status');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Error occurred while overriding status');
        } finally {
            setIsOverriding(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || '';
        switch (s) {
            case 'pending':
            case 'order_placed':
            case 'unpaid':
            case 'pending_payment':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'confirmed':
            case 'processing':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'ready_for_shipping':
            case 'ready_for_pickup':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'out_for_delivery':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'delivered':
            case 'completed':
            case 'released':
            case 'paid':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'pending_admin_review':
                return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
            case 'disputed':
                return 'bg-red-50 text-red-700 border-red-200 font-bold';
            case 'cancelled':
            case 'refunded':
            case 'failed':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getStatusLabel = (status: string) => {
        return (status || '').toUpperCase().replace(/_/g, ' ');
    };

    const formatNaira = (amount: number) => {
        return `₦${Number(amount || 0).toLocaleString()}`;
    };

    const getTimeGroup = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const startOfAWeekAgo = new Date(startOfToday);
        startOfAWeekAgo.setDate(startOfAWeekAgo.getDate() - 7);

        if (date >= startOfToday) return 'Today';
        if (date >= startOfYesterday) return 'Yesterday';
        if (date >= startOfAWeekAgo) return 'Last 7 Days';
        return 'Older';
    };

    // Group orders for the left list
    const groupedOrders = orders.reduce((groups: Record<string, MasterOrder[]>, order: MasterOrder) => {
        const group = getTimeGroup(order.created_at);
        if (!groups[group]) groups[group] = [];
        groups[group].push(order);
        return groups;
    }, {});

    const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Older'];

    return (
        <div className="space-y-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Order Management</h1>
                </div>
                <button
                    onClick={() => {
                        refetchStats();
                        refetchOrders();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[0.5rem] hover:bg-gray-50 text-gray-600 font-semibold text-xs transition shadow-sm self-start md:self-auto"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Feed
                </button>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">Total Orders</span>
                    {statsLoading ? (
                        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-2" />
                    ) : (
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{stats?.total_orders || 0}</span>
                            <Package className="w-5 h-5 text-gray-300" />
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">Awaiting Review</span>
                    {statsLoading ? (
                        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-2" />
                    ) : (
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-rose-600">{stats?.pending_review || 0}</span>
                            <Clock className="w-5 h-5 text-rose-300 animate-pulse" />
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">Disputed Shipments</span>
                    {statsLoading ? (
                        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-2" />
                    ) : (
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-red-600">{stats?.disputed || 0}</span>
                            <AlertTriangle className="w-5 h-5 text-red-300" />
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">Today's Inflow</span>
                    {statsLoading ? (
                        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-2" />
                    ) : (
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-2xl font-black text-gray-900">{stats?.today_orders || 0}</span>
                            <ArrowUpRight className="w-5 h-5 text-emerald-500" />
                        </div>
                    )}
                </div>

                <div className="col-span-2 lg:col-span-1 bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-black text-gray-400">Total Volume</span>
                    {statsLoading ? (
                        <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mt-2" />
                    ) : (
                        <div className="flex items-baseline justify-between mt-1">
                            <span className="text-xl font-black text-gray-900 truncate">{formatNaira(stats?.total_revenue || 0)}</span>
                            <DollarSign className="w-5 h-5 text-gray-300" />
                        </div>
                    )}
                </div>
            </div>

            {/* Filter and search toolbar */}
            <div className="bg-white p-4 rounded-[0.5rem] border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Search Box */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search by order ID, customer name, email, phone or reference..."
                            className="w-full bg-white border border-gray-100 rounded-[0.5rem] py-3.5 pl-12 pr-4 text-sm font-medium focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Date picker inputs */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-[0.5rem] px-3 py-2 text-xs font-semibold text-gray-500 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>From:</span>
                            <input
                                type="date"
                                className="bg-transparent border-none outline-none text-gray-700 text-xs cursor-pointer"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-[0.5rem] px-3 py-2 text-xs font-semibold text-gray-500 shadow-sm">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>To:</span>
                            <input
                                type="date"
                                className="bg-transparent border-none outline-none text-gray-700 text-xs cursor-pointer"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>

                        {(dateFrom || dateTo) && (
                            <button
                                onClick={() => {
                                    setDateFrom('');
                                    setDateTo('');
                                }}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                                title="Clear Dates"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabs bar */}
                <div className="flex overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3.5 text-md transition-all border-b-2 whitespace-nowrap ${activeTab === tab.key
                                ? 'border-rose-500 text-rose-500 '
                                : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab.label} {activeTab === tab.key && `(${ordersData?.pagination?.total || 0})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split panel workspace layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* Left Panel: Grouped orders list */}
                <div className={`col-span-1 lg:col-span-4 space-y-4 self-start lg:sticky lg:top-6 ${selectedOrder ? 'hidden lg:block' : 'block'}`}>
                    <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm p-4 h-auto flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
                            <span className="text-xs text-gray-400 font-black  tracking-wider">Orders List</span>
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                {orders.length} matches
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <StoqleLoader />
                                <span className="text-xs text-gray-400 font-semibold mt-4">Loading transaction registry...</span>
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
                                <Package className="w-12 h-12 text-gray-200 mb-3" />
                                <h3 className="font-extrabold text-sm text-gray-700">No orders found</h3>
                                <p className="text-xs text-gray-400 max-w-[240px] mt-1 leading-relaxed">
                                    No records match this query. Adjust filters or try searching for another reference.
                                </p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-6 max-h-[700px] scrollbar-hide pr-1">
                                {groupOrder.map((groupName) => {
                                    const groupItems = groupedOrders[groupName];
                                    if (!groupItems || groupItems.length === 0) return null;

                                    return (
                                        <div key={groupName} className="space-y-3">
                                            <div className="flex items-center gap-3 px-1">
                                                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
                                                    {groupName}
                                                </span>
                                                <div className="h-px bg-rose-100 flex-1" />
                                            </div>

                                            {groupItems.map((order: MasterOrder) => {
                                                const totalItemsCount = order.vendors.reduce(
                                                    (sum: number, vendor: VendorGroup) =>
                                                        sum +
                                                        vendor.shipments.reduce(
                                                            (subSum: number, ship: Shipment) => subSum + ship.items.reduce((itemSum: number, item: OrderItem) => itemSum + item.quantity, 0),
                                                            0
                                                        ),
                                                    0
                                                ) || order.total_items;

                                                const shipmentCount = order.vendors.reduce(
                                                    (sum: number, vendor: VendorGroup) => sum + vendor.shipments.length,
                                                    0
                                                );

                                                const isVendorClaim = order.vendors.some((v: VendorGroup) =>
                                                    v.shipments.some((s: Shipment) => s.status === 'pending_admin_review')
                                                );
                                                const isCustomerDispute = order.vendors.some((v: VendorGroup) =>
                                                    v.shipments.some((s: Shipment) => s.status === 'disputed' || s.items.some((i: OrderItem) => i.dispute_status === 'open'))
                                                );

                                                return (
                                                    <div
                                                        key={order.master_order_id}
                                                        onClick={() => handleSelectOrder(order)}
                                                        className={`cursor-pointer transition-all duration-200 p-4 rounded-[0.5rem] border ${selectedOrder?.master_order_id === order.master_order_id
                                                            ? 'bg-rose-50/20 border-rose-500 shadow-sm ring-1 ring-rose-500/10'
                                                            : 'bg-white border-gray-100 hover:border-gray-300'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2.5">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getStatusBadge(order.status)}`}>
                                                                    {getStatusLabel(order.status)}
                                                                </span>

                                                                {isCustomerDispute && (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-500 text-white border-none flex items-center gap-0.5" title="Customer Dispute">
                                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                                        Dispute
                                                                    </span>
                                                                )}

                                                                {isVendorClaim && !isCustomerDispute && (
                                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-500 text-white border-none flex items-center gap-0.5" title="Vendor Escrow Release Request">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        Claim
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-extrabold tracking-tight">
                                                                TXN: {order.payment_reference || 'N/A'}
                                                            </span>
                                                        </div>

                                                        <h3 className="font-extrabold text-slate-900 text-sm tracking-tight truncate">
                                                            {order.stoqle_order_id ? `#${order.stoqle_order_id}` : order.display_id}
                                                        </h3>

                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-gray-400 font-semibold tracking-tight">
                                                            <User size={10} className="text-gray-300" />
                                                            <span className="truncate max-w-[100px]">{order.full_name}</span>
                                                            <span className="text-gray-200">|</span>
                                                            <Package size={10} className="text-gray-300" />
                                                            <span>{totalItemsCount} items</span>
                                                            
                                                            {order.vendors && order.vendors.length > 0 && (
                                                                <>
                                                                    <span className="text-gray-200">|</span>
                                                                    <span className="truncate text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                                                                        {order.vendors[0].vendor_name}
                                                                        {order.vendors.length > 1 && ` + ${order.vendors.length - 1} more`}
                                                                    </span>
                                                                </>
                                                            )}

                                                            {shipmentCount > 1 && (
                                                                <>
                                                                    <span className="text-gray-200">|</span>
                                                                    <Truck size={10} className="text-gray-300" />
                                                                    <span>{shipmentCount} pkgs</span>
                                                                </>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-3">
                                                            <div className="text-xs font-black text-rose-500">
                                                                {formatNaira(order.combined_total)}
                                                            </div>
                                                            <div className="text-[10px] text-gray-400 font-semibold">
                                                                {new Date(order.created_at).toLocaleTimeString([], {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination control */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-1 bg-white border border-gray-200 rounded disabled:opacity-50 text-gray-500 hover:bg-gray-50"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-bold text-gray-600">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-1 bg-white border border-gray-200 rounded disabled:opacity-50 text-gray-500 hover:bg-gray-50"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Selected Order Details Workspace */}
                <div className={`col-span-1 lg:col-span-8 ${selectedOrder ? 'block' : 'hidden lg:block'}`}>
                    {selectedOrder ? (
                        <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">

                            {/* Detail header */}
                            <div className="p-6 bg-slate-900 text-white relative">
                                <div className="flex items-center justify-between gap-4 mb-3">
                                    <button
                                        onClick={() => setSelectedOrder(null)}
                                        className="lg:hidden flex items-center gap-1 text-slate-400 hover:text-white text-xs font-semibold"
                                    >
                                        <ChevronLeft size={16} /> Back
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${getStatusBadge(selectedOrder.status)}`}>
                                            {getStatusLabel(selectedOrder.status)}
                                        </span>
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${selectedOrder.payment_status?.toLowerCase() === 'paid'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                                            }`}>
                                            PAYMENT: {getStatusLabel(selectedOrder.payment_status || 'unpaid')}
                                        </span>
                                    </div>

                                    <span className="text-xs text-slate-400 font-extrabold">
                                        REF: {selectedOrder.payment_reference || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
                                    <div>
                                        <h2 className="text-lg md:text-xl font-black tracking-tight">
                                            {selectedOrder.stoqle_order_id ? `Order #${selectedOrder.stoqle_order_id}` : selectedOrder.display_id}
                                        </h2>
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mt-1">
                                            <Calendar className="w-3.5 h-3.5 text-rose-500" />
                                            <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                                            <span>•</span>
                                            <span>Transaction: {selectedOrder.payment_reference || 'N/A'}</span>
                                        </div>
                                    </div>

                                    <div className="text-left md:text-right">
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Master Total</p>
                                        <p className="text-2xl font-black text-rose-500">{formatNaira(selectedOrder.combined_total)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Customer & Address Details Card */}
                            <div className="p-5 border-b border-gray-50 bg-gray-50/20 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer profile</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[0.5rem] bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center text-sm font-bold text-gray-600">
                                            {selectedOrder.customer_profile_pic ? (
                                                <img
                                                    src={selectedOrder.customer_profile_pic}
                                                    alt={selectedOrder.full_name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                selectedOrder.full_name.charAt(0)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-sm text-gray-900">{selectedOrder.full_name}</p>
                                            <p className="text-xs text-gray-500">{selectedOrder.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1">
                                        <a
                                            href={`tel:${selectedOrder.phone}`}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-[0.375rem] text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                        >
                                            <Phone size={12} />
                                            {selectedOrder.phone || 'No phone'}
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Address</h4>
                                    <div className="flex items-start gap-2.5">
                                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        <div className="text-xs text-gray-600 leading-relaxed font-semibold">
                                            {selectedOrder.delivery_address ? (
                                                typeof selectedOrder.delivery_address === 'object' ? (
                                                    <>
                                                        <p className="text-gray-900 font-extrabold">{selectedOrder.delivery_address.recipientName || selectedOrder.full_name}</p>
                                                        <p className="text-[11px] text-gray-500 font-bold">{selectedOrder.delivery_address.contactNo}</p>
                                                        <p className="mt-1">{selectedOrder.delivery_address.address}, {selectedOrder.delivery_address.region}</p>
                                                    </>
                                                ) : (
                                                    <p>{selectedOrder.delivery_address}</p>
                                                )
                                            ) : (
                                                <p className="italic text-gray-400">No delivery address specified</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vendors Selector tabs */}
                            <div className="flex overflow-x-auto scrollbar-none border-b border-gray-100 bg-gray-50/50">
                                {selectedOrder.vendors.map((vGroup, idx) => (
                                    <button
                                        key={vGroup.sale_id}
                                        onClick={(e) => {
                                            setActiveVendorIdx(idx);
                                            setActiveShipmentIdx(0);
                                            e.currentTarget.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'nearest',
                                                inline: 'center'
                                            });
                                        }}
                                        className={`px-5 py-4 flex items-center gap-2 border-r border-gray-100 transition-all font-extrabold text-xs whitespace-nowrap shrink-0 ${activeVendorIdx === idx
                                            ? 'bg-white text-rose-600 font-black'
                                            : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        {vGroup.vendor_logo && (
                                            <img
                                                src={vGroup.vendor_logo}
                                                alt={vGroup.vendor_name}
                                                className="w-4 h-4 rounded-full object-cover"
                                            />
                                        )}
                                        <span>{vGroup.vendor_name}</span>
                                        <span className="text-[10px] text-slate-400 bg-gray-100 px-1.5 py-0.5 rounded font-black">
                                            {formatNaira(vGroup.total)}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Main Vendor Group Fulfillment Panel */}
                            {selectedOrder.vendors[activeVendorIdx] && (
                                <div className="flex-1 p-6 space-y-6">
                                    {/* Shipments Sub-tabs if multiple */}
                                    {selectedOrder.vendors[activeVendorIdx].shipments.length > 1 && (
                                        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[0.5rem] w-fit mb-4">
                                            {selectedOrder.vendors[activeVendorIdx].shipments.map((ship, sIdx) => (
                                                <button
                                                    key={ship.shipment_id || sIdx}
                                                    onClick={() => setActiveShipmentIdx(sIdx)}
                                                    className={`px-3 py-1.5 rounded-[0.375rem] text-[10px] font-black uppercase tracking-wider transition-all ${activeShipmentIdx === sIdx
                                                        ? 'bg-white text-gray-900 shadow-sm font-extrabold'
                                                        : 'text-gray-500 hover:text-gray-700'
                                                        }`}
                                                >
                                                    Pkg {sIdx + 1}
                                                    <span className={`ml-1.5 text-[8px] font-black px-1 py-0.25 rounded ${getStatusBadge(ship.status)}`}>
                                                        {ship.status.replace(/_/g, ' ')}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Active Shipment Details Panel */}
                                    {selectedOrder.vendors[activeVendorIdx].shipments[activeShipmentIdx] && (() => {
                                        const ship = selectedOrder.vendors[activeVendorIdx].shipments[activeShipmentIdx];
                                        const riderInfo = ship.rider_name ? { name: ship.rider_name, phone: ship.rider_phone } : null;
                                        const isShipCustomerDispute = ship.status === 'disputed' || ship.items.some(i => i.dispute_status === 'open');
                                        const isShipVendorClaim = ship.status === 'pending_admin_review';

                                        return (
                                            <div className="space-y-6">

                                                {/* Shipment Meta summary */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-[0.5rem] border border-gray-100 text-xs">
                                                    <div>
                                                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Package Status</p>
                                                        <span className={`inline-block font-extrabold mt-1.5 px-2 py-0.5 rounded border ${getStatusBadge(ship.status)}`}>
                                                            {getStatusLabel(ship.status)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Escrow Splits</p>
                                                        <span className="font-extrabold mt-1.5 block text-gray-800 uppercase flex items-center gap-1">
                                                            <Lock className="w-3 h-3 text-slate-400" />
                                                            {ship.escrow_status ? getStatusLabel(ship.escrow_status) : 'PENDING'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Fulfillment Type</p>
                                                        <span className="font-extrabold mt-1.5 block text-gray-800 truncate">
                                                            {ship.shipping_promise || 'Standard Delivery'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Delivery PIN</p>
                                                        <span className="font-mono font-bold mt-1.5 block text-gray-900 tracking-wider">
                                                            {ship.delivery_code || 'UNASSIGNED'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Dispute / Review Evidence Box */}
                                                {(isShipVendorClaim || isShipCustomerDispute || ship.delivery_review_reason) && (
                                                    <div className="p-5 border border-red-200 bg-red-50/30 rounded-[0.5rem] space-y-4">
                                                        <div className="flex items-start gap-3">
                                                            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                            <div>
                                                                <h4 className="font-black text-sm text-red-900">
                                                                    {isShipCustomerDispute
                                                                        ? "Customer Order Dispute"
                                                                        : isShipVendorClaim
                                                                            ? "Vendor Fulfillment Claim (Escrow Release Request)"
                                                                            : "Fulfillment Claim / Dispute Raised"}
                                                                </h4>
                                                                <p className="text-xs text-red-700 font-semibold mt-1">
                                                                    {isShipCustomerDispute
                                                                        ? "The buyer has opened a formal dispute regarding the items in this package. Escrow funds are locked pending administrative resolution."
                                                                        : isShipVendorClaim
                                                                            ? "The vendor has requested to mark this shipment as delivered and submitted proof of delivery for administrative approval to release escrow funds."
                                                                            : "The vendor submitted proof of delivery, or a customer dispute is pending administrative resolution."}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-white p-4 rounded-[0.375rem] border border-red-100 space-y-3 text-xs">
                                                            <div>
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reason / Trigger</span>
                                                                <p className="font-extrabold text-gray-800 mt-0.5">
                                                                    {ship.delivery_review_reason || ship.cancel_reason || 'Manual Review Request'}
                                                                </p>
                                                            </div>

                                                            {ship.delivery_review_explanation && (
                                                                <div>
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Explanation</span>
                                                                    <p className="text-gray-700 italic font-semibold mt-0.5">
                                                                        "{ship.delivery_review_explanation}"
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {/* Proof images */}
                                                            {ship.delivery_review_images && ship.delivery_review_images.length > 0 && (
                                                                <div>
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-2">Submitted Proof Images</span>
                                                                    <div className="flex flex-wrap gap-2.5">
                                                                        {ship.delivery_review_images.map((imgUrl, iIdx) => (
                                                                            <div
                                                                                key={iIdx}
                                                                                onClick={() => setSelectedImage(imgUrl)}
                                                                                className="relative w-16 h-16 rounded-[0.375rem] border border-gray-200 overflow-hidden cursor-zoom-in hover:opacity-85 transition-opacity group"
                                                                            >
                                                                                <img
                                                                                    src={imgUrl}
                                                                                    alt={`Proof ${iIdx + 1}`}
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                    <Eye className="w-3.5 h-3.5 text-white" />
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Resolve Dispute Administrative Control Form or Resolved Banner */}
                                                        {ship.admin_resolution ? (
                                                            <div className="bg-emerald-50/50 p-4 rounded-[0.375rem] border border-emerald-200 space-y-3 text-xs">
                                                                <h5 className="font-black text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                                                                    Conflict Resolved by Administrator
                                                                </h5>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Resolution Decision</span>
                                                                        <span className="font-extrabold text-emerald-800 uppercase text-[10px] mt-1 inline-block">
                                                                            {ship.admin_resolution === 'approve_vendor' ? 'Approved Vendor (Escrow Released)' : 'Refunded Customer (Escrow Voided)'}
                                                                        </span>
                                                                    </div>
                                                                    {ship.admin_resolution_notes && (
                                                                        <div>
                                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Resolution Notes</span>
                                                                            <p className="text-gray-700 italic font-semibold mt-1 bg-white p-2 rounded border border-emerald-100/50">
                                                                                "{ship.admin_resolution_notes}"
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-red-50/50 p-4 rounded-[0.375rem] border border-red-200/50 space-y-3.5">
                                                                <h5 className="font-black text-xs text-red-900 uppercase tracking-wider flex items-center gap-1.5">
                                                                    <ShieldCheck className="w-4 h-4" />
                                                                    Resolve Conflict
                                                                </h5>

                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                    <label className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-[0.375rem] border border-red-200/40 cursor-pointer shadow-xs">
                                                                        <input
                                                                            type="radio"
                                                                            name="dispute-res"
                                                                            checked={resolution === 'approve_vendor'}
                                                                            onChange={() => setResolution('approve_vendor')}
                                                                            className="text-rose-500 focus:ring-rose-500 w-3.5 h-3.5"
                                                                        />
                                                                        <div className="text-[11px] font-bold text-gray-700 leading-tight">
                                                                            <p className="font-black">Approve Vendor</p>
                                                                            <p className="text-[9px] text-gray-400">Release escrow funds to vendor wallet</p>
                                                                        </div>
                                                                    </label>

                                                                    <label className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-[0.375rem] border border-red-200/40 cursor-pointer shadow-xs">
                                                                        <input
                                                                            type="radio"
                                                                            name="dispute-res"
                                                                            checked={resolution === 'refund_customer'}
                                                                            onChange={() => setResolution('refund_customer')}
                                                                            className="text-rose-500 focus:ring-rose-500 w-3.5 h-3.5"
                                                                        />
                                                                        <div className="text-[11px] font-bold text-gray-700 leading-tight">
                                                                            <p className="font-black">Refund Customer</p>
                                                                            <p className="text-[9px] text-gray-400">Void escrow and return funds to buyer</p>
                                                                        </div>
                                                                    </label>
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <span className="text-[9px] font-black text-red-800 uppercase tracking-widest">Resolution Notes</span>
                                                                    <textarea
                                                                        placeholder="Describe the reasoning for this resolution (sent to database logs)..."
                                                                        className="w-full text-xs p-2.5 border border-red-200 rounded-[0.375rem] bg-white outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-400 transition-all font-semibold"
                                                                        rows={3}
                                                                        value={resolutionNotes}
                                                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                                                    />
                                                                </div>

                                                                <button
                                                                    onClick={() => handleResolveDispute(ship.shipment_id)}
                                                                    disabled={isResolving}
                                                                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-[0.375rem] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                                >
                                                                    {isResolving ? (
                                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <Check size={14} />
                                                                            Submit Resolution Decision
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Order Products section */}
                                                <div>
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3.5">
                                                        Products in package
                                                    </h4>
                                                    <div className="space-y-2.5">
                                                        {ship.items.map((item) => (
                                                            <div
                                                                key={item.order_item_id}
                                                                className="flex gap-4 p-3.5 bg-slate-50/50 rounded-[0.5rem] border border-gray-100 hover:shadow-xs transition-shadow"
                                                            >
                                                                <div className="w-12 h-12 bg-white rounded border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                                    {item.product_image ? (
                                                                        <img
                                                                            src={item.product_image}
                                                                            alt={item.product_name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <Package className="w-5 h-5 text-gray-300" />
                                                                    )}
                                                                </div>

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div>
                                                                            <h5 className="font-extrabold text-xs text-gray-900 truncate">
                                                                                {item.product_name}
                                                                            </h5>
                                                                            {item.variant_info && (
                                                                                <p className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                                                                    {item.variant_info}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="font-extrabold text-xs text-gray-900">
                                                                                {formatNaira(item.total_item_price)}
                                                                            </p>
                                                                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                                                                {item.quantity} x {formatNaira(item.unit_price)}
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex items-center justify-between border-t border-gray-100/50 pt-2 mt-2 text-[10px]">
                                                                        <span className="font-semibold text-gray-400">
                                                                            Item Status: <span className="font-black text-gray-700">{item.status.toUpperCase()}</span>
                                                                        </span>

                                                                        <button
                                                                            onClick={() => setShowSnapshotItem(item)}
                                                                            className="text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 transition-colors"
                                                                        >
                                                                            <Eye size={10} />
                                                                            Snapshot
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Delivery partner info card */}
                                                <div>
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3.5">
                                                        Logistics details
                                                    </h4>
                                                    <div className="p-4 bg-gray-50 rounded-[0.5rem] border border-gray-100">
                                                        {riderInfo ? (
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500">
                                                                        <Truck size={16} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[9px] uppercase tracking-widest font-black text-gray-400">Assigned Rider</p>
                                                                        <p className="font-extrabold text-xs text-gray-900">{riderInfo.name}</p>
                                                                    </div>
                                                                </div>

                                                                <a
                                                                    href={`tel:${riderInfo.phone}`}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-[0.375rem] text-[10px] font-bold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                                                                >
                                                                    <Phone size={12} />
                                                                    {riderInfo.phone}
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between text-gray-400 py-1 text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock size={14} className="text-gray-300" />
                                                                    <span className="font-bold italic">Rider assignment is pending...</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Override Status Control Panel */}
                                                <div className="p-5 bg-white border border-gray-150 rounded-[0.5rem] space-y-4">
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="w-5 h-5 text-gray-400" />
                                                        <div>
                                                            <h4 className="font-black text-sm text-gray-800">
                                                                Administrative Override Control
                                                            </h4>
                                                            <p className="text-[11px] text-gray-500">
                                                                Instantly force override the status of this shipment package. Use this when manual logistics updates occur.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Target Status</span>
                                                            <select
                                                                className="w-full text-xs p-2.5 border border-gray-200 rounded-[0.375rem] bg-white outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-300 transition-all font-semibold cursor-pointer"
                                                                value={overrideStatus}
                                                                onChange={(e) => setOverrideStatus(e.target.value)}
                                                            >
                                                                <option value="processing">PROCESSING / SHIPMENT INITIATED</option>
                                                                <option value="confirmed">CONFIRMED / PAID</option>
                                                                <option value="pending_admin_review">PENDING ADMIN REVIEW</option>
                                                                <option value="delivered">DELIVERED / FORCE RELEASED</option>
                                                                <option value="cancelled">CANCELLED / VOIDED</option>
                                                            </select>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Audit trail reason</span>
                                                            <input
                                                                type="text"
                                                                placeholder="Reason for manual override..."
                                                                className="w-full text-xs p-2.5 border border-gray-200 rounded-[0.375rem] bg-white outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-300 transition-all font-semibold"
                                                                value={overrideNotes}
                                                                onChange={(e) => setOverrideNotes(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleOverrideStatus(ship.shipment_id)}
                                                        disabled={isOverriding}
                                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-[0.375rem] shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                                    >
                                                        {isOverriding ? (
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <>
                                                                <RefreshCw size={12} />
                                                                Override Shipment Status
                                                            </>
                                                        )}
                                                    </button>
                                                </div>

                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="bg-white rounded-[0.5rem] border border-dashed border-gray-300 h-full min-h-[500px] flex flex-col items-center justify-center text-center p-8">
                            <Package className="w-16 h-16 text-gray-200 mb-4 stroke-1 animate-pulse" />
                            <h3 className="font-extrabold text-base text-gray-700">No order selected</h3>
                            <p className="text-xs text-gray-400 max-w-[340px] mt-1.5 leading-relaxed">
                                Pick a master order transaction from the listing panel to view shipment splits, vendor status, client address, and perform overrides or dispute settlements.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox image viewer modal */}
            {mounted && selectedImage && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="max-w-4xl max-h-[80vh] overflow-hidden rounded-[0.5rem] border border-white/10 bg-black">
                        <img
                            src={selectedImage}
                            alt="Fulfillment Proof Detail"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>,
                document.body
            )}

            {/* Product Snapshot Modal */}
            {mounted && showSnapshotItem && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setShowSnapshotItem(null)}
                            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-5 h-5 text-rose-500" />
                            <h3 className="font-black text-sm text-gray-900 uppercase tracking-wider">Purchase Snapshot</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="w-full h-48 bg-slate-50 border border-gray-150 rounded overflow-hidden flex items-center justify-center">
                                {showSnapshotItem.product_image ? (
                                    <img
                                        src={showSnapshotItem.product_image}
                                        alt={showSnapshotItem.product_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Package className="w-12 h-12 text-gray-300" />
                                )}
                            </div>

                            <div className="space-y-2 text-xs font-semibold">
                                <div>
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Product Title</span>
                                    <p className="font-black text-sm text-gray-800 mt-0.5">{showSnapshotItem.product_name}</p>
                                </div>

                                {showSnapshotItem.variant_info && (
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selected Variant</span>
                                        <p className="text-rose-500 font-extrabold mt-0.5 bg-rose-50/50 px-2 py-1 rounded w-fit border border-rose-100/50">
                                            {showSnapshotItem.variant_info}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Unit Price</span>
                                        <p className="font-black text-gray-900 mt-0.5">{formatNaira(showSnapshotItem.unit_price)}</p>
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Purchase Qty</span>
                                        <p className="font-black text-gray-900 mt-0.5">{showSnapshotItem.quantity} units</p>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cumulative Price</span>
                                    <p className="font-black text-lg text-rose-500 mt-0.5">{formatNaira(showSnapshotItem.total_item_price)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
