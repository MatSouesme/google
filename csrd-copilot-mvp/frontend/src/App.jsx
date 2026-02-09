import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase-config';
import { API_BASE_URL } from './api/apiClient';
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
import FinalReportPage from './pages/FinalReportPage';
import DataPointsPage from './pages/DataPointsPage';
import SmartImportPage from './pages/SmartImportPage';
import EcovadisPage from './pages/EcovadisPage';
import Settings from './pages/Settings';
import LineagePage from './pages/LineagePage';
import CommentsDemo from './pages/CommentsDemo';
import Discussions from './pages/Discussions';

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for demo mode first
        const isDemo = localStorage.getItem('ecoply_demo_mode');
        if (isDemo === 'true') {
            setUser({ 
                email: 'demo@ecoply.com', 
                uid: 'demo123',
                rbac: { role: 'admin', scopes: ['global'] }
            });
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const token = await currentUser.getIdToken();
                    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const profile = await response.json();
                        currentUser.rbac = profile;
                    }
                } catch (e) {
                    console.error("Failed to load user profile", e);
                }
            }
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
                    <Route path="data-points" element={<DataPointsPage />} />
                    <Route path="smart-import" element={<SmartImportPage />} />
                    <Route path="final-report" element={<FinalReportPage />} />
                    <Route path="connectors" element={<ConnectorsPage />} />
                    <Route path="ecovadis" element={<EcovadisPage />} />
                    <Route path="settings" element={<Settings user={user} />} />
                    <Route path="lineage" element={<LineagePage />} />
                    <Route path="discussions" element={<Discussions />} />
                    <Route path="comments-demo" element={<CommentsDemo />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
