import React from 'react';
import { BarChart, Activity, FileText, CheckCircle } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ 
            backgroundColor: `${color}20`, 
            padding: '1rem', 
            borderRadius: '12px',
            color: color 
        }}>
            <Icon size={24} />
        </div>
        <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{title}</h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</p>
        </div>
    </div>
);

const DashboardPage = () => {
    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your CSRD compliance status.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard title="Reports Generated" value="12" icon={FileText} color="#3b82f6" />
                <StatCard title="Data Sources" value="5" icon={Activity} color="#8b5cf6" />
                <StatCard title="Compliance Score" value="85%" icon={BarChart} color="#10b981" />
                <StatCard title="Tasks Completed" value="24" icon={CheckCircle} color="#f59e0b" />
            </div>

            <div className="card">
                <h2>Recent Activity</h2>
                <p style={{ color: 'var(--text-secondary)' }}>No recent activity to display.</p>
            </div>
        </div>
    );
};

export default DashboardPage;
