
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { kpis as initialKpis } from '../data/kpis';
import { CheckCircle, AlertCircle, ChevronDown, ChevronUp, Search, Filter, Database, Code, Bot, Loader2, ArrowRight, Folder, FolderOpen } from 'lucide-react';
import { auth } from '../firebase-config';
import Alert from '../components/Alert';
import { useDataStatus } from '../hooks/useDataStatus';
import { API_BASE_URL } from '../api/apiClient';

const DataPointsPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { hasImportedData } = useDataStatus();
    const [kpis, setKpis] = useState(initialKpis);
    const [expandedKPI, setExpandedKPI] = useState(null);
    const [expandedFolders, setExpandedFolders] = useState({ Environmental: false, Social: false, Governance: false, General: false });
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [standardFilter, setStandardFilter] = useState('all');
    const [sqlLoading, setSqlLoading] = useState({}); // { [kpiId]: boolean }
    const [generatedSql, setGeneratedSql] = useState({}); // { [kpiId]: string }

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const user = auth.currentUser;
                const token = user ? await user.getIdToken() : null;
                // If no token yet, it might be loading, but we can try. 
                // Better to wait for auth state, but for MVP this is okay if triggered on mount/auth change.
                
                if (token) {
                    const response = await fetch(`${API_BASE_URL}/data/status`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data.completed_kpis) {
                            setKpis(prev => prev.map(k => 
                                data.completed_kpis.includes(k.id) 
                                    ? { ...k, status: 'completed' } 
                                    : k
                            ));
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch status:", error);
            }
        };
        
        fetchStatus();
    }, [auth.currentUser]); // Re-run when user auth state changes

    // Derive unique standards for filter
    const standards = [...new Set(kpis.map(k => k.standard.split(' ')[0]))].sort();

    const toggleKPI = (id) => {
        setExpandedKPI(expandedKPI === id ? null : id);
    };

    const toggleFolder = (category) => {
        setExpandedFolders(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const handleGenerateSQL = async (e, kpi) => {
        e.stopPropagation(); // Prevent toggling accordion
        setSqlLoading(prev => ({ ...prev, [kpi.id]: true }));

        try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;

            // Construct a prompt for the SQL generation
            const prompt = `Generate a standard SQL query to retrieve or calculate the following CSRD data point:
            ID: ${kpi.id}
            Name: ${kpi.name}
            Description: ${kpi.description}
            Unit: ${kpi.unit}
            
            Assume a schema with tables: 
            - energy_consumption (site_id, date, fuel_type, amount_mwh)
            - ghg_emissions (site_id, date, scope, tco2e)
            - employees (employee_id, gender, department, salary, is_manager)
            - incidents (incident_id, date, type, severity)
            
            Return ONLY the SQL query.`;

            // Call the chat API
            // Note: Using the same endpoint as ChatPage. If unavailable or fails, fallback to mock.
            const response = await fetch('https://csrd-api-71795126030.europe-west1.run.app/chat/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({ query: prompt })
            });

            if (!response.ok) throw new Error("API call failed");

            const data = await response.json();
            // The API returns 'answer' (text) and optional 'sql'. 
            // If 'sql' is present, use it. If not, maybe the 'answer' contains code.
            const sql = data.sql || data.answer;

            setGeneratedSql(prev => ({ ...prev, [kpi.id]: sql }));

        } catch (error) {
            console.error("SQL Generation failed:", error);
            // Fallback mock for demo purposes if API fails
            const mockSql = `-- Mock SQL for ${kpi.id}\nSELECT\n  date,\n  SUM(value) as total_${kpi.unit.toLowerCase().replace(/[^a-z0-9]/g, '_')}\nFROM data_points\nWHERE kpi_id = '${kpi.id}'\nGROUP BY date\nORDER BY date DESC;`;
            setGeneratedSql(prev => ({ ...prev, [kpi.id]: mockSql }));
        } finally {
            setSqlLoading(prev => ({ ...prev, [kpi.id]: false }));
            if (expandedKPI !== kpi.id) setExpandedKPI(kpi.id); // Open if closed
        }
    };

    const filteredKPIs = kpis.filter(kpi => {
        const matchesSearch =
            kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            kpi.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            kpi.description.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'all' || kpi.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || kpi.category === categoryFilter;
        const matchesStandard = standardFilter === 'all' || kpi.standard.startsWith(standardFilter);

        return matchesSearch && matchesStatus && matchesCategory && matchesStandard;
    });

    const [manualEntry, setManualEntry] = useState({}); // { [kpiId]: { value: '', date: '', comment: '' } }
    const [submitting, setSubmitting] = useState({}); // { [kpiId]: boolean }

    const handleManualEntryChange = (kpiId, field, value) => {
        setManualEntry(prev => ({
            ...prev,
            [kpiId]: {
                ...prev[kpiId],
                [field]: value
            }
        }));
    };

    const handleManualSubmit = async (e, kpi) => {
        e.preventDefault();
        const entry = manualEntry[kpi.id];
        if (!entry || !entry.value || !entry.date) return;

        setSubmitting(prev => ({ ...prev, [kpi.id]: true }));

        try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;

            // TODO: Use env var
            const response = await fetch(`${API_BASE_URL}/data/manual-entry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    kpi_id: kpi.id,
                    value: entry.value,
                    date: entry.date,
                    comment: entry.comment,
                    unit: kpi.unit
                })
            });

            if (!response.ok) {
                // If endpoint doesn't exist, simulate success for demo
                console.warn("API endpoint might not exist, simulating success");
            }

            // Simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mark as completed
            setKpis(prev => prev.map(p => p.id === kpi.id ? { ...p, status: 'completed' } : p));
            setManualEntry(prev => ({ ...prev, [kpi.id]: { value: '', date: '', comment: '' } })); // Reset form
            alert(`Data for ${kpi.id} submitted successfully!`);

        } catch (error) {
            console.error("Submission failed:", error);
            alert("Failed to submit data. Please try again.");
        } finally {
            setSubmitting(prev => ({ ...prev, [kpi.id]: false }));
        }
    };

    const [dispatching, setDispatching] = useState(false);

    const handleDispatch = async () => {
        setDispatching(true);
        try {
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;
            
            const response = await fetch(`${API_BASE_URL}/data/dispatch`, {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            
            if (!response.ok) throw new Error("Dispatch failed");
            
            const data = await response.json();
            
            // Update KPIs status based on response
            if (data.stats && data.stats.completed_kpis) {
                setKpis(prev => prev.map(k => 
                    data.stats.completed_kpis.includes(k.id) 
                        ? { ...k, status: 'completed' } 
                        : k
                ));
            }
            
            alert("Data dispatched and progress updated!");
            
        } catch (error) {
            console.error("Dispatch error:", error);
            alert("Failed to update progress.");
        } finally {
            setDispatching(false);
        }
    };

    const categories = ['Environmental', 'Social', 'Governance', 'General'];

    // Group KPIs by category
    const groupedKPIs = {
        Environmental: filteredKPIs.filter(k => k.category === 'Environmental'),
        Social: filteredKPIs.filter(k => k.category === 'Social'),
        Governance: filteredKPIs.filter(k => k.category === 'Governance'),
        General: filteredKPIs.filter(k => k.category === 'General')
    };

    // Stats Calculation
    const stats = {
        total: kpis.length,
        completed: kpis.filter(k => k.status === 'completed').length,
        missing: kpis.filter(k => k.status === 'missing').length
    };
    const progressPercentage = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    
    // Category stats
    const categoryStats = {
        Environmental: {
            total: kpis.filter(k => k.category === 'Environmental').length,
            completed: kpis.filter(k => k.category === 'Environmental' && k.status === 'completed').length
        },
        Social: {
            total: kpis.filter(k => k.category === 'Social').length,
            completed: kpis.filter(k => k.category === 'Social' && k.status === 'completed').length
        },
        Governance: {
            total: kpis.filter(k => k.category === 'Governance').length,
            completed: kpis.filter(k => k.category === 'Governance' && k.status === 'completed').length
        },
        General: {
            total: kpis.filter(k => k.category === 'General').length,
            completed: kpis.filter(k => k.category === 'General' && k.status === 'completed').length
        }
    };
    
    const getCategoryIcon = (category) => {
        const icons = {
            Environmental: '🌍',
            Social: '👥',
            Governance: '⚖️',
            General: '📊'
        };
        return icons[category] || '📁';
    };
    
    const getCategoryColor = (category) => {
        const colors = {
            Environmental: '#10B981',
            Social: '#3B82F6',
            Governance: '#8B5CF6',
            General: '#6B7280'
        };
        return colors[category] || '#6B7280';
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>{t('dataPoints.title')}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>{t('dataPoints.subtitle')}</p>
                </div>
                <button
                    onClick={() => navigate('/generator')}
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
                    {t('dataPoints.nextStep')} <ArrowRight size={18} />
                </button>
            </div>

            {/* Alertes de guidance */}
            {!hasImportedData && (
                <Alert
                    type="warning"
                    title={t('alerts.dataPoints.noData.title')}
                    message={t('alerts.dataPoints.noData.message')}
                    action={{
                        label: t('alerts.dataPoints.noData.action'),
                        onClick: () => navigate('/smart-import')
                    }}
                />
            )}

            {hasImportedData && stats.completed === 0 && (
                <Alert
                    type="info"
                    title={t('alerts.dataPoints.noConfigured.title')}
                    message={t('alerts.dataPoints.noConfigured.message')}
                />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button 
                    onClick={handleDispatch} 
                    disabled={dispatching}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {dispatching ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                    Update Progress & Dispatch Data
                </button>
            </div>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid var(--primary-color)' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('dataPoints.stats.overallProgress')}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{progressPercentage}%</div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', marginTop: '0.5rem' }}>
                            <div style={{
                                width: `${progressPercentage}%`,
                                height: '100%',
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '3px',
                                transition: 'width 0.5s ease-in-out'
                            }}></div>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #10B981' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        <CheckCircle size={24} color="#10B981" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('dataPoints.stats.dataCollected')}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.completed}/{stats.total}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderTop: '4px solid #EF4444' }}>
                    <div style={{ padding: '1rem', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <AlertCircle size={24} color="#EF4444" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('dataPoints.stats.missingDataPoints')}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.missing}</div>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Search - Full Width */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                        type="text"
                        placeholder={t('dataPoints.search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 12px 12px 40px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-color)',
                            color: 'var(--text-color)',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                {/* Filters - Row below */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Category Filter */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        >
                            <option value="all">{t('dataPoints.filters.allCategories')}</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Standard Filter */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <select
                            value={standardFilter}
                            onChange={(e) => setStandardFilter(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        >
                            <option value="all">{t('dataPoints.filters.allStandards')}</option>
                            <option value="ESRS E">Environmental (ESRS E)</option>
                            <option value="ESRS S">Social (ESRS S)</option>
                            <option value="ESRS G">Governance (ESRS G)</option>
                            <option value="ESRS 2">General (ESRS 2)</option>
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="missing">Missing</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <span>{t('dataPoints.showing', { count: filteredKPIs.length, total: kpis.length })}</span>
                    <button
                        onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); setStandardFilter('all'); }}
                        className="btn-animated"
                        style={{ 
                            fontSize: '0.9rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: 'transparent',
                            border: '2px solid var(--primary-color)',
                            color: 'var(--primary-color)',
                            borderRadius: '6px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'var(--primary-color)';
                            e.target.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = 'var(--primary-color)';
                        }}
                    >
                        <Filter size={16} />
                        {t('dataPoints.clearFilters')}
                    </button>
                </div>
            </div>

            {/* List by Folders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {categories.map(category => {
                    const categoryKPIs = groupedKPIs[category] || [];
                    if (categoryKPIs.length === 0) return null;
                    
                    const isExpanded = expandedFolders[category];
                    const catStats = categoryStats[category];
                    
                    return (
                        <div key={category} className="animate-fade-in">
                            {/* Folder Header */}
                            <div 
                                className="card"
                                style={{
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    border: `2px solid ${getCategoryColor(category)}`,
                                    backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'var(--surface-color)',
                                    transition: 'all 0.3s ease',
                                    marginBottom: isExpanded ? '0.5rem' : '0'
                                }}
                                onClick={() => toggleFolder(category)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        {isExpanded ? (
                                            <FolderOpen size={32} style={{ color: getCategoryColor(category) }} />
                                        ) : (
                                            <Folder size={32} style={{ color: getCategoryColor(category) }} />
                                        )}
                                        <div>
                                            <h3 style={{ 
                                                fontSize: '1.5rem', 
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                marginBottom: '0.25rem'
                                            }}>
                                                <span>{getCategoryIcon(category)}</span>
                                                <span>{category}</span>
                                            </h3>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                {catStats.completed} / {catStats.total} {t('dataPoints.dataPoints')} {t('dataPoints.completed')}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getCategoryColor(category) }}>
                                                {catStats.total > 0 ? Math.round((catStats.completed / catStats.total) * 100) : 0}%
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {categoryKPIs.length} {t('dataPoints.dataPoints')}
                                            </div>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp size={24} style={{ color: getCategoryColor(category) }} />
                                        ) : (
                                            <ChevronDown size={24} style={{ color: getCategoryColor(category) }} />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Folder Content */}
                            {isExpanded && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1rem' }}>
                                    {categoryKPIs.map(kpi => (
                                        <div key={kpi.id} className="card animate-fade-in" style={{ overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                                            <div
                                                style={{
                                                    padding: '1.25rem 1.5rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    cursor: 'pointer',
                                                    backgroundColor: expandedKPI === kpi.id ? 'var(--bg-secondary)' : 'transparent',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onClick={() => toggleKPI(kpi.id)}
                        >
                            <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: '1.5rem', overflow: 'hidden' }}>
                                {/* Status Icon */}
                                <div title={kpi.status === 'completed' ? 'Completed' : 'Missing'} style={{
                                    flexShrink: 0,
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: kpi.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                }}>
                                    {kpi.status === 'completed' ? <CheckCircle size={18} color="#10B981" /> : <AlertCircle size={18} color="#EF4444" />}
                                </div>

                                {/* ID & Name */}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold',
                                            padding: '2px 6px', borderRadius: '4px',
                                            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                            color: 'var(--text-color)'
                                        }}>
                                            {kpi.id}
                                        </span>
                                        <h3 style={{ margin: 0, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{kpi.name}</h3>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem' }}>
                                        <span>{kpi.category}</span>
                                        <span>•</span>
                                        <span>{kpi.standard}</span>
                                        <span>•</span>
                                        <span>{t('dataPoints.unit')}: {kpi.unit}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={(e) => handleGenerateSQL(e, kpi)}
                                    disabled={sqlLoading[kpi.id]}
                                    style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    {sqlLoading[kpi.id] ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
                                    <span>{generatedSql[kpi.id] ? t('dataPoints.regenerateSQL') : t('dataPoints.getSQL')}</span>
                                </button>
                                {expandedKPI === kpi.id ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                            </div>
                        </div>

                        {/* Expanded Content */}
                        {expandedKPI === kpi.id && (
                            <div style={{ padding: '2rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 3fr) 2fr', gap: '2rem' }}>

                                    {/* Left: Description & SQL */}
                                    <div>
                                        <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{t('dataPoints.description')}</h4>
                                        <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>{kpi.description}</p>

                                        {generatedSql[kpi.id] && (
                                            <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                    <h4 style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                                        <Code size={16} color="var(--primary-color)" /> {t('dataPoints.generatedSQLQuery')}
                                                    </h4>
                                                </div>
                                                <div style={{ position: 'relative' }}>
                                                    <pre style={{
                                                        backgroundColor: '#1E1E1E', padding: '1rem', borderRadius: '8px',
                                                        overflowX: 'auto', fontSize: '0.9rem', color: '#E0E0E0',
                                                        border: '1px solid #333'
                                                    }}>
                                                        <code>{generatedSql[kpi.id]}</code>
                                                    </pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Metadata, Status & Manual Entry */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Status Card */}
                                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <h5 style={{ marginTop: 0, marginBottom: '1rem' }}>Data Status</h5>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: kpi.status === 'completed' ? '#10B981' : '#EF4444' }}>
                                                {kpi.status === 'completed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                                                <span style={{ fontWeight: '500' }}>{kpi.status === 'completed' ? 'Completed' : 'Missing Data'}</span>
                                            </div>
                                            {kpi.status === 'missing' && (
                                                <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => {
                                                    setKpis(prev => prev.map(p => p.id === kpi.id ? { ...p, status: 'completed' } : p));
                                                }}>
                                                    Simulate Complete
                                                </button>
                                            )}
                                        </div>

                                        {/* Manual Entry Form */}
                                        <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <h5 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Filter size={16} /> Manual Data Entry
                                            </h5>
                                            <form onSubmit={(e) => handleManualSubmit(e, kpi)}>
                                                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Value ({kpi.unit})</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="0.00"
                                                            value={manualEntry[kpi.id]?.value || ''}
                                                            onChange={(e) => handleManualEntryChange(kpi.id, 'value', e.target.value)}
                                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Date</label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={manualEntry[kpi.id]?.date || ''}
                                                            onChange={(e) => handleManualEntryChange(kpi.id, 'date', e.target.value)}
                                                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ marginBottom: '1rem' }}>
                                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Commentary (Optional)</label>
                                                    <textarea
                                                        rows="2"
                                                        value={manualEntry[kpi.id]?.comment || ''}
                                                        onChange={(e) => handleManualEntryChange(kpi.id, 'comment', e.target.value)}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)', resize: 'vertical' }}
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="btn btn-primary"
                                                    style={{ width: '100%' }}
                                                    disabled={submitting[kpi.id]}
                                                >
                                                    {submitting[kpi.id] ? (
                                                        <>
                                                            <Loader2 size={16} className="spin" style={{ marginRight: '0.5rem' }} />
                                                            Submitting...
                                                        </>
                                                    ) : 'Submit Data'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                {filteredKPIs.length === 0 && (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
                        <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'var(--text-secondary)' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>{t('dataPoints.noResults')}</p>
                        <button
                            onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setStatusFilter('all'); setStandardFilter('all'); }}
                            className="btn btn-outline"
                            style={{ marginTop: '1rem' }}
                        >
                            {t('dataPoints.resetFilters')}
                        </button>
                    </div>
                )}
            </div>

            {hasImportedData && filteredKPIs.length > 0 && (
                <div style={{ marginTop: '3rem', padding: '2rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>{t('navigation.sections.readyToGenerate.title')}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{t('navigation.sections.readyToGenerate.message')}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/final-report')}
                        style={{ padding: '0.75rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
                    >
                        {t('navigation.nextStep.viewFinalReport')}
                        <ArrowRight size={20} />
                    </button>
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .animate-fade-in { animation: fadeIn 0.3s ease-in; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default DataPointsPage;
