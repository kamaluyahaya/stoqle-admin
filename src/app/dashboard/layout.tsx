'use client';

import React, { createContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import StoqleLoader from '@/components/StoqleLoader';
import { Toaster, toast } from 'sonner';
import { io } from 'socket.io-client';

export const GlobalLoadingContext = createContext({
    isNavigating: false,
    setIsNavigating: (val: boolean) => { },
});

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        // When pathname changes, navigation is complete
        setIsNavigating(false);
    }, [pathname]);

    useEffect(() => {
        // Setup global socket connection for background tasks
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const socket = io(backendUrl.replace('/api/admin', '')); // adjust depending on how base URL is configured

        socket.on('connect', () => {
            console.log('Connected to global websocket for background events');
        });

        socket.on('global_analysis_complete', (data) => {
            // Play sound
            const audio = new Audio('/sound/credited.mp3');
            audio.play().catch(e => console.error('Audio play failed:', e));
            
            // Show global toast
            toast.success(`System-Wide Analysis Complete! \${data?.alertsGenerated || 0} high/medium alerts generated.`, {
                duration: 5000,
            });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return (
        <GlobalLoadingContext.Provider value={{ isNavigating, setIsNavigating }}>
            <div className="page-wrapper bg-slate-100 relative">
                {/* Center Loader */}
                {isNavigating && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300">
                        <StoqleLoader size={30} />
                    </div>
                )}
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="main-content">
                    <Navbar onMenuClick={() => setIsSidebarOpen(true)} />
                    <main className="page-body">
                        <div className="max-w-[1600px] mx-auto animate-fade-in">
                            {children}
                        </div>
                    </main>
                </div>
                <Toaster position="top-right" richColors />
            </div>
        </GlobalLoadingContext.Provider>
    );
}
