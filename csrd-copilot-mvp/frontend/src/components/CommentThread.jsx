import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

const CommentThread = ({ kpiId, dataSource, referenceId, datapointId, datapointValue }) => {
    const [comments, setComments] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [commentType, setCommentType] = useState('comment');
    const [replyTo, setReplyTo] = useState(null);
    const [showResolved, setShowResolved] = useState(false);
    const [error, setError] = useState(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (kpiId) {
            fetchComments();
            fetchSummary();
        }
    }, [kpiId, showResolved]);

    const fetchComments = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(
                `${API_BASE_URL}/comments/${kpiId}?include_resolved=${showResolved}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setComments(data.comments || []);
            } else {
                setError('Failed to load comments');
            }
        } catch (err) {
            console.error('Error fetching comments:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(
                `${API_BASE_URL}/comments/${kpiId}/summary`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSummary(data);
            }
        } catch (err) {
            console.error('Error fetching summary:', err);
        }
    };

    const submitComment = async () => {
        if (!newComment.trim()) return;

        try {
            const user = auth.currentUser;
            if (!user) {
                setError('You must be logged in to comment');
                return;
            }

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    kpi_id: kpiId,
                    comment_text: newComment,
                    comment_type: commentType,
                    parent_comment_id: replyTo?.comment_id || null,
                    data_source: dataSource,
                    reference_id: referenceId,
                    datapoint_id: datapointId,
                    datapoint_value: datapointValue
                })
            });

            if (response.ok) {
                setNewComment('');
                setCommentType('comment');
                setReplyTo(null);
                await fetchComments();
                await fetchSummary();
            } else {
                setError('Failed to post comment');
            }
        } catch (err) {
            console.error('Error posting comment:', err);
            setError(err.message);
        }
    };

    const resolveComment = async (commentId) => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/comments/${commentId}/resolve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchComments();
                await fetchSummary();
            }
        } catch (err) {
            console.error('Error resolving comment:', err);
        }
    };

    const deleteComment = async (commentId) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) return;

        try {
            const user = auth.currentUser;
            if (!user) return;

            const token = await user.getIdToken();
            const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                await fetchComments();
                await fetchSummary();
            }
        } catch (err) {
            console.error('Error deleting comment:', err);
        }
    };

    const getCommentTypeColor = (type) => {
        switch (type) {
            case 'question': return '#3b82f6';
            case 'alert': return '#ef4444';
            case 'comment': return '#6b7280';
            default: return '#6b7280';
        }
    };

    const getCommentTypeIcon = (type) => {
        switch (type) {
            case 'question': return '❓';
            case 'alert': return '⚠️';
            case 'comment': return '💬';
            default: return '💬';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'À l\'instant';
        if (diffMins < 60) return `Il y a ${diffMins} min`;
        if (diffHours < 24) return `Il y a ${diffHours}h`;
        if (diffDays < 7) return `Il y a ${diffDays}j`;
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderComment = (comment, depth = 0) => {
        const isResolved = comment.is_resolved;
        const currentUser = auth.currentUser;
        const isAuthor = currentUser && comment.author_email === currentUser.email;

        return (
            <div key={comment.comment_id} style={{ marginLeft: depth > 0 ? '2rem' : '0' }}>
                <div 
                    style={{ 
                        padding: '1rem',
                        backgroundColor: isResolved ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-secondary)',
                        borderRadius: '8px',
                        marginBottom: '0.75rem',
                        borderLeft: `4px solid ${getCommentTypeColor(comment.comment_type)}`,
                        opacity: isResolved ? 0.7 : 1
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                            <span style={{ fontSize: '1.2rem' }}>
                                {getCommentTypeIcon(comment.comment_type)}
                            </span>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <strong style={{ fontSize: '0.9rem' }}>{comment.author_name || comment.author_email}</strong>
                                    <span style={{ 
                                        fontSize: '0.7rem', 
                                        backgroundColor: comment.author_role === 'admin' ? '#8b5cf6' : '#6b7280',
                                        color: 'white',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '3px'
                                    }}>
                                        {comment.author_role}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {formatDate(comment.created_at)}
                                    {isResolved && (
                                        <span style={{ marginLeft: '0.5rem', color: '#10b981' }}>
                                            ✓ Résolu par {comment.resolved_by}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => {
                                    setReplyTo(comment);
                                    textareaRef.current?.focus();
                                }}
                                style={{ 
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'transparent',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Répondre
                            </button>
                            {!isResolved && comment.comment_type !== 'comment' && (
                                <button
                                    onClick={() => resolveComment(comment.comment_id)}
                                    style={{ 
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Résoudre
                                </button>
                            )}
                            {isAuthor && (
                                <button
                                    onClick={() => deleteComment(comment.comment_id)}
                                    style={{ 
                                        fontSize: '0.75rem',
                                        padding: '0.25rem 0.5rem',
                                        backgroundColor: 'transparent',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Supprimer
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Comment text */}
                    <div style={{ 
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap'
                    }}>
                        {comment.comment_text}
                    </div>

                    {/* Tags */}
                    {comment.tags && comment.tags.length > 0 && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {comment.tags.map((tag, i) => (
                                <span key={i} style={{ 
                                    fontSize: '0.7rem',
                                    backgroundColor: 'var(--border-color)',
                                    padding: '0.15rem 0.4rem',
                                    borderRadius: '3px'
                                }}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                    <div>
                        {comment.replies.map(reply => renderComment(reply, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Chargement des commentaires...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Summary Header */}
            {summary && summary.total_comments > 0 && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '6px'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                        <span>💬 {summary.total_comments} commentaire{summary.total_comments > 1 ? 's' : ''}</span>
                        {summary.unresolved_count > 0 && (
                            <span style={{ color: '#ef4444' }}>
                                ⚠️ {summary.unresolved_count} non résolu{summary.unresolved_count > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={showResolved}
                            onChange={(e) => setShowResolved(e.target.checked)}
                        />
                        Afficher résolus
                    </label>
                </div>
            )}

            {/* New Comment Form */}
            <div className="card" style={{ padding: '1rem' }}>
                {replyTo && (
                    <div style={{ 
                        marginBottom: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>↪️ Réponse à <strong>{replyTo.author_name}</strong></span>
                        <button
                            onClick={() => setReplyTo(null)}
                            style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1rem'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    {['comment', 'question', 'alert'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setCommentType(type)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                fontSize: '0.8rem',
                                backgroundColor: commentType === type ? getCommentTypeColor(type) : 'transparent',
                                color: commentType === type ? 'white' : 'var(--text-primary)',
                                border: `1px solid ${getCommentTypeColor(type)}`,
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {getCommentTypeIcon(type)} {type === 'comment' ? 'Commentaire' : type === 'question' ? 'Question' : 'Alerte'}
                        </button>
                    ))}
                </div>

                <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                        commentType === 'question' ? 'Posez une question sur ce KPI...' :
                        commentType === 'alert' ? 'Signalez un problème...' :
                        'Ajoutez un commentaire... (Utilisez @email pour mentionner)'
                    }
                    style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        fontSize: '0.9rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        marginBottom: '0.5rem'
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {replyTo && (
                        <button
                            onClick={() => {
                                setReplyTo(null);
                                setNewComment('');
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                        >
                            Annuler
                        </button>
                    )}
                    <button
                        onClick={submitComment}
                        disabled={!newComment.trim()}
                        className="btn btn-primary"
                        style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                        {replyTo ? 'Répondre' : 'Publier'}
                    </button>
                </div>
            </div>

            {/* Comments List */}
            {error && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
                    {error}
                </div>
            )}

            {comments.length === 0 ? (
                <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px'
                }}>
                    💬 Aucun commentaire pour le moment. Soyez le premier à commenter !
                </div>
            ) : (
                <div>
                    {comments.map(comment => renderComment(comment))}
                </div>
            )}
        </div>
    );
};

export default CommentThread;
