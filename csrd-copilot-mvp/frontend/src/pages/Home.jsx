import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home as HomeIcon } from 'lucide-react';
import ComplianceProgressDashboard from '../components/ComplianceProgressDashboard';

const Home = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <HomeIcon size={40} color="#10b981" />
                    {t('home.hero.title')}
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
                    {t('home.hero.subtitle')}
                </p>
            </div>

            {/* Dashboard de Progression */}
            <ComplianceProgressDashboard />

            {/* Quick Actions */}
            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {t('dashboard.quickActions.title')}
                </h2>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/upload')}
                        style={{
                            padding: '1.5rem',
                            fontSize: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'center'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>📤</span>
                        <span>{t('home.cta.import')}</span>
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/generate')}
                        style={{
                            padding: '1.5rem',
                            fontSize: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'center'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>✨</span>
                        <span>{t('home.cta.generate')}</span>
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/manual')}
                        style={{
                            padding: '1.5rem',
                            fontSize: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'center'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>✏️</span>
                        <span>{t('home.cta.manual')}</span>
                    </button>

                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/lineage')}
                        style={{
                            padding: '1.5rem',
                            fontSize: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.5rem',
                            textAlign: 'center'
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>🔍</span>
                        <span>{t('home.cta.traceability')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;
