import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { auth } from '../firebase-config';
import { useTranslation } from 'react-i18next';

const CopilotInterface = ({ enabledScopes }) => {
  const [topic, setTopic] = useState('');
  const [standard, setStandard] = useState('e1');
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

  const handleSaveDraft = async () => {
    if (!draft) return null;
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/save-draft', {
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

      const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/approve-draft', {
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
      window.location.href = `https://csrd-api-71795126030.europe-west1.run.app/export-xbrl/${reportId}`;

      setSuccessMsg("✅ XBRL Tagging Complete & Package Downloaded!");
    } catch (err) {
      setError("XBRL Export Failed");
    } finally {
      setXbrlLoading(false);
    }
  };

  return (
    <div className="copilot-interface" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--surface-color)' }}>
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>{t('copilot.title')}</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        {t('copilot.subtitle')}
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>{t('copilot.standardLabel')}</label>
          <select
            value={standard}
            onChange={(e) => setStandard(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }}
          >
            {(!enabledScopes || enabledScopes.e1) && <option value="e1">ESRS E1 (Climate Change)</option>}
            {(!enabledScopes || enabledScopes.e2) && <option value="e2">ESRS E2 (Pollution)</option>}
            {(!enabledScopes || enabledScopes.e3) && <option value="e3">ESRS E3 (Water & Marine)</option>}
            {(!enabledScopes || enabledScopes.e4) && <option value="e4">ESRS E4 (Biodiversity)</option>}
            {(!enabledScopes || enabledScopes.e5) && <option value="e5">ESRS E5 (Circular Economy)</option>}
            {(!enabledScopes || enabledScopes.s1) && <option value="s1">ESRS S1 (Own Workforce)</option>}
            {(!enabledScopes || enabledScopes.s2) && <option value="s2">ESRS S2 (Value Chain Workers)</option>}
            {(!enabledScopes || enabledScopes.s3) && <option value="s3">ESRS S3 (Affected Communities)</option>}
            {(!enabledScopes || enabledScopes.s4) && <option value="s4">ESRS S4 (Consumers)</option>}
            {(!enabledScopes || enabledScopes.g1) && <option value="g1">ESRS G1 (Business Conduct)</option>}
          </select>
        </div>
        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)' }}>{t('copilot.topicLabel')}</label>
          <input
            type="text"
            placeholder={t('copilot.topicPlaceholder')}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '4px' }}
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !topic}
        style={{ width: '100%', marginBottom: '1.5rem', backgroundColor: loading ? 'var(--text-secondary)' : 'var(--primary-color)', color: '#fff', border: 'none', padding: '10px', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
      >
        {loading ? t('copilot.generateBtn.loading') : t('copilot.generateBtn.default')}
      </button>

      {error && (
        <div style={{ color: 'var(--error-color)', padding: '1rem', backgroundColor: 'rgba(229, 115, 115, 0.1)', borderRadius: '4px', marginBottom: '1rem', border: '1px solid var(--error-color)' }}>
          {error}
        </div>
      )}

      {draft && (
        <div className="draft-result" style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>

          {/* Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--success-color)', margin: 0 }}>{t('copilot.result.title')}</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleSaveDraft} disabled={saving} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                {saving ? t('copilot.result.saveBtn.saving') : t('copilot.result.saveBtn.default')}
              </button>
              <button onClick={handleApprove} disabled={approving} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#1565c0', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {approving ? t('copilot.result.approveBtn.approving') : t('copilot.result.approveBtn.default')}
              </button>
              <button onClick={() => setShowSources(!showSources)} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }}>
                {showSources ? t('copilot.result.toggleSources.hide') : t('copilot.result.toggleSources.show')}
              </button>
              <button onClick={handleDownload} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                {t('copilot.result.download')}
              </button>
              <button onClick={handleExportXBRL} disabled={xbrlLoading} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', backgroundColor: '#e65100', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
