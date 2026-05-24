'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import adminDB from '@/lib/adminDB';
import {
  Search,
  Plus,
  MapPin,
  MoreHorizontal,
  Store,
  Package,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Map as MapIcon,
  Globe,
  Navigation,
  Edit,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';

interface Market {
  id: number;
  market_name: string;
  market_slug: string;
  market_type: string;
  city: string;
  state: string;
  country: string;
  address: string;
  description: string;
  total_vendors: number;
  total_products: number;
  is_active: number;
  created_at: string;
}

export default function MarketAffiliationPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    market_name: '',
    market_type: 'market',
    country: 'Nigeria',
    state: '',
    city: '',
    address: '',
    description: ''
  });

  // Expanded & Collapsible State
  const [expandedMarkets, setExpandedMarkets] = useState<Record<number, boolean>>({});
  const [marketVendors, setMarketVendors] = useState<Record<number, { list: any[]; page: number; total: number; isLoading: boolean }>>({});
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
  const [vendorProducts, setVendorProducts] = useState<Record<string, { list: any[]; page: number; total: number; isLoading: boolean }>>({});

  const startEditMarket = (market: any) => {
    setEditingMarket(market);
    setFormData({
      market_name: market.market_name || '',
      market_type: market.market_type || 'market',
      country: market.country || 'Nigeria',
      state: market.state || '',
      city: market.city || '',
      address: market.address || '',
      description: market.description || ''
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingMarket(null);
    setFormData({
      market_name: '',
      market_type: 'market',
      country: 'Nigeria',
      state: '',
      city: '',
      address: '',
      description: ''
    });
  };

  const fetchMarketVendors = async (marketId: number, nextPage = 1) => {
    const cacheKey = `market:vendors:${marketId}:page:${nextPage}`;
    const cached = await adminDB.get<any>('cache', cacheKey);

    if (cached) {
      setMarketVendors(prev => {
        const current = prev[marketId];
        const newList = nextPage === 1 ? cached.vendors : [...(current?.list || []), ...cached.vendors];
        return {
          ...prev,
          [marketId]: {
            list: newList,
            page: cached.pagination.page,
            total: cached.pagination.total,
            isLoading: false
          }
        };
      });
    } else {
      setMarketVendors(prev => ({
        ...prev,
        [marketId]: {
          ...(prev[marketId] || { list: [], page: 0, total: 0 }),
          isLoading: true
        }
      }));
    }

    try {
      const response = await api.get(`/users/vendors`, {
        params: { market_id: marketId, limit: 10, page: nextPage, status: 'all' }
      });
      if (response.data.success) {
        const { vendors, pagination } = response.data.data;
        const fresh = { vendors, pagination };

        if (!cached || JSON.stringify(cached) !== JSON.stringify(fresh)) {
          setMarketVendors(prev => {
            const current = prev[marketId];
            let newList;
            if (nextPage === 1) {
              newList = vendors;
            } else {
              const prevItems = (current?.list || []).slice(0, (nextPage - 1) * 10);
              newList = [...prevItems, ...vendors];
            }
            return {
              ...prev,
              [marketId]: {
                list: newList,
                page: pagination.page,
                total: pagination.total,
                isLoading: false
              }
            };
          });
          await adminDB.set('cache', cacheKey, fresh, Infinity);
        }
      }
    } catch (error) {
      console.error('fetchMarketVendors error:', error);
      toast.error('Failed to load vendors');
      setMarketVendors(prev => ({
        ...prev,
        [marketId]: {
          ...(prev[marketId] || { list: [], page: 0, total: 0 }),
          isLoading: false
        }
      }));
    }
  };

  const fetchVendorProducts = async (vendorId: string, nextPage = 1) => {
    const cacheKey = `vendor:products:${vendorId}:page:${nextPage}`;
    const cached = await adminDB.get<any>('cache', cacheKey);

    if (cached) {
      setVendorProducts(prev => {
        const current = prev[vendorId];
        const newList = nextPage === 1 ? cached.products : [...(current?.list || []), ...cached.products];
        return {
          ...prev,
          [vendorId]: {
            list: newList,
            page: cached.pagination.page,
            total: cached.pagination.total,
            isLoading: false
          }
        };
      });
    } else {
      setVendorProducts(prev => ({
        ...prev,
        [vendorId]: {
          ...(prev[vendorId] || { list: [], page: 0, total: 0 }),
          isLoading: true
        }
      }));
    }

    try {
      const response = await api.get(`/products`, {
        params: { business_id: vendorId, limit: 10, page: nextPage }
      });
      if (response.data.success) {
        const { products, pagination } = response.data.data;
        const fresh = { products, pagination };

        if (!cached || JSON.stringify(cached) !== JSON.stringify(fresh)) {
          setVendorProducts(prev => {
            const current = prev[vendorId];
            let newList;
            if (nextPage === 1) {
              newList = products;
            } else {
              const prevItems = (current?.list || []).slice(0, (nextPage - 1) * 10);
              newList = [...prevItems, ...products];
            }
            return {
              ...prev,
              [vendorId]: {
                list: newList,
                page: pagination.page,
                total: pagination.total,
                isLoading: false
              }
            };
          });
          await adminDB.set('cache', cacheKey, fresh, Infinity);
        }
      }
    } catch (error) {
      if (!cached) {
        toast.error('Failed to load products');
      }
      setVendorProducts(prev => ({
        ...prev,
        [vendorId]: {
          ...(prev[vendorId] || { list: [], page: 0, total: 0 }),
          isLoading: false
        }
      }));
    }
  };

  const toggleMarket = (marketId: number) => {
    const isNowExpanded = !expandedMarkets[marketId];
    setExpandedMarkets(prev => ({ ...prev, [marketId]: isNowExpanded }));
    if (isNowExpanded && (!marketVendors[marketId] || marketVendors[marketId].list.length === 0)) {
      fetchMarketVendors(marketId, 1);
    }
  };

  const toggleVendor = (vendorId: string) => {
    const isNowExpanded = !expandedVendors[vendorId];
    setExpandedVendors(prev => ({ ...prev, [vendorId]: isNowExpanded }));
    if (isNowExpanded && (!vendorProducts[vendorId] || vendorProducts[vendorId].list.length === 0)) {
      fetchVendorProducts(vendorId, 1);
    }
  };

  const fetchMarkets = useCallback(async () => {
    // Try to load from IndexedDB cache first
    const cached = await adminDB.get<Market[]>('cache', 'markets');
    if (cached) {
      setMarkets(cached);
      setIsLoading(false); // No loader is shown because we have cached data!
    } else {
      setIsLoading(true);
    }

    try {
      const response = await api.get('/markets');
      if (response.data.success) {
        const fresh = response.data.data;
        // Only update state and write cache if data changed or cache was empty
        if (!cached || JSON.stringify(cached) !== JSON.stringify(fresh)) {
          setMarkets(fresh);
          await adminDB.set('cache', 'markets', fresh, Infinity);
        }
      }
    } catch (error) {
      if (!cached) {
        toast.error('Failed to load market data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  const handleSubmitMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMarket) {
        const response = await api.put(`/markets/${editingMarket.id}`, formData);
        if (response.data.success) {
          toast.success('Market affiliation updated successfully');
          
          // Clear IndexedDB cache for markets list and this market's vendors
          await adminDB.del('cache', 'markets');
          for (let p = 1; p <= 5; p++) {
            await adminDB.del('cache', `market:vendors:${editingMarket.id}:page:${p}`);
          }
          
          // Reset React state for this market so it re-fetches
          setMarketVendors(prev => {
            const next = { ...prev };
            delete next[editingMarket.id];
            return next;
          });

          closeModal();
          fetchMarkets();
        }
      } else {
        const response = await api.post('/markets', formData);
        if (response.data.success) {
          toast.success('New market affiliation created successfully');
          
          // Clear IndexedDB cache for markets list
          await adminDB.del('cache', 'markets');

          closeModal();
          fetchMarkets();
        }
      }
    } catch (error) {
      toast.error(editingMarket ? 'Failed to update market affiliation' : 'Failed to create market affiliation');
    }
  };

  const filteredMarkets = markets.filter(m =>
    m.market_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Market Affiliations</h1>
        </div>
        <button
          onClick={() => {
            closeModal();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-rose-100 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Hub</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-white border border-gray-100 rounded-[0.5rem] p-2 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
          <input
            type="text"
            placeholder="Search by market name or location..."
            className="w-full bg-gray-50 border border-transparent rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Markets Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 bg-white border border-gray-100 rounded-[0.75rem]">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        </div>
      ) : filteredMarkets.length > 0 ? (
        <div className="bg-white border border-gray-100 rounded-[0.75rem] shadow-sm relative overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Market</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Type</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Location</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Vendors</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Products</th>
                  <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Status</th>
                  <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredMarkets.map((market) => (
                  <React.Fragment key={market.id}>
                    <tr
                      onClick={() => toggleMarket(market.id)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer select-none"
                    >
                      {/* Market Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                            <MapIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs leading-tight">{market.market_name}</p>
                            <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-0.5">ID: {market.market_slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Market Type */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 text-[10px] font-bold uppercase border border-gray-100">
                          {market.market_type.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <Navigation className="w-3.5 h-3.5 text-gray-400" />
                          {market.city}, {market.state}
                        </div>
                      </td>

                      {/* Vendors Count */}
                      <td className="px-6 py-4 font-extrabold text-gray-900 text-xs">
                        {market.total_vendors || 0}
                      </td>

                      {/* Products Count */}
                      <td className="px-6 py-4 font-extrabold text-gray-900 text-xs">
                        {market.total_products || 0}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {market.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-400 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            Hidden
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => startEditMarket(market)}
                          className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-rose-500 transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>

                    {/* Collapsible Vendors Row */}
                    {expandedMarkets[market.id] && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={7} className="px-8 py-4 border-b border-gray-100">
                          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-700 tracking-wider uppercase">Vendors in {market.market_name}</h4>
                              <span className="text-[10px] font-bold text-gray-400">Total: {marketVendors[market.id]?.total || 0}</span>
                            </div>

                            {marketVendors[market.id]?.isLoading && (!marketVendors[market.id]?.list || marketVendors[market.id].list.length === 0) ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
                              </div>
                            ) : marketVendors[market.id]?.list && marketVendors[market.id].list.length > 0 ? (
                              <div className="space-y-3">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-gray-100 text-gray-400">
                                      <th className="text-left font-bold py-2">Vendor Name</th>
                                      <th className="text-left font-bold py-2">Owner</th>
                                      <th className="text-left font-bold py-2 text-center">Total Product</th>
                                      <th className="text-left font-bold py-2 text-center">Orders</th>
                                      <th className="text-left font-bold py-2 text-center">Revenue</th>
                                      <th className="text-left font-bold py-2 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {marketVendors[market.id].list.map((vendor: any) => (
                                      <React.Fragment key={vendor.business_id}>
                                        <tr
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVendor(vendor.business_id);
                                          }}
                                          className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                        >
                                          <td className="py-3 font-semibold text-gray-900 flex items-center gap-2">
                                            {vendor.logo ? (
                                              <img src={vendor.logo} className="w-6 h-6 rounded-md object-cover" />
                                            ) : (
                                              <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-[10px]">
                                                {vendor.business_name[0]}
                                              </div>
                                            )}
                                            {vendor.business_name}
                                          </td>
                                          <td className="py-3 text-gray-600 font-medium">{vendor.owner_name}</td><td className="py-3 text-gray-700 font-bold text-center">{vendor.total_products || 0}</td>
                                          <td className="py-3 text-gray-700 font-bold text-center">{vendor.total_orders || 0}</td>
                                          <td className="py-3 text-gray-700 font-bold text-center">₦{Number(vendor.total_revenue).toLocaleString()}</td>
                                          <td className="py-3 text-center">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                              vendor.business_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                              {vendor.business_status}
                                            </span>
                                          </td>
                                        </tr>

                                        {/* Collapsible Products Row */}
                                        {expandedVendors[vendor.business_id] && (
                                          <tr>
                                            <td colSpan={6} className="px-6 py-3 bg-gray-50/30">
                                              <div className="bg-white rounded-xl border border-gray-100 p-3 pb-5 space-y-3 relative">
                                                <div className="flex items-center justify-between">
                                                  <h5 className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Products by {vendor.business_name}</h5>
                                                  <span className="text-[9px] font-bold text-gray-400">Total: {vendorProducts[vendor.business_id]?.total || 0}</span>
                                                </div>

                                                {vendorProducts[vendor.business_id]?.isLoading && (!vendorProducts[vendor.business_id]?.list || vendorProducts[vendor.business_id].list.length === 0) ? (
                                                  <div className="flex items-center justify-center py-4">
                                                    <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                                                  </div>
                                                ) : vendorProducts[vendor.business_id]?.list && vendorProducts[vendor.business_id].list.length > 0 ? (
                                                  <div className="space-y-3">
                                                    <div className="grid grid-cols-7 gap-2 text-[10px] font-bold text-gray-400 border-b border-gray-50 pb-1">
                                                      <span className="col-span-2">Product Info</span>
                                                      <span className="col-span-1 text-center">Available</span>
                                                      <span className="col-span-1 text-center">Reserved</span>
                                                      <span className="col-span-1 text-center">In Hand (Total)</span>
                                                      <span className="col-span-1 text-center">Status</span>
                                                      <span className="col-span-1 text-right">Actions</span>
                                                    </div>
                                                    <div className="divide-y divide-gray-50 pr-1">
                                                      {vendorProducts[vendor.business_id].list.map((prod: any) => {
                                                        const reserved = prod.reserved || 0;
                                                        const total = prod.stock || 0;
                                                        const available = total - reserved;
                                                        return (
                                                          <div key={prod.id} className="grid grid-cols-7 gap-2 py-2 text-[11px] text-gray-700 items-center">
                                                            <div className="col-span-2 flex items-center gap-3">
                                                              <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                                                {prod.image ? (
                                                                  <img src={prod.image} className="w-full h-full object-cover" alt={prod.name} />
                                                                ) : (
                                                                  <ImageIcon className="w-4 h-4 text-gray-300" />
                                                                )}
                                                              </div>
                                                              <div className="min-w-0">
                                                                <p className="text-xs font-semibold text-gray-900 truncate" title={prod.name}>{prod.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-medium">{prod.category}</p>
                                                              </div>
                                                            </div>
                                                            <span className="col-span-1 text-center font-bold text-gray-900">{available}</span>
                                                            <span className="col-span-1 text-center font-semibold text-amber-500">
                                                              {reserved > 0 ? `+${reserved}` : '0'}
                                                            </span>
                                                            <span className="col-span-1 text-center font-bold text-gray-900">{total}</span>
                                                            <span className="col-span-1 text-center">
                                                              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                                prod.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                              }`}>
                                                                {prod.status}
                                                              </span>
                                                            </span>
                                                            <span className="col-span-1 text-right">
                                                              <a
                                                                href={`/shop/${vendor.business_slug || vendor.business_id}?product_id=${prod.id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-rose-500 hover:text-rose-600 font-bold hover:underline"
                                                              >
                                                                View
                                                              </a>
                                                            </span>
                                                          </div>
                                                        );
                                                      })}
                                                    </div>
                                                    {vendorProducts[vendor.business_id].list.length < vendorProducts[vendor.business_id].total && (
                                                      <button
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          fetchVendorProducts(vendor.business_id, vendorProducts[vendor.business_id].page + 1);
                                                        }}
                                                        disabled={vendorProducts[vendor.business_id].isLoading}
                                                        className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5 active:scale-95 transition-all z-10 whitespace-nowrap"
                                                      >
                                                        {vendorProducts[vendor.business_id].isLoading ? (
                                                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white mr-0.5" />
                                                        ) : null}
                                                        View more products
                                                      </button>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <p className="text-[10px] font-bold text-gray-400 py-2">No products found for this vendor.</p>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>

                                {marketVendors[market.id].list.length < marketVendors[market.id].total && (
                                  <div className="flex justify-end pt-2 border-t border-gray-50">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        fetchMarketVendors(market.id, marketVendors[market.id].page + 1);
                                      }}
                                      disabled={marketVendors[market.id].isLoading}
                                      className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center gap-1.5 active:scale-95 transition-transform"
                                    >
                                      {marketVendors[market.id].isLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                      ) : null}
                                      View more vendors
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-gray-400 py-4 text-center">No vendors found for this market.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Grid View */}
          <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
            {filteredMarkets.map((market) => (
              <div
                key={market.id}
                onClick={() => toggleMarket(market.id)}
                className="bg-white rounded-[0.5rem] p-4 border border-gray-100 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer select-none"
              >
                <div className="absolute top-3 right-3" onClick={(e) => { e.stopPropagation(); startEditMarket(market); }}>
                  <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-rose-500 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
                    <MapIcon className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{market.market_name}</h3>
                    <div className="flex items-center gap-1 text-xs font-medium text-gray-400 mt-1 tracking-wider">
                      <Navigation className="w-3 h-3" />
                      {market.city}, {market.state}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-transparent hover:border-gray-100 transition-colors">
                      <Store className="w-4 h-4 text-rose-500 mb-1" />
                      <span className="text-sm font-bold text-gray-900">{market.total_vendors || 0}</span>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tighter">Vendors</span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-transparent hover:border-gray-100 transition-colors">
                      <Package className="w-4 h-4 text-rose-500 mb-1" />
                      <span className="text-sm font-bold text-gray-900">{market.total_products || 0}</span>
                      <span className="text-[10px] font-bold text-gray-400 tracking-tighter">Products</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-gray-50 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${market.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="text-[11px] font-bold text-gray-500 tracking-tight">
                        {market.is_active ? 'Publicly Visible' : 'Hidden'}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 italic">
                      ID: {market.market_slug}
                    </span>
                  </div>

                  {/* Collapsible Vendors on Mobile */}
                  {expandedMarkets[market.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-gray-400 tracking-wider uppercase">Vendors in {market.market_name}</h4>
                        <span className="text-[10px] font-bold text-gray-400">Total: {marketVendors[market.id]?.total || 0}</span>
                      </div>

                      {marketVendors[market.id]?.isLoading && (!marketVendors[market.id]?.list || marketVendors[market.id].list.length === 0) ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                        </div>
                      ) : marketVendors[market.id]?.list && marketVendors[market.id].list.length > 0 ? (
                        <div className="space-y-3">
                          {marketVendors[market.id].list.map((vendor: any) => (
                            <div
                              key={vendor.business_id}
                              onClick={() => toggleVendor(vendor.business_id)}
                              className={`bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 cursor-pointer relative ${
                                expandedVendors[vendor.business_id] && vendorProducts[vendor.business_id]?.list?.length < vendorProducts[vendor.business_id]?.total ? 'pb-6' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {vendor.logo ? (
                                    <img src={vendor.logo} className="w-6 h-6 rounded-md object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center font-bold text-[10px]">
                                      {vendor.business_name[0]}
                                    </div>
                                  )}
                                  <span className="font-bold text-gray-900 text-xs">{vendor.business_name}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  vendor.business_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {vendor.business_status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10px] text-gray-500 font-semibold bg-white/50 p-2 rounded-lg">
                                <div>Owner: <span className="text-gray-800 font-bold">{vendor.owner_name}</span></div>
                                <div>Products: <span className="text-gray-800 font-bold">{vendor.total_products || 0}</span></div>
                                <div>Orders: <span className="text-gray-800 font-bold">{vendor.total_orders || 0}</span></div>
                                <div>Revenue: <span className="text-rose-500 font-extrabold">₦{Number(vendor.total_revenue).toLocaleString()}</span></div>
                              </div>

                              {/* Products on Mobile inside Mobile Vendor Cards */}
                              {expandedVendors[vendor.business_id] && (
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-2" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Products</h5>
                                    <span className="text-[9px] font-bold text-gray-400">Total: {vendorProducts[vendor.business_id]?.total || 0}</span>
                                  </div>

                                  {vendorProducts[vendor.business_id]?.isLoading && (!vendorProducts[vendor.business_id]?.list || vendorProducts[vendor.business_id].list.length === 0) ? (
                                    <div className="flex items-center justify-center py-3">
                                      <Loader2 className="w-4 h-4 text-rose-500 animate-spin" />
                                    </div>
                                  ) : vendorProducts[vendor.business_id]?.list && vendorProducts[vendor.business_id].list.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="pr-1 space-y-2">
                                        {vendorProducts[vendor.business_id].list.map((prod: any) => {
                                          const reserved = prod.reserved || 0;
                                          const total = prod.stock || 0;
                                          const available = total - reserved;
                                          return (
                                            <div key={prod.id} className="bg-white rounded-xl p-3 border border-gray-100/60 flex flex-col gap-3 text-[10px] text-gray-700">
                                              <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                                  {prod.image ? (
                                                    <img src={prod.image} className="w-full h-full object-cover" alt={prod.name} />
                                                  ) : (
                                                    <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                                                  )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-semibold text-gray-900 truncate" title={prod.name}>{prod.name}</p>
                                                  <p className="text-[9px] text-gray-400 font-medium mt-0.5">{prod.category}</p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                    prod.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                                  }`}>
                                                    {prod.status}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="grid grid-cols-3 gap-1 bg-gray-50/50 rounded-lg p-2 text-center text-[9px] font-semibold text-gray-500">
                                                <div>
                                                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Available</p>
                                                  <p className="font-bold text-gray-900 mt-0.5">{available}</p>
                                                </div>
                                                <div>
                                                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Reserved</p>
                                                  <p className="font-bold text-amber-500 mt-0.5">{reserved > 0 ? `+${reserved}` : '0'}</p>
                                                </div>
                                                <div>
                                                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">In Hand</p>
                                                  <p className="font-bold text-gray-900 mt-0.5">{total}</p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {vendorProducts[vendor.business_id].list.length < vendorProducts[vendor.business_id].total && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            fetchVendorProducts(vendor.business_id, vendorProducts[vendor.business_id].page + 1);
                                          }}
                                          disabled={vendorProducts[vendor.business_id].isLoading}
                                          className="w-full bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-bold px-3 py-2 rounded-xl shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                        >
                                          {vendorProducts[vendor.business_id].isLoading ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin text-white mr-0.5" />
                                          ) : null}
                                          View more products
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[9px] text-gray-400 font-bold">No products found.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}

                          {marketVendors[market.id].list.length < marketVendors[market.id].total && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                fetchMarketVendors(market.id, marketVendors[market.id].page + 1);
                              }}
                              disabled={marketVendors[market.id].isLoading}
                              className="w-full py-2 bg-gray-50 rounded-xl text-[11px] font-bold text-rose-500 hover:bg-gray-100 flex items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                              {marketVendors[market.id].isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                              ) : null}
                              View more vendors
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-semibold text-center">No vendors found.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-[32px] border border-gray-100 border-dashed">
          <MapPin className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-gray-400 tracking-widest">No Markets Registered</p>
          <button
            onClick={() => {
              closeModal();
              setIsModalOpen(true);
            }}
            className="mt-4 text-rose-500 font-bold text-sm hover:underline"
          >
            Register your first hub now
          </button>
        </div>
      )}

      {/* Modal for Creating / Editing Market - Rendered via Portal */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={closeModal}
          />
          <div className="relative bg-white w-full max-w-xl rounded-[0.5rem] p-4 md:p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                  {editingMarket ? 'Edit Market Hub' : 'Register New Hub'}
                </h2>
                <p className="text-sm font-medium text-gray-400">
                  {editingMarket ? 'Update the physical hub configuration.' : 'Map a new physical location to the platform.'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-50 rounded-2xl text-gray-400 transition-colors"
              >
                <XCircle className="w-8 h-8" />
              </button>
            </div>

            <form onSubmit={handleSubmitMarket} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400   ml-1 mb-2 block">Market / Plaza Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kawo Market"
                    className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-semibold focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                    value={formData.market_name}
                    onChange={(e) => setFormData({ ...formData, market_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400   ml-1 mb-2 block">Type</label>
                    <select
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-bold text-gray-600 focus:bg-white focus:border-rose-100 outline-none transition-all cursor-pointer"
                      value={formData.market_type}
                      onChange={(e) => setFormData({ ...formData, market_type: e.target.value })}
                    >
                      <option value="market">Open Market</option>
                      <option value="plaza">Plaza / Complex</option>
                      <option value="shopping_mall">Shopping Mall</option>
                      <option value="business_hub">Digital Hub</option>
                      <option value="trade_center">Trade Center</option>
                      <option value="mini_market">Mini Market</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400  tracking-widest ml-1 mb-2 block">State</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaduna"
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-semibold focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400  tracking-widest ml-1 mb-2 block">City</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kaduna"
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-semibold focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400  tracking-widest ml-1 mb-2 block">Country</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-semibold focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400  tracking-widest ml-1 mb-2 block">Street Address</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Physical location details..."
                    className="w-full bg-gray-50 border border-transparent rounded-2xl py-3.5 px-4 text-sm font-semibold focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none resize-none"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-4 rounded-[20px] font-bold text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-[20px] font-extrabold text-sm shadow-xl shadow-rose-100 transition-all active:scale-[0.98]"
                >
                  {editingMarket ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
