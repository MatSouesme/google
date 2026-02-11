import React, { useState } from 'react';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/apiClient';

const Connectors = () => {
    const [connectorType, setConnectorType] = useState('salesforce');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [connected, setConnected] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const { t } = useTranslation();

    const fillDemoCredentials = () => {
        setUsername('demo@salesforce.com');
        setPassword('password123');
        setToken('DEMO_TOKEN_XYZ');
    };

    const handleDisconnect = () => {
        setConnected(false);
        setLastSync(null);
        setUsername('');
        setPassword('');
        setToken('');
        setMessage('');
    };

    const handleSync = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error(t('connectorsComponent.errorAuth'));
            const idToken = await user.getIdToken();

            // Simulate a realistic delay for "Connecting..."
            await new Promise(resolve => setTimeout(resolve, 1500));

            // TODO: Use env var for URL
            const response = await fetch(`${API_BASE_URL}/connectors/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    connector_type: connectorType,
                    credentials: {
                        username,
                        password,
                        token
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || t('connectorsComponent.errorSync'));
            }

            const data = await response.json();
            setConnected(true);
            setLastSync(new Date());
            setMessage(t('connectorsComponent.success', { count: data.rows_inserted, source: data.source }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ textAlign: 'left' }}>
            <h2 style={{ color: 'var(--primary-color)', marginTop: 0 }}>{t('connectorsComponent.title')}</h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                {t('connectorsComponent.subtitle')}
            </p>

            <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem' }}>
                {/* Sidebar / List of Connectors */}
                <div style={{ width: '200px', borderRight: '1px solid var(--border-color)' }}>
                    <div
                        style={{
                            padding: '10px',
                            backgroundColor: connectorType === 'salesforce' ? 'var(--primary-color)' : 'transparent',
                            color: connectorType === 'salesforce' ? '#fff' : 'var(--text-color)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            marginBottom: '0.5rem',
                            display: 'flex', alignItems: 'center', gap: '10px',
                            justifyContent: 'space-between'
                        }}
                        onClick={() => setConnectorType('salesforce')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {t('connectorsComponent.salesforce')}
                        </div>
                        {connected && <span style={{ color: '#4caf50', fontSize: '1.2rem' }}>•</span>}
                    </div>
                    <div style={{ padding: '10px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
                        {t('connectorsComponent.sap')}
                    </div>
                    <div style={{ padding: '10px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
                        {t('connectorsComponent.aws')}
                    </div>
                </div>

                {/* Configuration Form */}
                <div style={{ flex: 1 }}>
                    {connectorType === 'salesforce' && (
                        <>
                            {!connected ? (
                                <form onSubmit={handleSync} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                                    <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{t('connectorsComponent.configTitle')}</h3>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>{t('connectorsComponent.username')}</label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-color)',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>{t('connectorsComponent.password')}</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-color)',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>{t('connectorsComponent.token')}</label>
                                        <input
                                            type="password"
                                            value={token}
                                            onChange={(e) => setToken(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: 'var(--bg-color)',
                                                border: '1px solid var(--border-color)',
                                                color: 'var(--text-color)',
                                                borderRadius: '4px'
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={fillDemoCredentials}
                                            style={{
                                                background: 'none',
                                                border: '1px dashed var(--text-secondary)',
                                                color: 'var(--text-secondary)',
                                                padding: '5px 10px',
                                                fontSize: '0.8rem',
                                                cursor: 'pointer',
                                                width: '100%'
                                            }}
                                        >
                                            {t('connectorsComponent.demoBtn')}
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        style={{
                                            marginTop: '1rem',
                                            padding: '10px',
                                            backgroundColor: 'var(--primary-color)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '50px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                                        }}
                                    >
                                        {loading && <span className="spinner-small"></span>}
                                        {loading ? t('connectorsComponent.syncBtn.loading') : t('connectorsComponent.syncBtn.default')}
                                    </button>
                                </form>
                            ) : (
                                <div style={{
                                    border: '1px solid #4caf50',
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    padding: '2rem',
                                    borderRadius: '8px',
                                    maxWidth: '400px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                                    <h3 style={{ color: '#4caf50', margin: 0 }}>Connected to Salesforce</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        Sync Status: <strong>Active</strong><br />
                                        Last Sync: {lastSync ? lastSync.toLocaleTimeString() : 'Just now'}
                                    </p>
                                    <button
                                        onClick={handleDisconnect}
                                        style={{
                                            marginTop: '1rem',
                                            background: 'none',
                                            border: '1px solid var(--error-color)',
                                            color: 'var(--error-color)',
                                            padding: '5px 15px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {message && !connected && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(129, 199, 132, 0.2)', color: '#81c784', borderRadius: '4px' }}>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(229, 115, 115, 0.2)', color: '#e57373', borderRadius: '4px' }}>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Connectors;
