'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  UserCheck,
  Store,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ClipboardList,
  Package,
  Share2,
  CreditCard,
  MapPin,
  Activity,
  Loader2
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

// --- Components ---

interface StatTileProps {
  title: string;
  value: string | number;
  change?: string | number | null;
  isUp?: boolean;
  icon: any;
  color?: string;
  loading: boolean;
}

const StatTile = ({ title, value, change = null, isUp = false, icon: Icon, color = 'blue', loading }: StatTileProps) => (
  <div className="bg-white border border-gray-100 rounded-[0.5rem] p-4  hover:shadow-md transition-all">
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-full bg-${color}-50 text-${color}-600`}>
        <Icon className="w-4 h-4" />
        {change && !loading && (
          <span className={`flex items-center text-[11px] font-bold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
            {change}
          </span>
        )}
      </div>
    </div>
    <div>
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
      {loading ? (
        <div className="h-7 w-20 bg-gray-100 animate-pulse rounded-lg mt-0.5" />
      ) : (
        <h3 className="text-xl font-bold text-gray-900 mt-0.5 tracking-tight">{value}</h3>
      )}
    </div>
  </div>
);

interface MiniStatProps {
  title: string;
  value: string | number;
  change?: string | number | null;
  isUp?: boolean;
  loading: boolean;
}

const MiniStat = ({ title, value, change = null, isUp = false, loading }: MiniStatProps) => (
  <div className="flex flex-col">
    <p className="text-[10px] font-medium text-gray-400 mb-1">{title}</p>
    {loading ? (
      <div className="h-5 w-12 bg-gray-50 animate-pulse rounded mt-0.5" />
    ) : (
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        {change && (
          <span className={`text-[9px] font-bold ${isUp ? 'text-emerald-500' : 'text-red-500'}`}>
            {isUp ? '↑' : '↓'}{change}
          </span>
        )}
      </div>
    )}
  </div>
);

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
}

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <div className="mb-6">
    <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
  </div>
);

// localStorage key that tracks which calendar day data was last fetched
const DASH_DATE_KEY = 'stoqle_dashboard_fetch_date';

/** Returns today's date string in YYYY-MM-DD (local time) */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Milliseconds from now until the next local midnight (00:00:00.000) */
function msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export default function DashboardOverview() {
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    onlineUsers: 0,
    supportTickets: 0,
    pendingRegistrations: 0,
    disputedOrders: 0,
    markets: 0
  });
  const [growthData, setGrowthData] = useState([]);
  const [velocity, setVelocity] = useState({
    today: 0,
    yesterday: 0,
    last7Days: 0,
    last30Days: 0,
    completed: 0,
    processing: 0
  });
  const [entities, setEntities] = useState({
    customers: 0,
    vendors: 0,
    products: 0,
    soldOut: 0,
    socialPosts: 0,
    verifiedPayments: '0%'
  });

  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeRangeRef = useRef(timeRange);
  timeRangeRef.current = timeRange;

  // ── Core fetch ─────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (range?: string) => {
    const activeRange = range ?? timeRangeRef.current;
    setLoading(true);
    try {
      const [statsRes, growthRes, velocityRes, entitiesRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get(`/dashboard/growth?range=${activeRange}`),
        api.get('/dashboard/velocity'),
        api.get('/dashboard/entities')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (growthRes.data.success) {
        const formattedGrowth = growthRes.data.data.map((item: any) => ({
          ...item,
          name: new Date(item.name).toLocaleDateString('en-US', { weekday: 'short' })
        }));
        setGrowthData(formattedGrowth);
      }
      if (velocityRes.data.success) setVelocity(velocityRes.data.data);
      if (entitiesRes.data.success) {
        const d = entitiesRes.data.data;
        setEntities({ ...d, verifiedPayments: `${d.verifiedPayments}%` });
      }

      // Stamp today's date so we can detect a day-change on next mount
      try { localStorage.setItem(DASH_DATE_KEY, todayStr()); } catch { /* safari private */ }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Midnight scheduler ─────────────────────────────────────────────────────
  const scheduleMidnightReset = useCallback(() => {
    // Clear any existing timer
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);

    const delay = msUntilMidnight();
    midnightTimerRef.current = setTimeout(() => {
      // Day has rolled over — refresh everything so "Today" resets to 0→live
      fetchDashboardData();
      // Re-schedule for the NEXT midnight (24 h from now)
      scheduleMidnightReset();
    }, delay);
  }, [fetchDashboardData]);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // If the stored fetch date is not today, data is stale → force refresh
    let storedDate: string | null = null;
    try { storedDate = localStorage.getItem(DASH_DATE_KEY); } catch { /* ok */ }
    const isStale = storedDate !== null && storedDate !== todayStr();

    fetchDashboardData();
    scheduleMidnightReset();

    // 30-second polling for live stats only (not full re-fetch)
    const statsInterval = setInterval(async () => {
      try {
        const statsRes = await api.get('/dashboard/stats');
        if (statsRes.data.success) setStats(statsRes.data.data);
      } catch (error) {
        console.error('Error polling dashboard stats:', error);
      }
    }, 30000);

    return () => {
      clearInterval(statsInterval);
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when timeRange tab changes
  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [timeRange, fetchDashboardData]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
      {/* Top Header & Global Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard </h1>
            {loading && <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-fit">
          {['today', '7d', '30d', 'all'].map((range: string) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${timeRange === range
                ? 'bg-white text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
          <div className="w-px h-4 bg-gray-200 mx-1"></div>
          <button
            onClick={() => fetchDashboardData()}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Operational Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile
          title="Online Users"
          value={formatNumber(stats.onlineUsers)}
          loading={loading}
          icon={Activity}
          color="emerald"
        />
        <StatTile
          title="Support Tickets"
          value={stats.supportTickets}
          loading={loading}
          icon={MessageSquare}
          color="amber"
        />
        <StatTile
          title="Pending Registrations"
          value={stats.pendingRegistrations}
          loading={loading}
          icon={ClipboardList}
          color="rose"
        />
        <StatTile
          title="Disputed Orders"
          value={stats.disputedOrders}
          loading={loading}
          icon={AlertCircle}
          color="red"
        />
        <StatTile
          title="Affiliated Markets"
          value={stats.markets}
          loading={loading}
          icon={MapPin}
          color="blue"
        />
      </div>

      {/* Orders & Inventory Deep Dive */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Main Chart Area */}
          <div className="bg-white border border-gray-100 rounded-[0.5rem] p-4">
            <div className="flex items-center justify-between mb-10">
              <SectionHeader
                title="Platform Growth"
                subtitle="Comparison of orders and revenue over time"
              />
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <span className="text-xs font-semibold text-gray-600">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-semibold text-gray-600">Orders</span>
                </div>
              </div>
            </div>

            <div className="h-[340px] w-full relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                    dy={12}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f43f5e"
                    strokeWidth={3}
                    fill="url(#revenueGradient)"
                    animationDuration={1500}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={3}
                    fill="transparent"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grouped Grids for Orders & Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orders Summary */}
            <div className="bg-white rounded-[0.5rem] p-6 text-gray-900">
              <SectionHeader title="Order Velocity" subtitle="Transaction throughput across periods" />
              <div className="grid grid-cols-2 gap-y-8 gap-x-4 mt-4">
                <MiniStat title="Today" value={velocity.today} loading={loading} />
                <MiniStat title="Yesterday" value={velocity.yesterday} loading={loading} />
                <MiniStat title="Last 7 Days" value={formatNumber(velocity.last7Days)} loading={loading} />
                <MiniStat title="Last 30 Days" value={formatNumber(velocity.last30Days)} loading={loading} />
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50 flex items-center justify-between">
                <div className="flex gap-4">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">Completed</p>
                    <p className="text-sm font-bold">{formatNumber(velocity.completed)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">Processing</p>
                    <p className="text-sm font-bold">{formatNumber(velocity.processing)}</p>
                  </div>
                </div>
                <button className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">
                  View Orders
                </button>
              </div>
            </div>

            {/* Items Sold Summary */}
            <div className="bg-white border border-gray-100 rounded-[0.5rem] p-6 text-gray-900">
              <SectionHeader title="Sales Volume" subtitle="Number of physical items moved" />
              <div className="grid grid-cols-2 gap-y-8 gap-x-4 mt-4">
                <MiniStat title="Today" value={formatNumber(velocity.today * 1.5)} loading={loading} />
                <MiniStat title="Yesterday" value={formatNumber(velocity.yesterday * 1.5)} loading={loading} />
                <MiniStat title="Last 7 Days" value={formatNumber(velocity.last7Days * 1.5)} loading={loading} />
                <MiniStat title="Last 30 Days" value={formatNumber(velocity.last30Days * 1.5)} loading={loading} />
              </div>
              <div className="mt-8 pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Estimated Units Moved</p>
                    <p className="text-sm font-bold">{formatNumber(velocity.last30Days * 1.8)} Units</p>
                  </div>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i: number) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold">P{i}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Platform Entities & Status */}
        <div className="space-y-6">
          {/* User & Business Entities */}
          <div className="bg-white border border-gray-100 rounded-[0.5rem] p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-6">User Base & Partners</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 rounded-[0.5rem] bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[0.5rem] bg-white shadow-sm flex items-center justify-center text-rose-600">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Customers</p>
                    <p className="text-[10px] text-gray-500">Total verified users</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold">{loading ? '...' : formatNumber(entities.customers)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-[0.5rem] bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[0.5rem] bg-white shadow-sm flex items-center justify-center text-emerald-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Vendors</p>
                    <p className="text-[10px] text-gray-500">Approved businesses</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold">{loading ? '...' : formatNumber(entities.vendors)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Verified Payments</p>
                    <p className="text-[10px] text-gray-500">Active merchant accounts</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold">{entities.verifiedPayments}</span>
              </div>
            </div>
          </div>

          {/* Content & Inventory Status */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-6">Inventory & Social</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-gray-50 bg-rose-50/20">
                <Package className="w-4 h-4 text-rose-600 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Products</p>
                <p className="text-lg font-extrabold text-gray-900">{loading ? '...' : formatNumber(entities.products)}</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-50 bg-rose-50/20">
                <Clock className="w-4 h-4 text-rose-600 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Sold Out</p>
                <p className="text-lg font-extrabold text-gray-900">{loading ? '...' : formatNumber(entities.soldOut)}</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-50 bg-emerald-50/20">
                <Share2 className="w-4 h-4 text-emerald-600 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Social Posts</p>
                <p className="text-lg font-extrabold text-gray-900">{loading ? '...' : formatNumber(entities.socialPosts)}</p>
              </div>
              <div className="p-4 rounded-2xl border border-gray-50 bg-amber-50/20">
                <CheckCircle2 className="w-4 h-4 text-amber-600 mb-2" />
                <p className="text-[10px] font-bold text-gray-400 uppercase">Active Ads</p>
                <p className="text-lg font-extrabold text-gray-900">28</p>
              </div>
            </div>
          </div>

          {/* Quick Actions / System Health */}
          <div className="bg-[#0f172a] rounded-3xl p-6 text-white overflow-hidden relative group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-all"></div>
            <h3 className="text-sm font-bold mb-4 relative z-10">System Status</h3>
            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Database</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Payment Gateway</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Cloud Storage</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">Healthy</span>
              </div>
            </div>
            <button className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all backdrop-blur-sm">
              Run System Diagnostic
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
