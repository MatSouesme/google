import React, { useState } from 'react';
import { auth } from '../firebase-config';

const Connectors = () => {
    const [connectorType, setConnectorType] = useState('salesforce');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const fillDemoCredentials = () => {
        setUsername('demo@salesforce.com');
        setPassword('password123');
        setToken('DEMO_TOKEN_XYZ');
    };

    const handleSync = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");
            const idToken = await user.getIdToken();

            // TODO: Use env var for URL
            const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/connectors/sync', {
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
                throw new Error(errData.detail || "Sync failed");
            }

            const data = await response.json();
            setMessage(`✅ Success! ${data.rows_inserted} rows imported from ${data.source}.`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ textAlign: 'left' }}>
            <h2 style={{ color: 'var(--primary-color)', marginTop: 0 }}>Data Connectors</h2>
            <p style={{ color: '#aaa', fontSize: '0.9rem' }}>
                Connect directly to your operational systems to automate data collection.
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
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                        onClick={() => setConnectorType('salesforce')}
                    >
                        ☁️ Salesforce
                    </div>
                    <div style={{ padding: '10px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
                        🏗️ SAP (Coming Soon)
                    </div>
                    <div style={{ padding: '10px', color: 'var(--text-secondary)', cursor: 'not-allowed' }}>
                        ⚡ AWS (Coming Soon)
                    </div>
                </div>

                {/* Configuration Form */}
                <div style={{ flex: 1 }}>
                    {connectorType === 'salesforce' && (
                        <form onSubmit={handleSync} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-color)' }}>Salesforce Configuration</h3>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>Username</label>
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
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>Password</label>
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
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px', color: 'var(--text-color)' }}>Security Token</label>
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
                                    🪄 Remplir avec des identifiants de test (MVP)
                                </button>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                style={{ 
                                    marginTop: '1rem', 
                                    padding: '10px', 
                                    backgroundColor: '#00a1e0', // Salesforce Blue
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: '4px', 
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                {loading ? 'Syncing Data...' : 'Sync Now'}
                            </button>
                        </form>
                    )}

                    {message && (
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
