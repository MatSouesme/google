import React, { useState, useEffect } from 'react';
import { auth } from '../firebase-config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, CheckCircle, Circle } from 'lucide-react';

const FinalReportPage = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Define the full scope of standards for progress calculation
    // In a real app, this should come from the user's configuration
    const allStandards = ['e1', 'e2', 'e3', 'e4', 'e5', 's1', 's2', 's3', 's4', 'g1'];

    useEffect(() => {
        fetchReport();
    }, []);

    const fetchReport = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;
            const token = await user.getIdToken();

            const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/final-report', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch report');

            const data = await response.json();
            setReportData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate progress
    // We count how many unique standards have at least one approved topic
    const completedStandards = new Set(reportData.map(item => item.standard.toLowerCase()));
    const progressPercentage = Math.round((completedStandards.size / allStandards.length) * 100);

    if (loading) return <div className="page-container">Loading...</div>;

    return (
        <div className="page-container">
            <div className="page-header">
                <h1 className="page-title">Final Report Status</h1>
                <p className="page-subtitle">Track your progress and view the consolidated report.</p>
            </div>

            {/* Progress Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0 }}>Completion Progress</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, height: '10px', backgroundColor: 'var(--border-color)', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${progressPercentage}%`, 
                            height: '100%', 
                            backgroundColor: 'var(--success-color)',
                            transition: 'width 0.5s ease'
                        }} />
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{progressPercentage}%</span>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    {allStandards.map(std => (
                        <div key={std} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            opacity: completedStandards.has(std) ? 1 : 0.5
                        }}>
                            {completedStandards.has(std) ? 
                                <CheckCircle size={16} color="var(--success-color)" /> : 
                                <Circle size={16} />
                            }
                            <span style={{ textTransform: 'uppercase' }}>{std}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Section */}
            <div className="report-content">
                {reportData.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                        <h3>No approved content yet</h3>
                        <p>Go to the Generator to draft and approve sections of your report.</p>
                    </div>
                ) : (
                    reportData.map((section, index) => (
                        <div key={index} className="card" style={{ marginBottom: '2rem' }}>
                            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                                <span style={{ 
                                    backgroundColor: 'var(--primary-color)', 
                                    color: 'white', 
                                    padding: '0.2rem 0.5rem', 
                                    borderRadius: '4px', 
                                    fontSize: '0.8rem',
                                    textTransform: 'uppercase',
                                    marginRight: '1rem'
                                }}>
                                    {section.standard}
                                </span>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{section.topic}</span>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                    Last updated: {new Date(section.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="markdown-content">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {section.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FinalReportPage;
