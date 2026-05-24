'use client';

import React, { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import {
    Settings,
    Globe,
    FileText,
    Shield,
    ShoppingBag,
    Plus,
    Trash2,
    Save,
    GripVertical,
    Loader2,
    ChevronDown,
    ChevronUp,
    Info,
    Mail,
    Phone,
    Link,
    AlignLeft,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppConfig {
    config_id?: number;
    app_name?: string;
    app_email?: string;
    app_phone_number?: string;
    app_description?: string;
    support_center_url?: string;
    facebook_link?: string;
    twitter_link?: string;
    instagram_link?: string;
    app_version?: string;
}

interface PolicySection {
    id?: number;
    section_title: string;
    content: string;
    order: number;
    _key: string; // client-side unique key
}

type PolicyType = 'privacy_policy' | 'user_agreement' | 'ecommerce_policies';

type ActiveTab = 'general' | 'user_agreement' | 'privacy_policy' | 'ecommerce';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateKey() {
    return Math.random().toString(36).slice(2, 10);
}

// ─── SectionEditor ────────────────────────────────────────────────────────────

function SectionEditor({
    sections,
    onChange,
}: {
    sections: PolicySection[];
    onChange: (updated: PolicySection[]) => void;
}) {
    const add = () => {
        const updated = [
            ...sections,
            { section_title: '', content: '', order: sections.length, _key: generateKey() },
        ];
        onChange(updated);
    };

    const remove = (key: string) => {
        onChange(sections.filter((s) => s._key !== key).map((s, i) => ({ ...s, order: i })));
    };

    const update = (key: string, field: 'section_title' | 'content', value: string) => {
        onChange(sections.map((s) => (s._key === key ? { ...s, [field]: value } : s)));
    };

    const move = (key: string, direction: 'up' | 'down') => {
        const idx = sections.findIndex((s) => s._key === key);
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sections.length - 1) return;
        const next = [...sections];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
        onChange(next.map((s, i) => ({ ...s, order: i })));
    };

    return (
        <div className="space-y-4">
            {sections.length === 0 && (
                <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-[0.75rem]">
                    <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-bold text-gray-400">No sections yet</p>
                    <p className="text-xs text-gray-300 mt-1">Click "Add Section" to get started</p>
                </div>
            )}
            {sections.map((sec, idx) => (
                <div
                    key={sec._key}
                    className="bg-white border border-gray-100 rounded-[0.75rem] p-5 group hover:border-rose-100 transition-all shadow-sm"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1 pt-1 text-gray-300">
                            <GripVertical className="w-4 h-4 cursor-grab" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-500 text-[10px] font-black shrink-0">
                                    {idx + 1}
                                </span>
                                <input
                                    type="text"
                                    value={sec.section_title}
                                    onChange={(e) => update(sec._key, 'section_title', e.target.value)}
                                    placeholder="Section title..."
                                    className="flex-1 text-sm font-bold text-gray-800 border-0 outline-none bg-transparent placeholder:text-gray-300 placeholder:font-medium"
                                />
                            </div>
                            <textarea
                                value={sec.content}
                                onChange={(e) => update(sec._key, 'content', e.target.value)}
                                placeholder="Write the section content here..."
                                rows={5}
                                className="w-full text-sm text-gray-600 font-medium border border-gray-100 rounded-[0.5rem] p-3 resize-y outline-none focus:border-rose-200 focus:ring-4 focus:ring-rose-500/5 transition-all leading-relaxed"
                            />
                        </div>
                        <div className="flex flex-col gap-1 pt-1">
                            <button
                                onClick={() => move(sec._key, 'up')}
                                disabled={idx === 0}
                                className="p-1.5 rounded-[0.375rem] text-gray-300 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"
                                title="Move up"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => move(sec._key, 'down')}
                                disabled={idx === sections.length - 1}
                                className="p-1.5 rounded-[0.375rem] text-gray-300 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"
                                title="Move down"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => remove(sec._key)}
                                className="p-1.5 rounded-[0.375rem] text-gray-200 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                title="Delete section"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            <button
                onClick={add}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-[0.75rem] text-sm font-bold text-gray-400 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/50 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Section
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('general');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // General
    const [appConfig, setAppConfig] = useState<AppConfig>({});

    // Policy sections
    const [userAgreement, setUserAgreement] = useState<PolicySection[]>([]);
    const [privacyPolicy, setPrivacyPolicy] = useState<PolicySection[]>([]);
    const [ecommercePolicies, setEcommercePolicies] = useState<PolicySection[]>([]);

    // ── Fetch all settings ────────────────────────────────────────────────────
    const fetchSettings = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await api.get('/platform/settings');
            if (res.data.success) {
                const { appConfig: cfg, userAgreement: ua, privacyPolicy: pp, ecommercePolicies: ec } = res.data.data;
                setAppConfig(cfg || {});
                setUserAgreement(ua.map((s: any) => ({ ...s, _key: generateKey() })));
                setPrivacyPolicy(pp.map((s: any) => ({ ...s, _key: generateKey() })));
                setEcommercePolicies(ec.map((s: any) => ({ ...s, _key: generateKey() })));
            }
        } catch {
            toast.error('Failed to load platform settings.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // ── Save General Config ───────────────────────────────────────────────────
    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            await api.put('/platform/settings/config', appConfig);
            toast.success('Platform configuration saved!');
        } catch {
            toast.error('Failed to save configuration.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Save Policy Sections ──────────────────────────────────────────────────
    const handleSaveSections = async (type: PolicyType, sections: PolicySection[]) => {
        setIsSaving(true);
        try {
            await api.put(`/platform/settings/policy/${type}`, { sections });
            toast.success('Policy sections saved!');
        } catch {
            toast.error('Failed to save policy sections.');
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Tabs definition ──────────────────────────────────────────────────────
    const tabs = [
        { id: 'general' as ActiveTab, label: 'General', icon: Globe },
        { id: 'user_agreement' as ActiveTab, label: 'User Agreement', icon: FileText },
        { id: 'privacy_policy' as ActiveTab, label: 'Privacy Policy', icon: Shield },
        { id: 'ecommerce' as ActiveTab, label: 'E-Commerce Policies', icon: ShoppingBag },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                    <p className="text-sm font-bold text-gray-400">Loading settings…</p>
                </div>
            </div>
        );
    }

    return (
        <div className=" mx-auto space-y-8 pb-16">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <Settings className="w-5 h-5 text-rose-500" />
                        Platform Settings
                    </h1>
                    <p className="text-xs font-medium text-gray-400 mt-1">
                        Manage global platform policies, content, and configuration.
                    </p>
                </div>
            </div>

            {/* Tab Nav */}
            <div className="flex items-center gap-1 bg-gray-50/80 p-1.5 rounded-[0.75rem] border border-gray-100 w-fit">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-[0.5rem] text-[13px] font-bold transition-all duration-200 whitespace-nowrap ${isActive
                                ? 'bg-white text-rose-600 shadow-sm border border-gray-100'
                                : 'text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-rose-500' : ''}`} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── General Tab ──────────────────────────────────────────────────── */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Config */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Identity */}
                        <div className="bg-white border border-gray-100 rounded-[0.75rem] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-[0.5rem] bg-rose-50 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-rose-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-extrabold text-gray-900">Platform Identity</h2>
                                    <p className="text-[11px] text-gray-400 font-medium">App name, version, and description</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">App Name</label>
                                        <input
                                            type="text"
                                            value={appConfig.app_name || ''}
                                            onChange={(e) => setAppConfig({ ...appConfig, app_name: e.target.value })}
                                            placeholder="Stoqle"
                                            className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">App Version</label>
                                        <input
                                            type="text"
                                            value={appConfig.app_version || ''}
                                            onChange={(e) => setAppConfig({ ...appConfig, app_version: e.target.value })}
                                            placeholder="1.0.0"
                                            className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                                        <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3" /> About the Platform</span>
                                    </label>
                                    <textarea
                                        value={appConfig.app_description || ''}
                                        onChange={(e) => setAppConfig({ ...appConfig, app_description: e.target.value })}
                                        placeholder="Describe what Stoqle is about..."
                                        rows={5}
                                        className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium resize-y focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-white border border-gray-100 rounded-[0.75rem] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-[0.5rem] bg-blue-50 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-extrabold text-gray-900">Contact Details</h2>
                                    <p className="text-[11px] text-gray-400 font-medium">Official email and phone number</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Mail className="w-3 h-3" /> App Email
                                    </label>
                                    <input
                                        type="email"
                                        value={appConfig.app_email || ''}
                                        onChange={(e) => setAppConfig({ ...appConfig, app_email: e.target.value })}
                                        placeholder="support@stoqle.com"
                                        className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={appConfig.app_phone_number || ''}
                                        onChange={(e) => setAppConfig({ ...appConfig, app_phone_number: e.target.value })}
                                        placeholder="+234..."
                                        className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Link className="w-3 h-3" /> Support Center URL
                                    </label>
                                    <input
                                        type="url"
                                        value={appConfig.support_center_url || ''}
                                        onChange={(e) => setAppConfig({ ...appConfig, support_center_url: e.target.value })}
                                        placeholder="https://support.stoqle.com"
                                        className="w-full border border-gray-200 rounded-[0.5rem] px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Social Links */}
                        <div className="bg-white border border-gray-100 rounded-[0.75rem] p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 rounded-[0.5rem] bg-violet-50 flex items-center justify-center">
                                    <Link className="w-4 h-4 text-violet-500" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-extrabold text-gray-900">Social Media Links</h2>
                                    <p className="text-[11px] text-gray-400 font-medium">Official Stoqle social accounts</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {[
                                    { key: 'facebook_link', label: 'Facebook', placeholder: 'https://facebook.com/stoqle' },
                                    { key: 'twitter_link', label: 'Twitter / X', placeholder: 'https://x.com/stoqle' },
                                    { key: 'instagram_link', label: 'Instagram', placeholder: 'https://instagram.com/stoqle' },
                                ].map((field) => (
                                    <div key={field.key} className="flex items-center gap-3">
                                        <label className="w-28 text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">{field.label}</label>
                                        <input
                                            type="url"
                                            value={(appConfig as any)[field.key] || ''}
                                            onChange={(e) => setAppConfig({ ...appConfig, [field.key]: e.target.value })}
                                            placeholder={field.placeholder}
                                            className="flex-1 border border-gray-200 rounded-[0.5rem] px-4 py-2.5 text-sm font-medium focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 outline-none transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-rose-500 rounded-[0.75rem] p-6 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-[0.5rem] bg-white/20 flex items-center justify-center mb-4">
                                    <Info className="w-5 h-5" />
                                </div>
                                <h3 className="font-extrabold text-base mb-2">General Config</h3>
                                <p className="text-rose-100 text-xs font-medium leading-relaxed">
                                    These settings define the public-facing identity of the Stoqle platform. Changes here may reflect on the mobile app and web.
                                </p>
                            </div>
                            <div className="absolute right-[-40px] bottom-[-40px] w-40 h-40 bg-white/5 rounded-full" />
                        </div>
                        <button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-sm rounded-[0.75rem] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-[0.99]"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving…' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Policy Editor Tabs ────────────────────────────────────────────── */}
            {(activeTab === 'user_agreement' || activeTab === 'privacy_policy' || activeTab === 'ecommerce') && (() => {
                const config: Record<string, {
                    label: string; subtitle: string; icon: React.ElementType; color: string;
                    bg: string; sections: PolicySection[]; setSections: (s: PolicySection[]) => void;
                    type: PolicyType;
                }> = {
                    user_agreement: {
                        label: 'User Agreement', subtitle: 'Define the terms users accept when signing up to Stoqle.',
                        icon: FileText, color: 'text-blue-500', bg: 'bg-blue-50',
                        sections: userAgreement, setSections: setUserAgreement, type: 'user_agreement'
                    },
                    privacy_policy: {
                        label: 'Privacy Policy', subtitle: 'Detail how user data is collected, used, and protected.',
                        icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50',
                        sections: privacyPolicy, setSections: setPrivacyPolicy, type: 'privacy_policy'
                    },
                    ecommerce: {
                        label: 'E-Commerce Policies', subtitle: 'Set platform-wide shipping rules, return policies, and more.',
                        icon: ShoppingBag, color: 'text-violet-500', bg: 'bg-violet-50',
                        sections: ecommercePolicies, setSections: setEcommercePolicies, type: 'ecommerce_policies'
                    },
                };
                const c = config[activeTab];
                const Icon = c.icon;
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-8 h-8 rounded-[0.5rem] ${c.bg} flex items-center justify-center`}>
                                    <Icon className={`w-4 h-4 ${c.color}`} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-extrabold text-gray-900">{c.label}</h2>
                                    <p className="text-[11px] text-gray-400 font-medium">{c.subtitle}</p>
                                </div>
                                <span className="ml-auto text-xs font-bold text-gray-400">
                                    {c.sections.length} section{c.sections.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <SectionEditor sections={c.sections} onChange={c.setSections} />
                        </div>

                        <div className="space-y-4">
                            <div className={`${c.bg} border border-gray-100 rounded-[0.75rem] p-5`}>
                                <Icon className={`w-6 h-6 ${c.color} mb-3`} />
                                <h3 className="font-extrabold text-gray-800 text-sm mb-1">{c.label}</h3>
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">{c.subtitle}</p>
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tips</p>
                                    <p className="text-[11px] text-gray-500">• Use clear, numbered sections for readability</p>
                                    <p className="text-[11px] text-gray-500">• Reorder sections using the ↑ ↓ arrows</p>
                                    <p className="text-[11px] text-gray-500">• Changes are immediately reflected on mobile</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleSaveSections(c.type, c.sections)}
                                disabled={isSaving}
                                className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-sm rounded-[0.75rem] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 active:scale-[0.99]"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Saving…' : `Save ${c.label}`}
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
