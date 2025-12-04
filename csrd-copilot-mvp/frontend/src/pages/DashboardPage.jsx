import React from 'react';
import { BarChart, Activity, FileText, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
            backgroundColor: `${color}20`,
            padding: '1rem',
            borderRadius: '12px',
            color: color
        }}>
            <Icon size={24} />
        </div>
        <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
            {subtitle && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{subtitle}</p>}
        </div>
    </div>
);

const DashboardPage = () => {
    const { t } = useTranslation();

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1 className="page-title">{t('dashboard.title')}</h1>
                <p className="page-subtitle">{t('dashboard.subtitle')}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard
                    title={t('dashboard.stats.reports')}
                    value="12"
                    subtitle={t('dashboard.stats.reportsSubtitle')}
                    icon={FileText}
                    color="#3b82f6"
                />
                <StatCard
                    title={t('dashboard.stats.sources')}
                    value="5"
                    subtitle={t('dashboard.stats.sourcesSubtitle')}
                    icon={Activity}
                    color="#8b5cf6"
                />
                <StatCard
                    title={t('dashboard.stats.score')}
                    value="85%"
                    subtitle={t('dashboard.stats.scoreSubtitle')}
                    icon={BarChart}
                    color="#10b981"
                />
                <StatCard
                    title={t('dashboard.stats.tasks')}
                    value="24"
                    subtitle={t('dashboard.stats.tasksSubtitle')}
                    icon={CheckCircle}
                    color="#f59e0b"
                />
            </div>

            <div className="card">
                <h2>{t('dashboard.recentActivity.title')}</h2>
                <div style={{ marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span>{t('dashboard.recentActivity.item1')}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t('dashboard.recentActivity.item1Meta')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
