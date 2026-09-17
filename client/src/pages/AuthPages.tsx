import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/api';
import { Notice } from '../components/Notice';

export function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [email, setEmail] = useState('staff@cafepoints.demo'); const [password, setPassword] = useState('DemoPass123!'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setBusy(true); try { await login(email, password); navigate((location.state as { from?: string } | null)?.from || '/app', { replace: true }); } catch (e) { setError(e instanceof ApiError ? e.message : 'Unable to sign in.'); } finally { setBusy(false); } }
  return <AuthLayout title="Welcome back" subtitle="Open the counter workspace and keep every balance in sync."><form className="auth-form" onSubmit={submit}>{error && <Notice kind="error">{error}</Notice>}<label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label><button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button><p className="form-help">Demo: <strong>staff@cafepoints.demo</strong> / <strong>DemoPass123!</strong></p><p className="switch-auth">Need an account? <Link to="/register">Register staff access</Link></p></form></AuthLayout>;
}

export function RegisterPage() {
  const { register } = useAuth(); const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setBusy(true); try { await register(form.name, form.email, form.password, form.confirmPassword); navigate('/app', { replace: true }); } catch (e) { setError(e instanceof ApiError ? e.message : 'Unable to create account.'); } finally { setBusy(false); } }
  return <AuthLayout title="Create staff access" subtitle="A simple account is enough to operate the counter."><form className="auth-form" onSubmit={submit}>{error && <Notice kind="error">{error}</Notice>}<label>Name<input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label><label>Email<input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></label><div className="two-col"><label>Password<input type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" /></label><label>Confirm password<input type="password" minLength={8} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required autoComplete="new-password" /></label></div><button className="button primary full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button><p className="switch-auth">Already have access? <Link to="/login">Sign in</Link></p></form></AuthLayout>;
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="auth-page"><div className="auth-side"><Link to="/" className="brand on-dark"><span className="brand-mark">CP</span><div><strong>CaféPoints</strong><small>Counter console</small></div></Link><div><span className="eyebrow">Accuracy by design</span><h1>One source of truth for every point.</h1><p>Purchase, redemption, balance, and tier changes travel together through the backend transaction.</p></div></div><div className="auth-panel"><div className="auth-card"><Link to="/" className="back-link">← Back to CaféPoints</Link><span className="eyebrow">Staff access</span><h2>{title}</h2><p>{subtitle}</p>{children}</div></div></div>;
}
