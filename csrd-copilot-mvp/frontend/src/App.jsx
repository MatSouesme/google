import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config';
import './App.css';

// Components
import Layout from './components/Layout';
import Home from './components/Home';

// Pages
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import Generator from './pages/Generator';
import ConnectorsPage from './pages/ConnectorsPage';
import ChatPage from './pages/ChatPage';
import ReportViewer from './pages/ReportViewer';

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

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)'
            }}>
                Loading...
            </div>
        );
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={!user ? <Login /> : <Navigate to='/' replace />}
                />

                <Route
                    path="/"
                    element={user ? <Layout user={user} /> : <Navigate to='/login' replace />}
                >
                    <Route index element={<Home />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="generator" element={<Generator />} />
                    <Route path="chat" element={<ChatPage />} />
                    <Route path="view-report" element={<ReportViewer />} />
                    <Route path="connectors" element={<ConnectorsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
