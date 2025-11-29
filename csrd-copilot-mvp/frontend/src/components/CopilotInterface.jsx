import React, { useState } from 'react';

const CopilotInterface = () => {
  const [topic, setTopic] = useState('');
  const [standard, setStandard] = useState('e1');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic) return;

    setLoading(true);
    setError('');
    setDraft('');

    try {
      // TODO: Use environment variable for API URL
      const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/generate-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, standard }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      setDraft(data.draft);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="copilot-interface" style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#1e1e1e' }}>
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>AI Draft Generator</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Ask Ecoply to draft a section of your report based on your uploaded data.
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
        style={{ width: '100%', marginBottom: '1.5rem' }}
      >
        {loading ? 'Generating Draft...' : 'Generate Draft'}
      </button>

      {error && (
        <div style={{ color: '#e57373', padding: '1rem', backgroundColor: 'rgba(207, 102, 121, 0.1)', borderRadius: '4px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {draft && (
        <div className="draft-result">
          <h3 style={{ fontSize: '1.1rem', color: '#81c784' }}>Generated Draft</h3>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            backgroundColor: '#252525', 
            padding: '1rem', 
            borderRadius: '4px', 
            border: '1px solid #444',
            lineHeight: '1.6',
            textAlign: 'left'
          }}>
            {draft}
          </div>
        </div>
      )}
    </div>
  );
};

export default CopilotInterface;
