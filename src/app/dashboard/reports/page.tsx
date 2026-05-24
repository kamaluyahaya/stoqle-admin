'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
    FileText,
    BarChart,
    PieChart,
    TrendingUp,
    Users,
    ShoppingBag,
    Download,
    Calendar,
    ChevronRight,
    Loader2,
    Filter
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart as ReBarChart,
    Bar,
    Cell
} from 'recharts';
import { toast } from 'sonner';

export default function ReportsPage() {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        const fetchReports = async () => {
            setIsLoading(true);
            try {
                const response = await api.get('/reports/global');
                if (response.data.success) {
                    setData(response.data.data);
                }
            } catch (error) {
                toast.error('Failed to aggregate platform intelligence');
            } finally {
                setIsLoading(false);
            }
        };
        fetchReports();
    }, [timeRange]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                <p className="text-sm font-bold text-gray-400 ">Aggregating Business Intelligence...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-10 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        Platform Insights
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-2 bg-rose-500 text-white rounded-full font-bold text-sm transition-all hover:bg-rose-600">
                        <Download className="w-4 h-4" />
                        <span>Download Annual Report</span>
                    </button>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Revenue Growth */}
                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-8 ">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Revenue Dynamics</h3>
                            <p className="text-[10px] font-bold text-gray-400  tracking-widest mt-0.5">30-Day Moving Average</p>
                        </div>
                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                    </div>

                    <div className="h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={data?.growth}>
                                <defs>
                                    <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#f43f5e"
                                    strokeWidth={3}
                                    fill="url(#growthGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Share */}
                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-8 ">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Marketplace Verticals</h3>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">Top performing categories</p>
                        </div>
                        <ShoppingBag className="w-5 h-5 text-rose-500" />
                    </div>

                    <div className="h-[300px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <ReBarChart data={data?.categories} layout="vertical">
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#1e293b' }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="sold" radius={[0, 10, 10, 0]} barSize={20}>
                                    {data?.categories?.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#f43f5e' : '#f87171'} />
                                    ))}
                                </Bar>
                            </ReBarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Vendors */}
                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-8 lg:col-span-2">
                    <h3 className="text-lg font-extrabold text-gray-900 tracking-tight mb-8">Premier Merchant Rankings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-6">
                            {data?.vendors?.map((vendor: any, idx: number) => (
                                <div key={vendor.name} className="flex items-center justify-between p-4 rounded-[0.5rem] bg-gray-50 border border-transparent hover:border-rose-100 hover:bg-white hover: transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-[0.5rem] bg-white flex items-center justify-center text-rose-500 font-black">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-extrabold text-gray-900 group-hover:text-rose-600 transition-colors">{vendor.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400  tracking-widest">Platform Partner</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-900">₦{parseFloat(vendor.revenue).toLocaleString()}</p>
                                        <p className="text-[10px] font-bold text-emerald-500 ">Revenue</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-rose-50 rounded-[0.5rem] p-8 flex flex-col justify-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h4 className="text-2xl font-black text-rose-900 tracking-tighter mb-4">Strategic AI Recommendation</h4>
                                <p className="text-rose-700/80 font-medium leading-relaxed">
                                    Based on current growth vectors, expanding the <strong>{data?.categories[0]?.name}</strong> vertical could yield a <strong>15% increase</strong> in transaction volume next quarter.
                                </p>
                                <button className="mt-8 flex items-center gap-2 text-rose-600 font-bold text-sm group">
                                    Explore Strategy <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                            <BarChart className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-rose-100" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
