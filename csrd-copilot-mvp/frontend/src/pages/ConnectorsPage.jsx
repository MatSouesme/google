import React from 'react';
import Connectors from '../components/Connectors';
import { useTranslation } from 'react-i18next';

const ConnectorsPage = () => {
    const { t } = useTranslation();

    return (
        <div className="connectors-page">
            <div className="page-header">
                <h1 className="page-title">{t('connectors.title')}</h1>
                <p className="page-subtitle">{t('connectors.subtitle')}</p>
            </div>

            <div className="card">
                <Connectors />
            </div>
        </div>
    );
};

export default ConnectorsPage;
