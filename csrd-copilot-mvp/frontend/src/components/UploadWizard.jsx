import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Lock } from 'lucide-react';

const UploadWizard = ({ selectedScopes, onScopeChange }) => {
  const [step, setStep] = useState(0); // 0: Scope, 1: Upload
  // Local state removed, using props
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const { t } = useTranslation();

  const handleScopeChange = (scope) => {
    if (scope === 'e1') return; // Locked
    onScopeChange(prev => ({ ...prev, [scope]: !prev[scope] }));
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    // In a real app, we would also send the selectedScopes here
    // formData.append('scopes', JSON.stringify(selectedScopes));

    try {
      const response = await fetch('http://localhost:8000/upload-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`${t('uploadWizard.errorPrefix')}${response.statusText}`);
      }

      const data = await response.json();
      setStatus('success');
      setMessage(`${t('uploadWizard.success')}${data.upload_id}`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  const handleDownload = (standard) => {
    // TODO: Use environment variable for API URL
    window.location.href = `http://localhost:8000/download-template/${standard}`;
  };

  const ScopeItem = ({ id, label, checked, locked }) => (
    <div
      onClick={() => !locked && handleScopeChange(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        backgroundColor: 'var(--surface-color)',
        marginBottom: '0.8rem',
        borderRadius: '8px',
        border: `1px solid ${checked ? 'var(--primary-color)' : 'var(--border-color)'}`,
        cursor: locked ? 'not-allowed' : 'pointer',
        opacity: locked ? 0.8 : 1,
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '6px',
          backgroundColor: checked ? 'var(--primary-color)' : 'transparent',
          border: `2px solid ${checked ? 'var(--primary-color)' : 'var(--text-secondary)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          {checked && <Check size={16} />}
        </div>
        <span style={{ fontWeight: '500', color: 'var(--text-color)' }}>{label}</span>
      </div>
      {locked && <Lock size={18} style={{ color: 'var(--text-secondary)' }} />}
    </div>
  );

  return (
    <div className="upload-wizard">
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>{t('uploadWizard.title')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        {t('uploadWizard.subtitle')}
      </p>

      {step === 0 && (
        <div className="fade-in">
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('uploadWizard.stepScope.title')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {t('uploadWizard.stepScope.subtitle')}
          </p>

          <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <ScopeItem id="e1" label="ESRS E1 (Climate)" checked={selectedScopes.e1} locked={true} />
            <ScopeItem id="e2" label="ESRS E2 (Pollution)" checked={selectedScopes.e2} />
            <ScopeItem id="e3" label="ESRS E3 (Water)" checked={selectedScopes.e3} />
            <ScopeItem id="e4" label="ESRS E4 (Biodiversity)" checked={selectedScopes.e4} />
            <ScopeItem id="e5" label="ESRS E5 (Circular Economy)" checked={selectedScopes.e5} />
            <ScopeItem id="s1" label="ESRS S1 (Own Workforce)" checked={selectedScopes.s1} />
            <ScopeItem id="s2" label="ESRS S2 (Value Chain Workers)" checked={selectedScopes.s2} />
            <ScopeItem id="s3" label="ESRS S3 (Affected Communities)" checked={selectedScopes.s3} />
            <ScopeItem id="s4" label="ESRS S4 (Consumers)" checked={selectedScopes.s4} />
            <ScopeItem id="g1" label="ESRS G1 (Business Conduct)" checked={selectedScopes.g1} />
          </div>

          <button
            className="btn-animated btn-primary"
            onClick={() => setStep(1)}
            style={{ width: '100%' }}
          >
            {t('uploadWizard.stepScope.confirm')}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="fade-in">
          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('uploadWizard.step1.title')}</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-animated btn-secondary" onClick={() => handleDownload('e1')}>
                {t('uploadWizard.step1.downloadE1')}
              </button>
              <button className="btn-animated btn-secondary" onClick={() => handleDownload('g1')}>
                {t('uploadWizard.step1.downloadG1')}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('uploadWizard.step2.title')}</h3>
            <div className="file-upload-container">
              <input
                type="file"
                id="file-upload"
                accept=".csv"
                onChange={handleFileChange}
                className="file-upload-input"
              />
              <label htmlFor="file-upload" className="file-upload-label">
                {file ? t('uploadWizard.step2.changeFile') : t('uploadWizard.step2.chooseFile')}
              </label>
            </div>
            {file && <p style={{ marginTop: '0.5rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>{t('uploadWizard.step2.selected')}{file.name}</p>}
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
            <button
              className="btn-animated btn-secondary"
              onClick={() => setStep(0)}
              style={{ flex: 1 }}
            >
              Back
            </button>
            <button
              className="btn-animated btn-primary"
              onClick={handleUpload}
              disabled={!file || status === 'uploading'}
              style={{ flex: 2, opacity: (!file || status === 'uploading') ? 0.6 : 1 }}
            >
              {status === 'uploading' ? t('uploadWizard.uploadBtn.uploading') : t('uploadWizard.uploadBtn.default')}
            </button>
          </div>

          {status === 'success' && (
            <div style={{ color: '#81c784', backgroundColor: 'rgba(76, 175, 80, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid #4caf50' }}>
              {message}
            </div>
          )}

          {status === 'error' && (
            <div style={{ color: '#e57373', backgroundColor: 'rgba(207, 102, 121, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid #cf6679' }}>
              {message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadWizard;
