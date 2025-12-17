import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import UploadWizard from '../components/UploadWizard';
import CopilotInterface from '../components/CopilotInterface';
import Alert from '../components/Alert';
import { useTranslation } from 'react-i18next';
import { useDataStatus } from '../hooks/useDataStatus';

const Generator = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasImportedData } = useDataStatus();
    const [alertCollapsed, setAlertCollapsed] = React.useState(true);
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
        <div className="generator-page" style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        {t('generator.title')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{t('generator.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/final-report')}
                    className="btn-animated btn-primary"
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {t('generator.nextStep')} <ArrowRight size={18} />
                </button>
            </div>

            {!hasImportedData && (
                <div 
                    style={{ 
                        marginBottom: '1.5rem',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        border: '2px solid rgba(251, 191, 36, 0.5)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <div 
                        onClick={() => setAlertCollapsed(!alertCollapsed)}
                        style={{ 
                            padding: '1rem 1.5rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                            <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>
                                {t('alerts.generator.noData.title')}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {alertCollapsed ? 'Afficher' : 'Masquer'}
                            </span>
                            {alertCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </div>
                    </div>
                    {!alertCollapsed && (
                        <div style={{ 
                            padding: '0 1.5rem 1rem 1.5rem',
                            borderTop: '1px solid rgba(251, 191, 36, 0.2)',
                            paddingTop: '1rem'
                        }}>
                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)' }}>
                                {t('alerts.generator.noData.message')}
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/smart-import');
                                }}
                                className="btn-animated"
                                style={{ 
                                    fontSize: '0.9rem', 
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#f97316',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                {t('alerts.generator.noData.action')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'minmax(400px, 1fr) minmax(600px, 2fr)', 
                gap: '2rem',
                alignItems: 'start'
            }}>
                <div className="card" style={{ 
                    padding: '2rem',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    height: 'fit-content',
                    position: 'sticky',
                    top: '2rem'
                }}>
                    <UploadWizard
                        selectedScopes={selectedScopes}
                        onScopeChange={setSelectedScopes}
                    />
                </div>

                <div className="card" style={{ 
                    padding: '2rem',
                    background: 'var(--surface-color)',
                    border: '2px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                    <CopilotInterface enabledScopes={selectedScopes} />
                </div>
            </div>
        </div>
    );
};

export default Generator;
