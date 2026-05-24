'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import StoqleLoader from '@/components/StoqleLoader';
import { io } from 'socket.io-client';
import {
    Search,
    Filter,
    Clock,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    X,
    Wallet,
    CreditCard,
    TrendingUp,
    Download,
    ArrowUpRight
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdminQuery } from '@/lib/useAdminQuery';
import { useSearchParams } from 'next/navigation';

interface Transaction {
    id: number;
    total: number;
    status: string;
    created_at: string;
    business_name: string;
    customer_name?: string;
    user_email?: string;
    // Wallet specific fields
    transaction_type?: string;
    amount?: number;
    description?: string;
    reference?: string;
    balance_before?: number;
    balance_after?: number;
    owner_type?: string;
    owner_id?: number;
}

export default function FinancialsPage() {
    const searchParams = useSearchParams();
    
    // UI State
    const [viewMode, setViewMode] = useState<'orders'|'wallets'>(
        (searchParams?.get('view') as 'orders'|'wallets') || 'orders'
    );
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState(searchParams?.get('search') || '');
    const [debouncedSearch, setDebouncedSearch] = useState(searchParams?.get('search') || '');
    const [currentPage, setCurrentPage] = useState(1);
    const limit = 8; // Match the 8 records limit

    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const isTxPositive = selectedTx ? ['deposit', 'escrow_release', 'refund', 'escrow_hold', 'escrow_refund'].includes(selectedTx.transaction_type || '') : false;

    // Fetch Stats using IndexedDB cache
    const { data: statsData, isSyncing: statsSyncing, refetch: refetchStats } = useAdminQuery({
        queryKey: 'admin_finance_stats',
        fetcher: async () => {
            const res = await api.get('/finance/stats');
            return res.data?.data;
        }
    });

    const stats = statsData || null;

    // Fetch Transactions using IndexedDB cache
    const queryKey = viewMode === 'orders' 
        ? `admin_transactions:${activeTab}:${currentPage}:${limit}:${debouncedSearch}`
        : `admin_wallet_transactions:${activeTab}:${currentPage}:${limit}:${debouncedSearch}`;

    const { data: activeData, isSyncing, refetch: refetchTx } = useAdminQuery({
        queryKey,
        fetcher: async () => {
            if (viewMode === 'orders') {
                const params: any = {
                    tab: activeTab,
                    page: currentPage,
                    limit,
                    search: debouncedSearch
                };
                const res = await api.get('/finance/transactions', { params });
                return res.data?.data;
            } else {
                const params: any = {
                    type: activeTab,
                    page: currentPage,
                    limit,
                    search: debouncedSearch
                };
                const res = await api.get('/finance/wallet-transactions', { params });
                return res.data?.data;
            }
        }
    });

    const transactions = activeData?.transactions || [];
    const totalPages = activeData?.pagination?.pages || 1;
    const loading = activeData === null && isSyncing;

    // Handle search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Reset pagination on tab change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedTx(null);
    }, [activeTab]);

    // Sync viewMode and search parameters from URL on change
    useEffect(() => {
        const view = searchParams?.get('view') as 'orders'|'wallets';
        if (view) {
            setViewMode(view);
        }
        const search = searchParams?.get('search') || '';
        setSearchQuery(search);
        setDebouncedSearch(search);
        setSelectedTx(null);
    }, [searchParams]);

    // Smart auto-select transaction matching search query or first in list
    useEffect(() => {
        if (!transactions || transactions.length === 0) {
            if (selectedTx) setSelectedTx(null);
            return;
        }

        const searchParam = searchParams?.get('search');
        if (searchParam) {
            // Try to find the exact match first
            const matched = transactions.find((tx: Transaction) => 
                String(tx.id) === searchParam || 
                tx.reference === searchParam ||
                `TX-${tx.id}` === searchParam ||
                `#TX-${tx.id}` === searchParam
            );
            if (matched) {
                if (selectedTx?.id !== matched.id) {
                    setSelectedTx(matched);
                }
                return;
            }
        }

        // Default to auto-selecting the first one if none is selected
        if (!selectedTx) {
            setSelectedTx(transactions[0]);
        } else {
            // Update selected tx if data changed in background
            const updated = transactions.find((tx: Transaction) => tx.id === selectedTx.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedTx)) {
                setSelectedTx(updated);
            }
        }
    }, [transactions, searchParams]);

    // Background polling for real-time reflection of updates
    useEffect(() => {
        const interval = setInterval(() => {
            refetchStats();
            refetchTx();
        }, 20000); // Check every 20 seconds
        return () => clearInterval(interval);
    }, [refetchStats, refetchTx]);

    // Real-time WebSocket synchronization
    useEffect(() => {
        const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000', {
            transports: ['websocket', 'polling']
        });

        socket.on('admin_finance_update', (data) => {
            refetchStats();
            refetchTx();
            if (data?.message) {
                toast.success(data.message, { icon: '💳' });
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [refetchStats, refetchTx]);

    const formatCurrency = (val: number) => {
        const num = Number(val || 0);
        return `${num < 0 ? '-' : ''}₦${Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const orderTabs = [
        { key: 'all', label: 'All' },
        { key: 'paid', label: 'Paid' },
        { key: 'unpaid', label: 'Unpaid' },
        { key: 'failed', label: 'Failed' }
    ];

    const walletTabs = [
        { key: 'all', label: 'All' },
        { key: 'deposit', label: 'Deposits' },
        { key: 'escrow_hold', label: 'Escrow Holds' },
        { key: 'withdrawal', label: 'Withdrawals' },
        { key: 'payout', label: 'Payouts' }
    ];

    const tabs = viewMode === 'orders' ? orderTabs : walletTabs;

    return (
        <div className="space-y-6 pb-12">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <CreditCard className="w-6 h-6 text-rose-500" />
                        Financial Ecosystem
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-white border border-gray-100 px-4 py-2.5 rounded-[0.5rem] font-bold text-xs text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                        <span>Export Ledger</span>
                    </button>
                    <button
                        onClick={() => {
                            refetchStats();
                            refetchTx();
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-[0.5rem] hover:bg-gray-50 text-gray-600 font-semibold text-xs transition shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        Refresh Feed
                    </button>
                </div>
            </div>

            {/* Hero Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[0.5rem] p-6 text-white relative overflow-hidden group shadow-sm">
                    <div className="relative z-10">
                        <p className="text-rose-100 text-[10px] font-black uppercase tracking-widest mb-1.5">Platform Volume</p>
                        <h3 className="text-2xl font-black tracking-tighter">{formatCurrency(stats?.totalVolume || 0)}</h3>
                    </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-6 shadow-sm">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Wallets Available</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(stats?.totalWalletAvailable || 0)}</h3>
                </div>

                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-6 shadow-sm">
                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Wallets Pending</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{formatCurrency(stats?.totalWalletPending || 0)}</h3>
                </div>
            </div>

            {/* Filter controls */}
            <div className="bg-white p-4 rounded-[0.5rem] shadow-sm border border-gray-100 space-y-4">
                <div className="flex bg-gray-50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => { setViewMode('orders'); setActiveTab('all'); }}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'orders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Store Orders
                    </button>
                    <button
                        onClick={() => { setViewMode('wallets'); setActiveTab('all'); }}
                        className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${viewMode === 'wallets' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Wallet Ledger
                    </button>
                </div>
                
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by ID, Vendor or Customer..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-[0.5rem] leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-rose-500 focus:border-rose-500 sm:text-sm transition-colors"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-4 w-4" />
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
                            {tab.label} {activeTab === tab.key && `(${activeData?.pagination?.total || 0})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Split panel workspace layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
                {/* Left Panel: List */}
                <div className={`col-span-1 lg:col-span-4 space-y-4 self-start lg:sticky lg:top-6 ${selectedTx ? 'hidden lg:block' : 'block'}`}>
                    <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm p-4 h-auto flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
                            <span className="text-xs text-gray-400 font-black tracking-wider uppercase">Transactions</span>
                            <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                                {transactions.length} matches
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20">
                                <StoqleLoader />
                            </div>
                        ) : transactions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Wallet className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">No transactions found</h3>
                                <p className="text-xs text-gray-500 max-w-[200px]">
                                    Try adjusting your filters or search terms.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {transactions.map((tx: Transaction) => (
                                    <div
                                        key={tx.id}
                                        onClick={() => setSelectedTx(tx)}
                                        className={`cursor-pointer transition-all duration-200 p-4 rounded-[0.5rem] border ${selectedTx?.id === tx.id
                                            ? 'bg-rose-50/20 border-rose-500 shadow-sm ring-1 ring-rose-500/10'
                                            : 'bg-white border-gray-100 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-gray-900">#TX-{tx.id}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">
                                                {new Date(tx.created_at).toLocaleDateString()}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium truncate pr-2">Vendor</span>
                                                <span className="font-bold text-gray-900">{tx.business_name || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 font-medium truncate pr-2">Customer</span>
                                                <span className="font-bold text-gray-900">{tx.customer_name || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                                viewMode === 'orders' 
                                                    ? (tx.status?.toLowerCase() === 'paid' || tx.status?.toLowerCase() === 'completed'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25')
                                                    : (tx.status?.toLowerCase() === 'completed' || tx.status?.toLowerCase() === 'success' || tx.transaction_type?.toLowerCase() === 'deposit'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25')
                                                }`}>
                                                {viewMode === 'orders' ? (tx.status?.toUpperCase() || 'UNKNOWN') : (tx.transaction_type?.toUpperCase() || 'UNKNOWN')}
                                            </span>
                                            <span className="text-sm font-black text-gray-900">
                                                {formatCurrency(viewMode === 'orders' ? tx.total : (tx.amount || 0))}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination control */}
                        {totalPages > 1 && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-500 font-medium">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Details */}
                <div className={`col-span-1 lg:col-span-8 ${!selectedTx ? 'hidden lg:block' : 'block'}`}>
                    {selectedTx ? (
                        <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
                            {/* Mobile Back Button */}
                            <div className="lg:hidden p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="p-2 hover:bg-white rounded-[0.5rem] transition-colors border border-transparent hover:border-gray-200 shadow-sm text-gray-600"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-sm text-gray-900">Back to List</span>
                            </div>

                            {/* Main Detail Header */}
                            <div className="px-6 py-6 border-b border-gray-100 bg-white">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-black text-gray-900 tracking-tight">
                                                Transaction #TX-{selectedTx.id}
                                            </h2>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                                viewMode === 'orders'
                                                    ? (selectedTx.status?.toLowerCase() === 'paid' || selectedTx.status?.toLowerCase() === 'completed'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25')
                                                    : (selectedTx.status?.toLowerCase() === 'completed' || selectedTx.status?.toLowerCase() === 'success' || selectedTx.transaction_type?.toLowerCase() === 'deposit'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/25')
                                                }`}>
                                                {viewMode === 'orders' ? selectedTx.status?.toUpperCase() : selectedTx.transaction_type?.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(selectedTx.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right bg-gray-50 px-4 py-3 rounded-[0.5rem] border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{viewMode === 'orders' ? 'Total Amount' : 'Transaction Amount'}</p>
                                        <p className="text-2xl font-black text-gray-900 leading-none">{formatCurrency(viewMode === 'orders' ? selectedTx.total : (selectedTx.amount || 0))}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detail Content */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    {/* Breakdown Card */}
                                    <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Financial Breakdown</h3>

                                        {viewMode === 'orders' ? (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                                    <span className="text-sm font-medium text-gray-500">Gross Total</span>
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(selectedTx.total)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-sm font-bold text-gray-900">Net to Vendor</span>
                                                    <span className="text-sm font-black text-emerald-600">
                                                        {formatCurrency(selectedTx.total)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                                    <span className="text-sm font-medium text-gray-500">Balance Before</span>
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(selectedTx.balance_before || 0)}</span>
                                                </div>
                                                <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                                                    <span className="text-sm font-medium text-gray-500">Amount</span>
                                                    <span className={`text-sm font-black ${isTxPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isTxPositive ? '+' : '-'}{formatCurrency(Math.abs(Number(selectedTx.amount || 0)))}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1">
                                                    <span className="text-sm font-bold text-gray-900">Balance After</span>
                                                    <span className="text-sm font-black text-gray-900">
                                                        {formatCurrency(selectedTx.balance_after || 0)}
                                                    </span>
                                                </div>
                                                {selectedTx.description && (
                                                    <div className="pt-3 border-t border-gray-50 text-xs text-gray-600 bg-gray-50/50 p-2 rounded">
                                                        <span className="font-bold text-gray-400 uppercase text-[9px] block mb-1">Description</span>
                                                        {selectedTx.description}
                                                    </div>
                                                )}
                                                {selectedTx.reference && (
                                                    <div className="pt-1 text-xs text-gray-600 bg-gray-50/50 p-2 rounded">
                                                        <span className="font-bold text-gray-400 uppercase text-[9px] block mb-1">Reference</span>
                                                        {selectedTx.reference}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Entities Card */}
                                    <div className="bg-white p-5 rounded-[0.5rem] border border-gray-100 shadow-sm">
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Entities Involved</h3>

                                        <div className="space-y-4">
                                            {viewMode === 'orders' ? (
                                                <>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Vendor (Business)</p>
                                                        <p className="text-sm font-bold text-gray-900">{selectedTx.business_name || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Customer</p>
                                                        <p className="text-sm font-bold text-gray-900">{selectedTx.customer_name || 'N/A'}</p>
                                                        <p className="text-xs font-medium text-gray-500">{selectedTx.user_email || 'N/A'}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Owner Type</p>
                                                        <p className="text-sm font-bold text-gray-900 capitalize">{selectedTx.owner_type || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entity Details</p>
                                                        {selectedTx.owner_type === 'vendor' ? (
                                                            <p className="text-sm font-bold text-gray-900">{selectedTx.business_name || 'N/A'} <span className="text-gray-400 font-normal text-xs">(Vendor ID: {selectedTx.owner_id})</span></p>
                                                        ) : (
                                                            <>
                                                                <p className="text-sm font-bold text-gray-900">{selectedTx.customer_name || 'N/A'} <span className="text-gray-400 font-normal text-xs">(User ID: {selectedTx.owner_id})</span></p>
                                                                <p className="text-xs font-medium text-gray-500">{selectedTx.user_email || 'N/A'}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[0.5rem] border border-gray-100 shadow-sm h-full min-h-[600px] flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Wallet className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Select a Transaction</h3>
                            <p className="text-sm text-gray-500 max-w-[300px]">
                                Click on any transaction from the list on the left to view its full financial breakdown and details.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
