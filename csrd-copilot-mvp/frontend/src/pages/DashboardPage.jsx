import React from 'react';
import DataVisualization from '../components/DataVisualization';
import GapAnalysisSection from '../components/Dashboard'; // Updated import
import { LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DashboardPage = () => {
    const { t } = useTranslation();

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <LayoutDashboard size={32} color="#10b981" />
                    {t('dashboard.title')}
                </h1>
                <p className="page-subtitle">{t('dashboard.subtitle')}</p>
            </div>

            <GapAnalysisSection />
            <DataVisualization />
        </div>
    );
};

export default DashboardPage;
