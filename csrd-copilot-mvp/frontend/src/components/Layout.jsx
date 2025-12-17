import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Sparkles, Link as LinkIcon, LogOut, Sun, Moon, Home, Languages, MessageSquare, FileText, ClipboardList, UploadCloud } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';

const Layout = ({ user }) => {
    const location = useLocation();
    const [theme, setTheme] = useState('dark');
    const { t, i18n } = useTranslation();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'fr' : 'en';
        i18n.changeLanguage(newLang);
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
                        <span>{t('nav.home')}</span>
                    </Link>
                    
                    {/* 1. Ingestion des données */}
                    <Link to="/smart-import" className={`nav-item ${isActive('/smart-import') ? 'active' : ''}`}>
                        <UploadCloud size={20} />
                        <span>{t('nav.smartImport')}</span>
                    </Link>
                    
                    {/* 2. Monitorer les data points */}
                    <Link to="/data-points" className={`nav-item ${isActive('/data-points') ? 'active' : ''}`}>
                        <ClipboardList size={20} />
                        <span>{t('nav.dataPoints')}</span>
                    </Link>
                    
                    {/* 3. Générateur de rapports */}
                    <Link to="/generator" className={`nav-item ${isActive('/generator') ? 'active' : ''}`}>
                        <Sparkles size={20} />
                        <span>{t('nav.generator')}</span>
                    </Link>
                    
                    {/* 4. Rapport final - Dernière étape du workflow */}
                    <Link to="/final-report" className={`nav-item ${isActive('/final-report') ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span>{t('nav.finalReport')}</span>
                    </Link>
                    
                    {/* Autres fonctionnalités */}
                    <Link to="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
                        <MessageSquare size={20} />
                        <span>{t('nav.chat')}</span>
                    </Link>
                    
                    <Link to="/connectors" className={`nav-item ${isActive('/connectors') ? 'active' : ''}`}>
                        <LinkIcon size={20} />
                        <span>{t('nav.connectors')}</span>
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
                        <button onClick={toggleLanguage} className="logout-button" title={t('common.toggleLanguage')}>
                            <Languages size={18} />
                            <span style={{ fontSize: '0.75rem', marginLeft: '4px', fontWeight: 'bold' }}>{i18n.language.toUpperCase()}</span>
                        </button>
                        <button onClick={toggleTheme} className="logout-button" title={t('common.toggleTheme')}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <button onClick={handleLogout} className="logout-button" title={t('common.logout')}>
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
