import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">CP</span><div><strong>CaféPoints</strong><small>Counter console</small></div></div>
      <nav className="nav-list">
        <NavLink to="/app" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
        <NavLink to="/app/members" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Members</NavLink>
      </nav>
      <div className="sidebar-foot"><div className="user-chip"><div className="avatar">{user?.name?.slice(0, 1).toUpperCase()}</div><div><strong>{user?.name}</strong><small>{user?.role}</small></div></div><button className="button ghost full" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button></div>
    </aside>
    <main className="main-area"><header className="mobile-topbar"><div className="brand"><span className="brand-mark">CP</span><strong>CaféPoints</strong></div><button className="button ghost" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button></header><Outlet /></main>
  </div>;
}
