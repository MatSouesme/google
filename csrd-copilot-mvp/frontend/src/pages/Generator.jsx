import React from 'react';
import UploadWizard from '../components/UploadWizard';
import CopilotInterface from '../components/CopilotInterface';
import { useTranslation } from 'react-i18next';

const Generator = () => {
    const { t } = useTranslation();

    return (
        <div className="generator-page">
            <div className="page-header">
                <h1 className="page-title">{t('generator.title')}</h1>
                <p className="page-subtitle">{t('generator.subtitle')}</p>
            </div>

            <div className="card">
                <UploadWizard />
            </div>

            <div className="card">
                <CopilotInterface />
            </div>
        </div>
    );
};

export default Generator;
