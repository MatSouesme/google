import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Sparkles, Link as LinkIcon, LogOut, Sun, Moon, Home } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';

const Layout = ({ user }) => {
    const location = useLocation();
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    const isActive = (path) => location.pathname === path;

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="logo-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                    <img src="/logo.png" alt="Ecoply Logo" style={{ height: '50px', width: 'auto' }} />
                    <span className="logo-text" style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '1.5rem' }}>Ecoply</span>
                </div>

                <nav className="nav-menu">
                    <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                        <Home size={20} />
                        <span>Home</span>
                    </Link>
                    <Link to="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/generator" className={`nav-item ${isActive('/generator') ? 'active' : ''}`}>
                        <Sparkles size={20} />
                        <span>IA Generator</span>
                    </Link>
                    <Link to="/connectors" className={`nav-item ${isActive('/connectors') ? 'active' : ''}`}>
                        <LinkIcon size={20} />
                        <span>Connectors</span>
                    </Link>
                </nav>

                <div className="user-section">
                    <div className="user-info">
                        <div className="user-avatar">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <span className="user-email">{user?.email}</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={toggleTheme} className="logout-button" title="Toggle Theme">
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button onClick={handleLogout} className="logout-button" title="Logout">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
