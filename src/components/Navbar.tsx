'use client';

import React from 'react';
import { Search, Bell, Moon, Sun, HelpCircle, Menu } from 'lucide-react';

interface NavbarProps {
    onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
    return (
        <header className="h-[var(--topbar-height)] bg-[var(--topbar-bg)] backdrop-blur-md border-b border-[var(--topbar-border)] px-8 flex items-center justify-between sticky top-0 z-30 transition-all">
            <div className="flex items-center gap-6 flex-1">
                <button
                    className="p-2.5 hover:bg-gray-100 rounded-[0.5rem] lg:hidden transition-colors"
                    onClick={onMenuClick}
                >
                    <Menu className="w-5 h-5 text-gray-600" />
                </button>

                <div className="max-w-md w-full relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-rose-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search platform..."
                        className="w-full bg-gray-50 border border-transparent rounded-[0.5rem] py-2.5 pl-11 pr-4 text-[13px] font-medium focus:bg-white focus:border-rose-100 focus:ring-4 focus:ring-rose-500/5 transition-all outline-none"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-[0.5rem] transition-colors relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-[0.5rem] border-2 border-white"></span>
                </button>
                <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-[0.5rem] transition-colors">
                    <HelpCircle className="w-5 h-5" />
                </button>

                <div className="h-8 w-px bg-gray-100 mx-2"></div>

                <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-[0.5rem] transition-colors mr-2">
                    <Sun className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3 pl-3 pr-1 py-1 rounded-[0.5rem] hover:bg-gray-50 transition-all cursor-pointer group border border-transparent hover:border-gray-100">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-gray-900 leading-tight">Admin User</p>
                        <p className="text-[10px] font-medium text-gray-500">Super Admin</p>
                    </div>
                    <div className="w-9 h-9 rounded-[0.5rem] bg-rose-600 flex items-center justify-center text-white font-bold text-xs ">
                        AU
                    </div>
                </div>
            </div>
        </header>
    );
}
