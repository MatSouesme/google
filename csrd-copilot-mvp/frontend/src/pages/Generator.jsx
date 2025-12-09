import React from 'react';
import UploadWizard from '../components/UploadWizard';
import CopilotInterface from '../components/CopilotInterface';
import { useTranslation } from 'react-i18next';

const Generator = () => {
    const { t } = useTranslation();
    const [selectedScopes, setSelectedScopes] = React.useState({
        e1: true,
        e2: false,
        e3: false,
        e4: false,
        e5: false,
        s1: true,
        s2: false,
        s3: false,
        s4: false,
        g1: true
    });

    return (
        <div className="generator-page">
            <div className="page-header">
                <h1 className="page-title">{t('generator.title')}</h1>
                <p className="page-subtitle">{t('generator.subtitle')}</p>
            </div>

            <div className="card">
                <UploadWizard
                    selectedScopes={selectedScopes}
                    onScopeChange={setSelectedScopes}
                />
            </div>

            <div className="card">
                <CopilotInterface enabledScopes={selectedScopes} />
            </div>
        </div>
    );
};

export default Generator;
