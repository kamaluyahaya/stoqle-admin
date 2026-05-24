'use client';

import React, { useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShoppingBag,
    CreditCard,
    FileText,
    Settings,
    Bell,
    BarChart3,
    ShieldCheck,
    ChevronLeft,
    LogOut,
    X,
    MapPin,
    MessageSquare
} from 'lucide-react';
import { GlobalLoadingContext } from '@/app/dashboard/layout';

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'User Management', icon: Users, href: '/dashboard/users' },
    { name: 'Product Management', icon: ShoppingBag, href: '/dashboard/products' },
    { name: 'Order Management', icon: ShoppingBag, href: '/dashboard/order' },
    { name: 'Social Management', icon: MessageSquare, href: '/dashboard/social' },
    { name: 'Financials', icon: CreditCard, href: '/dashboard/finance' },
    { name: 'Reports', icon: FileText, href: '/dashboard/reports' },
    { name: 'Activity Log', icon: BarChart3, href: '/dashboard/activity' },
    { name: 'Market Affiliation', icon: MapPin, href: '/dashboard/markets' },
    { name: 'Moderation', icon: ShieldCheck, href: '/dashboard/moderation' },
];

const bottomItems = [
    { name: 'Notifications', icon: Bell, href: '/dashboard/notifications' },
    { name: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { setIsNavigating } = useContext(GlobalLoadingContext);

    const handleNavClick = (href: string) => {
        if (pathname !== href) {
            setIsNavigating(true);
        }
        if (window.innerWidth < 1024) onClose();
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-[var(--sidebar-width)] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col h-full transition-all duration-300 transform lg:translate-x-0 lg:static lg:block",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-2 rounded-full bg-rose-500 flex items-center justify-center font-bold text-white ">
                            stoqle
                        </div>
                    </div>
                    <button
                        className="p-2 rounded-[0.5rem] bg-gray-50 text-gray-400 hover:text-gray-900 lg:hidden transition-colors"
                        onClick={onClose}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
                    <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Core Platform</p>
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => handleNavClick(item.href)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-[0.5rem] text-[13px] font-semibold transition-all duration-200 group",
                                    isActive
                                        ? "bg-rose-50 text-rose-600"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-rose-600" : "text-gray-400 group-hover:text-gray-600")} />
                                {item.name}
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-[0.5rem] bg-rose-600" />}
                            </Link>
                        );
                    })}
                </div>

                <div className="px-4 py-6 border-t border-[var(--sidebar-border)] space-y-1">
                    <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Preferences</p>
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => handleNavClick(item.href)}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-[0.5rem] text-[13px] font-semibold transition-all group",
                                    isActive
                                        ? "bg-rose-50 text-rose-600"
                                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", isActive ? "text-rose-600" : "text-gray-400 group-hover:text-gray-600")} />
                                {item.name}
                            </Link>
                        );
                    })}
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-[0.5rem] text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-all mt-2">
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>

                <div className="p-4 m-4 rounded-[0.5rem] bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[0.5rem] bg-gradient-to-br from-rose-500 to-pink-500 p-0.5 ">
                            <div className="w-full h-full rounded-[0.5rem] bg-white flex items-center justify-center text-xs font-bold text-rose-600">
                                AD
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">Admin User</p>
                            <p className="text-[10px] text-gray-500 font-medium truncate">super_admin</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

// Simple cn utility if not present
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
