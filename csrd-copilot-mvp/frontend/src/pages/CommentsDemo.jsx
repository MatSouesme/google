import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import KPIWithComments from '../components/KPIWithComments';
import CommentThread from '../components/CommentThread';

/**
 * Page de démonstration du système de commentaires
 * Montre différents cas d'usage
 */
const CommentsDemoPage = () => {
    const { t } = useTranslation();
    const [selectedExample, setSelectedExample] = useState('wrapper');

    const demoKpis = [
        {
            id: 'E1-6',
            name: 'Émissions GES Scope 1, 2, 3',
            type: 'quantitative',
            value: '12,340 tCO2e',
            standard: 'E1'
        },
        {
            id: 'E1-1',
            name: 'Plan de transition pour l\'atténuation du changement climatique',
            type: 'narrative',
            status: 'missing',
            standard: 'E1'
        },
        {
            id: 'G1-4',
            name: 'Incidents confirmés de corruption ou de pots-de-vin',
            type: 'quantitative',
            value: '0 incidents',
            standard: 'G1'
        }
    ];

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                    🧪 {t('commentsDemo.title')}
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    {t('commentsDemo.subtitle')}
                </p>
            </div>

            {/* Sélecteur d'exemple */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                    onClick={() => setSelectedExample('wrapper')}
                    className={selectedExample === 'wrapper' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                    📦 {t('commentsDemo.example1')}
                </button>
                <button
                    onClick={() => setSelectedExample('direct')}
                    className={selectedExample === 'direct' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                    💬 {t('commentsDemo.example2')}
                </button>
                <button
                    onClick={() => setSelectedExample('list')}
                    className={selectedExample === 'list' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                    📋 {t('commentsDemo.example3')}
                </button>
                <button
                    onClick={() => setSelectedExample('split')}
                    className={selectedExample === 'split' ? 'btn btn-primary' : 'btn btn-secondary'}
                >
                    ↔️ {t('commentsDemo.example4')}
                </button>
            </div>

            {/* Exemple 1 : Wrapper autour d'un KPI */}
            {selectedExample === 'wrapper' && (
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>📦 {t('commentsDemo.wrapperTitle')}</h2>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        {t('commentsDemo.wrapperDesc')}
                    </p>

                    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f8f9fa' }}>
                        <pre style={{ 
                            backgroundColor: '#1e1e1e', 
                            color: '#d4d4d4', 
                            padding: '1rem', 
                            borderRadius: '6px',
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem'
                        }}>
{`<KPIWithComments 
    kpiId="E1-6"
    dataSource="demo_page"
>
    <div className="card">
        <h3>E1-6 - Émissions GES</h3>
        <p>Scope 1: 1,234 tCO2e</p>
        <p>Scope 2: 5,678 tCO2e</p>
        <p>Scope 3: 5,428 tCO2e</p>
    </div>
</KPIWithComments>`}
                        </pre>

                        {/* Exemple live */}
                        <div style={{ borderTop: '2px dashed #ccc', paddingTop: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#3b82f6' }}>↓ {t('commentsDemo.liveResult')} ↓</h4>
                            <KPIWithComments 
                                kpiId="E1-6"
                                dataSource="demo_page"
                            >
                                <div className="card" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ margin: 0 }}>E1-6 - Émissions GES Scope 1, 2, 3</h3>
                                        <span style={{ 
                                            backgroundColor: '#10b981',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '6px',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold'
                                        }}>
                                            ESRS E1
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Scope 1 (Émissions directes)</span>
                                            <strong>1,234 tCO2e</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Scope 2 (Émissions indirectes - énergie)</span>
                                            <strong>5,678 tCO2e</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Scope 3 (Autres émissions indirectes)</span>
                                            <strong>5,428 tCO2e</strong>
                                        </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            borderTop: '2px solid var(--border-color)',
                                            paddingTop: '0.5rem',
                                            marginTop: '0.5rem'
                                        }}>
                                            <span style={{ fontWeight: 'bold' }}>Total</span>
                                            <strong style={{ fontSize: '1.2rem', color: '#3b82f6' }}>12,340 tCO2e</strong>
                                        </div>
                                    </div>
                                </div>
                            </KPIWithComments>
                        </div>
                    </div>
                </div>
            )}

            {/* Exemple 2 : Thread direct */}
            {selectedExample === 'direct' && (
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>💬 {t('commentsDemo.directTitle')}</h2>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        {t('commentsDemo.directDesc')}
                    </p>

                    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f8f9fa' }}>
                        <pre style={{ 
                            backgroundColor: '#1e1e1e', 
                            color: '#d4d4d4', 
                            padding: '1rem', 
                            borderRadius: '6px',
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem'
                        }}>
{`<CommentThread 
    kpiId="E1-1"
    dataSource="demo_page"
/>`}
                        </pre>

                        <div style={{ borderTop: '2px dashed #ccc', paddingTop: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#3b82f6' }}>↓ {t('commentsDemo.liveResult')} ↓</h4>
                            <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                                <h3>E1-1 - Plan de transition pour l'atténuation du changement climatique</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    Type: Narratif | Standard: ESRS E1 | Statut: Manquant
                                </p>
                            </div>
                            <CommentThread 
                                kpiId="E1-1"
                                dataSource="demo_page"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Exemple 3 : Liste de KPIs */}
            {selectedExample === 'list' && (
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>📋 {t('commentsDemo.listTitle')}</h2>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        {t('commentsDemo.listDesc')}
                    </p>

                    <div className="card" style={{ padding: '1.5rem', backgroundColor: '#f8f9fa' }}>
                        <pre style={{ 
                            backgroundColor: '#1e1e1e', 
                            color: '#d4d4d4', 
                            padding: '1rem', 
                            borderRadius: '6px',
                            overflow: 'auto',
                            fontSize: '0.85rem',
                            marginBottom: '1.5rem'
                        }}>
{`{kpis.map((kpi) => (
    <KPIWithComments 
        key={kpi.id}
        kpiId={kpi.id}
        dataSource="dashboard"
    >
        <KPICard {...kpi} />
    </KPIWithComments>
))}`}
                        </pre>

                        <div style={{ borderTop: '2px dashed #ccc', paddingTop: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#3b82f6' }}>↓ {t('commentsDemo.liveResult')} ↓</h4>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {demoKpis.map((kpi) => (
                                    <KPIWithComments
                                        key={kpi.id}
                                        kpiId={kpi.id}
                                        dataSource="demo_list"
                                    >
                                        <div className="card" style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                        <span style={{
                                                            backgroundColor: kpi.standard === 'E1' ? '#10b981' : '#8b5cf6',
                                                            color: 'white',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold'
                                                        }}>
                                                            {kpi.standard}
                                                        </span>
                                                        <strong>{kpi.id}</strong>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            backgroundColor: kpi.type === 'quantitative' ? '#3b82f6' : '#f59e0b',
                                                            color: 'white',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {kpi.type === 'quantitative' ? t('commentsDemo.quantitative') : t('commentsDemo.narrative')}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                                        {kpi.name}
                                                    </p>
                                                    {kpi.value && (
                                                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                                            {kpi.value}
                                                        </p>
                                                    )}
                                                    {kpi.status === 'missing' && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            backgroundColor: '#ef4444',
                                                            color: 'white',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '4px',
                                                            display: 'inline-block',
                                                            marginTop: '0.5rem'
                                                        }}>
                                                            ⚠️ {t('commentsDemo.missing')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </KPIWithComments>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Exemple 4 : Vue split */}
            {selectedExample === 'split' && (
                <div>
                    <h2 style={{ marginBottom: '1rem' }}>↔️ {t('commentsDemo.splitTitle')}</h2>
                    <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                        {t('commentsDemo.splitDesc')}
                    </p>

                    <SplitViewDemo kpis={demoKpis} />
                </div>
            )}

            {/* Tips section */}
            <div className="card" style={{ padding: '1.5rem', marginTop: '2rem', backgroundColor: '#fffbeb', border: '2px solid #f59e0b' }}>
                <h3 style={{ marginTop: 0, color: '#f59e0b' }}>💡 {t('commentsDemo.tips')}</h3>
                <ul style={{ marginBottom: 0 }}>
                    <li><strong>{t('commentsDemo.tip1')}</strong></li>
                    <li><strong>{t('commentsDemo.tip2')}</strong></li>
                    <li><strong>{t('commentsDemo.tip3')}</strong></li>
                    <li><strong>{t('commentsDemo.tip4')}</strong></li>
                    <li><strong>{t('commentsDemo.tip5')}</strong></li>
                </ul>
            </div>
        </div>
    );
};

// Composant pour la vue split
const SplitViewDemo = ({ kpis }) => {
    const { t } = useTranslation();
    const [selectedKpi, setSelectedKpi] = useState(null);

    return (
        <div style={{ display: 'grid', gridTemplateColumns: selectedKpi ? '400px 1fr' : '1fr', gap: '1.5rem' }}>
            {/* Liste des KPIs */}
            <div>
                <h3 style={{ marginBottom: '1rem' }}>{t('commentsDemo.availableKpis')}</h3>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {kpis.map((kpi) => (
                        <div
                            key={kpi.id}
                            onClick={() => setSelectedKpi(kpi)}
                            className="card"
                            style={{
                                padding: '1rem',
                                cursor: 'pointer',
                                border: selectedKpi?.id === kpi.id ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                                backgroundColor: selectedKpi?.id === kpi.id ? 'rgba(59, 130, 246, 0.05)' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{
                                            backgroundColor: kpi.standard === 'E1' ? '#10b981' : '#8b5cf6',
                                            color: 'white',
                                            padding: '0.15rem 0.5rem',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {kpi.standard}
                                        </span>
                                        <strong style={{ fontSize: '0.9rem' }}>{kpi.id}</strong>
                                    </div>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {kpi.name}
                                    </p>
                                </div>
                                {selectedKpi?.id === kpi.id && (
                                    <span style={{ fontSize: '1.5rem' }}>👉</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Thread de commentaires */}
            {selectedKpi && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>{t('commentsDemo.discussion')} - {selectedKpi.id}</h3>
                        <button
                            onClick={() => setSelectedKpi(null)}
                            style={{
                                padding: '0.5rem',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    <CommentThread
                        kpiId={selectedKpi.id}
                        dataSource="split_view_demo"
                    />
                </div>
            )}

            {!selectedKpi && (
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    padding: '4rem',
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                }}>
                    <div>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>👈</div>
                        <p>{t('commentsDemo.selectKpi')}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommentsDemoPage;
