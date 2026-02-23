import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

const ComplianceProgressDashboard = () => {
    const { t } = useTranslation();
    const [progressData, setProgressData] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProgressData();
        fetchTimeline();
    }, []);

    const fetchProgressData = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                setError("User not authenticated");
                setLoading(false);
                return;
            }

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/analytics/compliance-progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setProgressData(data);
            } else {
                setError("Failed to load compliance progress");
            }
        } catch (err) {
            console.error("Error fetching compliance progress:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTimeline = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/analytics/regulatory-timeline`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setTimeline(data.timeline || []);
            }
        } catch (err) {
            console.error("Error fetching timeline:", err);
        }
    };

    const getScoreColor = (score) => {
        if (score < 30) return '#ef4444'; // Rouge
        if (score < 70) return '#f59e0b'; // Orange
        return '#10b981'; // Vert
    };

    const getTimelineStatusColor = (status) => {
        switch (status) {
            case 'critical': return '#ef4444';
            case 'warning': return '#f59e0b';
            case 'upcoming': return '#3b82f6';
            case 'passed': return '#9ca3af';
            default: return '#6b7280';
        }
    };

    const getTimelineStatusLabel = (status) => {
        switch (status) {
            case 'critical': return t('compliance.statusCritical');
            case 'warning': return t('compliance.statusWarning');
            case 'upcoming': return t('compliance.statusUpcoming');
            case 'passed': return t('compliance.statusPassed');
            default: return status.toUpperCase();
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    {t('compliance.loadingProgress')}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card" style={{ padding: '2rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444' }}>
                <strong style={{ color: '#ef4444' }}>Erreur:</strong> {error}
            </div>
        );
    }

    if (!progressData) return null;

    return (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* En-tête avec progression globale */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>
                            {t('compliance.csrdProgress')}
                        </h2>
                        <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                            {t('compliance.complianceOverview')}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', lineHeight: 1 }}>
                            {progressData.overall.completeness_percentage}%
                        </div>
                        <div style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '0.25rem' }}>
                            {progressData.overall.total_covered}/{progressData.overall.total_mandatory} KPIs
                        </div>
                    </div>
                </div>

                {/* Progress bar globale */}
                <div style={{ 
                    width: '100%', 
                    height: '16px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                    borderRadius: '8px',
                    overflow: 'hidden',
                    marginTop: '1rem'
                }}>
                    <div style={{ 
                        width: `${progressData.overall.completeness_percentage}%`, 
                        height: '100%', 
                        backgroundColor: 'white',
                        transition: 'width 1s ease-in-out',
                        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)'
                    }} />
                </div>
            </div>

            {/* Progress bars par Standard */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                {progressData.standards.map((standard) => (
                    <div key={standard.standard} className="card" style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
                                    ESRS {standard.standard}
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {standard.standard === 'E1' ? t('compliance.climate') : standard.standard === 'G1' ? t('compliance.governance') : t('compliance.social')}
                                </p>
                            </div>
                            <div style={{ 
                                fontSize: '2rem', 
                                fontWeight: 'bold', 
                                color: getScoreColor(standard.completeness_score) 
                            }}>
                                {standard.completeness_score}%
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div style={{ 
                            width: '100%', 
                            height: '10px', 
                            backgroundColor: 'var(--border-color)', 
                            borderRadius: '5px',
                            overflow: 'hidden',
                            marginBottom: '0.75rem'
                        }}>
                            <div style={{ 
                                width: `${standard.completeness_score}%`, 
                                height: '100%', 
                                backgroundColor: getScoreColor(standard.completeness_score),
                                transition: 'width 1s ease-in-out'
                            }} />
                        </div>

                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                            {standard.covered_count}/{standard.total_mandatory} {t('compliance.mandatoryKpis')}
                        </div>
                    </div>
                ))}
            </div>

            {/* Section KPIs manquants critiques */}
            {progressData.critical_missing.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            backgroundColor: '#ef4444', 
                            borderRadius: '50%',
                            marginRight: '0.75rem',
                            animation: 'pulse 2s infinite'
                        }} />
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                            {t('compliance.criticalMissing')}
                        </h3>
                    </div>
                    
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {t('compliance.criticalMissingDesc')}
                    </p>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                        {progressData.critical_missing.map((kpi, index) => (
                            <div 
                                key={`${kpi.standard}-${kpi.kpi_id}`}
                                style={{ 
                                    padding: '1rem', 
                                    backgroundColor: 'rgba(239, 68, 68, 0.05)', 
                                    borderRadius: '6px',
                                    borderLeft: '4px solid #ef4444',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        <span style={{ 
                                            backgroundColor: '#ef4444', 
                                            color: 'white', 
                                            padding: '0.15rem 0.5rem', 
                                            borderRadius: '4px', 
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {kpi.standard}
                                        </span>
                                        <strong style={{ fontSize: '0.9rem' }}>{kpi.kpi_id}</strong>
                                    </div>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {kpi.kpi_name}
                                    </p>
                                </div>
                                <span style={{ 
                                    backgroundColor: kpi.type === 'quantitative' ? '#3b82f6' : '#8b5cf6',
                                    color: 'white',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap',
                                    marginLeft: '1rem'
                                }}>
                                    {kpi.type === 'quantitative' ? t('compliance.quantitative') : t('compliance.narrative')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline réglementaire */}
            {timeline.length > 0 && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        📅 {t('compliance.regulatoryTimeline')}
                    </h3>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {timeline.map((item) => (
                            <div 
                                key={item.id}
                                style={{ 
                                    padding: '1rem', 
                                    backgroundColor: item.status === 'critical' 
                                        ? 'rgba(239, 68, 68, 0.05)' 
                                        : item.status === 'warning'
                                        ? 'rgba(245, 158, 11, 0.05)'
                                        : 'rgba(59, 130, 246, 0.05)',
                                    borderRadius: '6px',
                                    borderLeft: `4px solid ${getTimelineStatusColor(item.status)}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: '1rem'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <span style={{ 
                                            backgroundColor: getTimelineStatusColor(item.status),
                                            color: 'white',
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '4px',
                                            fontSize: '0.7rem',
                                            fontWeight: 'bold'
                                        }}>
                                            {getTimelineStatusLabel(item.status)}
                                        </span>
                                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 'bold' }}>
                                            {item.title}
                                        </h4>
                                    </div>
                                    <p style={{ margin: '0.25rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        {item.description}
                                    </p>
                                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                        {item.regulation}
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: getTimelineStatusColor(item.status) }}>
                                        {new Date(item.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </div>
                                    {item.days_remaining >= 0 ? (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {t('compliance.inDays', { count: item.days_remaining })}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                                            {t('compliance.passed')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer avec dernière mise à jour */}
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {t('compliance.lastUpdated', { date: new Date(progressData.last_updated).toLocaleString() })}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

export default ComplianceProgressDashboard;
