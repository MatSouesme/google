import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, X, Loader2, ArrowRight, Save, Share2, Download, Folder } from 'lucide-react';
import { auth } from '../firebase-config';
import Alert from '../components/Alert';
import { useDataStatus } from '../hooks/useDataStatus';
import { API_BASE_URL } from '../api/apiClient';

const SmartImportPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState([]); // Array of { id, kpi_id, name, value, unit, date, confidence }
    const [ingesting, setIngesting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(false);
    const { markDataImported, hasImportedData } = useDataStatus();

    // SharePoint states
    const [showSharePoint, setShowSharePoint] = useState(false);
    const [sharepointConfig, setSharepointConfig] = useState({
        siteUrl: '',
        folderPath: '',
        clientId: '',
        clientSecret: ''
    });
    const [sharepointConnected, setSharepointConnected] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);
    const [sharepointFiles, setSharepointFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [downloadingFiles, setDownloadingFiles] = useState(false);

    const handleFileDrop = (e) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) setFile(droppedFile);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setAnalyzing(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;

            // Call Backend API
            const response = await fetch(`${API_BASE_URL}/data/smart-extract`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData
            });

            if (!response.ok) throw new Error('Analysis failed');

            const result = await response.json();
            // Add local ID for UI handling
            setExtractedData(result.candidates.map((item, index) => ({ ...item, id: index })));

        } catch (error) {
            console.error("Analysis Error:", error);
            alert("Failed to analyze file. Please try again.");
            setExtractedData([]); // Clear data on error
        } finally {
            setAnalyzing(false);
        }
    };

    const handleRemoveRow = (id) => {
        setExtractedData(prev => prev.filter(row => row.id !== id));
    };

    const handleUpdateRow = (id, field, value) => {
        setExtractedData(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
    };

    const handleTestSharePointConnection = async () => {
        setTestingConnection(true);
        try {
            // Simuler un test de connexion (remplacer par vraie API)
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSharepointConnected(true);
            alert(t('sharepoint.connected'));
        } catch (error) {
            setSharepointConnected(false);
            alert(t('sharepoint.connectionFailed'));
        } finally {
            setTestingConnection(false);
        }
    };

    const handleListSharePointFiles = async () => {
        if (!sharepointConnected) {
            alert('Please connect to SharePoint first');
            return;
        }

        setLoadingFiles(true);
        try {
            // Simuler récupération de fichiers (remplacer par vraie API Microsoft Graph)
            await new Promise(resolve => setTimeout(resolve, 1000));
            const mockFiles = [
                { id: 1, name: 'CSRD_Report_2023.xlsx', size: '2.4 MB', modified: '2023-12-15', url: '#' },
                { id: 2, name: 'ESG_Data_Q4.csv', size: '856 KB', modified: '2023-12-10', url: '#' },
                { id: 3, name: 'Sustainability_Metrics.pdf', size: '1.2 MB', modified: '2023-12-01', url: '#' }
            ];
            setSharepointFiles(mockFiles);
        } catch (error) {
            alert('Failed to list files');
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleToggleFileSelection = (fileId) => {
        setSelectedFiles(prev =>
            prev.includes(fileId)
                ? prev.filter(id => id !== fileId)
                : [...prev, fileId]
        );
    };

    const handleDownloadAndIngest = async () => {
        if (selectedFiles.length === 0) {
            alert('Please select at least one file');
            return;
        }

        setDownloadingFiles(true);
        try {
            // Simuler téléchargement et ingestion (remplacer par vraie API)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock des données extraites
            const mockExtracted = selectedFiles.map((fileId, idx) => ({
                id: idx,
                kpi_id: `E${idx + 1}-1`,
                name: `Data Point ${idx + 1}`,
                value: String(Math.floor(Math.random() * 10000)),
                unit: ['tCO2e', 'FTE', '%'][idx % 3],
                date: '2023-12-31',
                confidence: 0.85 + Math.random() * 0.15
            }));

            setExtractedData(mockExtracted);
            setShowSharePoint(false);
            alert(`Downloaded and extracted ${selectedFiles.length} files!`);
        } catch (error) {
            alert('Failed to download files');
        } finally {
            setDownloadingFiles(false);
        }
    };

    const handleIngest = async () => {
        if (extractedData.length === 0) return;

        // Group by Standard (E1, S1, G1)
        const standards = [...new Set(extractedData.map(item => {
            if (!item.kpi_id) return 'Unknown';
            const parts = item.kpi_id.split('-');
            return parts[0] ? parts[0].toUpperCase() : 'Unknown';
        }))].filter(s => s !== 'Unknown');

        // Ask for confirmation
        const message = `Do you want to ingest ${extractedData.length} data points into the following standards: ${standards.join(', ')}?`;
        if (!window.confirm(message)) return;

        setIngesting(true);

        // Ingest each row one by one (or batch if API supports it, here Reuse manual entry logic loop)
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        let successCount = 0;

        for (const row of extractedData) {
            try {
                await fetch(`${API_BASE_URL}/data/manual-entry`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                        kpi_id: row.kpi_id,
                        value: String(row.value), // Ensure string
                        date: row.date,
                        unit: row.unit,
                        comment: `Files Import from ${file ? file.name : 'Unknown File'} (Confidence: ${row.confidence})`
                    })
                });
                successCount++;
            } catch (err) {
                console.error(`Failed to ingest ${row.kpi_id}`, err);
            }
        }

        setIngesting(false);
        setExtractedData([]);
        setFile(null);

        // Marquer les données comme importées
        markDataImported();
        setImportSuccess(true);

        alert(t('smartImport.successfullyIngested', { count: successCount }));
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <UploadCloud size={32} color="#10b981" />
                        {t('smartImport.title')}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('smartImport.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/data-points')}
                    className="btn-animated btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 1.5rem',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {t('smartImport.nextStep')} <ArrowRight size={18} />
                </button>
            </div>

            {/* Alerte de succès après import */}
            {importSuccess && (
                <Alert
                    type="success"
                    title={t('smartImport.importSuccess.title')}
                    message={t('smartImport.importSuccess.message')}
                    onClose={() => setImportSuccess(false)}
                />
            )}

            {/* Info pour première utilisation */}
            {!hasImportedData && !extractedData.length && !file && (
                <Alert
                    type="info"
                    title={t('smartImport.firstTime.title')}
                    message={t('smartImport.firstTime.message')}
                />
            )}

            {/* SharePoint Connection Toggle */}
            {!extractedData.length && (
                <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => setShowSharePoint(false)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '50px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: !showSharePoint ? 'none' : '2px solid var(--border-color)',
                            backgroundColor: !showSharePoint ? 'var(--primary-color)' : 'transparent',
                            color: !showSharePoint ? 'white' : 'var(--text-secondary)',
                            boxShadow: !showSharePoint ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none'
                        }}
                    >
                        <UploadCloud size={20} />
                        {t('smartImport.manualUpload')}
                    </button>
                    <button
                        onClick={() => setShowSharePoint(true)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '50px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: showSharePoint ? 'none' : '2px solid var(--border-color)',
                            backgroundColor: showSharePoint ? 'var(--primary-color)' : 'transparent',
                            color: showSharePoint ? 'white' : 'var(--text-secondary)',
                            boxShadow: showSharePoint ? '0 4px 12px rgba(5, 150, 105, 0.3)' : 'none'
                        }}
                    >
                        <img
                            src="/Microsoft_Office_SharePoint_(2019–2025).svg.png"
                            alt="SharePoint"
                            style={{ width: '20px', height: '20px', objectFit: 'contain' }}
                        />
                        SharePoint
                    </button>
                </div>
            )}

            {/* SharePoint Connection Section */}
            {showSharePoint && !extractedData.length && (
                <div className="card animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <img
                                src="/Microsoft_Office_SharePoint_(2019–2025).svg.png"
                                alt="SharePoint"
                                style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                            />
                            {t('sharepoint.title')}
                        </h2>
                        <p style={{ color: 'var(--text-secondary)' }}>{t('sharepoint.subtitle')}</p>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                {t('sharepoint.siteUrl')}
                            </label>
                            <input
                                type="text"
                                value={sharepointConfig.siteUrl}
                                onChange={(e) => setSharepointConfig({ ...sharepointConfig, siteUrl: e.target.value })}
                                placeholder={t('sharepoint.siteUrlPlaceholder')}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                {t('sharepoint.folderPath')}
                            </label>
                            <input
                                type="text"
                                value={sharepointConfig.folderPath}
                                onChange={(e) => setSharepointConfig({ ...sharepointConfig, folderPath: e.target.value })}
                                placeholder={t('sharepoint.folderPathPlaceholder')}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    {t('sharepoint.clientId')}
                                </label>
                                <input
                                    type="text"
                                    value={sharepointConfig.clientId}
                                    onChange={(e) => setSharepointConfig({ ...sharepointConfig, clientId: e.target.value })}
                                    placeholder={t('sharepoint.clientIdPlaceholder')}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    {t('sharepoint.clientSecret')}
                                </label>
                                <input
                                    type="password"
                                    value={sharepointConfig.clientSecret}
                                    onChange={(e) => setSharepointConfig({ ...sharepointConfig, clientSecret: e.target.value })}
                                    placeholder={t('sharepoint.clientSecretPlaceholder')}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleTestSharePointConnection}
                            disabled={testingConnection || !sharepointConfig.siteUrl}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {testingConnection ? (
                                <>
                                    <Loader2 size={20} className="spin" />
                                    {t('sharepoint.connecting')}
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    {t('sharepoint.testConnection')}
                                </>
                            )}
                        </button>

                        {sharepointConnected && (
                            <button
                                className="btn btn-primary"
                                onClick={handleListSharePointFiles}
                                disabled={loadingFiles}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {loadingFiles ? (
                                    <>
                                        <Loader2 size={20} className="spin" />
                                        {t('sharepoint.loadingFiles')}
                                    </>
                                ) : (
                                    <>
                                        <FileText size={20} />
                                        {t('sharepoint.listFiles')}
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Files List */}
                    {sharepointFiles.length > 0 && (
                        <div className="animate-fade-in">
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                                {t('sharepoint.selectFiles')} ({sharepointFiles.length} {t('sharepoint.filesFound', { count: sharepointFiles.length })})
                            </h3>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', textAlign: 'left', width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFiles.length === sharepointFiles.length}
                                                    onChange={(e) => setSelectedFiles(e.target.checked ? sharepointFiles.map(f => f.id) : [])}
                                                />
                                            </th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('sharepoint.fileName')}</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('sharepoint.fileSize')}</th>
                                            <th style={{ padding: '0.75rem', textAlign: 'left' }}>{t('sharepoint.modified')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sharepointFiles.map(file => (
                                            <tr key={file.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(file.id)}
                                                        onChange={() => handleToggleFileSelection(file.id)}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FileText size={16} style={{ color: 'var(--primary-color)' }} />
                                                    {file.name}
                                                </td>
                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{file.size}</td>
                                                <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{file.modified}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleDownloadAndIngest}
                                disabled={downloadingFiles || selectedFiles.length === 0}
                                style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {downloadingFiles ? (
                                    <>
                                        <Loader2 size={20} className="spin" />
                                        {t('sharepoint.downloading')}
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        {t('sharepoint.downloadAndIngest')} ({selectedFiles.length})
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {sharepointConnected && sharepointFiles.length === 0 && !loadingFiles && (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                            <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p>{t('sharepoint.noFiles')}</p>
                        </div>
                    )}
                </div>
            )}

            {/* File Upload Section */}
            {!extractedData.length && !showSharePoint && (
                <div
                    className="card"
                    style={{
                        padding: '3rem',
                        border: '2px dashed var(--border-color)',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: 'var(--bg-secondary)',
                        transition: 'border-color 0.2s'
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => document.getElementById('fileInput').click()}
                >
                    <input
                        type="file"
                        id="fileInput"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        accept=".pdf,.xlsx,.csv,.jpg,.jpeg,.png,.txt"
                    />

                    {analyzing ? (
                        <div style={{ color: 'var(--primary-color)' }}>
                            <Loader2 size={48} className="spin" style={{ marginBottom: '1rem' }} />
                            <h3>Analyzing Document...</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>This may take a few seconds.</p>
                        </div>
                    ) : (
                        <>
                            <UploadCloud size={48} style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>
                                {file ? file.name : "Drag & Drop or Click to Upload"}
                            </h3>
                            <p style={{ color: 'var(--text-secondary)' }}>Supports PDF, Excel, CSV, Images, Text</p>
                            {file && (
                                <button
                                    className="btn btn-primary"
                                    style={{ marginTop: '1.5rem' }}
                                    onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}
                                >
                                    Analyze File
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Review Table Section */}
            {extractedData.length > 0 && (
                <div className="animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} /> Review Extracted Data
                        </h2>
                        <button
                            className="btn btn-ghost"
                            onClick={() => { setExtractedData([]); setFile(null); }}
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            Cancel
                        </button>
                    </div>

                    <div className="card" style={{ overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                                        <th style={{ padding: '1rem', whiteSpace: 'nowrap' }}>KPI ID</th>
                                        <th style={{ padding: '1rem' }}>Name</th>
                                        <th style={{ padding: '1rem' }}>Value</th>
                                        <th style={{ padding: '1rem' }}>Unit</th>
                                        <th style={{ padding: '1rem' }}>Date</th>
                                        <th style={{ padding: '1rem' }}>Confidence</th>
                                        <th style={{ padding: '1rem' }}>Source</th>
                                        <th style={{ padding: '1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extractedData.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                <input
                                                    type="text"
                                                    value={row.kpi_id || ''}
                                                    onChange={(e) => handleUpdateRow(row.id, 'kpi_id', e.target.value)}
                                                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>{row.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.value || ''}
                                                    onChange={(e) => handleUpdateRow(row.id, 'value', e.target.value)}
                                                    style={{ width: '100px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.unit || ''}
                                                    onChange={(e) => handleUpdateRow(row.id, 'unit', e.target.value)}
                                                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="date"
                                                    value={row.date || ''}
                                                    onChange={(e) => handleUpdateRow(row.id, 'date', e.target.value)}
                                                    style={{ width: '130px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '50px', height: '4px', backgroundColor: '#eee', borderRadius: '2px' }}>
                                                        <div style={{ width: `${row.confidence * 100}%`, height: '100%', backgroundColor: row.confidence > 0.8 ? '#10B981' : '#F59E0B', borderRadius: '2px' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{Math.round(row.confidence * 100)}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)', maxWidth: '200px' }}>
                                                {row.snippet ? (
                                                    <span title={row.snippet}>
                                                        {row.snippet.length > 50 ? row.snippet.substring(0, 50) + '...' : row.snippet}
                                                    </span>
                                                ) : '-'}
                                                {row.page_number && <div style={{ marginTop: '4px', fontSize: '0.7rem' }}>Pg {row.page_number}</div>}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <button
                                                    className="btn btn-ghost"
                                                    onClick={() => handleRemoveRow(row.id)}
                                                    style={{ color: '#EF4444', padding: '4px' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleIngest}
                            disabled={ingesting}
                            style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                        >
                            {ingesting ? (
                                <>
                                    <Loader2 size={20} className="spin" />
                                    Ingesting Data ({extractedData.length})...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    {t('smartImport.confirmIngest', { count: extractedData.length })}
                                </>
                            )}
                        </button>

                        {importSuccess && (
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate('/data-points')}
                                style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            >
                                {t('navigation.nextStep.configureDataPoints')}
                                <ArrowRight size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartImportPage;
