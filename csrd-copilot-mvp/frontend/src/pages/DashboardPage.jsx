import React from 'react';
import DataVisualization from '../components/DataVisualization';
import { useTranslation } from 'react-i18next';

const DashboardPage = () => {
    const { t } = useTranslation();

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1 className="page-title">{t('dashboard.title')}</h1>
                <p className="page-subtitle">{t('dashboard.subtitle')}</p>
            </div>
            
            <DataVisualization />
        </div>
    );
};

export default DashboardPage;
