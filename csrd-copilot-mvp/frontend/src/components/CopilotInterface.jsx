import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from '../firebase-config';

const CopilotInterface = () => {
  const [topic, setTopic] = useState('');
  const [standard, setStandard] = useState('e1');
  const [draft, setDraft] = useState('');
  const [auditReport, setAuditReport] = useState('');
  const [sourceData, setSourceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSources, setShowSources] = useState(false);

  const handleGenerate = async () => {
    if (!topic) return;

    setLoading(true);
    setError('');
    setDraft('');
    setAuditReport('');
    setSourceData(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("You must be logged in to generate a draft.");
      }
      const token = await user.getIdToken();

      // TODO: Use environment variable for API URL
      const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, standard }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setDraft(data.draft);
      setAuditReport(data.audit_report);
      setSourceData(data.source_data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([draft], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `csrd_draft_${standard}_${topic.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="copilot-interface" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1e1e1e' }}>
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>AI Draft Generator</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Ask Ecoply to draft a section of your report based on your uploaded data and official ESRS standards.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Standard</label>
          <select 
            value={standard} 
            onChange={(e) => setStandard(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2a2a2a', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
          >
            <option value="e1">ESRS E1 (Climate Change)</option>
            <option value="g1">ESRS G1 (Business Conduct)</option>
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Topic / Disclosure Requirement</label>
          <input 
            type="text" 
            placeholder="e.g., Scope 1 Emissions analysis" 
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2a2a2a', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
          />
        </div>
      </div>

      <button 
        onClick={handleGenerate} 
        disabled={loading || !topic}
        style={{ width: '100%', marginBottom: '1.5rem', backgroundColor: loading ? '#555' : 'var(--primary-color)', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Generating Draft (Reading PDFs & Data)...' : 'Generate Draft'}
      </button>

      {error && (
        <div style={{ color: '#e57373', padding: '1rem', backgroundColor: 'rgba(207, 102, 121, 0.1)', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {draft && (
        <div className="draft-result" style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
          
          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#81c784', margin: 0 }}>Generated Draft</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowSources(!showSources)} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}>
                    {showSources ? 'Hide Sources' : 'Show Sources'}
                </button>
                <button onClick={handleDownload} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Download .MD
                </button>
            </div>
          </div>

          {/* Sources Panel */}
          {showSources && sourceData && (
            <div style={{ backgroundColor: '#2a2a2a', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid #64b5f6' }}>
                <h4 style={{ marginTop: 0, color: '#64b5f6', marginBottom: '1rem' }}>📚 Sources & Context</h4>
                
                {/* Data Source */}
                <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📄</span>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#e0e0e0' }}>Données Entreprise</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                            {(() => {
                                try {
                                    const data = JSON.parse(sourceData);
                                    const date = data.ingestion_timestamp ? new Date(data.ingestion_timestamp).toLocaleDateString() : 'N/A';
                                    return `${data.source_file || 'Unknown File'} (${date})`;
                                } catch (e) {
                                    return 'Raw Data (Parse Error)';
                                }
                            })()}
                        </div>
                    </div>
                </div>

                {/* Legal Source */}
                <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#e0e0e0' }}>Cadre Légal</div>
                        <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                            ESRS {standard.toUpperCase()} (Official Text)
                        </div>
                    </div>
                </div>

                {/* Raw Data Toggle */}
                <details style={{ marginTop: '1rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#64b5f6', fontSize: '0.8rem' }}>Voir les données brutes (JSON)</summary>
                    <pre style={{ fontSize: '0.7rem', overflowX: 'auto', color: '#888', marginTop: '0.5rem' }}>
                        {sourceData}
                    </pre>
                </details>
            </div>
          )}

          {/* Draft Content */}
          <div style={{ 
            backgroundColor: '#252525', 
            padding: '2rem', 
            borderRadius: '4px', 
            border: '1px solid #444',
            lineHeight: '1.6',
            textAlign: 'left',
            minHeight: '300px'
          }}>
            <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({node, ...props}) => {
                        // Handle audit trail tooltips
                        if (props.href && props.href.startsWith('#audit:')) {
                            try {
                                const sourceInfo = decodeURIComponent(props.href.replace('#audit:', ''));
                                // Parse the source info for better formatting
                                // Expected format from prompt: "e1_demo.csv, Row: 1, Field: energy_total"
                                const parts = sourceInfo.split(',').map(p => p.trim());
                                
                                return (
                                    <span className="audit-tooltip-container">
                                        <span className="audit-icon">ℹ️</span>
                                        <span className="audit-tooltip">
                                            <div style={{ borderBottom: '1px solid #555', paddingBottom: '4px', marginBottom: '4px', fontWeight: 'bold', color: '#64b5f6' }}>
                                                Verified Source
                                            </div>
                                            {parts.map((part, i) => (
                                                <div key={i} style={{ marginBottom: '2px' }}>• {part}</div>
                                            ))}
                                        </span>
                                    </span>
                                );
                            } catch (e) {
                                console.error("Audit tooltip error:", e);
                                return <span>ℹ️</span>;
                            }
                        }
                        return <a {...props} style={{color: '#64b5f6'}} target="_blank" rel="noopener noreferrer" />;
                    }
                }}
            >
                {/* Regex explanation:
                    \[\[           : Match literal [[
                    \s*Source\s*:  : Match "Source" with optional spaces and colon
                    ([\s\S]*?)     : Match any character (including newlines) non-greedily
                    \]\]           : Match literal ]]
                */}
                {draft ? draft.replace(/\[\[\s*Source\s*:([\s\S]*?)\]\]/gi, (match, content) => ` [ℹ️](#audit:${encodeURIComponent(content.trim())})`) : ''}
            </ReactMarkdown>
          </div>

          {/* Auditor's Vigilance Points */}
          {auditReport && (
            <div style={{ 
                marginTop: '2rem', 
                padding: '1.5rem', 
                backgroundColor: '#2a1a1a', 
                border: '1px solid #e57373', 
                borderRadius: '8px' 
            }}>
                <h3 style={{ marginTop: 0, color: '#e57373', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ⚠️ Auditor's Vigilance Points
                </h3>
                <div style={{ color: '#e0e0e0', lineHeight: '1.5' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {auditReport}
                    </ReactMarkdown>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CopilotInterface;
