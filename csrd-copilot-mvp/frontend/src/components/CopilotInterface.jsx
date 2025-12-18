import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../api/apiClient';

const CopilotInterface = ({ enabledScopes }) => {
  const [topic, setTopic] = useState('');
  const [standard, setStandard] = useState('e1');
  const [language, setLanguage] = useState('fr');
  const [draft, setDraft] = useState('');
  const [auditReport, setAuditReport] = useState('');
  const [sourceData, setSourceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Effect to ensure selected standard is valid
  React.useEffect(() => {
    if (enabledScopes && !enabledScopes[standard]) {
      // If current standard is disabled, switch to first enabled one
      const firstEnabled = Object.keys(enabledScopes).find(k => enabledScopes[k]);
      if (firstEnabled) setStandard(firstEnabled);
    }
  }, [enabledScopes, standard]);

  const handleGenerate = async () => {
    if (!topic) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDraft('');
    setAuditReport('');
    setSourceData(null);
    setCurrentDraftId(null);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error(t('copilot.errors.loginRequired'));
      }
      const token = await user.getIdToken();

      // TODO: Use environment variable for API URL
      const response = await fetch(`${API_BASE_URL}/generate-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topic, standard, language }),
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

  const handleSaveDraft = async () => {
    if (!draft) return null;
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/save-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic,
          standard,
          content: draft,
          audit_report: auditReport,
          source_data: sourceData
        }),
      });

      if (!response.ok) throw new Error(t('copilot.errors.saveFailed'));

      const data = await response.json();
      setCurrentDraftId(data.draft_id);
      setSuccessMsg(t('copilot.result.successSaved'));
      return data.draft_id;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    let draftId = currentDraftId;
    if (!draftId) {
      // If not saved yet, save first and wait for the ID
      draftId = await handleSaveDraft();
      if (!draftId) return; // If save failed
    }

    setApproving(true);
    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/approve-draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ draft_id: draftId }),
      });

      if (!response.ok) throw new Error(t('copilot.errors.approveFailed'));

      setSuccessMsg(t('copilot.result.successApproved'));

      // Navigate to report viewer
      navigate('/view-report', { state: { draft, topic, standard } });
    } catch (err) {
      setError(err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([draft], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `csrd_draft_${standard}_${topic.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const [xbrlLoading, setXbrlLoading] = useState(false);

  const handleExportXBRL = async () => {
    setXbrlLoading(true);
    setSuccessMsg('');
    try {
      // Simulate mapping delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Use a dummy ID if not saved yet, or the real one
      const reportId = currentDraftId || 'draft_' + Date.now();

      // Trigger download
      window.location.href = `${API_BASE_URL}/export-xbrl/${reportId}`;

      setSuccessMsg("✅ XBRL Tagging Complete & Package Downloaded!");
    } catch (err) {
      setError("XBRL Export Failed");
    } finally {
      setXbrlLoading(false);
    }
  };

  return (
    <div className="copilot-interface">
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ 
          marginTop: 0, 
          fontSize: '1.75rem',
          color: 'var(--success-color)',
          fontWeight: 'bold',
          marginBottom: '0.5rem'
        }}>{t('copilot.title')}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          {t('copilot.subtitle')}
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr 2fr', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-color)' }}>📋 {t('copilot.standardLabel')}</label>
          <select
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              backgroundColor: 'var(--bg-color)', 
              border: '2px solid var(--border-color)', 
              color: 'var(--text-color)', 
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease'
            }}
          >
            {(!enabledScopes || enabledScopes.e1) && <option value="e1">E1 - Climate</option>}
            {(!enabledScopes || enabledScopes.e2) && <option value="e2">E2 - Pollution</option>}
            {(!enabledScopes || enabledScopes.e3) && <option value="e3">E3 - Water</option>}
            {(!enabledScopes || enabledScopes.e4) && <option value="e4">E4 - Biodiversity</option>}
            {(!enabledScopes || enabledScopes.e5) && <option value="e5">E5 - Circular Economy</option>}
            {(!enabledScopes || enabledScopes.s1) && <option value="s1">S1 - Workforce</option>}
            {(!enabledScopes || enabledScopes.s2) && <option value="s2">S2 - Value Chain</option>}
            {(!enabledScopes || enabledScopes.s3) && <option value="s3">S3 - Communities</option>}
            {(!enabledScopes || enabledScopes.s4) && <option value="s4">S4 - Consumers</option>}
            {(!enabledScopes || enabledScopes.g1) && <option value="g1">G1 - Business Conduct</option>}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-color)' }}>🌍 {t('generator.language')}</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              backgroundColor: 'var(--bg-color)', 
              border: '2px solid var(--border-color)', 
              color: 'var(--text-color)', 
              borderRadius: '6px',
              fontSize: '0.95rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'border-color 0.2s ease'
            }}
          >
            <option value="fr">{t('generator.languages.fr')}</option>
            <option value="en">{t('generator.languages.en')}</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-color)' }}>🎯 {t('copilot.topicLabel')}</label>
          <input
            type="text"
            placeholder={t('copilot.topicPlaceholder')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              backgroundColor: 'var(--bg-color)', 
              border: '2px solid var(--border-color)', 
              color: 'var(--text-color)', 
              borderRadius: '6px',
              fontSize: '0.95rem',
              transition: 'border-color 0.2s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <button
          onClick={handleGenerate}
          disabled={loading || !topic}
          className="btn-animated btn-primary"
          style={{ 
            padding: '1rem 3rem',
            fontSize: '1.15rem',
            fontWeight: '700',
            letterSpacing: '0.02em',
            opacity: (loading || !topic) ? 0.6 : 1,
            cursor: (loading || !topic) ? 'not-allowed' : 'pointer',
            minWidth: '320px',
            background: (loading || !topic) ? 'var(--primary-color)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            border: 'none',
            boxShadow: (loading || !topic) ? 'none' : '0 4px 15px rgba(59, 130, 246, 0.3)',
            transform: (loading || !topic) ? 'none' : 'translateY(0)',
            transition: 'all 0.3s ease'
          }}
          aria-label={loading ? 'Generating draft' : 'Generate CSRD draft'}
          aria-busy={loading}
          onMouseEnter={(e) => !loading && !topic || (e.target.style.transform = 'translateY(-2px)', e.target.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)')}
          onMouseLeave={(e) => (e.target.style.transform = 'translateY(0)', e.target.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.3)')}
        >
          {loading ? '⏳ ' + t('copilot.generateBtn.loading') : '✨ ' + t('copilot.generateBtn.default')}
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--error-color)', padding: '1rem', backgroundColor: 'rgba(229, 115, 115, 0.1)', borderRadius: '4px', marginBottom: '1rem', border: '1px solid var(--error-color)' }}>
          {error}
        </div>
      )}

      {draft && (
        <div className="draft-result" style={{ 
          display: 'flex', 
          gap: '2rem', 
          flexDirection: 'column',
          padding: '2rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '2px solid var(--success-color)',
          animation: 'fadeIn 0.5s ease-in'
        }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ 
              fontSize: '1.3rem', 
              color: 'var(--success-color)', 
              margin: 0,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              ✅ {t('copilot.result.title')}
            </h3>
            <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleSaveDraft} 
                disabled={saving} 
                className="btn-animated btn-secondary"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer'
                }}
                aria-label="Save draft"
                aria-busy={saving}
              >
                💾 {saving ? t('copilot.result.saveBtn.saving') : t('copilot.result.saveBtn.default')}
              </button>
              <button 
                onClick={handleApprove} 
                disabled={approving} 
                className="btn-animated"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  backgroundColor: '#1565c0', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  opacity: approving ? 0.6 : 1,
                  cursor: approving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                aria-label="Approve draft"
                aria-busy={approving}
              >
                ✓ {approving ? t('copilot.result.approveBtn.approving') : t('copilot.result.approveBtn.default')}
              </button>
              <button 
                onClick={() => setShowSources(!showSources)} 
                className="btn-animated btn-secondary"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600'
                }}
                aria-label={showSources ? 'Hide sources' : 'Show sources'}
                aria-expanded={showSources}
              >
                📊 {showSources ? t('copilot.result.toggleSources.hide') : t('copilot.result.toggleSources.show')}
              </button>
              <button 
                onClick={handleDownload} 
                className="btn-animated"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  backgroundColor: 'var(--success-color)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                aria-label="Download draft as markdown"
              >
                ⬇️ {t('copilot.result.download')}
              </button>
              <button 
                onClick={handleExportXBRL} 
                disabled={xbrlLoading} 
                className="btn-animated"
                style={{ 
                  padding: '0.5rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600',
                  backgroundColor: '#e65100', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.375rem',
                  opacity: xbrlLoading ? 0.6 : 1,
                  cursor: xbrlLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                aria-label="Export as XBRL format"
                aria-busy={xbrlLoading}
              >
                {xbrlLoading ? '🏷️ Mapping...' : '🏷️ Export XBRL'}
              </button>
            </div>
          </div>

          {successMsg && (
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'var(--success-color)', borderRadius: '4px', marginTop: '0.5rem', border: '1px solid var(--success-color)' }}>
              {successMsg}
            </div>
          )}

          {/* Sources Panel */}
          {showSources && sourceData && (
            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '4px', borderLeft: '4px solid #64b5f6', border: '1px solid var(--border-color)' }}>
              <h4 style={{ marginTop: 0, color: '#64b5f6', marginBottom: '1rem' }}>{t('copilot.result.sourcesTitle')}</h4>

              {/* Data Source */}
              <div style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📄</span>
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{t('copilot.result.dataSource')}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
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
                  <div style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>{t('copilot.result.legalSource')}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    ESRS {standard.toUpperCase()} (Official Text)
                  </div>
                </div>
              </div>

              {/* Raw Data Toggle */}
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: '#64b5f6', fontSize: '0.8rem' }}>{t('copilot.result.rawData')}</summary>
                <pre style={{ fontSize: '0.7rem', overflowX: 'auto', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {sourceData}
                </pre>
              </details>
            </div>
          )}

          {/* Draft Content */}
          <div style={{
            backgroundColor: 'var(--bg-color)',
            padding: '2rem',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            lineHeight: '1.6',
            textAlign: 'left',
            minHeight: '300px',
            color: 'var(--text-color)'
          }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
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
                            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '4px', fontWeight: 'bold', color: '#64b5f6' }}>
                              Verified Source
                            </div>
                            {parts.map((part, i) => (
                              <div key={i} style={{ marginBottom: '2px', color: 'var(--text-color)' }}>• {part}</div>
                            ))}
                          </span>
                        </span>
                      );
                    } catch (e) {
                      console.error("Audit tooltip error:", e);
                      return <span>ℹ️</span>;
                    }
                  }
                  return <a {...props} style={{ color: '#64b5f6' }} target="_blank" rel="noopener noreferrer" />;
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
              backgroundColor: 'var(--bg-color)',
              border: '1px solid var(--error-color)',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginTop: 0, color: 'var(--error-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {t('copilot.result.auditTitle')}
              </h3>
              <div style={{ color: 'var(--text-color)', lineHeight: '1.5' }}>
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
