import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase-config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, CheckCircle, Circle, ArrowRight } from 'lucide-react';
import Alert from '../components/Alert';
import { useDataStatus } from '../hooks/useDataStatus';
import { API_BASE_URL } from '../api/apiClient';

const FinalReportPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { hasImportedData, hasDataPoints } = useDataStatus();
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

            const response = await fetch(`${API_BASE_URL}/final-report`, {
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FileText size={32} color="#10b981" />
                        {t('finalReport.title')}
                    </h1>
                    <p className="page-subtitle">{t('finalReport.subtitle')}</p>
                </div>
            </div>

            {/* Alertes de guidance */}
            {!hasImportedData && (
                <Alert
                    type="error"
                    title={t('alerts.finalReport.noData.title')}
                    message={t('alerts.finalReport.noData.message')}
                    action={{
                        label: t('alerts.finalReport.noData.action'),
                        onClick: () => navigate('/smart-import')
                    }}
                    dismissible={false}
                />
            )}

            {hasImportedData && !hasDataPoints && (
                <Alert
                    type="warning"
                    title={t('alerts.finalReport.noDataPoints.title')}
                    message={t('alerts.finalReport.noDataPoints.message')}
                    action={{
                        label: t('alerts.finalReport.noDataPoints.action'),
                        onClick: () => navigate('/data-points')
                    }}
                />
            )}

            {hasImportedData && reportData.length === 0 && (
                <Alert
                    type="info"
                    title={t('alerts.finalReport.noDrafts.title')}
                    message={t('alerts.finalReport.noDrafts.message')}
                    action={{
                        label: t('alerts.finalReport.noDrafts.action'),
                        onClick: () => navigate('/generator')
                    }}
                />
            )}

            {/* Progress Section */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginTop: 0 }}>{t('finalReport.completionProgress')}</h3>
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

                {reportData.length > 0 && (
                    <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('navigation.sections.exploreData.title')}</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{t('navigation.sections.exploreData.message')}</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/dashboard')}
                            style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
                        >
                            {t('navigation.nextStep.viewDashboard')}
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinalReportPage;
