'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
 BarChart3,
 Search,
 Filter,
 Activity,
 History,
 Shield,
 User,
 Monitor,
 Globe,
 Loader2,
 ChevronLeft,
 ChevronRight,
 Database
} from 'lucide-react';
import { toast } from 'sonner';

interface ActivityLog {
 id: number;
 user_id: number;
 action: string;
 ip_address: string;
 user_agent: string;
 metadata: any;
 created_at: string;
 user_name?: string;
 user_email?: string;
 user_role?: string;
}

export default function ActivityLogPage() {
 const [logs, setLogs] = useState<ActivityLog[]>([]);
 const [isLoading, setIsLoading] = useState(true);
 const [searchQuery, setSearchQuery] = useState('');
 const [page, setPage] = useState(1);
 const [pagination, setPagination] = useState({ total: 0, pages: 1 });
 const [stats, setStats] = useState<any[]>([]);

 const fetchLogs = useCallback(async () => {
 setIsLoading(true);
 try {
 const response = await api.get('/activity/logs', {
 params: { page, search: searchQuery }
 });
 if (response.data.success) {
 setLogs(response.data.data.logs);
 setPagination(response.data.data.pagination);
 }

 const statsRes = await api.get('/activity/stats');
 if (statsRes.data.success) {
 setStats(statsRes.data.data);
 }
 } catch (error) {
 toast.error('Failed to audit activity stream');
 } finally {
 setIsLoading(false);
 }
 }, [page, searchQuery]);

 useEffect(() => {
 const timer = setTimeout(() => {
 fetchLogs();
 }, 400);
 return () => clearTimeout(timer);
 }, [fetchLogs]);

 const getActionColor = (action: string) => {
 if (action.includes('login')) return 'text-emerald-500 bg-emerald-50';
 if (action.includes('delete') || action.includes('block')) return 'text-rose-500 bg-rose-50';
 if (action.includes('update') || action.includes('edit')) return 'text-amber-500 bg-amber-50';
 return 'text-blue-500 bg-blue-50';
 };

 return (
 <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
 <History className="w-8 h-8 text-rose-500" />
 Activity Audit
 </h1>
 <p className="text-sm font-medium text-gray-400 mt-1">Comprehensive immutable log of platform events.</p>
 </div>
 </div>

 {/* Summary Stats */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {stats.slice(0, 4).map((stat) => (
 <div key={stat.action} className="bg-white border border-gray-100 rounded-[0.5rem] p-4 ">
 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">{stat.action}</p>
 <div className="flex items-center justify-between">
 <span className="text-xl font-extrabold text-gray-900">{stat.count}</span>
 <Activity className="w-4 h-4 text-rose-500" />
 </div>
 </div>
 ))}
 </div>

 {/* Control Bar */}
 <div className="bg-white border border-gray-100 rounded-[0.5rem] p-4 flex flex-col md:flex-row gap-4 items-center">
 <div className="relative flex-1 w-full group">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
 <input
 type="text"
 placeholder="Search by action, identity, or IP..."
 className="w-full bg-gray-50 border border-transparent rounded-[0.5rem] py-3 pl-12 pr-4 text-sm font-medium focus:bg-white focus:border-rose-100 transition-all outline-none"
 value={searchQuery}
 onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
 />
 </div>
 
 <button 
 onClick={() => fetchLogs()}
 className="p-3 text-gray-400 hover:bg-gray-50 hover:text-gray-900 rounded-[0.5rem] transition-all border border-transparent hover:border-gray-100"
 >
 <Loader2 className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
 </button>
 </div>

 {/* Logs Table */}
 <div className="bg-white border border-gray-100 rounded-[0.5rem] overflow-hidden">
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="border-b border-gray-50">
 <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Action</th>
 <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Identity</th>
 <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Terminal</th>
 <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Timestamp</th>
 <th className="px-8 py-5 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">Reference</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {isLoading ? (
 <tr>
 <td colSpan={5} className="py-24 text-center">
 <Loader2 className="w-10 h-10 animate-spin text-rose-500 mx-auto mb-4" />
 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Decrypting Activity Stream...</p>
 </td>
 </tr>
 ) : logs.length > 0 ? (
 logs.map((log) => (
 <tr key={log.id} className="group hover:bg-gray-50/50 transition-colors">
 <td className="px-8 py-5">
 <div className="flex items-center gap-3">
 <span className={`px-3 py-1 rounded-[0.5rem] text-[10px] font-black uppercase tracking-tighter ${getActionColor(log.action)}`}>
 {log.action}
 </span>
 </div>
 </td>
 <td className="px-8 py-5">
 {log.user_id ? (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-[0.5rem] bg-gray-100 flex items-center justify-center text-gray-400">
 <User className="w-4 h-4" />
 </div>
 <div>
 <p className="text-[13px] font-bold text-gray-900">{log.user_name || 'User #' + log.user_id}</p>
 <p className="text-[11px] font-medium text-gray-400">{log.user_email}</p>
 </div>
 </div>
 ) : (
 <span className="text-[13px] font-bold text-gray-300">System Event</span>
 )}
 </td>
 <td className="px-8 py-5">
 <div className="flex flex-col">
 <div className="flex items-center gap-1.5 text-gray-600">
 <Globe className="w-3 h-3" />
 <span className="text-[12px] font-bold">{log.ip_address}</span>
 </div>
 <div className="flex items-center gap-1.5 text-gray-400 mt-1">
 <Monitor className="w-3 h-3" />
 <span className="text-[10px] font-medium truncate max-w-[150px]">{log.user_agent}</span>
 </div>
 </div>
 </td>
 <td className="px-8 py-5 text-[13px] font-semibold text-gray-500">
 {new Date(log.created_at).toLocaleString()}
 </td>
 <td className="px-8 py-5 text-right">
 <button className="p-2 hover:bg-white hover: rounded-[0.5rem] text-gray-300 hover:text-gray-900 transition-all border border-transparent hover:border-gray-100">
 <Database className="w-4 h-4" />
 </button>
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={5} className="py-24 text-center">
 <Database className="w-16 h-16 text-gray-100 mx-auto mb-4" />
 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Stream Empty</p>
 <p className="text-xs text-gray-400 mt-1">No activity records match your criteria.</p>
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </div>

 {/* Footer Navigation */}
 <div className="px-8 py-6 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
 <p className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">
 Showing <span className="text-gray-900">{logs.length}</span> of <span className="text-gray-900">{pagination.total}</span> records
 </p>
 <div className="flex items-center gap-3">
 <button 
 onClick={() => setPage(p => Math.max(1, p - 1))}
 disabled={page === 1}
 className="flex items-center gap-2 px-4 py-2 rounded-[0.5rem] text-[12px] font-bold text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
 >
 <ChevronLeft className="w-4 h-4" />
 Previous
 </button>
 <span className="text-[12px] font-bold text-gray-900">Page {page} of {pagination.pages || 1}</span>
 <button 
 onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
 disabled={page === pagination.pages || pagination.pages === 0}
 className="flex items-center gap-2 px-4 py-2 rounded-[0.5rem] text-[12px] font-bold text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-colors"
 >
 Next
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
