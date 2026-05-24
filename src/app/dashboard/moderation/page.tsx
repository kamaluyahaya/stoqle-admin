'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import StoqleLoader from '@/components/StoqleLoader';
import {
    ShieldCheck,
    AlertTriangle,
    Search,
    ShieldAlert,
    Brain,
    Activity,
    User,
    Store,
    CheckCircle2,
    Eye,
    ChevronDown,
    Loader2,
    ExternalLink,
    Filter
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Flag {
    type: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
}

interface Alert {
    id: number;
    entity_id: number;
    account_type: 'user' | 'vendor';
    risk_score: number;
    risk_level: 'low' | 'medium' | 'high';
    flags: Flag[];
    recommended_action: string;
    explanation: string;
    admin_priority: 'low' | 'medium' | 'high';
    status: 'pending' | 'reviewed' | 'resolved';
    created_at: string;
    updated_at: string;
    entity_info?: {
        full_name?: string;
        email?: string;
    };
}

// ─── Formatter ───────────────────────────────────────────────────────────────

const getRiskColor = (level: string) => {
    switch (level) {
        case 'high': return 'text-red-600 bg-red-50 border-red-100';
        case 'medium': return 'text-orange-600 bg-orange-50 border-orange-100';
        case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
};

const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-emerald-500';
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ModerationPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all');
    
    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const limit = 10;

    const handleFilterChange = (status: 'all' | 'pending' | 'reviewed' | 'resolved') => {
        setStatusFilter(status);
        setPage(1);
    };

    // Trigger Analysis Modal
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [analyzeType, setAnalyzeType] = useState<'user' | 'vendor'>('user');
    const [analyzeId, setAnalyzeId] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGlobalAnalyzing, setIsGlobalAnalyzing] = useState(false);

    // Deep Dive Modal
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

    // Mount state for Portals
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchAlerts = useCallback(async (currentPage: number) => {
        if (currentPage === 1) setIsLoading(true);
        else setIsLoadingMore(true);

        try {
            const res = await api.get('/moderation/alerts', {
                params: { page: currentPage, limit, status: statusFilter }
            });
            if (res.data.success) {
                // MySQL returns JSON strings for flags if not casted
                const processedAlerts = res.data.data.alerts.map((a: any) => ({
                    ...a,
                    flags: typeof a.flags === 'string' ? JSON.parse(a.flags) : (a.flags || [])
                }));
                if (currentPage === 1) {
                    setAlerts(processedAlerts);
                } else {
                    setAlerts(prev => [...prev, ...processedAlerts]);
                }
                setTotal(res.data.data.pagination.total);
            }
        } catch (error) {
            toast.error('Failed to load moderation alerts');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [statusFilter, limit]);

    useEffect(() => {
        fetchAlerts(page);
    }, [page, fetchAlerts]);

    const handleUpdateStatus = async (id: number, newStatus: string) => {
        try {
            const res = await api.patch(`/moderation/alerts/${id}`, { status: newStatus });
            if (res.data.success) {
                toast.success('Alert status updated');
                if (selectedAlert?.id === id) setSelectedAlert(null);
                // To keep it simple, just refresh page 1 when an action is taken to reset the view
                setPage(1);
                fetchAlerts(1);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleTriggerAnalysis = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!analyzeId) return;
        
        setIsAnalyzing(true);
        try {
            const res = await api.post('/moderation/analyze', {
                entity_id: analyzeId,
                account_type: analyzeType
            });
            if (res.data.success) {
                toast.success('AI Deep Analysis complete!');
                setIsAnalysisModalOpen(false);
                setAnalyzeId('');
                setPage(1);
                fetchAlerts(1);
            } else {
                toast.error(res.data.message || 'Analysis failed');
            }
        } catch (error) {
            toast.error('Failed to trigger analysis. Ensure the ID exists.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleTriggerGlobalAnalysis = async () => {
        setIsGlobalAnalyzing(true);
        try {
            const res = await api.post('/moderation/analyze-global');
            if (res.data.success) {
                toast.success('System-Wide Analysis started in background!');
            } else {
                toast.error(res.data.message || 'Failed to start global analysis');
                setIsGlobalAnalyzing(false); // only reset on fail, let socket handle success reset if we wanted, but we'll reset here so button isn't stuck if socket fails
            }
        } catch (error) {
            toast.error('Failed to trigger global analysis.');
        } finally {
            setTimeout(() => setIsGlobalAnalyzing(false), 2000); // disable button for a short time to prevent spam
        }
    };

    return (
        <>
            <div className="max-w-[1600px] mx-auto space-y-10 pb-12 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Brain className="w-6 h-6 text-red-500" />
                        Fraud Detection Engine
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Continuously analyzing platform signals to detect suspicious activity and fraud.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleTriggerGlobalAnalysis}
                        disabled={isGlobalAnalyzing}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black disabled:opacity-50 text-white text-sm font-extrabold rounded-[0.5rem] shadow-lg transition-all active:scale-95 shrink-0"
                    >
                        {isGlobalAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        Run System-Wide Analysis
                    </button>
                    <button
                        onClick={() => setIsAnalysisModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold rounded-[0.5rem] shadow-lg transition-all active:scale-95 shrink-0"
                    >
                        <Brain className="w-4 h-4" />
                        Trigger Deep Analysis
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-100 p-5 rounded-[0.75rem] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">High Risk</p>
                        <p className="text-xl font-black text-gray-900 mt-1">
                            {alerts.filter(a => a.risk_level === 'high').length}
                        </p>
                    </div>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-[0.75rem] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center shrink-0">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Alerts</p>
                        <p className="text-xl font-black text-gray-900 mt-1">
                            {alerts.filter(a => a.status === 'pending').length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 uppercase">Status:</span>
                </div>
                {['all', 'pending', 'reviewed', 'resolved'].map(status => (
                    <button
                        key={status}
                        onClick={() => handleFilterChange(status as any)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all capitalize ${statusFilter === status ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Alerts Feed */}
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <StoqleLoader size={32} />
                </div>
            ) : alerts.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-[0.75rem] py-24 text-center">
                    <ShieldCheck className="w-16 h-16 text-emerald-400 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-extrabold text-gray-900">Platform Secure</h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">No moderation alerts found for the selected filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-white border border-gray-100 rounded-[0.75rem] p-5 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Score Circle */}
                                <div className="shrink-0 flex flex-col items-center justify-center">
                                    <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center \${getScoreColor(alert.risk_score)} \${alert.risk_level === 'high' ? 'border-red-100 bg-red-50' : alert.risk_level === 'medium' ? 'border-orange-100 bg-orange-50' : 'border-emerald-100 bg-emerald-50'}`}>
                                        <span className="text-xl font-black">{alert.risk_score}</span>
                                    </div>
                                    <span className={`mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border \${getRiskColor(alert.risk_level)}`}>
                                        {alert.risk_level}
                                    </span>
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                {alert.account_type === 'user' ? <User className="w-4 h-4 text-blue-500" /> : <Store className="w-4 h-4 text-purple-500" />}
                                                <h3 className="text-sm font-extrabold text-gray-900 truncate">
                                                    {alert.entity_info?.full_name || 'Unknown Entity'}
                                                </h3>
                                                <span className="text-xs font-medium text-gray-400">ID: {alert.entity_id}</span>
                                            </div>
                                            <p className="text-xs text-gray-500">{alert.entity_info?.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded \${alert.status === 'pending' ? 'bg-yellow-50 text-yellow-600' : alert.status === 'reviewed' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {alert.status}
                                            </span>
                                            <p className="text-[10px] text-gray-400 font-bold mt-2">{new Date(alert.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-[0.5rem] p-3 border border-gray-100">
                                        <p className="text-xs font-medium text-gray-600 line-clamp-2">
                                            <span className="font-bold text-gray-900 mr-2">System Summary:</span>
                                            {alert.explanation}
                                        </p>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            onClick={() => setSelectedAlert(alert)}
                                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-[0.375rem] transition-colors flex items-center gap-2"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> View Deep Dive
                                        </button>
                                        
                                        {alert.status === 'pending' && (
                                            <button
                                                onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                                                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-[0.375rem] transition-colors flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    {/* Load More Button */}
                    {alerts.length > 0 && alerts.length < total && (
                        <div className="flex justify-center pt-6 pb-2">
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={isLoadingMore}
                                className="px-6 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-full transition-colors border border-gray-200 flex items-center gap-2"
                            >
                                {isLoadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isLoadingMore ? 'Loading...' : 'Load 10 More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
            </div>

            {/* Deep Dive Modal */}
            {mounted && selectedAlert && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[1rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-100">
                        <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 p-6 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 \${getScoreColor(selectedAlert.risk_score)} \${selectedAlert.risk_level === 'high' ? 'border-red-100 bg-red-50' : selectedAlert.risk_level === 'medium' ? 'border-orange-100 bg-orange-50' : 'border-emerald-100 bg-emerald-50'}`}>
                                    <span className="text-lg font-black">{selectedAlert.risk_score}</span>
                                </div>
                                <div>
                                    <h2 className="text-lg font-extrabold text-gray-900">System Deep Dive Analysis</h2>
                                    <p className="text-xs font-medium text-gray-500 capitalize">{selectedAlert.account_type} #{selectedAlert.entity_id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                                <ExternalLink className="w-4 h-4 rotate-180" />
                            </button>
                        </div>
                        <div className="p-6 space-y-8">
                            
                            <div className="bg-blue-50/50 border border-blue-100 rounded-[0.75rem] p-5">
                                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Brain className="w-4 h-4" /> System Explanation
                                </h3>
                                <p className="text-sm text-blue-900 leading-relaxed font-medium">
                                    {selectedAlert.explanation}
                                </p>
                            </div>

                            <div>
                                <h3 className="text-sm font-extrabold text-gray-900 mb-4 border-b border-gray-100 pb-2">Triggered Flags</h3>
                                {selectedAlert.flags && selectedAlert.flags.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedAlert.flags.map((flag, idx) => (
                                            <div key={idx} className="flex gap-4 items-start p-3 bg-gray-50 rounded-[0.5rem] border border-gray-100">
                                                <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 \${flag.severity === 'high' ? 'bg-red-500' : flag.severity === 'medium' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900 uppercase mb-1">{flag.type} FLAG</p>
                                                    <p className="text-sm text-gray-600 font-medium">{flag.reason}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No specific flags triggered.</p>
                                )}
                            </div>

                            <div className="bg-gray-900 rounded-[0.75rem] p-6 text-white shadow-inner">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Action Recommendation Engine</h3>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <p className="text-lg font-extrabold text-white">{selectedAlert.recommended_action}</p>
                                </div>
                            </div>
                        </div>
                        <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-end gap-3 rounded-b-[1rem]">
                            {selectedAlert.status !== 'resolved' && (
                                <button
                                    onClick={() => handleUpdateStatus(selectedAlert.id, 'resolved')}
                                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-[0.5rem] transition-colors shadow-lg shadow-emerald-500/20"
                                >
                                    Mark as Resolved
                                </button>
                            )}
                            {selectedAlert.status === 'pending' && (
                                <button
                                    onClick={() => handleUpdateStatus(selectedAlert.id, 'reviewed')}
                                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-[0.5rem] transition-colors"
                                >
                                    Mark as Reviewed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            , document.body)}

            {/* Trigger Analysis Modal */}
            {mounted && isAnalysisModalOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-fade-in">
                    <form onSubmit={handleTriggerAnalysis} className="bg-white rounded-[1rem] shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-50 to-white p-6 border-b border-gray-100">
                            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                <Brain className="w-5 h-5 text-blue-500" />
                                Trigger Manual Analysis
                            </h2>
                            <p className="text-xs font-medium text-gray-500 mt-1">Force the system to evaluate a specific account.</p>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Account Type</label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAnalyzeType('user')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-[0.5rem] transition-all font-bold text-sm \${analyzeType === 'user' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <User className="w-4 h-4" /> User
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAnalyzeType('vendor')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 border rounded-[0.5rem] transition-all font-bold text-sm \${analyzeType === 'vendor' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <Store className="w-4 h-4" /> Vendor
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    {analyzeType === 'user' ? 'User ID or Email' : 'Vendor ID or Email'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={analyzeId}
                                    onChange={(e) => setAnalyzeId(e.target.value)}
                                    placeholder={analyzeType === 'user' ? "e.g. 1045, STQ-USER, or john@stoqle.com" : "e.g. 66 or store@stoqle.com"}
                                    className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsAnalysisModalOpen(false)}
                                className="px-5 py-2.5 text-gray-500 font-bold text-sm hover:bg-gray-200 rounded-[0.5rem] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isAnalyzing || !analyzeId}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-[0.5rem] shadow-lg transition-all flex items-center gap-2"
                            >
                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
                            </button>
                        </div>
                    </form>
                </div>
            , document.body)}
        </>
    );
}
