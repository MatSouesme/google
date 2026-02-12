import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/apiClient';
import CommentThread from '../components/CommentThread';

const DiscussionsPage = () => {
    const { t } = useTranslation();
    const [kpis, setKpis] = useState([]);
    const [selectedKpi, setSelectedKpi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'unresolved', 'my_mentions'

    useEffect(() => {
        fetchKPIsWithComments();
    }, [filter]);

    const fetchKPIsWithComments = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();

            // Récupérer tous les standards avec leurs KPIs
            const standards = ['e1', 'g1'];
            const allKpis = [];

            for (const standard of standards) {
                const response = await fetch(
                    `${API_BASE_URL}/analytics/gap-analysis?standard=${standard}`,
                    {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const kpisWithStandard = data.missing_kpis.map(kpi => ({
                        ...kpi,
                        standard: standard.toUpperCase()
                    }));
                    allKpis.push(...kpisWithStandard);
                }
            }

            // Pour chaque KPI, récupérer le résumé des commentaires
            const kpisWithComments = await Promise.all(
                allKpis.map(async (kpi) => {
                    try {
                        const summaryResponse = await fetch(
                            `${API_BASE_URL}/comments/${kpi.id}/summary`,
                            {
                                headers: { 'Authorization': `Bearer ${token}` }
                            }
                        );

                        if (summaryResponse.ok) {
                            const summary = await summaryResponse.json();
                            return {
                                ...kpi,
                                commentSummary: summary
                            };
                        }
                    } catch (err) {
                        console.error(`Error fetching summary for ${kpi.id}:`, err);
                    }
                    return kpi;
                })
            );

            // Filtrer selon le filtre actif
            let filtered = kpisWithComments;
            if (filter === 'unresolved') {
                filtered = kpisWithComments.filter(
                    kpi => kpi.commentSummary?.unresolved_count > 0
                );
            }

            setKpis(filtered);
        } catch (error) {
            console.error('Error fetching KPIs with comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTotalUnresolved = () => {
        return kpis.reduce((sum, kpi) => sum + (kpi.commentSummary?.unresolved_count || 0), 0);
    };

    const getTotalComments = () => {
        return kpis.reduce((sum, kpi) => sum + (kpi.commentSummary?.total_comments || 0), 0);
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                    {t('common.loading', 'Chargement...')}
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>
                    💬 {t('discussions.title')}
                </h1>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                    {t('discussions.subtitle')}
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {getTotalComments()}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {t('discussions.totalComments')}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ef4444' }}>
                        {getTotalUnresolved()}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {t('discussions.unresolved')}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981' }}>
                        {kpis.filter(k => k.commentSummary?.total_comments > 0).length}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {t('discussions.kpisDiscussed')}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={() => setFilter('all')}
                    className={filter === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                    {t('discussions.filterAll')}
                </button>
                <button
                    onClick={() => setFilter('unresolved')}
                    className={filter === 'unresolved' ? 'btn btn-primary' : 'btn btn-secondary'}
                    style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                >
                    ⚠️ {t('discussions.filterUnresolved')} ({getTotalUnresolved()})
                </button>
            </div>

            {/* Content - Split View */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedKpi ? '400px 1fr' : '1fr', gap: '1.5rem' }}>
                {/* KPI List */}
                <div>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                        {t('discussions.kpisListTitle')} ({kpis.length})
                    </h2>

                    {kpis.length === 0 ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {filter === 'unresolved'
                                ? t('discussions.emptyUnresolved')
                                : t('discussions.emptyAll')}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {kpis.map((kpi) => (
                                <div
                                    key={kpi.id}
                                    onClick={() => setSelectedKpi(kpi)}
                                    className="card"
                                    style={{
                                        padding: '1rem',
                                        cursor: 'pointer',
                                        border: selectedKpi?.id === kpi.id ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                                        backgroundColor: selectedKpi?.id === kpi.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span style={{
                                                    backgroundColor: kpi.standard === 'E1' ? '#10b981' : '#8b5cf6',
                                                    color: 'white',
                                                    padding: '0.15rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {kpi.standard}
                                                </span>
                                                <strong style={{ fontSize: '0.9rem' }}>{kpi.id}</strong>
                                            </div>
                                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                {kpi.name}
                                            </p>
                                        </div>

                                        {/* Comment badges */}
                                        {kpi.commentSummary && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                                                {kpi.commentSummary.total_comments > 0 && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: '#3b82f6',
                                                        color: 'white',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px'
                                                    }}>
                                                        💬 {kpi.commentSummary.total_comments}
                                                    </span>
                                                )}
                                                {kpi.commentSummary.unresolved_count > 0 && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '12px'
                                                    }}>
                                                        ⚠️ {kpi.commentSummary.unresolved_count}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Comment Thread View */}
                {selectedKpi && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>
                                    {selectedKpi.id} - {selectedKpi.name}
                                </h2>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    ESRS {selectedKpi.standard}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedKpi(null)}
                                style={{
                                    padding: '0.5rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '1rem'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        <CommentThread
                            kpiId={selectedKpi.id}
                            dataSource="discussion_page"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiscussionsPage;
