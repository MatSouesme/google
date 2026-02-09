import React, { useEffect, useState } from 'react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';
import KPIWithComments from './KPIWithComments';

const GapAnalysisCard = ({ standard }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showMissing, setShowMissing] = useState(false);

    useEffect(() => {
        const fetchGapAnalysis = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const token = await user.getIdToken();

                const response = await fetch(`${API_BASE_URL}/analytics/gap-analysis?standard=${standard.toLowerCase()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error(`Error fetching gap analysis for ${standard}:`, error);
            } finally {
                setLoading(false);
            }
        };

        fetchGapAnalysis();
    }, [standard]);

    if (loading) return <div className="card" style={{ marginBottom: '1rem', flex: 1, minWidth: '300px' }}>Loading {standard}...</div>;
    if (!stats) return null;

    const getColor = (score) => {
        if (score < 30) return '#ef4444'; // Red
        if (score < 70) return '#f59e0b'; // Orange
        return '#10b981'; // Green
    };

    return (
        <div className="card" style={{ marginBottom: '1rem', flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>ESRS {standard.toUpperCase()}</h3>
                <span style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: getColor(stats.completeness_score) 
                }}>
                    {stats.completeness_score}%
                </span>
            </div>

            {/* Progress Bar */}
            <div style={{ 
                width: '100%', 
                height: '12px', 
                backgroundColor: 'var(--border-color)', 
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '1.5rem'
            }}>
                <div style={{ 
                    width: `${stats.completeness_score}%`, 
                    height: '100%', 
                    backgroundColor: getColor(stats.completeness_score),
                    transition: 'width 1s ease-in-out'
                }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                    {stats.covered_count}/{stats.total_mandatory} KPIs
                </p>
                <button 
                    className="btn btn-secondary"
                    onClick={() => setShowMissing(!showMissing)}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                    {showMissing ? 'Hide' : 'Details'}
                </button>
            </div>

            {showMissing && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    {stats.missing_kpis.length === 0 ? (
                        <p style={{ color: '#10b981', fontSize: '0.9rem' }}>Complete! 🎉</p>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                            {stats.missing_kpis.map((kpi) => (
                                <KPIWithComments
                                    key={kpi.id}
                                    kpiId={kpi.id}
                                    dataSource="gap_analysis"
                                    style={{ marginBottom: '0.5rem' }}
                                >
                                    <div style={{ 
                                        padding: '0.5rem', 
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                                        borderRadius: '4px',
                                        borderLeft: '3px solid #ef4444',
                                        fontSize: '0.85rem'
                                    }}>
                                        <strong>{kpi.id}</strong>: {kpi.name}
                                    </div>
                                </KPIWithComments>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const GapAnalysisSection = () => {
    return (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
            <GapAnalysisCard standard="E1" />
            <GapAnalysisCard standard="S1" />
            <GapAnalysisCard standard="G1" />
        </div>
    );
};

export default GapAnalysisSection;
