'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import api from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';
import StoqleLoader from '@/components/StoqleLoader';
import {
    ShoppingBag,
    Search,
    Filter,
    Star,
    ExternalLink,
    Edit,
    TrendingUp,
    Image as ImageIcon,
    ArrowUpRight,
    ChevronRight,
    ChevronDown,
    Grid,
    List,
    Loader2,
    Package
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
    id: string;
    name: string;
    category: string;
    vendor: string;
    vendor_logo?: string;
    price: string | number;
    stock: number;
    status: 'published' | 'active' | 'draft' | 'disabled' | 'out_of_stock';
    isFeatured: boolean;
    image?: string;
}

interface Vendor {
    business_id: number;
    business_name: string;
    logo?: string;
    avatar?: string;
    total_products: number;
}

interface Category {
    category_id: string;
    category_name: string;
}

interface VendorProductState {
    products: Product[];
    page: number;
    total: number;
    isLoading: boolean;
    hasLoaded: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VENDOR_PAGE_SIZE = 10;
const PRODUCT_PAGE_SIZE = 8;

// ─── Helper: renderPrice (module-level, no re-creation) ──────────────────────

function renderPrice(price: any) {
    const p = parseFloat(price);
    if (isNaN(p)) return (
        <span className="text-[14px] font-semibold text-gray-700">
            <span className="text-[10px] font-extrabold mr-0.5">₦</span>0.00
        </span>
    );
    return (
        <span className="text-[14px] font-bold text-gray-900 tracking-tight">
            <span className="text-[10px] font-extrabold mr-0.5">₦</span>{Number(p.toFixed(2)).toLocaleString()}
        </span>
    );
}

// ─── VendorSkeleton ───────────────────────────────────────────────────────────

const VendorSkeleton = memo(function VendorSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[0.75rem] px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/5" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                </div>
            ))}
        </div>
    );
});

// ─── ProductCard (grid) ───────────────────────────────────────────────────────

interface ProductCardProps {
    product: Product;
    vendor: Vendor;
    activeDropdown: string | null;
    setActiveDropdown: (id: string | null) => void;
    onStatusToggle: (product: Product, vendor: Vendor) => void;
}

const ProductCard = memo(function ProductCard({
    product, vendor, activeDropdown, setActiveDropdown, onStatusToggle
}: ProductCardProps) {
    return (
        <div className="group bg-gray-50/50 border border-gray-100 rounded-[0.5rem] hover:border-rose-100 transition-all duration-500">
            <div className="relative aspect-square bg-white rounded-t-[0.5rem] flex items-center justify-center overflow-hidden">
                {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <ImageIcon className="w-14 h-14 text-gray-100 group-hover:scale-110 group-hover:text-gray-200 transition-all duration-700" />
                )}
                {product.isFeatured && (
                    <div className="absolute top-3 left-3">
                        <span className="bg-amber-400 text-white p-1.5 rounded-[0.375rem]">
                            <Star className="w-3 h-3 fill-current" />
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/5 transition-all duration-500 flex items-center justify-center">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                        <button className="w-10 h-10 rounded-[0.5rem] bg-white text-gray-900 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow active:scale-95">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button className="w-10 h-10 rounded-[0.5rem] bg-white text-gray-900 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow active:scale-95">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-2">
                <h3 className="font-semibold text-gray-700 tracking-tight text-[13px] leading-tight overflow-hidden"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: '34px' }}>
                    {product.name}
                </h3>
                <div className="flex items-center justify-between mt-1.5">
                    {renderPrice(product.price)}
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === product.id ? null : product.id); }}
                            className="px-2 py-1 text-[10px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-[0.375rem] transition-all"
                        >
                            Manage
                        </button>
                        {activeDropdown === product.id && (
                            <div className="absolute right-0 bottom-full mb-1.5 w-40 bg-white border border-gray-100 rounded-[0.5rem] shadow-xl z-20 py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { setActiveDropdown(null); toast.success(`Viewing: ${product.name}`); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">View Product</button>
                                <button onClick={() => { setActiveDropdown(null); toast.info(`Managing: ${product.name}`); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Manage Product</button>
                                <button
                                    onClick={() => { setActiveDropdown(null); onStatusToggle(product, vendor); }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${product.status === 'published' || product.status === 'active' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                                >
                                    {product.status === 'published' || product.status === 'active' ? 'Disable Product' : 'Enable Product'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─── ProductRow (table) ───────────────────────────────────────────────────────

interface ProductRowProps {
    product: Product;
    vendor: Vendor;
    activeDropdown: string | null;
    setActiveDropdown: (id: string | null) => void;
    onStatusToggle: (product: Product, vendor: Vendor) => void;
}

const ProductRow = memo(function ProductRow({
    product, vendor, activeDropdown, setActiveDropdown, onStatusToggle
}: ProductRowProps) {
    return (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="px-5 py-2">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[0.375rem] bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative group/img">
                        {product.image ? (
                            <img src={product.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt={product.name} />
                        ) : (
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-800 text-xs truncate max-w-[200px]" title={product.name}>{product.name}</p>
                        {product.isFeatured && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-500 uppercase tracking-wider">
                                <Star className="w-2.5 h-2.5 fill-current" /> Featured
                            </span>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-5 py-3">{renderPrice(product.price)}</td>
            <td className="px-5 py-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-[0.375rem] bg-gray-50 text-gray-600 text-xs font-bold">
                    {product.stock} units
                </span>
            </td>
            <td className="px-5 py-3 text-right relative">
                <div className="relative inline-block">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === product.id ? null : product.id); }}
                        className="px-2.5 py-1.5 text-[10px] font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-[0.375rem] uppercase tracking-wider transition-all"
                    >
                        Manage
                    </button>
                    {activeDropdown === product.id && (
                        <div className="absolute right-0 bottom-full mb-1.5 w-40 bg-white border border-gray-100 rounded-[0.5rem] shadow-xl z-20 py-1 overflow-hidden text-left" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => { setActiveDropdown(null); toast.success(`Viewing: ${product.name}`); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">View Product</button>
                            <button onClick={() => { setActiveDropdown(null); toast.info(`Managing: ${product.name}`); }} className="w-full text-left px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors">Manage Product</button>
                            <button
                                onClick={() => { setActiveDropdown(null); onStatusToggle(product, vendor); }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${product.status === 'published' || product.status === 'active' ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                            >
                                {product.status === 'published' || product.status === 'active' ? 'Disable Product' : 'Enable Product'}
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
});

// ─── VendorAccordion ──────────────────────────────────────────────────────────

interface VendorAccordionProps {
    vendor: Vendor;
    isOpen: boolean;
    vpState: VendorProductState | undefined;
    viewMode: 'grid' | 'table';
    activeDropdown: string | null;
    setActiveDropdown: (id: string | null) => void;
    onToggle: (vendor: Vendor) => void;
    onLoadMore: (vendor: Vendor, nextPage: number) => void;
    onStatusToggle: (product: Product, vendor: Vendor) => void;
}

const VendorAccordion = memo(function VendorAccordion({
    vendor, isOpen, vpState, viewMode, activeDropdown, setActiveDropdown,
    onToggle, onLoadMore, onStatusToggle
}: VendorAccordionProps) {
    const hasMore = vpState ? vpState.products.length < vpState.total : false;

    return (
        <div className="bg-white border border-gray-100 rounded-[0.75rem] overflow-hidden shadow-sm">
            {/* Vendor header */}
            <button
                onClick={() => onToggle(vendor)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {vendor.logo ? (
                        <img src={vendor.logo} className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shrink-0" alt={vendor.business_name} />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-extrabold text-sm border-2 border-rose-100 shrink-0">
                            {vendor.business_name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-extrabold text-gray-900 text-sm truncate">{vendor.business_name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {vendor.total_products} product{vendor.total_products !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${isOpen ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Products panel — conditionally rendered but not a new component type */}
            {isOpen && (
                <div className="border-t border-gray-50">
                    {vpState?.isLoading && !vpState?.hasLoaded ? (
                        <div className="p-6 flex flex-col items-center gap-3">
                            <StoqleLoader size={24} />
                            <p className="text-xs font-bold text-gray-400">Loading products…</p>
                        </div>
                    ) : vpState?.hasLoaded && vpState.products.length === 0 ? (
                        <div className="py-10 text-center">
                            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400">No products found for this vendor</p>
                        </div>
                    ) : vpState?.hasLoaded ? (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="p-4 animate-fade-in">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                        {vpState.products.map(product => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                vendor={vendor}
                                                activeDropdown={activeDropdown}
                                                setActiveDropdown={setActiveDropdown}
                                                onStatusToggle={onStatusToggle}
                                            />
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <div className="mt-4 flex items-center justify-center">
                                            <button
                                                onClick={() => onLoadMore(vendor, vpState.page + 1)}
                                                disabled={vpState.isLoading}
                                                className="flex items-center gap-2 px-6 py-2 text-xs font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-full border border-rose-100 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {vpState.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                View more products
                                                <span className="text-[10px] font-bold text-rose-300">({vpState.total - vpState.products.length} remaining)</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="bg-gray-50/60 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <th className="px-5 py-3">Product Info</th>
                                                    <th className="px-5 py-3">Price</th>
                                                    <th className="px-5 py-3">Stock</th>
                                                    <th className="px-5 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {vpState.products.map(product => (
                                                    <ProductRow
                                                        key={product.id}
                                                        product={product}
                                                        vendor={vendor}
                                                        activeDropdown={activeDropdown}
                                                        setActiveDropdown={setActiveDropdown}
                                                        onStatusToggle={onStatusToggle}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {hasMore && (
                                        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-gray-400">
                                                Showing {vpState.products.length} of {vpState.total} products
                                            </p>
                                            <button
                                                onClick={() => onLoadMore(vendor, vpState.page + 1)}
                                                disabled={vpState.isLoading}
                                                className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-full border border-rose-100 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {vpState.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                View more products
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
    const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'bestsellers'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [categoryStats, setCategoryStats] = useState<any[]>([]);

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorPage, setVendorPage] = useState(1);
    const [vendorTotal, setVendorTotal] = useState(0);
    const [isLoadingVendors, setIsLoadingVendors] = useState(true);
    const [isLoadingMoreVendors, setIsLoadingMoreVendors] = useState(false);

    const [vendorProducts, setVendorProducts] = useState<Map<number, VendorProductState>>(new Map());
    const [expandedVendors, setExpandedVendors] = useState<Set<number>>(new Set());

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Close dropdowns on outside click
    useEffect(() => {
        const close = () => setActiveDropdown(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // ── Fetch vendors ─────────────────────────────────────────────────────────
    const fetchVendors = useCallback(async (page: number, append = false) => {
        if (append) setIsLoadingMoreVendors(true);
        else setIsLoadingVendors(true);
        try {
            const res = await api.get('/users/vendors', {
                params: { page, limit: VENDOR_PAGE_SIZE, search: debouncedSearch }
            });
            if (res.data.success) {
                const { vendors: fetched, pagination } = res.data.data;
                setVendors(prev => append ? [...prev, ...fetched] : fetched);
                setVendorTotal(pagination.total);
                setVendorPage(page);
            }
        } catch { toast.error('Failed to load vendors list.'); }
        finally {
            setIsLoadingVendors(false);
            setIsLoadingMoreVendors(false);
        }
    }, [debouncedSearch]);

    // Reset + re-fetch vendors when filters change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        setVendors([]);
        setExpandedVendors(new Set());
        setVendorProducts(new Map());
        fetchVendors(1, false);
    }, [debouncedSearch, activeTab, filterCategory]);

    // ── Fetch categories ──────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            const cacheKey = '/categories?all=true';
            const cached = await getCache(cacheKey);
            const process = (data: any[]) => {
                const seen = new Set<string>();
                const unique: Category[] = [];
                for (const cat of data) {
                    const n = cat.category_name.trim().toLowerCase();
                    if (!seen.has(n)) { seen.add(n); unique.push(cat); }
                }
                setCategories(unique);
            };
            if (cached) process(cached);
            try {
                const r = await api.get('/categories?all=true');
                if (r.data?.success) { process(r.data.data); setCache(cacheKey, r.data.data); }
            } catch { /* silent */ }
        };
        load();
    }, []);

    // ── Fetch products for a vendor ───────────────────────────────────────────
    const fetchVendorProducts = useCallback(async (vendor: Vendor, page: number) => {
        const bid = vendor.business_id;
        setVendorProducts(prev => {
            const next = new Map(prev);
            const existing = next.get(bid) ?? { products: [], page: 0, total: 0, isLoading: false, hasLoaded: false };
            next.set(bid, { ...existing, isLoading: true });
            return next;
        });
        try {
            const params: Record<string, any> = {
                business_id: bid, page, limit: PRODUCT_PAGE_SIZE,
                status: activeTab !== 'all' ? activeTab : undefined,
                category: filterCategory !== 'all' ? filterCategory : undefined,
            };
            const res = await api.get('/products', { params });
            if (res.data.success) {
                const { products: fetched, pagination, categoryBreakdown } = res.data.data;
                if (categoryBreakdown?.length) setCategoryStats(categoryBreakdown);
                setVendorProducts(prev => {
                    const next = new Map(prev);
                    const existing = next.get(bid) ?? { products: [], page: 0, total: 0, isLoading: false, hasLoaded: false };
                    next.set(bid, {
                        products: page === 1 ? fetched : [...existing.products, ...fetched],
                        page, total: pagination.total, isLoading: false, hasLoaded: true,
                    });
                    return next;
                });
            }
        } catch {
            toast.error(`Failed to load products for ${vendor.business_name}`);
            setVendorProducts(prev => {
                const next = new Map(prev);
                const existing = next.get(bid);
                if (existing) next.set(bid, { ...existing, isLoading: false });
                return next;
            });
        }
    }, [activeTab, filterCategory]);

    // ── Toggle vendor ─────────────────────────────────────────────────────────
    const toggleVendor = useCallback((vendor: Vendor) => {
        const bid = vendor.business_id;
        setExpandedVendors(prev => {
            const next = new Set(prev);
            if (next.has(bid)) {
                next.delete(bid);
            } else {
                next.add(bid);
                setVendorProducts(vp => {
                    const state = vp.get(bid);
                    if (!state?.hasLoaded && !state?.isLoading) {
                        // schedule fetch after state update
                        setTimeout(() => fetchVendorProducts(vendor, 1), 0);
                    }
                    return vp;
                });
            }
            return next;
        });
    }, [fetchVendorProducts]);

    // ── Status toggle ─────────────────────────────────────────────────────────
    const handleStatusToggle = useCallback(async (product: Product, vendor: Vendor) => {
        const isActive = product.status === 'published' || product.status === 'active';
        try {
            const res = await api.patch(`/products/${product.id}/status`, { status: isActive ? 'draft' : 'published' });
            if (res.data.success) {
                toast.success(`Product ${isActive ? 'disabled' : 'enabled'} successfully`);
                fetchVendorProducts(vendor, 1);
            }
        } catch { toast.error('Failed to update product status'); }
    }, [fetchVendorProducts]);

    const hasMoreVendors = vendors.length < vendorTotal;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Product Inventory</h1>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-[0.5rem] border border-gray-100 w-fit">
                    {(['all', 'featured', 'bestsellers'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 rounded-[0.5rem] text-[13px] font-bold capitalize transition-all ${activeTab === tab ? 'bg-rose-500 text-white' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        >
                            {tab === 'all' ? 'All Inventory' : tab === 'bestsellers' ? 'Best Sellers' : 'Featured'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 w-full relative group">
                    {searchQuery !== debouncedSearch
                        ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-500 animate-spin" />
                        : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
                    }
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        className="w-full bg-white border border-gray-100 rounded-[0.5rem] py-3.5 pl-12 pr-4 text-sm font-medium focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-48">
                        <select
                            className="w-full appearance-none bg-white border border-gray-100 rounded-[0.5rem] py-3.5 pl-4 pr-10 text-sm font-bold text-gray-600 outline-none focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all cursor-pointer"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat.category_id} value={cat.category_name}>{cat.category_name}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    <div className="flex items-center gap-1 bg-white p-1 rounded-[0.5rem] border border-gray-100 shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-[0.375rem] transition-all ${viewMode === 'grid' ? 'bg-rose-50 text-rose-500' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View">
                            <Grid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`p-2 rounded-[0.375rem] transition-all ${viewMode === 'table' ? 'bg-rose-50 text-rose-500' : 'text-gray-400 hover:text-gray-600'}`} title="Table View">
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Vendor List */}
            {isLoadingVendors ? (
                <VendorSkeleton />
            ) : vendors.length === 0 ? (
                <div className="py-24 text-center">
                    <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No vendors found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary + expand/collapse controls */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400">
                            {vendors.length} of {vendorTotal} vendor{vendorTotal !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const allIds = new Set(vendors.map(v => v.business_id));
                                    setExpandedVendors(allIds);
                                    vendors.forEach(v => {
                                        const state = vendorProducts.get(v.business_id);
                                        if (!state?.hasLoaded && !state?.isLoading) fetchVendorProducts(v, 1);
                                    });
                                }}
                                className="text-[11px] font-bold text-gray-400 hover:text-rose-500 transition-colors px-3 py-1.5 rounded-[0.375rem] hover:bg-rose-50"
                            >
                                Expand all
                            </button>
                            <span className="text-gray-200">|</span>
                            <button
                                onClick={() => setExpandedVendors(new Set())}
                                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-[0.375rem] hover:bg-gray-50"
                            >
                                Collapse all
                            </button>
                        </div>
                    </div>

                    {/* Vendor accordion rows */}
                    <div className="space-y-3">
                        {vendors.map(vendor => (
                            <VendorAccordion
                                key={vendor.business_id}
                                vendor={vendor}
                                isOpen={expandedVendors.has(vendor.business_id)}
                                vpState={vendorProducts.get(vendor.business_id)}
                                viewMode={viewMode}
                                activeDropdown={activeDropdown}
                                setActiveDropdown={setActiveDropdown}
                                onToggle={toggleVendor}
                                onLoadMore={fetchVendorProducts}
                                onStatusToggle={handleStatusToggle}
                            />
                        ))}
                    </div>

                    {/* Load more vendors — only when there are actually more on the server */}
                    {hasMoreVendors && (
                        <div className="flex justify-center pt-2">
                            <button
                                disabled={isLoadingMoreVendors}
                                onClick={() => fetchVendors(vendorPage + 1, true)}
                                className="px-10 py-3 bg-rose-500 hover:bg-rose-600 active:scale-95 disabled:opacity-80 text-white font-extrabold text-xs rounded-full shadow-[0_4px_14px_rgba(244,63,94,0.35)] transition-all flex items-center gap-2"
                            >
                                {isLoadingMoreVendors
                                    ? <StoqleLoader size={16} className="[&_circle]:stroke-white" />
                                    : <span>Load more vendors ({vendorTotal - vendors.length} remaining)</span>
                                }
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Summary Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-gradient-to-br from-slate-400 to-slate-500 rounded-[0.5rem] p-10 text-white relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-[0.5rem] border border-white/10 mb-6">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-widest">Global Marketplace Stats</span>
                            </div>
                            <h3 className="text-4xl font-extrabold mb-4 tracking-tighter">
                                Vendor Network <span className="text-rose-200">{vendorTotal} Vendors</span>
                            </h3>
                            <p className="text-rose-100 text-sm max-w-md font-medium leading-relaxed">
                                Platform-wide inventory turnover is reaching record highs. Highlight seasonal collections to optimize vendor performance.
                            </p>
                        </div>
                        <div className="flex gap-12 mt-10">
                            <div>
                                <p className="text-rose-200 text-[10px] uppercase font-extrabold tracking-widest mb-2">Total Vendors</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-4xl font-black tracking-tighter">{vendorTotal}</p>
                                    <ArrowUpRight className="w-5 h-5 text-rose-200" />
                                </div>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div>
                                <p className="text-rose-200 text-[10px] uppercase font-extrabold tracking-widest mb-2">Categories</p>
                                <p className="text-4xl font-black tracking-tighter">{categories.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-[-100px] top-[-100px] w-[500px] h-[500px] bg-white/5 rounded-[0.5rem] blur-[100px] group-hover:scale-110 transition-transform duration-1000" />
                    <ShoppingBag className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5" />
                </div>

                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Market Vertical</h3>
                        <button className="p-2 hover:bg-gray-50 rounded-[0.5rem] text-gray-400 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-8">
                        {categoryStats.slice(0, 4).map((cat) => (
                            <div key={cat.name} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <span className="text-[13px] font-extrabold text-gray-900 tracking-tight">{cat.name}</span>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Category Density</p>
                                    </div>
                                    <span className="text-[12px] font-black text-rose-500">{cat.count} Units</span>
                                </div>
                                <div className="h-2 w-full bg-gray-50 rounded-[0.5rem] overflow-hidden">
                                    <div
                                        className="h-full bg-rose-500 rounded-[0.5rem] transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (cat.count / Math.max(1, categoryStats[0]?.count ?? 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                        {categoryStats.length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-4">Expand a vendor to load category stats</p>
                        )}
                    </div>
                    <button className="w-full mt-10 py-4 bg-gray-50 hover:bg-gray-100 rounded-[0.5rem] text-[12px] font-extrabold text-gray-500 uppercase tracking-widest transition-all">
                        Full Inventory Report
                    </button>
                </div>
            </div>
        </div>
    );
}
