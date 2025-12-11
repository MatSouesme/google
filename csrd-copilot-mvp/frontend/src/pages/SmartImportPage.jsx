import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertTriangle, X, Loader2, ArrowRight, Save } from 'lucide-react';
import { auth } from '../firebase-config';

const SmartImportPage = () => {
    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [extractedData, setExtractedData] = useState([]); // Array of { id, kpi_id, name, value, unit, date, confidence }
    const [ingesting, setIngesting] = useState(false);

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
            const response = await fetch('http://localhost:8000/data/smart-extract', {
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

            // Mock data for demo if API fails/not implemented yet
            const mockData = [
                { id: 1, kpi_id: 'E1-1', name: 'Scope 1 Emissions', value: '12500', unit: 'tCO2e', date: '2023-12-31', confidence: 0.95 },
                { id: 2, kpi_id: 'S1-1', name: 'Total Employees', value: '450', unit: 'FTE', date: '2023-12-31', confidence: 0.88 },
                { id: 3, kpi_id: 'G1-1', name: 'Board Diversity', value: '40', unit: '%', date: '2023-12-31', confidence: 0.72 },
            ];
            setExtractedData(mockData);

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

    const handleIngest = async () => {
        if (extractedData.length === 0) return;
        setIngesting(true);

        // Ingest each row one by one (or batch if API supports it, here Reuse manual entry logic loop)
        const user = auth.currentUser;
        const token = user ? await user.getIdToken() : null;

        let successCount = 0;

        for (const row of extractedData) {
            try {
                await fetch('http://localhost:8000/data/manual-entry', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                        kpi_id: row.kpi_id,
                        value: row.value,
                        date: row.date,
                        unit: row.unit,
                        comment: `Files Import from ${file.name} (Confidence: ${row.confidence})`
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
        alert(`Successfully ingested ${successCount} data points!`);
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Files Import</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Upload your reports (PDF, Excel) and let AI extract CSRD data points for you.</p>
            </div>

            {/* File Upload Section */}
            {!extractedData.length && (
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
                        accept=".pdf,.xlsx,.csv"
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
                            <p style={{ color: 'var(--text-secondary)' }}>Supports PDF, Excel, CSV</p>
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
                                        <th style={{ padding: '1rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {extractedData.map((row) => (
                                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontFamily: 'monospace', fontWeight: 'bold' }}>
                                                <input
                                                    type="text"
                                                    value={row.kpi_id}
                                                    onChange={(e) => handleUpdateRow(row.id, 'kpi_id', e.target.value)}
                                                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>{row.name}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.value}
                                                    onChange={(e) => handleUpdateRow(row.id, 'value', e.target.value)}
                                                    style={{ width: '100px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="text"
                                                    value={row.unit}
                                                    onChange={(e) => handleUpdateRow(row.id, 'unit', e.target.value)}
                                                    style={{ width: '80px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                                                />
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <input
                                                    type="date"
                                                    value={row.date}
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

                    <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
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
                                    Confirm & Ingest {extractedData.length} Data Points
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartImportPage;
