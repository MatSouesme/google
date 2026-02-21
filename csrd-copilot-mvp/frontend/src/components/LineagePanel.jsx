import React, { useState, useEffect } from 'react';
import { X, FileText, Download, ExternalLink, AlertCircle, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

import { useTranslation } from 'react-i18next';

const LineagePanel = ({ kpiId, value, standard, onClose }) => {
    const { t } = useTranslation();
    const [lineageData, setLineageData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (kpiId || value) {
            fetchLineage();
        }
    }, [kpiId, value, standard]);

    const fetchLineage = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            let response;
            
            // Strategy 1: Search by numeric value + standard (most reliable)
            if (value && standard) {
                const numericValue = value.replace(/[^\d.]/g, '');
                console.log(`[Lineage] Searching by value: "${numericValue}" standard: "${standard}"`);
                response = await fetch(
                    `${API_BASE_URL}/lineage/search?value=${encodeURIComponent(numericValue)}&standard=${encodeURIComponent(standard)}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                
                // If no results with standard filter, retry without standard
                if (response.ok) {
                    const data = await response.json();
                    if (data.sources && data.sources.length > 0) {
                        console.log(`[Lineage] Found ${data.sources.length} sources by value+standard`);
                        setLineageData(data);
                        return;
                    }
                }
                
                // Retry without standard filter
                console.log(`[Lineage] No results with standard filter, retrying without...`);
                response = await fetch(
                    `${API_BASE_URL}/lineage/search?value=${encodeURIComponent(numericValue)}`,
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.sources && data.sources.length > 0) {
                        console.log(`[Lineage] Found ${data.sources.length} sources by value only`);
                        setLineageData(data);
                        return;
                    }
                }
            }
            
            // Strategy 2: Search by KPI ID if we have a real one (not VALUE_LOOKUP)
            if (kpiId && kpiId !== 'VALUE_LOOKUP') {
                console.log(`[Lineage] Searching by KPI ID: "${kpiId}"`);
                response = await fetch(`${API_BASE_URL}/lineage/kpi/${encodeURIComponent(kpiId)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response && response.ok) {
                    const data = await response.json();
                    if (data.sources && data.sources.length > 0) {
                        console.log(`[Lineage] Found ${data.sources.length} sources by KPI ID`);
                        setLineageData(data);
                        return;
                    }
                }
            }
            
            console.log('[Lineage] No lineage data found for this value');
            setLineageData({ sources: [] });
        } catch (error) {
            console.error('Failed to fetch lineage:', error);
            setLineageData({ sources: [] });
        } finally {
            setLoading(false);
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
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '500px',
            height: '100vh',
            backgroundColor: 'var(--surface-color)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideInRight 0.3s ease-out'
        }}>
            {/* Header */}
            <div style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
            }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-color)', marginBottom: '0.25rem' }}>
                        {t('lineage.panelTitle')}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        {kpiId === 'VALUE_LOOKUP' ? (value || 'Data Point') : kpiId}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>{t('lineage.loadingData')}</p>
                    </div>
                ) : !lineageData || lineageData.sources.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 1rem' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {t('lineage.noSourcesFound')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Value Info */}
                        {value && (
                            <div style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderRadius: '8px',
                                marginBottom: '1.5rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                                    {t('lineage.valueUsed')}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {value}
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div style={{
                            padding: '1rem',
                            backgroundColor: 'var(--bg-color)',
                            borderRadius: '8px',
                            marginBottom: '1.5rem',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        {t('lineage.sourcesCount')}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                        {lineageData.sources.length}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                        {t('lineage.entriesCount')}
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                        {lineageData.sources.reduce((sum, s) => sum + s.entries.length, 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sources */}
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-color)', marginBottom: '1rem', textTransform: 'uppercase' }}>
                            {t('lineage.sourceDocuments')}
                        </h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {lineageData.sources.map((source, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        backgroundColor: 'var(--bg-color)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Source Header */}
                                    <div style={{
                                        padding: '1rem',
                                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                                            <FileText size={20} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                                                    {source.source_filename}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {source.entries.length} {t('lineage.extracts')}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadSource(source.source_filename)}
                                                style={{
                                                    padding: '0.5rem',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-color)',
                                                    display: 'flex',
                                                    alignItems: 'center'
                                                }}
                                                title={t('lineage.downloadDoc')}
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Entries */}
                                    <div style={{ padding: '1rem' }}>
                                        {source.entries.map((entry, entryIdx) => (
                                            <div
                                                key={entryIdx}
                                                style={{
                                                    marginBottom: entryIdx < source.entries.length - 1 ? '1rem' : 0,
                                                    paddingBottom: entryIdx < source.entries.length - 1 ? '1rem' : 0,
                                                    borderBottom: entryIdx < source.entries.length - 1 ? '1px solid var(--border-color)' : 'none'
                                                }}
                                            >
                                                {/* Value */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <CheckCircle2 size={16} color="#10b981" />
                                                    <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-color)' }}>
                                                        {entry.value} {entry.unit || ''}
                                                    </span>
                                                    {entry.confidence && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.125rem 0.5rem',
                                                            borderRadius: '12px',
                                                            backgroundColor: entry.confidence > 0.8 ? 'rgba(16, 185, 129, 0.1)' : entry.confidence > 0.6 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: entry.confidence > 0.8 ? '#10b981' : entry.confidence > 0.6 ? '#f59e0b' : '#ef4444',
                                                            fontWeight: '500'
                                                        }}>
                                                            {(entry.confidence * 100).toFixed(0)}% {t('lineage.confidence')}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Metadata */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                                    {entry.page_number && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <MapPin size={12} />
                                                            {t('lineage.page')} {entry.page_number}
                                                        </div>
                                                    )}
                                                    {entry.ingestion_timestamp && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <Clock size={12} />
                                                            {formatDate(entry.ingestion_timestamp)}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Snippet */}
                                                {entry.snippet && (
                                                    <div style={{
                                                        padding: '0.75rem',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                                        borderRadius: '6px',
                                                        fontSize: '0.8rem',
                                                        color: 'var(--text-secondary)',
                                                        fontStyle: 'italic',
                                                        lineHeight: '1.4'
                                                    }}>
                                                        "{entry.snippet}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LineagePanel;
