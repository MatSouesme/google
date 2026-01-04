import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertTriangle, XCircle, Play, FileText, Zap, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { API_BASE_URL } from '../api/apiClient';
import Alert from '../components/Alert';
import Markdown from 'react-markdown';

const EcovadisPage = () => {
    const [loading, setLoading] = useState(false);
    const [auditResults, setAuditResults] = useState(null);
    const [error, setError] = useState(null);
    const [expandedItems, setExpandedItems] = useState({});

    const runAudit = async () => {
        setLoading(true);
        setError(null);

        // Setup timeout (5 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 300000);

        try {
            const response = await fetch(`${API_BASE_URL}/ecovadis/scan`, {
                method: 'POST',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Audit failed: ${response.status} ${response.statusText}`);
            const data = await response.json();
            setAuditResults(data);

            const newExpanded = {};
            data.results.forEach(item => {
                if (item.status !== 'Conforme') {
                    newExpanded[item.criterion_id] = true;
                }
            });
            setExpandedItems(newExpanded);

        } catch (err) {
            if (err.name === 'AbortError') {
                setError("Délai d'attente dépassé. L'IA analyse beaucoup de documents.");
            } else {
                setError(err.message + " (Si vous avez MetaMask, désactivez-le).");
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Conforme':
                return <span className="badge badge-success" style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14} /> Conforme</span>;
            case 'Partiel':
                return <span className="badge badge-warning" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14} /> Partiel</span>;
            case 'Non Conforme':
                return <span className="badge badge-error" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={14} /> Non Conforme</span>;
            default:
                return <span className="badge" style={{ backgroundColor: '#f3f4f6', color: '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{status}</span>;
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/EcoVadis-Logo-Leaf_only.png" alt="EcoVadis" style={{ height: '32px' }} onError={(e) => { e.target.style.display = 'none' }} />
                    EcoVadis Audit Agent
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Analysez automatiquement vos documents internes pour vérifier votre conformité aux critères EcoVadis.
                </p>
            </div>

            {error && (
                <div style={{ marginBottom: '1rem' }}>
                    <Alert type="error" title="Erreur" message={error} />
                </div>
            )}

            {!auditResults && !loading && (
                <div className="card" style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                    <FileText size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
                    <h3 style={{ marginBottom: '1rem' }}>Prêt à auditer vos documents</h3>
                    <p style={{ marginBottom: '2rem', color: 'var(--text-secondary)' }}>
                        Déposez vos PDF dans le dossier <code>data/company_docs</code>.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={runAudit}
                        style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto' }}
                    >
                        <Play size={20} /> Lancer l'Audit Automatique
                    </button>
                </div>
            )}

            {loading && (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <Loader2 size={48} className="spin" style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                    <h3>Analyse IA Expert en cours...</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Vérification des critères, détection des signatures et analyse cross-documents.</p>
                </div>
            )}

            {auditResults && (
                <div className="animate-fade-in">

                    {/* FORMALITY CHECK SECTION */}
                    {auditResults.formality_check && auditResults.formality_check.length > 0 && (
                        <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={20} color="#475569" />
                                Hygiène Documentaire (Checklist Formelle)
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                                            <th style={{ padding: '0.75rem' }}>Document</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Logo/Nom</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Date</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'center' }}>Signature</th>
                                            <th style={{ padding: '0.75rem' }}>Commentaire</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditResults.formality_check.map((doc, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                <td style={{ padding: '0.75rem', fontWeight: '500' }}>{doc.doc_name}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {doc.has_logo ? <CheckCircle size={16} color="green" /> : <XCircle size={16} color="red" />}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {doc.has_date ? <CheckCircle size={16} color="green" /> : <XCircle size={16} color="red" />}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                    {doc.has_signature ? <CheckCircle size={16} color="green" /> : <XCircle size={16} color="red" />}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>{doc.comment}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                            <strong>{auditResults.total_docs_scanned}</strong> documents analysés.
                        </div>
                        <button className="btn btn-primary" onClick={runAudit} disabled={loading} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '0.5rem 1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <Play size={16} /> Relancer l'analyse
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {auditResults.results.map((item) => (
                            <div key={item.criterion_id} className="card" style={{
                                padding: '1.5rem',
                                borderLeft: item.status === 'Conforme' ? '4px solid #10B981' : item.status === 'Partiel' ? '4px solid #F59E0B' : '4px solid #EF4444',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => toggleExpand(item.criterion_id)}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.criterion_id}</span>
                                            {getStatusBadge(item.status)}
                                        </div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>{item.criterion_name}</h3>
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)' }}>
                                        {expandedItems[item.criterion_id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {expandedItems[item.criterion_id] && (
                                    <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>EVIDENCE TROUVÉE :</h4>
                                            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '6px', fontSize: '0.95rem', border: '1px solid var(--border-color)' }}>
                                                {item.evidence}
                                            </div>
                                        </div>

                                        {item.status !== 'Conforme' && (
                                            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '1rem', borderRadius: '6px' }}>
                                                <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e40af', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <Zap size={16} /> SUGGESTION D'AMÉLIORATION :
                                                </h4>
                                                <div style={{ color: '#1e3a8a', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                                    <Markdown>{item.suggestion}</Markdown>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EcovadisPage;
