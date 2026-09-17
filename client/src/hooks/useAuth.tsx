import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = async () => {
    try { const result = await api.auth.me(); setUser(result.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    refresh,
    login: async (email, password) => { const result = await api.auth.login({ email, password }); setUser(result.user); return result.user; },
    register: async (name, email, password, confirmPassword) => { const result = await api.auth.register({ name, email, password, confirmPassword }); setUser(result.user); return result.user; },
    logout: async () => { await api.auth.logout(); setUser(null); }
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
