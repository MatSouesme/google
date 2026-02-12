import React from 'react';
import Connectors from '../components/Connectors';
import { Link } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const ConnectorsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="connectors-page">
            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link size={32} color="#10b981" />
                    {t('connectors.title')}
                </h1>
                <p className="page-subtitle">{t('connectors.subtitle')}</p>
            </div>

            <div className="card">
                <Connectors />
            </div>
        </div>
    );
};

export default ConnectorsPage;
