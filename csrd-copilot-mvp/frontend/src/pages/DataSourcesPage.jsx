import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Database, Search, Download, Eye, TrendingUp, Clock, User, Package, History, Loader2 } from 'lucide-react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

/**
 * Page des sources de données - Liste tous les documents importés via Smart Import
 * avec leurs KPIs extraits (lineage upstream: source → KPIs)
 */
const DataSourcesPage = () => {
    const { t } = useTranslation();
    const [sources, setSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [sourceDetails, setSourceDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [kpiHistory, setKpiHistory] = useState({}); // { [kpiId]: [{value, date, comment, user_email, submission_timestamp}] }
    const [loadingHistory, setLoadingHistory] = useState({}); // { [kpiId]: boolean }
    const [expandedKpis, setExpandedKpis] = useState(new Set()); // Set of expanded KPI IDs

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
                console.log('Sources fetched:', data.sources.length, 'documents'); // DEBUG
                setSources(data.sources || []);
            }
        } catch (error) {
            console.error('Failed to fetch sources:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSourceDetails = async (sourceFilename) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(
                `${API_BASE_URL}/lineage/source/${encodeURIComponent(sourceFilename)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setSourceDetails(data);

                // Charger automatiquement l'historique pour tous les KPIs
                const kpiIds = Object.keys(data.kpis || {});
                const allExpanded = new Set(kpiIds);
                setExpandedKpis(allExpanded);

                // Charger l'historique de tous les KPIs en parallèle
                kpiIds.forEach(kpiId => {
                    handleLoadHistory(kpiId);
                });
            }
        } catch (error) {
            console.error('Failed to fetch source details:', error);
        }
    };

    const handleSourceSelect = (source) => {
        setSelectedSource(source.source_filename);
        fetchSourceDetails(source.source_filename);
        setKpiHistory({}); // Reset history when changing source
        setExpandedKpis(new Set()); // Reset expanded KPIs
    };

    const handleLoadHistory = async (kpiId) => {
        setLoadingHistory(prev => ({ ...prev, [kpiId]: true }));

        try {
            const user = auth.currentUser;
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE_URL}/data/history?kpi_id=${kpiId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to load history");

            const data = await response.json();

            // Filter entries for this specific KPI and sort by timestamp
            const kpiEntries = data.entries.filter(e => e.kpi_id === kpiId);
            setKpiHistory(prev => ({ ...prev, [kpiId]: kpiEntries }));

        } catch (error) {
            console.error("Failed to load history:", error);
        } finally {
            setLoadingHistory(prev => ({ ...prev, [kpiId]: false }));
        }
    };

    const toggleKpiHistory = (kpiId) => {
        const newExpanded = new Set(expandedKpis);
        if (newExpanded.has(kpiId)) {
            newExpanded.delete(kpiId);
        } else {
            newExpanded.add(kpiId);
            // Load history if not already loaded
            if (!kpiHistory[kpiId]) {
                handleLoadHistory(kpiId);
            }
        }
        setExpandedKpis(newExpanded);
    };

    const handleDownloadSource = async (sourceFilename) => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(
                `${API_BASE_URL}/lineage/document/${encodeURIComponent(sourceFilename)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

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

    const getFileIcon = (sourceType) => {
        switch (sourceType) {
            case 'pdf': return { icon: FileText, color: '#ef4444' };
            case 'excel': return { icon: Package, color: '#10b981' };
            default: return { icon: FileText, color: '#6b7280' };
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    color: 'var(--text-color)'
                }}>
                    <Database size={32} color="#10b981" />
                    {t('dataSources.title', 'Sources de Données')}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '0.5rem' }}>
                    {t('dataSources.subtitle', 'Documents importés via Smart Import et leurs données extraites')}
                </p>
            </div>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <FileText size={32} color="#3b82f6" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                        {sources.length}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {t('dataSources.totalDocuments', 'Documents importés')}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <TrendingUp size={32} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                        {sources.reduce((sum, s) => sum + (s.kpi_count || 0), 0)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {t('dataSources.totalKpis', 'KPIs extraits')}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedSource ? '400px 1fr' : '1fr', gap: '1.5rem' }}>
                {/* Sources List */}
                <div className="card" style={{ padding: '1.5rem' }}>
                    {/* Search */}
                    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                        <Search size={18} style={{
                            position: 'absolute',
                            left: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)'
                        }} />
                        <input
                            type="text"
                            placeholder={t('dataSources.searchPlaceholder', 'Rechercher un document...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-color)',
                                color: 'var(--text-color)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>

                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', color: 'var(--text-color)' }}>
                        {t('dataSources.documentsTitle', 'Documents')} ({filteredSources.length})
                    </h3>

                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                            {t('common.loading', 'Chargement...')}
                        </p>
                    ) : filteredSources.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                            <p>{t('dataSources.noDocuments', 'Aucun document importé')}</p>
                            <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                {t('dataSources.importHint', 'Utilisez Smart Import pour ajouter des documents')}
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '600px', overflowY: 'auto' }}>
                            {filteredSources.map((source, idx) => {
                                const { icon: Icon, color } = getFileIcon(source.source_type);
                                const isSelected = selectedSource === source.source_filename;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleSourceSelect(source)}
                                        style={{
                                            padding: '1rem',
                                            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-color)',
                                            borderRadius: '8px',
                                            border: `1px solid ${isSelected ? '#10b981' : 'var(--border-color)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                                            <Icon size={20} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontWeight: '500',
                                                    color: 'var(--text-color)',
                                                    marginBottom: '0.5rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {source.source_filename}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-secondary)',
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '0.75rem'
                                                }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                        <TrendingUp size={12} />
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
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Source Details */}
                {selectedSource && sourceDetails && (
                    <div className="card" style={{ padding: '1.5rem' }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                            marginBottom: '2rem',
                            paddingBottom: '1rem',
                            borderBottom: '2px solid var(--border-color)'
                        }}>
                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.5rem' }}>
                                    {selectedSource}
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    {sourceDetails.total_kpis} {t('dataSources.kpisExtracted', 'KPIs extraits de ce document')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDownloadSource(selectedSource)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.6rem 1.2rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    borderRadius: '8px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500'
                                }}
                            >
                                <Download size={16} />
                                {t('common.download', 'Télécharger')}
                            </button>
                        </div>

                        {/* KPIs List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
                            {Object.entries(sourceDetails.kpis).map(([kpiId, entries]) => (
                                <div
                                    key={kpiId}
                                    style={{
                                        padding: '1.25rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)'
                                    }}
                                >
                                    {/* KPI Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1rem'
                                    }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: 'var(--text-color)',
                                            fontSize: '1rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            <TrendingUp size={18} color="#10b981" />
                                            {kpiId}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <button
                                                onClick={() => toggleKpiHistory(kpiId)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.4rem 0.8rem',
                                                    backgroundColor: expandedKpis.has(kpiId) ? '#10b981' : 'transparent',
                                                    color: expandedKpis.has(kpiId) ? 'white' : '#10b981',
                                                    border: '1px solid #10b981',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                <History size={14} />
                                                {expandedKpis.has(kpiId) ? t('dataSources.hideHistory', 'Masquer') : t('dataSources.showHistory', 'Afficher')}
                                            </button>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                color: '#10b981',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                fontWeight: '500'
                                            }}>
                                                {entries.length} {entries.length > 1 ? t('dataSources.extractions', 'extractions') : t('dataSources.extraction', 'extraction')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* History Section */}
                                    {expandedKpis.has(kpiId) && kpiHistory[kpiId] && kpiHistory[kpiId].length > 0 && (
                                        <div style={{
                                            marginBottom: '1.5rem',
                                            padding: '1rem',
                                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <h5 style={{
                                                fontSize: '0.9rem',
                                                marginBottom: '0.75rem',
                                                color: '#10b981',
                                                fontWeight: '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                <History size={16} />
                                                {t('dataSources.fullHistory', 'Historique complet')} ({kpiHistory[kpiId].length} {kpiHistory[kpiId].length > 1 ? t('dataSources.entries', 'entrées') : t('dataSources.entry', 'entrée')})
                                            </h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {kpiHistory[kpiId].map((histEntry, histIdx) => (
                                                    <div key={histIdx} style={{
                                                        padding: '0.75rem',
                                                        backgroundColor: histIdx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-color)',
                                                        borderRadius: '6px',
                                                        border: histIdx === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                                                        display: 'grid',
                                                        gridTemplateColumns: '80px 1fr auto',
                                                        gap: '0.75rem',
                                                        alignItems: 'center',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        <div>
                                                            {histIdx === 0 && (
                                                                <span style={{
                                                                    fontSize: '0.7rem',
                                                                    backgroundColor: '#10b981',
                                                                    color: 'white',
                                                                    padding: '0.2rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 'bold'
                                                                }}>
                                                                    {t('dataSources.current', 'ACTUEL')}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.25rem' }}>
                                                                {histEntry.value} {histEntry.unit}
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                                {histEntry.date ? `Date: ${new Date(histEntry.date).toLocaleDateString('fr-FR')}` : ''}
                                                                {histEntry.comment && ` • ${histEntry.comment}`}
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                            <div>{histEntry.user_email}</div>
                                                            <div>{new Date(histEntry.submission_timestamp).toLocaleString('fr-FR')}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extractions from Smart Import */}
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <h5 style={{
                                            fontSize: '0.85rem',
                                            color: 'var(--text-secondary)',
                                            fontWeight: '500',
                                            marginBottom: '0.75rem'
                                        }}>
                                            {t('dataSources.smartImportExtractions', 'Extractions Smart Import :')}
                                        </h5>
                                    </div>
                                    {entries.map((entry, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                marginTop: idx > 0 ? '1rem' : 0,
                                                paddingTop: idx > 0 ? '1rem' : 0,
                                                borderTop: idx > 0 ? '1px solid var(--border-color)' : 'none'
                                            }}
                                        >
                                            {/* Value */}
                                            <div style={{
                                                fontSize: '1.2rem',
                                                fontWeight: 'bold',
                                                color: '#10b981',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {entry.value} {entry.unit || ''}
                                            </div>

                                            {/* Metadata Grid */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                                gap: '0.75rem',
                                                fontSize: '0.85rem',
                                                marginBottom: '0.75rem'
                                            }}>
                                                {entry.date && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-secondary)' }}>{t('dataSources.date', 'Date')} : </span>
                                                        <span style={{ color: 'var(--text-color)', fontWeight: '500' }}>{entry.date}</span>
                                                    </div>
                                                )}
                                                {entry.page_number && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-secondary)' }}>{t('dataSources.page', 'Page')} : </span>
                                                        <span style={{ color: 'var(--text-color)', fontWeight: '500' }}>{entry.page_number}</span>
                                                    </div>
                                                )}
                                                {entry.confidence && (
                                                    <div>
                                                        <span style={{ color: 'var(--text-secondary)' }}>{t('dataSources.confidence', 'Confiance')} : </span>
                                                        <span style={{
                                                            color: entry.confidence > 0.8 ? '#10b981' : entry.confidence > 0.6 ? '#f59e0b' : '#ef4444',
                                                            fontWeight: '600'
                                                        }}>
                                                            {(entry.confidence * 100).toFixed(0)}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Snippet */}
                                            {entry.snippet && (
                                                <div style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                                    borderRadius: '6px',
                                                    fontSize: '0.85rem',
                                                    color: 'var(--text-secondary)',
                                                    fontStyle: 'italic',
                                                    lineHeight: '1.5',
                                                    borderLeft: '3px solid #10b981'
                                                }}>
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

export default DataSourcesPage;
