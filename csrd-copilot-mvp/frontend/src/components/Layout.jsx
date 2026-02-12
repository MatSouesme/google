import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
<<<<<<< HEAD
import { LayoutDashboard, Sparkles, Link as LinkIcon, LogOut, Sun, Moon, Home, Languages, MessageSquare, FileText, ClipboardList, UploadCloud, ShieldCheck, Settings, TrendingUp, MessageCircle, Calculator } from 'lucide-react';
=======
import { LayoutDashboard, Sparkles, Link as LinkIcon, LogOut, Sun, Moon, Home, MessageSquare, FileText, ClipboardList, UploadCloud, ShieldCheck, Settings, TrendingUp, MessageCircle, ChevronDown, Globe } from 'lucide-react';
>>>>>>> 26d97df2341cf4ec1ac9e7331e0ba2e74923ebde
import { signOut } from 'firebase/auth';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';

const Layout = ({ user }) => {
    const location = useLocation();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const langDropdownRef = useRef(null);
    const { t, i18n } = useTranslation();

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (langDropdownRef.current && !langDropdownRef.current.contains(e.target)) {
                setLangDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const languageOptions = [
        { code: 'en', flag: '🇬🇧', label: 'English' },
        { code: 'fr', flag: '🇫🇷', label: 'Français' },
        { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
        { code: 'es', flag: '🇪🇸', label: 'Español' }
    ];

    const currentLang = languageOptions.find(l => l.code === i18n.language) || languageOptions[0];

    const handleLogout = async () => {
        localStorage.removeItem('ecoply_demo_mode');
        await signOut(auth);
        window.location.reload();
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

                    <Link to="/smart-import" className={`nav-item ${isActive('/smart-import') ? 'active' : ''}`}>
                        <UploadCloud size={20} />
                        <span>{t('nav.smartImport')}</span>
                    </Link>

                    <Link to="/data-points" className={`nav-item ${isActive('/data-points') ? 'active' : ''}`}>
                        <ClipboardList size={20} />
                        <span>{t('nav.dataPoints')}</span>
                    </Link>

                    <Link to="/generator" className={`nav-item ${isActive('/generator') ? 'active' : ''}`}>
                        <Sparkles size={20} />
                        <span>{t('nav.generator')}</span>
                    </Link>

                    <Link to="/ecovadis" className={`nav-item ${isActive('/ecovadis') ? 'active' : ''}`}>
                        <ShieldCheck size={20} />
                        <span>{t('nav.ecovadis')}</span>
                    </Link>

                    <Link to="/final-report" className={`nav-item ${isActive('/final-report') ? 'active' : ''}`}>
                        <FileText size={20} />
                        <span>{t('nav.finalReport')}</span>
                    </Link>

                    <Link to="/chat" className={`nav-item ${isActive('/chat') ? 'active' : ''}`}>
                        <MessageSquare size={20} />
                        <span>{t('nav.chat')}</span>
                    </Link>

                    <Link to="/connectors" className={`nav-item ${isActive('/connectors') ? 'active' : ''}`}>
                        <LinkIcon size={20} />
                        <span>{t('nav.connectors')}</span>
                    </Link>

                    <Link to="/lineage" className={`nav-item ${isActive('/lineage') ? 'active' : ''}`}>
                        <TrendingUp size={20} />
                        <span>{t('nav.lineage')}</span>
                    </Link>

                    <Link to="/discussions" className={`nav-item ${isActive('/discussions') ? 'active' : ''}`}>
                        <MessageCircle size={20} />
                        <span>{t('nav.discussions')}</span>
                    </Link>

                    <Link to="/emission-factors" className={`nav-item ${isActive('/emission-factors') ? 'active' : ''}`}>
                        <Calculator size={20} />
                        <span>{t('nav.emissionFactors', 'Facteurs d\'émissions')}</span>
                    </Link>

                    <Link to="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
                        <Settings size={20} />
                        <span>{t('nav.settings')}</span>
                    </Link>
                </nav>
            </aside>

            <main className="main-content" style={{ paddingTop: '0' }}>
                {/* Top Bar */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--bg-color)',
                    zIndex: 10
                }}>
                    {/* Language Dropdown (custom, in-page) */}
                    <div ref={langDropdownRef} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.45rem 0.75rem',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                color: 'var(--text-color)',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '500',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Globe size={16} style={{ color: 'var(--text-secondary)' }} />
                            <span>{currentLang.flag} {currentLang.label}</span>
                            <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: langDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }} />
                        </button>

                        {langDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 4px)',
                                right: 0,
                                backgroundColor: 'var(--surface-color, var(--bg-color))',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                minWidth: '170px',
                                padding: '0.35rem',
                                zIndex: 100
                            }}>
                                {languageOptions.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => { i18n.changeLanguage(lang.code); setLangDropdownOpen(false); }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            width: '100%',
                                            padding: '0.55rem 0.75rem',
                                            border: 'none',
                                            borderRadius: '7px',
                                            backgroundColor: i18n.language === lang.code ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                            color: i18n.language === lang.code ? 'var(--primary-color)' : 'var(--text-color)',
                                            fontWeight: i18n.language === lang.code ? '600' : '400',
                                            cursor: 'pointer',
                                            fontSize: '0.85rem',
                                            transition: 'background-color 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => { if (i18n.language !== lang.code) e.target.style.backgroundColor = 'var(--hover-bg, rgba(0,0,0,0.05))'; }}
                                        onMouseLeave={(e) => { if (i18n.language !== lang.code) e.target.style.backgroundColor = 'transparent'; }}
                                    >
                                        <span style={{ fontSize: '1.1rem' }}>{lang.flag}</span>
                                        <span>{lang.label}</span>
                                        {i18n.language === lang.code && <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Theme Toggle */}
                    <button onClick={toggleTheme} className="logout-button" title={t('common.toggleTheme')} style={{ padding: '0.45rem', borderRadius: '8px' }}>
                        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                    </button>

                    {/* User Info + Logout */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)' }}>
                        <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem', flexShrink: 0 }}>
                            {user?.email?.[0].toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-color)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</span>
                            {user?.rbac && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    {user.rbac.role}
                                </span>
                            )}
                        </div>
                        <button onClick={handleLogout} className="logout-button" title={t('common.logout')} style={{ padding: '0.45rem', borderRadius: '8px' }}>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
