import React, { useState, useEffect } from 'react'
import './App.css'
import UploadWizard from './components/UploadWizard'
import CopilotInterface from './components/CopilotInterface'
import Login from './pages/Login'
import { auth } from './firebase-config'
import { onAuthStateChanged, signOut } from 'firebase/auth'

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const handleLogout = async () => {
        await signOut(auth);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>Loading...</div>;
    }

    if (!user) {
        return <Login />;
    }

    return (
        <div className="App">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>Ecoply</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#aaa' }}>{user.email}</span>
                    <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#333', border: '1px solid #555' }}>
                        Logout
                    </button>
                </div>
            </div>
            
            <div className="card">
                <UploadWizard />
            </div>
            <div className="card" style={{ marginTop: '2rem' }}>
                <CopilotInterface />
            </div>
        </div>
    )
}

export default App

