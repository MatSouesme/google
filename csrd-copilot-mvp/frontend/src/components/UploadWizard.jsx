import React, { useState } from 'react';

const UploadWizard = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [message, setMessage] = useState('');

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
      const response = await fetch('http://localhost:8080/upload-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      setStatus('success');
      setMessage(`Success! File uploaded. ID: ${data.upload_id}`);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
    }
  };

  return (
    <div className="upload-wizard">
      <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>Guided Data Upload</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Follow the steps below to ingest your CSRD data into Ecoply.
      </p>

      <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Step 1: Download Template</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="secondary" onClick={() => alert("Downloading E1 Template...")} style={{ backgroundColor: '#333', border: '1px solid #555' }}>
            Download E1 (Climate)
          </button>
          <button className="secondary" onClick={() => alert("Downloading G1 Template...")} style={{ backgroundColor: '#333', border: '1px solid #555' }}>
            Download G1 (Business Conduct)
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Step 2: Upload Data</h3>
        <input type="file" accept=".csv" onChange={handleFileChange} />
        {file && <p style={{ marginTop: '0.5rem', color: 'var(--primary-color)' }}>Selected: {file.name}</p>}
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={handleUpload}
          disabled={!file || status === 'uploading'}
          style={{ width: '100%' }}
        >
          {status === 'uploading' ? 'Uploading...' : 'Upload CSV'}
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
