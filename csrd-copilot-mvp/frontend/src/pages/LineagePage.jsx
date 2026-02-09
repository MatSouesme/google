import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Database, TrendingUp, Download, ExternalLink, Search, Filter, Clock, User } from 'lucide-react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

const LineagePage = () => {
    const { t } = useTranslation();
    const [sources, setSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [sourceLineage, setSourceLineage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchAllSources();
    }, []);

    const fetchAllSources = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/lineage/sources`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSources(data.sources || []);
            }
        } catch (error) {
            console.error('Failed to fetch sources:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSourceClick = async (sourceFilename) => {
        setSelectedSource(sourceFilename);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/lineage/source/${encodeURIComponent(sourceFilename)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSourceLineage(data);
            }
        } catch (error) {
            console.error('Failed to fetch source lineage:', error);
        }
    };

    const handleDownloadSource = async (sourceFilename) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/lineage/document/${encodeURIComponent(sourceFilename)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = sourceFilename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }
        } catch (error) {
            console.error('Failed to download source:', error);
        }
    };

    const filteredSources = sources.filter(source =>
        source.source_filename?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            return new Date(timestamp).toLocaleString('fr-FR', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return timestamp;
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-color)' }}>
                    <TrendingUp size={32} color="var(--primary-color)" />
                    {t('lineage.title', 'Data Lineage')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '0.5rem' }}>
                    {t('lineage.subtitle', 'Tracez chaque donnée de sa source originale à son utilisation finale dans les rapports')}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedSource ? '1fr 2fr' : '1fr', gap: '2rem' }}>
                {/* Sources List */}
                <div style={{
                    backgroundColor: 'var(--surface-color)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="text"
                                placeholder={t('lineage.search', 'Rechercher une source...')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-color)',
                                    color: 'var(--text-color)'
                                }}
                            />
                        </div>
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-color)' }}>
                        {t('lineage.sources', 'Sources de Données')} ({filteredSources.length})
                    </h3>

                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Chargement...</p>
                    ) : filteredSources.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Aucune source trouvée</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                            {filteredSources.map((source, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSourceClick(source.source_filename)}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: selectedSource === source.source_filename ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-color)',
                                        borderRadius: '8px',
                                        border: `1px solid ${selectedSource === source.source_filename ? '#3b82f6' : 'var(--border-color)'}`,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                                        <FileText size={20} color={source.source_type === 'pdf' ? '#ef4444' : '#3b82f6'} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: '500', color: 'var(--text-color)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {source.source_filename}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Database size={12} />
                                                    {source.kpi_count} KPIs
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <Clock size={12} />
                                                    {formatDate(source.last_used)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Lineage Details */}
                {selectedSource && sourceLineage && (
                    <div style={{
                        backgroundColor: 'var(--surface-color)',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.5rem' }}>
                                    {selectedSource}
                                </h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    {sourceLineage.total_kpis} KPIs dérivés de cette source
                                </p>
                            </div>
                            <button
                                onClick={() => handleDownloadSource(selectedSource)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                <Download size={16} />
                                Télécharger
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                            {Object.entries(sourceLineage.kpis).map(([kpiId, entries]) => (
                                <div
                                    key={kpiId}
                                    style={{
                                        padding: '1rem',
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                                        {kpiId}
                                    </div>
                                    {entries.map((entry, idx) => (
                                        <div key={idx} style={{ marginBottom: idx < entries.length - 1 ? '0.75rem' : 0, paddingBottom: idx < entries.length - 1 ? '0.75rem' : 0, borderBottom: idx < entries.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.875rem' }}>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Valeur: </span>
                                                    <span style={{ color: 'var(--text-color)', fontWeight: '500' }}>{entry.value} {entry.unit || ''}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Date: </span>
                                                    <span style={{ color: 'var(--text-color)' }}>{entry.date || 'N/A'}</span>
                                                </div>
                                                {entry.page_number && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Page: </span>
                                                        <span style={{ color: 'var(--text-color)' }}>{entry.page_number}</span>
                                                    </div>
                                                )}
                                                {entry.confidence && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-secondary)' }}>Confiance: </span>
                                                        <span style={{ color: entry.confidence > 0.8 ? '#10b981' : entry.confidence > 0.6 ? '#f59e0b' : '#ef4444', fontWeight: '500' }}>
                                                            {(entry.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {entry.snippet && (
                                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    "{entry.snippet}"
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LineagePage;
