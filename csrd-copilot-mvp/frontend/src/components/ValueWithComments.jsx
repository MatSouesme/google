import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

/**
 * Composant pour afficher une valeur avec ses commentaires au survol
 * Utilisé dans les drafts générés pour montrer la traçabilité et discussions
 */
const ValueWithComments = ({ 
    value, 
    datapointId, 
    kpiId,
    unit = '',
    className = '',
    style = {}
}) => {
    const { t } = useTranslation();
    const [comments, setComments] = useState([]);
    const [showTooltip, setShowTooltip] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (showTooltip && datapointId && comments.length === 0) {
            fetchComments();
        }
    }, [showTooltip, datapointId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch(
                `${API_BASE_URL}/comments/datapoint/${encodeURIComponent(datapointId)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            }
        } catch (error) {
            console.error('Failed to fetch datapoint comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const unresolvedCount = comments.filter(c => !c.is_resolved && ['question', 'alert'].includes(c.comment_type)).length;
    const hasComments = comments.length > 0;
    const hasUnresolved = unresolvedCount > 0;

    return (
        <span
            className={`value-with-comments ${className}`}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.15rem 0.35rem',
                borderRadius: '4px',
                backgroundColor: hasUnresolved ? 'rgba(239, 68, 68, 0.1)' : hasComments ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: hasComments ? '1px solid ' + (hasUnresolved ? '#ef4444' : '#3b82f6') : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...style
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <span style={{ fontWeight: hasComments ? '600' : 'normal' }}>
                {value} {unit}
            </span>
            
            {hasComments && (
                <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    fontSize: '0.75rem',
                    color: hasUnresolved ? '#ef4444' : '#3b82f6'
                }}>
                    {hasUnresolved ? (
                        <AlertCircle size={14} />
                    ) : (
                        <MessageCircle size={14} />
                    )}
                    <span style={{ marginLeft: '0.15rem', fontWeight: '600' }}>
                        {comments.length}
                    </span>
                </span>
            )}

            {/* Tooltip */}
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '0.5rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    minWidth: '300px',
                    maxWidth: '400px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <div style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-color)' }}>
                            {t('comments.commentsOnValue')}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            KPI: {kpiId} • Valeur: {value} {unit}
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem' }}>
                            {t('common.loading')}
                        </div>
                    ) : comments.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem', fontSize: '0.85rem' }}>
                            {t('comments.noCommentsDatapoint')}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {comments.map((comment) => (
                                <div 
                                    key={comment.comment_id}
                                    style={{
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '6px',
                                        borderLeft: `3px solid ${
                                            comment.comment_type === 'alert' ? '#ef4444' :
                                            comment.comment_type === 'question' ? '#f59e0b' :
                                            '#3b82f6'
                                        }`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color)' }}>
                                            {comment.author_name || comment.author_email}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                            {new Date(comment.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-color)', lineHeight: '1.4' }}>
                                        {comment.comment_text}
                                    </div>
                                    {comment.is_resolved && (
                                        <div style={{ 
                                            marginTop: '0.5rem', 
                                            fontSize: '0.7rem', 
                                            color: '#10b981',
                                            fontWeight: '500'
                                        }}>
                                            ✓ {t('comments.resolvedBy', { name: comment.resolved_by })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .value-with-comments:hover {
                    transform: scale(1.02);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </span>
    );
};

export default ValueWithComments;
