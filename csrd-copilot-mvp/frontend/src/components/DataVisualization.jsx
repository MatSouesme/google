import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { auth } from '../firebase-config';
import { API_BASE_URL } from '../api/apiClient';

const DataVisualization = () => {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;
                const idToken = await user.getIdToken();

                // TODO: Use env var for URL
                const response = await fetch(`${API_BASE_URL}/data/dashboard`, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`
                    }
                });

                if (!response.ok) throw new Error("Failed to fetch dashboard data");
                
                const result = await response.json();
                if (result.debug_error) {
                    console.error("Backend Error:", result.debug_error);
                    setError(`Backend Error: ${result.debug_error}`);
                }
                setData(result);
            } catch (err) {
                console.error(err);
                setError(t('dataVisualization.noDataDesc'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div style={{ color: 'var(--text-secondary)' }}>{t('dataVisualization.loadingVisualization')}</div>;
    if (error) return <div style={{ color: 'var(--error-color)' }}>{error}</div>;
    if (!data || (data.emissions_by_year.length === 0 && data.top_facilities.length === 0)) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <h3 style={{ color: 'var(--text-color)' }}>{t('dataVisualization.noDataTitle')}</h3>
                <p>{t('dataVisualization.noDataDesc')}</p>
            </div>
        );
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="dashboard-container">
            <h2 style={{ color: 'var(--primary-color)', marginTop: 0 }}>{t('dataVisualization.title')}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                {t('dataVisualization.subtitle')}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                
                {/* Chart 1: Emissions by Year */}
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-color)' }}>{t('dataVisualization.emissionsByYear')}</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={data.emissions_by_year}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis dataKey="year" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                                    itemStyle={{ color: 'var(--text-color)' }}
                                />
                                <Legend />
                                <Bar dataKey="scope1" stackId="a" fill="#8884d8" name="Scope 1" />
                                <Bar dataKey="scope2" stackId="a" fill="#82ca9d" name="Scope 2" />
                                <Bar dataKey="scope3" stackId="a" fill="#ffc658" name="Scope 3" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Top Facilities */}
                <div style={{ backgroundColor: 'var(--surface-color)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem', color: 'var(--text-color)' }}>{t('dataVisualization.topFacilities')}</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={data.top_facilities}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="total_emissions"
                                >
                                    {data.top_facilities.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}
                                    itemStyle={{ color: 'var(--text-color)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DataVisualization;
