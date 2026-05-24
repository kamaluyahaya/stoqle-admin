'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await api.post('/auth/login', { email, password });
            if (response.data.success) {
                toast.success('Access Granted. Welcome back!');
                const params = new URLSearchParams(window.location.search);
                let from = params.get('from') || '/dashboard';
                if (from === '/' || !from.startsWith('/')) {
                    from = '/dashboard';
                }
                window.location.href = from;
            } else {
                toast.error(response.data.message || 'Invalid credentials');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Security verification failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fbfcfd] relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-100/30 rounded-[0.5rem] blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-rose-50/50 rounded-[0.5rem] blur-[100px] -ml-64 -mb-64" />

            <div className="w-full max-w-[440px] p-4 relative z-10">
                <div className="bg-white border border-gray-100 rounded-[0.5rem] p-10">
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-[0.5rem] ">
                            <span className="text-xl py-1 px-3 rounded-full font-extrabold text-white tracking-tighter bg-rose-500">stoqle</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">stoqle admin</h1>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
                                    Admin Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
                                    <input
                                        type="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-[0.5rem] py-4 pl-12 pr-4 outline-none focus:bg-white focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 transition-all placeholder:text-gray-300 font-medium text-sm"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                                        Password
                                    </label>
                                    <button type="button" className="text-[10px] font-bold text-rose-500 hover:underline">
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 group-focus-within:text-rose-500 transition-colors" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full bg-gray-50 border border-gray-100 text-gray-900 rounded-[0.5rem] py-4 pl-12 pr-4 outline-none focus:bg-white focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 transition-all placeholder:text-gray-300 font-medium text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-[0.5rem] flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group mt-8"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span className="text-[15px]">Sign into Dashboard</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-gray-50">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                            <ShieldCheck className="w-4 h-4" />
                            <p className="text-[10px] font-bold uppercase tracking-tighter">Secure Enterprise Access</p>
                        </div>
                    </div>
                </div>

                <p className="text-center mt-8 text-[11px] font-semibold text-gray-400">
                    Stoqle Platform v2.4.0 &copy; 2026. All rights reserved.
                </p>
            </div>
        </div>
    );
}
