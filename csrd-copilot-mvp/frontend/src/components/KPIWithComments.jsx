import React, { useState } from 'react';
import CommentThread from '../components/CommentThread';

/**
 * Composant wrapper pour ajouter des commentaires à n'importe quel KPI
 * Utilisation : <KPIWithComments kpiId="E1-1" dataSource="manual_entry">
 */
const KPIWithComments = ({ 
    kpiId, 
    dataSource, 
    referenceId,
    children,
    showThreadByDefault = false,
    style = {}
}) => {
    const [showThread, setShowThread] = useState(showThreadByDefault);

    return (
        <div style={{ position: 'relative', ...style }}>
            {/* Contenu principal (le KPI lui-même) */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                    {children}
                </div>
                
                {/* Bouton pour toggle le thread de commentaires */}
                <button
                    onClick={() => setShowThread(!showThread)}
                    style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.85rem',
                        backgroundColor: showThread ? '#3b82f6' : 'transparent',
                        color: showThread ? 'white' : 'var(--text-secondary)',
                        border: `1px solid ${showThread ? '#3b82f6' : 'var(--border-color)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        whiteSpace: 'nowrap'
                    }}
                    title="Afficher/Masquer les commentaires"
                >
                    💬 {showThread ? 'Masquer' : 'Commentaires'}
                </button>
            </div>

            {/* Thread de commentaires (collapsible) */}
            {showThread && (
                <div style={{ 
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)'
                }}>
                    <CommentThread 
                        kpiId={kpiId}
                        dataSource={dataSource}
                        referenceId={referenceId}
                    />
                </div>
            )}
        </div>
    );
};

export default KPIWithComments;
