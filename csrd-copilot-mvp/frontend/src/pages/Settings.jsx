import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlertTriangle, CheckCircle, Shield, ChevronDown } from 'lucide-react';
import { API_BASE_URL } from '../api/apiClient';
import { auth } from '../firebase-config';

const Settings = ({ user }) => {
    const { t, i18n } = useTranslation();
    const [confirmation, setConfirmation] = useState('');
    const [selectedScope, setSelectedScope] = useState('global');
    const [isPurging, setIsPurging] = useState(false);
    const [purgeResult, setPurgeResult] = useState(null);
    const [showDangerZone, setShowDangerZone] = useState(false);
    const [isScopeOpen, setIsScopeOpen] = useState(false);

    // User Management State
    const [targetEmail, setTargetEmail] = useState('');
    const [targetRole, setTargetRole] = useState('reader');
    const [targetScopes, setTargetScopes] = useState(['global']);
    const [isUpdatingUser, setIsUpdatingUser] = useState(false);
    const [userUpdateMsg, setUserUpdateMsg] = useState('');
    const [usersList, setUsersList] = useState({});
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);

    const isAdmin = user?.rbac?.role === 'admin';

    // Fetch users list on mount if admin
    React.useEffect(() => {
        if (isAdmin) {
            fetchUsersList();
        }
    }, [isAdmin]);

    const fetchUsersList = async () => {
        setIsLoadingUsers(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            const token = await currentUser.getIdToken();

            const response = await fetch(`${API_BASE_URL}/users/list`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setUsersList(data.users || {});
            }
        } catch (e) {
            console.error("Failed to load users list", e);
        } finally {
            setIsLoadingUsers(false);
        }
    };

    const handleUpdateRole = async () => {
        setIsUpdatingUser(true);
        setUserUpdateMsg('');
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Authentication required");
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/users/update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: targetEmail,
                    role: targetRole,
                    scopes: targetScopes
                })
            });

            const data = await response.json();
            if (response.ok) {
                setUserUpdateMsg(t('settings.role_update_success', "Rôle mis à jour avec succès."));
                fetchUsersList(); // Refresh the list
            } else {
                setUserUpdateMsg(t('settings.error_prefix', "Erreur: ") + data.detail);
            }
        } catch (e) {
            setUserUpdateMsg(t('settings.error_prefix', "Erreur: ") + e.message);
        } finally {
            setIsUpdatingUser(false);
        }
    };

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
                    <Shield size={32} color="#10b981" />
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
                    {t('settings.audit_title', 'Audit & Traçabilité')}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={20} color="var(--success-color)" />
                    <span style={{ color: 'var(--text-secondary)' }}>{t('settings.audit_logging_enabled', 'La journalisation sécurisée (Audit Logging) est active.')}</span>
                </div>
            </div>



            {/* User Management Section - Admin Only */}
            {isAdmin && (
                <div style={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '12px',
                    padding: '2rem',
                    border: '1px solid var(--border-color)',
                    marginBottom: '2rem',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Shield size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{t('settings.user_management', 'Gestion des Utilisateurs')}</h2>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                {t('settings.user_desc', 'Assigner des rôles et permissions aux utilisateurs')}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>{t('auth.email')}</label>
                            <input
                                type="email"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #4b5563', backgroundColor: 'var(--bg-color)' }}
                                value={targetEmail}
                                onChange={(e) => setTargetEmail(e.target.value)}
                                placeholder="user@example.com"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>{t('settings.role', 'Rôle')}</label>
                            <select
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #4b5563', backgroundColor: 'var(--bg-color)' }}
                                value={targetRole}
                                onChange={(e) => setTargetRole(e.target.value)}
                            >
                                <option value="reader">{t('settings.role_reader', 'Lecteur')}</option>
                                <option value="editor">{t('settings.role_editor', 'Éditeur')}</option>
                                <option value="admin">{t('settings.role_admin', 'Admin')}</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>{t('settings.scope', 'Périmètre')}</label>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {['global', 'environment', 'social', 'governance'].map(scope => (
                                    <label key={scope} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={targetScopes.includes(scope)}
                                            onChange={(e) => {
                                                if (e.target.checked) setTargetScopes([...targetScopes, scope]);
                                                else setTargetScopes(targetScopes.filter(s => s !== scope));
                                            }}
                                        />
                                        <span style={{ textTransform: 'capitalize' }}>{t(`settings.scope_${scope}_label`, scope)}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleUpdateRole}
                        disabled={!targetEmail || isUpdatingUser}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            borderRadius: '0.25rem',
                            cursor: (!targetEmail || isUpdatingUser) ? 'not-allowed' : 'pointer',
                            opacity: (!targetEmail || isUpdatingUser) ? 0.5 : 1
                        }}
                    >
                        {isUpdatingUser ? t('settings.save', 'Enregistrer') : t('settings.update_role', 'Mettre à jour le rôle')}
                    </button>
                    {userUpdateMsg && <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: userUpdateMsg.startsWith(t('settings.error_prefix', 'Erreur')) ? 'red' : 'lightgreen' }}>{userUpdateMsg}</p>}

                    {/* Users List */}
                    <div style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                            {t('settings.current_users', 'Utilisateurs actuels')}
                        </h3>
                        {isLoadingUsers ? (
                            <p style={{ color: 'var(--text-secondary)' }}>{t('settings.loading', 'Chargement...')}</p>
                        ) : Object.keys(usersList).length === 0 ? (
                            <p style={{ color: 'var(--text-secondary)' }}>{t('settings.no_users', 'Aucun utilisateur configuré')}</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {Object.entries(usersList).map(([email, userData]) => (
                                    <div key={email} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem 1rem',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: '500', color: 'var(--text-color)' }}>{email}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                <span style={{
                                                    textTransform: 'uppercase',
                                                    fontWeight: '600',
                                                    color: userData.role === 'admin' ? '#ef4444' : userData.role === 'editor' ? '#3b82f6' : '#6b7280'
                                                }}>
                                                    {userData.role}
                                                </span>
                                                {' · '}
                                                <span>{userData.scopes?.join(', ') || t('settings.no_scopes', 'no scopes')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isAdmin && (
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
                                    {t('settings.target_label', 'Cible de la suppression :')}
                                </label>

                                <div style={{ position: 'relative', width: '100%' }}>
                                    <div
                                        onClick={() => setIsScopeOpen(!isScopeOpen)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)',
                                            backgroundColor: 'var(--bg-color)',
                                            color: 'var(--text-color)',
                                            fontSize: '1rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span>
                                            {selectedScope === 'global' && t('settings.target_global', "💥 TOUT SUPPRIMER (Global Purge)")}
                                            {selectedScope === 'documents' && t('settings.target_documents', "📄 Documents Sources (PDFs, Images)")}
                                            {selectedScope === 'e1' && t('settings.target_e1', "🌍 Données Environnementales (E1)")}
                                            {selectedScope === 'g1' && t('settings.target_g1', "⚖️ Données Gouvernance (G1)")}
                                            {selectedScope === 'manual' && t('settings.target_manual', "✍️ Entrées Manuelles (Manual Entries)")}
                                        </span>
                                        <ChevronDown size={20} />
                                    </div>

                                    {isScopeOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '105%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: 'var(--surface-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                            zIndex: 50,
                                            overflow: 'hidden'
                                        }}>
                                            {[
                                                { value: 'global', label: t('settings.target_global', "💥 TOUT SUPPRIMER (Global Purge)") },
                                                { value: 'documents', label: t('settings.target_documents', "📄 Documents Sources (PDFs, Images)") },
                                                { value: 'e1', label: t('settings.target_e1', "🌍 Données Environnementales (E1)") },
                                                { value: 'g1', label: t('settings.target_g1', "⚖️ Données Gouvernance (G1)") },
                                                { value: 'manual', label: t('settings.target_manual', "✍️ Entrées Manuelles (Manual Entries)") }
                                            ].map(opt => (
                                                <div
                                                    key={opt.value}
                                                    onClick={() => { setSelectedScope(opt.value); setIsScopeOpen(false); }}
                                                    style={{
                                                        padding: '0.75rem',
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedScope === opt.value ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                                        color: 'var(--text-color)',
                                                        borderBottom: '1px solid var(--border-color)'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-active)'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = selectedScope === opt.value ? 'rgba(37, 99, 235, 0.1)' : 'transparent'}
                                                >
                                                    {opt.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
            )}
        </div>
    );
};

export default Settings;
