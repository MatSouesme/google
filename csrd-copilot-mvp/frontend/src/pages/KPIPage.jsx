import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { kpis as initialKpis } from '../data/kpis';
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, BookOpen, Calculator, Info, FileText, PieChart, TrendingUp, Shield, Activity } from 'lucide-react';

const KPIPage = () => {
    const { t } = useTranslation();
    const [kpis, setKpis] = useState(initialKpis);
    const [expandedKPI, setExpandedKPI] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'missing'
    const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'Environmental', 'Social', 'Governance'

    const toggleKPI = (id) => {
        if (expandedKPI === id) {
            setExpandedKPI(null);
        } else {
            setExpandedKPI(id);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        setKpis(prevKpis => prevKpis.map(kpi =>
            kpi.id === id ? { ...kpi, status: newStatus } : kpi
        ));
    };

    const filteredKPIs = kpis.filter(kpi => {
        const statusMatch = filter === 'all' || kpi.status === filter;
        const categoryMatch = categoryFilter === 'all' || kpi.category === categoryFilter;
        return statusMatch && categoryMatch;
    });

    const stats = {
        total: kpis.length,
        completed: kpis.filter(k => k.status === 'completed').length,
        missing: kpis.filter(k => k.status === 'missing').length
    };

    const progressPercentage = Math.round((stats.completed / stats.total) * 100);

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>CSRD KPI Guide</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Track your progress on mandatory ESRS KPIs and generate your final report.</p>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary-color)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overall Progress</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{progressPercentage}%</div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '0.5rem' }}>
                            <div style={{
                                width: `${progressPercentage}%`,
                                height: '100%',
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease-in-out' // Smooth transition
                            }}></div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #10B981' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <CheckCircle size={24} color="#10B981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Data Collected</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.completed}/{stats.total}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #EF4444' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <AlertCircle size={24} color="#EF4444" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Missing Data Points</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.missing}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                    <button
                        className={`btn ${categoryFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCategoryFilter('all')}
                    >
                        All Categories
                    </button>
                    <button
                        className={`btn ${categoryFilter === 'Environmental' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCategoryFilter('Environmental')}
                        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                        <PieChart size={16} /> Environmental
                    </button>
                    <button
                        className={`btn ${categoryFilter === 'Social' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCategoryFilter('Social')}
                        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                        <TrendingUp size={16} /> Social
                    </button>
                    <button
                        className={`btn ${categoryFilter === 'Governance' ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setCategoryFilter('Governance')}
                        style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
                    >
                        <Shield size={16} /> Governance
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className={`btn ${filter === 'all' ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => setFilter('all')}
                        style={{ fontSize: '0.9rem', padding: '0.25rem 0.75rem' }}
                    >
                        All Status
                    </button>
                    <button
                        className={`btn ${filter === 'missing' ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => setFilter('missing')}
                        style={{ fontSize: '0.9rem', padding: '0.25rem 0.75rem' }}
                    >
                        Missing Only
                    </button>
                    <button
                        className={`btn ${filter === 'completed' ? 'btn-secondary' : 'btn-outline'}`}
                        onClick={() => setFilter('completed')}
                        style={{ fontSize: '0.9rem', padding: '0.25rem 0.75rem' }}
                    >
                        Completed Only
                    </button>
                </div>
            </div>

            {/* KPI List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {filteredKPIs.map(kpi => (
                    <div key={kpi.id} className="card" style={{ overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <div
                            style={{
                                padding: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                backgroundColor: expandedKPI === kpi.id ? 'var(--bg-secondary)' : 'transparent',
                                transition: 'background-color 0.2s'
                            }}
                            onClick={() => toggleKPI(kpi.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: kpi.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                }}>
                                    {kpi.status === 'completed' ? (
                                        <CheckCircle color="#10B981" size={20} />
                                    ) : (
                                        <AlertCircle color="#EF4444" size={20} />
                                    )}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            padding: '0.1rem 0.4rem',
                                            borderRadius: '4px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {kpi.standard}
                                        </span>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{kpi.name}</h3>
                                    </div>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {kpi.category} • Unit: {kpi.unit}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {expandedKPI === kpi.id ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                            </div>
                        </div>

                        {expandedKPI === kpi.id && (
                            <div style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 2fr) 1fr', gap: '2rem' }}>
                                    <div>
                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                                            <Info size={18} /> Description & Requirement
                                        </h4>
                                        <p style={{ color: 'var(--text-color)', lineHeight: '1.7', marginBottom: '1.5rem' }}>{kpi.description}</p>

                                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
                                            <Calculator size={18} /> Calculation Methodology
                                        </h4>
                                        <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                            <code style={{ fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--text-color)' }}>{kpi.calculation}</code>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                                            <h5 style={{ marginTop: 0, marginBottom: '1rem' }}>Data Status</h5>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: kpi.status === 'completed' ? '#10B981' : '#EF4444' }}>
                                                {kpi.status === 'completed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                                <span style={{ fontWeight: '500' }}>{kpi.status === 'completed' ? 'Data Verified' : 'Action Required'}</span>
                                            </div>

                                            {kpi.status === 'missing' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ width: '100%', justifyContent: 'center' }}
                                                        onClick={() => handleStatusChange(kpi.id, 'completed')}
                                                    >
                                                        Mark as Completed
                                                    </button>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                        Click to simulate data collection
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ width: '100%', justifyContent: 'center', color: '#EF4444', borderColor: '#EF4444' }}
                                                    onClick={() => handleStatusChange(kpi.id, 'missing')}
                                                >
                                                    Mark as Missing
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default KPIPage;
