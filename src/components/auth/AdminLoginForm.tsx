'use client';

import { useState, FormEvent } from 'react';
import { toast } from 'sonner';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Eye, EyeOff, Shield, Lock, Mail } from 'lucide-react';

export default function AdminLoginForm() {
 const { login } = useAdminAuth();
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [showPwd, setShowPwd] = useState(false);
 const [loading, setLoading] = useState(false);

 async function handleSubmit(e: FormEvent) {
 e.preventDefault();
 if (!email || !password) {
 toast.error('Please enter your email and password.');
 return;
 }
 setLoading(true);
 try {
 await login(email, password);
 toast.success('Welcome back!');
 } catch (err: unknown) {
 const msg =
 (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
 'Invalid credentials. Please try again.';
 toast.error(msg);
 } finally {
 setLoading(false);
 }
 }

 return (
 <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
 {/* Email */}
 <div>
 <label htmlFor="admin-email" style={labelStyle}>Email address</label>
 <div style={inputWrapStyle}>
 <Mail size={15} style={iconStyle} />
 <input
 id="admin-email"
 type="email"
 className="input"
 style={{ paddingLeft: 38 }}
 placeholder="admin@stoqle.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 autoComplete="email"
 required
 />
 </div>
 </div>

 {/* Password */}
 <div>
 <label htmlFor="admin-password" style={labelStyle}>Password</label>
 <div style={inputWrapStyle}>
 <Lock size={15} style={iconStyle} />
 <input
 id="admin-password"
 type={showPwd ? 'text' : 'password'}
 className="input"
 style={{ paddingLeft: 38, paddingRight: 40 }}
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 autoComplete="current-password"
 required
 />
 <button
 type="button"
 onClick={() => setShowPwd(!showPwd)}
 style={eyeBtnStyle}
 tabIndex={-1}
 aria-label={showPwd ? 'Hide password' : 'Show password'}
 >
 {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
 </button>
 </div>
 </div>

 {/* Submit */}
 <button
 id="admin-login-btn"
 type="submit"
 className="btn btn-primary"
 style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4 }}
 disabled={loading}
 >
 {loading ? (
 <>
 <span style={spinnerStyle} />
 Signing in…
 </>
 ) : (
 <>
 <Shield size={15} />
 Sign in to Admin
 </>
 )}
 </button>
 </form>
 );
}

const labelStyle: React.CSSProperties = {
 display: 'block',
 marginBottom: 6,
 fontSize: 13,
 fontWeight: 500,
 color: 'var(--text-primary)',
};

const inputWrapStyle: React.CSSProperties = {
 position: 'relative',
};

const iconStyle: React.CSSProperties = {
 position: 'absolute',
 left: 12,
 top: '50%',
 transform: 'translateY(-50%)',
 color: 'var(--text-muted)',
 pointerEvents: 'none',
};

const eyeBtnStyle: React.CSSProperties = {
 position: 'absolute',
 right: 10,
 top: '50%',
 transform: 'translateY(-50%)',
 background: 'none',
 border: 'none',
 cursor: 'pointer',
 color: 'var(--text-muted)',
 padding: 4,
 display: 'flex',
 alignItems: 'center',
};

const spinnerStyle: React.CSSProperties = {
 width: 14,
 height: 14,
 border: '2px solid rgba(255,255,255,0.3)',
 borderTopColor: '#fff',
 borderRadius: '50%',
 display: 'inline-block',
 animation: 'spin 0.6s linear infinite',
};
