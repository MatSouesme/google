import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { API_BASE_URL } from '../api/apiClient';
import { auth } from '../firebase-config';

const Settings = () => {
    const { t } = useTranslation();
    const [confirmation, setConfirmation] = useState('');
    const [selectedScope, setSelectedScope] = useState('global');
    const [isPurging, setIsPurging] = useState(false);
    const [purgeResult, setPurgeResult] = useState(null);
    const [showDangerZone, setShowDangerZone] = useState(false);

    const handlePurge = async () => {
        if (confirmation !== 'DELETE') return;
        
        setIsPurging(true);
        setPurgeResult(null);
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required");
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/purge-data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    confirmation: 'DELETE',
                    scope: selectedScope
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Purge failed');
            }

            const data = await response.json();
            setPurgeResult({ success: true, message: data.message });
            setConfirmation('');
            
        } catch (error) {
            setPurgeResult({ success: false, message: error.message });
        } finally {
            setIsPurging(false);
        }
    };

    return (
        <div className="settings-page" style={{ padding: '1.5rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-color)' }}>
                    <Shield size={32} color="var(--primary-color)" />
                    {t('settings.title', 'Paramètres & Sécurité')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
                    {t('settings.subtitle', 'Gérez la sécurité et le cycle de vie de vos données.')}
                </p>
            </div>

            <div className="card" style={{ 
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '2rem',
                backgroundColor: 'var(--surface-color)',
                marginBottom: '2rem',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-color)' }}>
                    Audit & Traceability
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                     <CheckCircle size={20} color="var(--success-color)" />
                     <span style={{ color: 'var(--text-secondary)' }}>{t('settings.audit_logging_enabled', 'La journalisation sécurisée (Audit Logging) est active.')}</span>
                </div>
            </div>

            <div style={{ 
                border: '1px solid var(--error-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'rgba(239, 68, 68, 0.05)'
            }}>
                <div style={{ 
                    padding: '1.5rem',
                    borderBottom: showDangerZone ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                }}
                onClick={() => setShowDangerZone(!showDangerZone)}
                >
                    <div>
                        <h3 style={{ color: 'var(--error-color)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                            <AlertTriangle size={24} />
                            {t('settings.danger_zone', 'Zone de Danger')}
                        </h3>
                        <p style={{ color: 'var(--error-color)', margin: '0.5rem 0 0 0', fontSize: '0.95rem', opacity: 0.9 }}>
                            {t('settings.right_to_erasure', 'Droit à l\'oubli / Purge des données')}
                        </p>
                    </div>
                    <button className="btn-animated" style={{ 
                        border: '1px solid var(--error-color)', 
                        color: 'var(--error-color)', 
                        background: 'transparent',
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}>
                        {showDangerZone ? t('settings.collapse', 'Masquer') : t('settings.expand', 'Afficher')}
                    </button>
                </div>

                {showDangerZone && (
                    <div style={{ padding: '2rem', backgroundColor: 'var(--surface-color)' }}>
                        <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-color)', fontSize: '1.1rem' }}>
                            {t('settings.purge_title', 'Réinitialiser les données')}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
                            {t('settings.purge_description', 'Sélectionnez les données à supprimer définitivement. Cette action est irréversible. Seul le journal d\'audit sera conservé.')}
                        </p>

                        <div style={{ marginBottom: '1.5rem' }}>
                             <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>
                                Cible de la suppression :
                             </label>
                             <select 
                                value={selectedScope} 
                                onChange={(e) => setSelectedScope(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    marginBottom: '1rem',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-color)',
                                    fontSize: '1rem'
                                }}
                             >
                                 <option value="global">💥 TOUT SUPPRIMER (Global Purge)</option>
                                 <option value="documents">📄 Documents Sources (PDFs, Images)</option>
                                 <option value="e1">🌍 Données Environnementales (E1)</option>
                                 <option value="g1">⚖️ Données Gouvernance (G1)</option>
                                 <option value="manual">✍️ Entrées Manuelles (Manual Entries)</option>
                             </select>
                        </div>

                        <div style={{ 
                            backgroundColor: 'var(--bg-color)', 
                            padding: '1.5rem', 
                            borderRadius: '8px', 
                            border: '1px solid var(--border-color)',
                            marginBottom: '2rem' 
                        }}>
                             <label style={{ display: 'block', fontSize: '0.95rem', marginBottom: '0.5rem', fontWeight: '600', color: 'var(--text-color)' }}>
                                {t('settings.confirmation_prompt', 'Pour confirmer, tapez "DELETE" ci-dessous :')}
                             </label>
                             <input 
                                type="text" 
                                value={confirmation}
                                onChange={(e) => setConfirmation(e.target.value)}
                                placeholder="DELETE"
                                style={{ 
                                    width: '100%', 
                                    padding: '0.75rem', 
                                    border: '1px solid var(--border-color)', 
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '1rem',
                                    color: 'var(--text-color)',
                                    backgroundColor: 'var(--surface-color)'
                                }}
                             />
                        </div>

                        <button 
                            onClick={handlePurge}
                            disabled={confirmation !== 'DELETE' || isPurging}
                            className="btn-animated"
                            style={{ 
                                backgroundColor: confirmation === 'DELETE' ? 'var(--error-color)' : 'var(--text-secondary)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: confirmation === 'DELETE' ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                width: 'fit-content',
                                opacity: confirmation === 'DELETE' ? 1 : 0.7
                            }}
                        >
                            {isPurging ? (
                                <span>{t('settings.purging', 'Suppression en cours...')}</span>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    {t('settings.confirm_purge', 'Supprimer définitivement les données')}
                                </>
                            )}
                        </button>

                        {purgeResult && (
                            <div style={{ 
                                marginTop: '1.5rem', 
                                padding: '1rem', 
                                borderRadius: '8px', 
                                backgroundColor: purgeResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: purgeResult.success ? 'var(--success-color)' : 'var(--error-color)',
                                border: `1px solid ${purgeResult.success ? 'var(--success-color)' : 'var(--error-color)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                fontWeight: '500'
                            }}>
                                {purgeResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                <span>{purgeResult.message}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
