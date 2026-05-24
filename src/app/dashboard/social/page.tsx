'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import api from '@/lib/api';
import StoqleLoader from '@/components/StoqleLoader';
import {
    MessageSquare,
    Search,
    Heart,
    MessageCircle,
    ExternalLink,
    Edit,
    TrendingUp,
    Image as ImageIcon,
    ArrowUpRight,
    ChevronDown,
    Grid,
    List,
    Loader2,
    Share2,
    EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SocialPost {
    post_id: number;
    content: string;
    media_type: string;
    media_url?: string;
    subtitle?: string;
    status: 'ready' | 'disabled' | 'processing' | 'failed' | string;
    created_at: string;
    likes_count: number;
    comments_count: number;
}

interface SocialUser {
    user_id: number;
    name: string;
    email: string;
    avatar?: string;
    account_status: string;
    total_posts: number;
    total_followers: number;
    latest_post_date: string;
}

interface UserPostState {
    posts: SocialPost[];
    page: number;
    total: number;
    isLoading: boolean;
    hasLoaded: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_PAGE_SIZE = 10;
const POST_PAGE_SIZE = 8;

// ─── Formatter ───────────────────────────────────────────────────────────────

function formatNumber(num: number) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ─── UserSkeleton ───────────────────────────────────────────────────────────

const UserSkeleton = memo(function UserSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-[0.75rem] px-5 py-4 flex items-center gap-4 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                        <div className="h-3 bg-gray-100 rounded w-1/5" />
                    </div>
                    <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                </div>
            ))}
        </div>
    );
});

// ─── PostCard (grid) ───────────────────────────────────────────────────────

interface PostCardProps {
    post: SocialPost;
    user: SocialUser;
    activeDropdown: number | null;
    setActiveDropdown: (id: number | null) => void;
    onStatusToggle: (post: SocialPost, user: SocialUser) => void;
}

const PostCard = memo(function PostCard({
    post, user, activeDropdown, setActiveDropdown, onStatusToggle
}: PostCardProps) {
    return (
        <div className="group bg-gray-50/50 border border-gray-100 rounded-[0.5rem] hover:border-blue-100 transition-all duration-500">
            <div className="relative aspect-square bg-white rounded-t-[0.5rem] flex items-center justify-center overflow-hidden">
                {post.media_url ? (
                    <img src={post.media_url} alt="Post media" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                    <ImageIcon className="w-14 h-14 text-gray-100 group-hover:scale-110 group-hover:text-gray-200 transition-all duration-700" />
                )}
                {post.status === 'disabled' && (
                    <div className="absolute top-3 left-3">
                        <span className="bg-red-500 text-white p-1.5 rounded-[0.375rem] flex items-center gap-1 text-[10px] font-bold">
                            <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-all duration-500 flex items-center justify-center">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                        <button className="w-10 h-10 rounded-[0.5rem] bg-white text-gray-900 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all shadow active:scale-95">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="p-3">
                <p className="font-medium text-gray-600 tracking-tight text-[12px] leading-snug overflow-hidden mb-3"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', height: '32px' }}>
                    {post.content || post.subtitle || 'No content provided.'}
                </p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-3 text-gray-400">
                        <div className="flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{formatNumber(post.likes_count)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">{formatNumber(post.comments_count)}</span>
                        </div>
                    </div>
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === post.post_id ? null : post.post_id); }}
                            className="px-2 py-1 text-[10px] font-extrabold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-[0.375rem] transition-all"
                        >
                            Manage
                        </button>
                        {activeDropdown === post.post_id && (
                            <div className="absolute right-0 bottom-full mb-1.5 w-40 bg-white border border-gray-100 rounded-[0.5rem] shadow-xl z-20 py-1 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => { setActiveDropdown(null); onStatusToggle(post, user); }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${post.status === 'disabled' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}
                                >
                                    {post.status === 'disabled' ? 'Restore Post' : 'Hide Post'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

// ─── PostRow (table) ───────────────────────────────────────────────────────

interface PostRowProps {
    post: SocialPost;
    user: SocialUser;
    activeDropdown: number | null;
    setActiveDropdown: (id: number | null) => void;
    onStatusToggle: (post: SocialPost, user: SocialUser) => void;
}

const PostRow = memo(function PostRow({
    post, user, activeDropdown, setActiveDropdown, onStatusToggle
}: PostRowProps) {
    return (
        <tr className="hover:bg-gray-50/50 transition-colors">
            <td className="px-5 py-2 w-[40%]">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-[0.375rem] bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center relative group/img">
                        {post.media_url ? (
                            <img src={post.media_url} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" alt="Post media" />
                        ) : (
                            <ImageIcon className="w-5 h-5 text-gray-300" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-gray-600 text-[11px] line-clamp-2 pr-4" title={post.content}>{post.content || post.subtitle || 'No content'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {new Date(post.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
            </td>
            <td className="px-5 py-3">
                <div className="flex items-center gap-4 text-gray-500">
                    <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-bold">{formatNumber(post.likes_count)}</span></div>
                    <div className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-bold">{formatNumber(post.comments_count)}</span></div>
                </div>
            </td>
            <td className="px-5 py-3 text-right relative">
                <div className="relative inline-block">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === post.post_id ? null : post.post_id); }}
                        className="px-2.5 py-1.5 text-[10px] font-extrabold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-[0.375rem] uppercase tracking-wider transition-all"
                    >
                        Manage
                    </button>
                    {activeDropdown === post.post_id && (
                        <div className="absolute right-0 bottom-full mb-1.5 w-40 bg-white border border-gray-100 rounded-[0.5rem] shadow-xl z-20 py-1 overflow-hidden text-left" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => { setActiveDropdown(null); onStatusToggle(post, user); }}
                                className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${post.status === 'disabled' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'}`}
                            >
                                {post.status === 'disabled' ? 'Restore Post' : 'Hide Post'}
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );
});

// ─── UserAccordion ──────────────────────────────────────────────────────────

interface UserAccordionProps {
    user: SocialUser;
    isOpen: boolean;
    upState: UserPostState | undefined;
    viewMode: 'grid' | 'table';
    activeDropdown: number | null;
    setActiveDropdown: (id: number | null) => void;
    onToggle: (user: SocialUser) => void;
    onLoadMore: (user: SocialUser, nextPage: number) => void;
    onStatusToggle: (post: SocialPost, user: SocialUser) => void;
}

const UserAccordion = memo(function UserAccordion({
    user, isOpen, upState, viewMode, activeDropdown, setActiveDropdown,
    onToggle, onLoadMore, onStatusToggle
}: UserAccordionProps) {
    const hasMore = upState ? upState.posts.length < upState.total : false;

    return (
        <div className="bg-white border border-gray-100 rounded-[0.75rem] overflow-hidden shadow-sm">
            {/* User header */}
            <button
                onClick={() => onToggle(user)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left"
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {user.avatar ? (
                        <img src={user.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-gray-100 shrink-0" alt={user.name} />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-extrabold text-sm border-2 border-blue-100 shrink-0">
                            {user.name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-extrabold text-gray-900 text-sm truncate">{user.name}</p>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded uppercase tracking-widest">{user.account_status}</span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">{user.email}</p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 shrink-0 mr-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Posts</p>
                        <p className="text-xs font-black text-gray-700">{formatNumber(user.total_posts)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Followers</p>
                        <p className="text-xs font-black text-gray-700">{formatNumber(user.total_followers)}</p>
                    </div>
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 ${isOpen ? 'bg-blue-50 text-blue-500' : 'bg-gray-50 text-gray-400'}`}>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Posts panel */}
            {isOpen && (
                <div className="border-t border-gray-50">
                    {upState?.isLoading && !upState?.hasLoaded ? (
                        <div className="p-6 flex flex-col items-center gap-3">
                            <StoqleLoader size={24} />
                            <p className="text-xs font-bold text-gray-400">Loading posts…</p>
                        </div>
                    ) : upState?.hasLoaded && upState.posts.length === 0 ? (
                        <div className="py-10 text-center">
                            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-xs font-bold text-gray-400">No posts found for this user</p>
                        </div>
                    ) : upState?.hasLoaded ? (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="p-4 bg-gray-50/30 animate-fade-in">
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {upState.posts.map(post => (
                                            <PostCard
                                                key={post.post_id}
                                                post={post}
                                                user={user}
                                                activeDropdown={activeDropdown}
                                                setActiveDropdown={setActiveDropdown}
                                                onStatusToggle={onStatusToggle}
                                            />
                                        ))}
                                    </div>
                                    {hasMore && (
                                        <div className="mt-4 flex items-center justify-center">
                                            <button
                                                onClick={() => onLoadMore(user, upState.page + 1)}
                                                disabled={upState.isLoading}
                                                className="flex items-center gap-2 px-6 py-2 text-xs font-extrabold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-100 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {upState.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                View more posts
                                                <span className="text-[10px] font-bold text-blue-300">({upState.total - upState.posts.length} remaining)</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="overflow-x-auto bg-gray-50/30">
                                        <table className="w-full text-sm text-left table-fixed min-w-[500px]">
                                            <thead>
                                                <tr className="bg-gray-50/60 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    <th className="px-5 py-3 w-[50%]">Content</th>
                                                    <th className="px-5 py-3 w-[25%]">Engagement</th>
                                                    <th className="px-5 py-3 w-[25%] text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {upState.posts.map(post => (
                                                    <PostRow
                                                        key={post.post_id}
                                                        post={post}
                                                        user={user}
                                                        activeDropdown={activeDropdown}
                                                        setActiveDropdown={setActiveDropdown}
                                                        onStatusToggle={onStatusToggle}
                                                    />
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {hasMore && (
                                        <div className="px-5 py-3 border-t border-gray-50 flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-gray-400">
                                                Showing {upState.posts.length} of {upState.total} posts
                                            </p>
                                            <button
                                                onClick={() => onLoadMore(user, upState.page + 1)}
                                                disabled={upState.isLoading}
                                                className="flex items-center gap-2 px-5 py-2 text-xs font-extrabold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-100 transition-all active:scale-95 disabled:opacity-60"
                                            >
                                                {upState.isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                                View more posts
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SocialPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

    const [users, setUsers] = useState<SocialUser[]>([]);
    const [userPage, setUserPage] = useState(1);
    const [userTotal, setUserTotal] = useState(0);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingMoreUsers, setIsLoadingMoreUsers] = useState(false);

    const [userPosts, setUserPosts] = useState<Map<number, UserPostState>>(new Map());
    const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Close dropdowns on outside click
    useEffect(() => {
        const close = () => setActiveDropdown(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    // ── Fetch users ─────────────────────────────────────────────────────────
    const fetchUsers = useCallback(async (page: number, append = false) => {
        if (append) setIsLoadingMoreUsers(true);
        else setIsLoadingUsers(true);
        try {
            const res = await api.get('/social/users', {
                params: { page, limit: USER_PAGE_SIZE, search: debouncedSearch }
            });
            if (res.data.success) {
                const { users: fetched, pagination } = res.data.data;
                setUsers(prev => append ? [...prev, ...fetched] : fetched);
                setUserTotal(pagination.total);
                setUserPage(page);
            }
        } catch { toast.error('Failed to load social users.'); }
        finally {
            setIsLoadingUsers(false);
            setIsLoadingMoreUsers(false);
        }
    }, [debouncedSearch]);

    // Reset + re-fetch users when filters change
    useEffect(() => {
        setUsers([]);
        setExpandedUsers(new Set());
        setUserPosts(new Map());
        fetchUsers(1, false);
    }, [debouncedSearch, fetchUsers]);

    // ── Fetch posts for a user ───────────────────────────────────────────
    const fetchUserPosts = useCallback(async (user: SocialUser, page: number) => {
        const uid = user.user_id;
        setUserPosts(prev => {
            const next = new Map(prev);
            const existing = next.get(uid) ?? { posts: [], page: 0, total: 0, isLoading: false, hasLoaded: false };
            next.set(uid, { ...existing, isLoading: true });
            return next;
        });
        try {
            const params: Record<string, any> = { page, limit: POST_PAGE_SIZE };
            const res = await api.get(`/social/users/${uid}/posts`, { params });
            if (res.data.success) {
                const { posts: fetched, pagination } = res.data.data;
                setUserPosts(prev => {
                    const next = new Map(prev);
                    const existing = next.get(uid) ?? { posts: [], page: 0, total: 0, isLoading: false, hasLoaded: false };
                    next.set(uid, {
                        posts: page === 1 ? fetched : [...existing.posts, ...fetched],
                        page, total: pagination.total, isLoading: false, hasLoaded: true,
                    });
                    return next;
                });
            }
        } catch {
            toast.error(`Failed to load posts for ${user.name}`);
            setUserPosts(prev => {
                const next = new Map(prev);
                const existing = next.get(uid);
                if (existing) next.set(uid, { ...existing, isLoading: false });
                return next;
            });
        }
    }, []);

    // ── Toggle user ─────────────────────────────────────────────────────────
    const toggleUser = useCallback((user: SocialUser) => {
        const uid = user.user_id;
        setExpandedUsers(prev => {
            const next = new Set(prev);
            if (next.has(uid)) {
                next.delete(uid);
            } else {
                next.add(uid);
                setUserPosts(up => {
                    const state = up.get(uid);
                    if (!state?.hasLoaded && !state?.isLoading) {
                        setTimeout(() => fetchUserPosts(user, 1), 0);
                    }
                    return up;
                });
            }
            return next;
        });
    }, [fetchUserPosts]);

    // ── Status toggle ─────────────────────────────────────────────────────────
    const handleStatusToggle = useCallback(async (post: SocialPost, user: SocialUser) => {
        const isHidden = post.status === 'disabled';
        try {
            const res = await api.patch(`/social/posts/${post.post_id}/status`, { status: isHidden ? 'ready' : 'disabled' });
            if (res.data.success) {
                toast.success(`Post ${isHidden ? 'restored' : 'hidden'} successfully`);
                fetchUserPosts(user, 1);
            }
        } catch { toast.error('Failed to update post status'); }
    }, [fetchUserPosts]);

    const hasMoreUsers = users.length < userTotal;

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="max-w-[1600px] mx-auto space-y-10 pb-12">
            {/* Header */}
            <div>
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Social Management</h1>
                <p className="text-sm font-medium text-gray-500 mt-1">Manage platform posts, media, and creator activity.</p>
            </div>

            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row items-center gap-6">
                <div className="flex-1 w-full relative group">
                    {searchQuery !== debouncedSearch
                        ? <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                        : <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" />
                    }
                    <input
                        type="text"
                        placeholder="Search by name, email..."
                        className="w-full bg-white border border-gray-100 rounded-[0.5rem] py-3.5 pl-12 pr-4 text-sm font-medium focus:border-blue-100 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-[0.5rem] border border-gray-100 shrink-0">
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-[0.375rem] transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title="Grid View">
                            <Grid className="w-4 h-4" />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`p-2 rounded-[0.375rem] transition-all ${viewMode === 'table' ? 'bg-blue-50 text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} title="Table View">
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* User List */}
            {isLoadingUsers ? (
                <UserSkeleton />
            ) : users.length === 0 ? (
                <div className="py-24 text-center">
                    <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-400">No social users found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Summary + expand/collapse controls */}
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400">
                            {users.length} of {userTotal} creator{userTotal !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const allIds = new Set(users.map(u => u.user_id));
                                    setExpandedUsers(allIds);
                                    users.forEach(u => {
                                        const state = userPosts.get(u.user_id);
                                        if (!state?.hasLoaded && !state?.isLoading) fetchUserPosts(u, 1);
                                    });
                                }}
                                className="text-[11px] font-bold text-gray-400 hover:text-blue-500 transition-colors px-3 py-1.5 rounded-[0.375rem] hover:bg-blue-50"
                            >
                                Expand all
                            </button>
                            <span className="text-gray-200">|</span>
                            <button
                                onClick={() => setExpandedUsers(new Set())}
                                className="text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-[0.375rem] hover:bg-gray-50"
                            >
                                Collapse all
                            </button>
                        </div>
                    </div>

                    {/* User accordion rows */}
                    <div className="space-y-3">
                        {users.map(user => (
                            <UserAccordion
                                key={user.user_id}
                                user={user}
                                isOpen={expandedUsers.has(user.user_id)}
                                upState={userPosts.get(user.user_id)}
                                viewMode={viewMode}
                                activeDropdown={activeDropdown}
                                setActiveDropdown={setActiveDropdown}
                                onToggle={toggleUser}
                                onLoadMore={fetchUserPosts}
                                onStatusToggle={handleStatusToggle}
                            />
                        ))}
                    </div>

                    {/* Load more users */}
                    {hasMoreUsers && (
                        <div className="flex justify-center pt-2">
                            <button
                                disabled={isLoadingMoreUsers}
                                onClick={() => fetchUsers(userPage + 1, true)}
                                className="px-10 py-3 bg-blue-500 hover:bg-blue-600 active:scale-95 disabled:opacity-80 text-white font-extrabold text-xs rounded-full shadow-[0_4px_14px_rgba(59,130,246,0.35)] transition-all flex items-center gap-2"
                            >
                                {isLoadingMoreUsers
                                    ? <StoqleLoader size={16} className="[&_circle]:stroke-white" />
                                    : <span>Load more creators ({userTotal - users.length} remaining)</span>
                                }
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
