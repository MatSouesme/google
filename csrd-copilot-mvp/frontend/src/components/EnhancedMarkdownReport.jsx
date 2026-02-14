import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ValueWithComments from './ValueWithComments';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

/**
 * Enhanced Markdown renderer qui détecte automatiquement les valeurs numériques
 * et les rend cliquables pour afficher les commentaires associés
 */
const EnhancedMarkdownReport = ({ content, kpiId, standard }) => {
    const [lineageMap, setLineageMap] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (kpiId) {
            fetchLineageForKpi();
        }
    }, [kpiId]);

    const fetchLineageForKpi = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            // Récupérer le lineage pour ce KPI
            const response = await fetch(
                `${API_BASE_URL}/lineage/kpi/${encodeURIComponent(kpiId)}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.ok) {
                const data = await response.json();
                // Créer un map : valeur numérique -> lineage_id
                const map = {};
                if (data.sources) {
                    data.sources.forEach(source => {
                        source.entries.forEach(entry => {
                            // Nettoyer la valeur pour la comparaison
                            const cleanValue = String(entry.value).replace(/[^\d.-]/g, '');
                            if (cleanValue) {
                                map[cleanValue] = {
                                    lineage_id: entry.lineage_id,
                                    value: entry.value,
                                    unit: entry.unit,
                                    source: source.source_filename,
                                    confidence: entry.confidence
                                };
                            }
                        });
                    });
                }
                setLineageMap(map);
            }
        } catch (error) {
            console.error('Failed to fetch lineage:', error);
        } finally {
            setLoading(false);
        }
    };

    // Custom renderer pour détecter et enrichir les valeurs numériques
    const components = {
        p: ({ children }) => {
            return <p>{processTextWithValues(children)}</p>;
        },
        li: ({ children }) => {
            return <li>{processTextWithValues(children)}</li>;
        },
        td: ({ children }) => {
            return <td>{processTextWithValues(children)}</td>;
        }
    };

    const processTextWithValues = (children) => {
        if (typeof children === 'string') {
            return parseAndEnrichValues(children);
        }

        if (Array.isArray(children)) {
            return children.map((child, idx) => {
                if (typeof child === 'string') {
                    return <React.Fragment key={idx}>{parseAndEnrichValues(child)}</React.Fragment>;
                }
                return child;
            });
        }

        return children;
    };

    const parseAndEnrichValues = (text) => {
        // Regex pour détecter : nombre (avec espaces, virgules, points) + unité optionnelle
        // Exemples: "1,234 tCO2e", "42%", "1 234.56 EUR", "15.5"
        const valuePattern = /(\d[\d\s,.']*\d|\d+)\s*([a-zA-Z%€$£]+)?/g;
        
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = valuePattern.exec(text)) !== null) {
            const fullMatch = match[0];
            const numericPart = match[1];
            const unitPart = match[2] || '';
            
            // Ajouter le texte avant le match
            if (match.index > lastIndex) {
                parts.push(text.substring(lastIndex, match.index));
            }

            // Nettoyer le nombre pour chercher dans lineageMap
            const cleanNumber = numericPart.replace(/[\s,']/g, '');
            const lineageData = lineageMap[cleanNumber];

            if (lineageData && !loading) {
                // Valeur avec lineage → composant interactif
                parts.push(
                    <ValueWithComments
                        key={`value-${match.index}`}
                        value={numericPart}
                        unit={unitPart}
                        datapointId={lineageData.lineage_id}
                        kpiId={kpiId}
                    />
                );
            } else {
                // Valeur sans lineage ou en cours de chargement → texte normal
                parts.push(fullMatch);
            }

            lastIndex = match.index + fullMatch.length;
        }

        // Ajouter le reste du texte
        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts.length > 0 ? parts : text;
    };

    if (loading) {
        return (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Enrichissement du contenu avec les métadonnées...
            </div>
        );
    }

    return (
        <div className="enhanced-markdown">
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={components}
            >
                {content}
            </ReactMarkdown>

            {Object.keys(lineageMap).length > 0 && (
                <div style={{
                    marginTop: '2rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)'
                }}>
                    💡 <strong>Astuce :</strong> Les valeurs surlignées sont liées à des données sources. 
                    Survolez-les pour voir les commentaires et la traçabilité.
                </div>
            )}
        </div>
    );
};

export default EnhancedMarkdownReport;
