import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const UploadWizard = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');
  const { t } = useTranslation();

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

    try {
      const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/upload-data', {
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
    window.location.href = `https://csrd-api-71795126030.europe-west1.run.app/download-template/${standard}`;
  };

  return (
    <div className="upload-wizard">
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>{t('uploadWizard.title')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        {t('uploadWizard.subtitle')}
      </p>

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

      <div style={{ marginBottom: '1rem' }}>
        <button
          className="btn-animated btn-primary"
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          style={{ width: '100%', opacity: (!file || status === 'uploading') ? 0.6 : 1 }}
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
  );
};

export default UploadWizard;
