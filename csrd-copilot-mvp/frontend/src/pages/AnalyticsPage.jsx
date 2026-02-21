import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Database, Zap, AlertCircle, Clock, CheckCircle, FileText } from 'lucide-react';
import { API_BASE_URL } from '../api/apiClient';
import { auth } from '../firebase-config';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [confidenceDistribution, setConfidenceDistribution] = useState(null);
  const [featureAdoption, setFeatureAdoption] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30);
  const [activeTab, setActiveTab] = useState('overview'); // overview, extraction, api, users, ai

  useEffect(() => {
    fetchAllAnalytics();
  }, [timeRange]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('Vous devez être connecté pour accéder à cette page');
      }
      const token = await user.getIdToken();
      
      // Fetch main analytics
      const analyticsRes = await fetch(`${API_BASE_URL}/metrics/analytics?days=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!analyticsRes.ok) {
        if (analyticsRes.status === 403) {
          throw new Error('Accès refusé: Vous devez être administrateur pour accéder à cette page');
        }
        throw new Error(`HTTP ${analyticsRes.status}`);
      }

      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch timeseries (async, failures non-bloquantes)
      try {
        const timeseriesRes = await fetch(`${API_BASE_URL}/metrics/extraction/timeseries?days=${timeRange}&granularity=day`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (timeseriesRes.ok) {
          const timeseriesData = await timeseriesRes.json();
          setTimeseries(timeseriesData.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch timeseries:', err);
      }

      // Fetch confidence distribution
      try {
        const confRes = await fetch(`${API_BASE_URL}/metrics/confidence/distribution?days=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (confRes.ok) {
          const confData = await confRes.json();
          setConfidenceDistribution(confData);
        }
      } catch (err) {
        console.error('Failed to fetch confidence:', err);
      }

      // Fetch feature adoption
      try {
        const featuresRes = await fetch(`${API_BASE_URL}/metrics/features/adoption?days=${timeRange}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (featuresRes.ok) {
          const featuresData = await featuresRes.json();
          setFeatureAdoption(featuresData.features || []);
        }
      } catch (err) {
        console.error('Failed to fetch features:', err);
      }

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <div className="spinner" />
        <p>Chargement des analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '30px' }}>
        <div style={{ background: '#fee', border: '1px solid #fcc', borderRadius: '8px', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
          <AlertCircle size={24} color="#c33" />
          <p style={{ marginTop: '10px', fontWeight: 'bold' }}>{error}</p>
          {error.includes('administrateur') ? (
            <p style={{ marginTop: '10px', fontSize: '14px' }}>
              Cette page est réservée aux administrateurs. Contactez votre responsable si vous pensez que c'est une erreur.
            </p>
          ) : (
            <button onClick={fetchAllAnalytics} style={{ marginTop: '15px' }}>Réessayer</button>
          )}
        </div>
      </div>
    );
  }

  const { extraction_stats, api_performance, user_engagement, data_quality, vertex_ai_stats, duplicate_detection } = analytics || {};

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>
          <BarChart3 size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }} />
          Analytics Admin
        </h1>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label>Période:</label>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(Number(e.target.value))}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
            <option value={180}>6 mois</option>
          </select>
          
          <button 
            onClick={fetchAllAnalytics}
            style={{ padding: '8px 16px', borderRadius: '6px', background: '#3182ce', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', borderBottom: '2px solid #e2e8f0' }}>
        {[
          { id: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 size={18} /> },
          { id: 'extraction', label: 'Extraction', icon: <FileText size={18} /> },
          { id: 'api', label: 'Performance API', icon: <Zap size={18} /> },
          { id: 'users', label: 'Utilisateurs', icon: <Users size={18} /> },
          { id: 'ai', label: 'IA & Coûts', icon: <Database size={18} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? '#3182ce' : 'transparent',
              color: activeTab === tab.id ? 'white' : '#4a5568',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3182ce' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content par Tab */}
      {activeTab === 'overview' && (
        <OverviewTab 
          extraction={extraction_stats}
          users={user_engagement}
          quality={data_quality}
          duplicates={duplicate_detection}
        />
      )}

      {activeTab === 'extraction' && (
        <ExtractionTab 
          stats={extraction_stats}
          timeseries={timeseries}
          confidence={confidenceDistribution}
        />
      )}

      {activeTab === 'api' && (
        <ApiTab performance={api_performance} />
      )}

      {activeTab === 'users' && (
        <UsersTab 
          engagement={user_engagement}
          features={featureAdoption}
        />
      )}

      {activeTab === 'ai' && (
        <AiTab vertexStats={vertex_ai_stats} />
      )}
    </div>
  );
}

// ========== TABS COMPONENTS ==========

function OverviewTab({ extraction, users, quality, duplicates }) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2c5282' }}>Vue d'ensemble</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <StatCard
          title="Taux de Succès Extraction"
          value={`${extraction?.success_rate || 0}%`}
          subtitle={`${extraction?.successful_extractions || 0} / ${extraction?.total_extractions || 0} documents`}
          icon={<CheckCircle size={24} color="#38a169" />}
          color="#f0fff4"
        />
        
        <StatCard
          title="Temps Médian (P50)"
          value={`${Math.round(extraction?.p50_ms / 1000) || 0}s`}
          subtitle={`P95: ${Math.round(extraction?.p95_ms / 1000) || 0}s, P99: ${Math.round(extraction?.p99_ms / 1000) || 0}s`}
          icon={<Clock size={24} color="#3182ce" />}
          color="#ebf8ff"
        />
        
        <StatCard
          title="Utilisateurs Actifs"
          value={users?.total_active_users || 0}
          subtitle={`DAU moyen: ${Math.round(users?.avg_dau) || 0}, Stickiness: ${users?.stickiness || 0}%`}
          icon={<Users size={24} color="#805ad5" />}
          color="#faf5ff"
        />
        
        <StatCard
          title="KPIs Extraits (Moyenne)"
          value={extraction?.avg_kpis_per_doc?.toFixed(1) || '0.0'}
          subtitle={`Médiane: ${extraction?.median_kpis || 0} KPIs/doc`}
          icon={<TrendingUp size={24} color="#dd6b20" />}
          color="#fffaf0"
        />
        
        <StatCard
          title="Taux de Doublons"
          value={`${duplicates?.detection_rate || 0}%`}
          subtitle={`${duplicates?.total_conflicts || 0} conflits détectés`}
          icon={<AlertCircle size={24} color="#d69e2e" />}
          color="#fefcbf"
        />
        
        <StatCard
          title="Qualité Données E1"
          value={`${quality?.e1_completeness?.toFixed(0) || 0}%`}
          subtitle={`S1: ${quality?.s1_completeness?.toFixed(0) || 0}%, G1: ${quality?.g1_completeness?.toFixed(0) || 0}%`}
          icon={<Database size={24} color="#38a169" />}
          color="#f0fff4"
        />
      </div>
    </div>
  );
}

function ExtractionTab({ stats, timeseries, confidence }) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2c5282' }}>Extraction de Documents</h2>
      
      {/* KPIs principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        <StatCard
          title="Total Extractions"
          value={stats?.total_extractions || 0}
          subtitle={`${stats?.successful_extractions || 0} réussies`}
          icon={<FileText size={24} color="#3182ce" />}
          color="#ebf8ff"
        />
        <StatCard
          title="Taux de Succès"
          value={`${(stats?.success_rate || 0).toFixed(0)}%`}
          subtitle="Documents traités avec succès"
          icon={<CheckCircle size={24} color="#38a169" />}
          color="#f0fff4"
        />
        <StatCard
          title="Temps Médian"
          value={`${((stats?.p50_ms || 0) / 1000).toFixed(1)}s`}
          subtitle={`P95: ${((stats?.p95_ms || 0) / 1000).toFixed(1)}s`}
          icon={<Clock size={24} color="#dd6b20" />}
          color="#fffaf0"
        />
        <StatCard
          title="KPIs / Document"
          value={(stats?.avg_kpis_per_doc || 0).toFixed(1)}
          subtitle={`Médiane: ${stats?.median_kpis || 0}`}
          icon={<TrendingUp size={24} color="#805ad5" />}
          color="#faf5ff"
        />
      </div>

      {/* Types et Tailles côte à côte */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '30px' }}>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', color: '#4a5568', marginBottom: '12px' }}>Par Type</h3>
          <ProgressBar label="PDF" value={stats?.pdf_count || 0} total={stats?.total_extractions || 1} color="#3182ce" />
          <ProgressBar label="Excel/CSV" value={stats?.excel_count || 0} total={stats?.total_extractions || 1} color="#38a169" />
          <ProgressBar label="Image" value={stats?.image_count || 0} total={stats?.total_extractions || 1} color="#805ad5" />
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', color: '#4a5568', marginBottom: '12px' }}>Par Taille</h3>
          <ProgressBar label="< 1 MB" value={stats?.small_files || 0} total={stats?.total_extractions || 1} color="#38a169" />
          <ProgressBar label="1-10 MB" value={stats?.medium_files || 0} total={stats?.total_extractions || 1} color="#dd6b20" />
          <ProgressBar label="> 10 MB" value={stats?.large_files || 0} total={stats?.total_extractions || 1} color="#e53e3e" />
        </div>
      </div>

      {/* Timeseries */}
      {timeseries && timeseries.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '15px', color: '#4a5568', marginBottom: '15px' }}>Évolution Temporelle</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#718096' }}>Période</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Documents</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Durée Moy.</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>KPIs Moy.</th>
                  <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Succès</th>
                </tr>
              </thead>
              <tbody>
                {timeseries.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f7fafc' }}>
                    <td style={{ padding: '10px', fontSize: '14px' }}>
                      {new Date(row.period).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>{row.total_docs}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                      {((row.avg_duration_ms || 0) / 1000).toFixed(1)}s
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                      {(row.avg_kpis_extracted || 0).toFixed(1)}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                      <span style={{ 
                        background: (row.success_rate || 0) >= 90 ? '#c6f6d5' : '#fed7d7', 
                        padding: '2px 8px', borderRadius: '10px', fontSize: '13px' 
                      }}>
                        {(row.success_rate || 0).toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confidence Distribution */}
      {confidence && confidence.distribution && confidence.distribution.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', color: '#4a5568', marginBottom: '10px' }}>
            Scores de Confiance 
            <span style={{ fontWeight: 'normal', color: '#a0aec0', marginLeft: '10px' }}>
              Moyenne: {(confidence.avg_confidence || 0).toFixed(2)}
            </span>
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {confidence.distribution.map((bucket, idx) => (
              <div key={idx} style={{
                background: getConfidenceColor(bucket.confidence_bucket),
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600'
              }}>
                {bucket.confidence_bucket}: {bucket.count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ApiTab({ performance }) {
  if (!performance || performance.length === 0) {
    return <div style={{ padding: '20px' }}>Aucune donnée de performance API disponible</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2c5282' }}>Performance API (7 derniers jours)</h2>
      
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#718096' }}>Endpoint</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Requêtes</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>P50 (ms)</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>P95 (ms)</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>P99 (ms)</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Taux Erreur</th>
              <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Payload (KB)</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((endpoint, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f7fafc' }}>
                <td style={{ padding: '10px', fontSize: '14px', fontFamily: 'monospace', color: '#2d3748' }}>
                  {endpoint.endpoint}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                  {endpoint.request_count}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                  {Math.round(endpoint.p50_latency_ms)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                  {Math.round(endpoint.p95_latency_ms)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                  {Math.round(endpoint.p99_latency_ms)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px', color: endpoint.error_rate > 5 ? '#e53e3e' : '#38a169' }}>
                  {endpoint.error_rate}%
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                  {endpoint.avg_payload_kb?.toFixed(1) || '0.0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsersTab({ engagement, features }) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2c5282' }}>Engagement Utilisateurs</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard
          title="Utilisateurs Actifs"
          value={engagement?.total_active_users || 0}
          subtitle="Sur la période"
          icon={<Users size={24} color="#805ad5" />}
          color="#faf5ff"
        />
        
        <StatCard
          title="DAU Moyen"
          value={Math.round(engagement?.avg_dau) || 0}
          subtitle="Daily Active Users"
          icon={<TrendingUp size={24} color="#3182ce" />}
          color="#ebf8ff"
        />
        
        <StatCard
          title="WAU Max"
          value={engagement?.max_wau || 0}
          subtitle="Weekly Active Users"
          icon={<Users size={24} color="#38a169" />}
          color="#f0fff4"
        />
        
        <StatCard
          title="Stickiness"
          value={`${engagement?.stickiness || 0}%`}
          subtitle="DAU/WAU ratio"
          icon={<BarChart3 size={24} color="#dd6b20" />}
          color="#fffaf0"
        />
        
        <StatCard
          title="Actions par Session"
          value={engagement?.avg_actions_per_session?.toFixed(1) || '0.0'}
          subtitle="Moyenne"
          icon={<Zap size={24} color="#d69e2e" />}
          color="#fefcbf"
        />
      </div>

      {/* Feature Adoption */}
      {features && features.length > 0 && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Adoption des Features</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', fontSize: '13px', color: '#718096' }}>Feature</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Utilisateurs Uniques</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Utilisations</th>
                <th style={{ padding: '10px', textAlign: 'right', fontSize: '13px', color: '#718096' }}>Moy./User</th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f7fafc' }}>
                  <td style={{ padding: '10px', fontSize: '14px' }}>{feature.feature}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>{feature.unique_users}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>{feature.usage_count}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontSize: '14px' }}>
                    {(feature.usage_count / feature.unique_users).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AiTab({ vertexStats }) {
  const inputTokens = vertexStats?.total_input_tokens || 0;
  const outputTokens = vertexStats?.total_output_tokens || 0;
  const totalTokens = inputTokens + outputTokens;
  const totalCost = vertexStats?.total_cost_usd || 0;
  const avgCost = vertexStats?.avg_cost_per_call || 0;
  const totalCalls = vertexStats?.total_calls || 0;

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px', color: '#2c5282' }}>Vertex AI & Coûts</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard
          title="Appels Vertex AI"
          value={totalCalls}
          subtitle="Requêtes totales"
          icon={<Zap size={24} color="#3182ce" />}
          color="#ebf8ff"
        />
        
        <StatCard
          title="Tokens Totaux"
          value={totalTokens.toLocaleString()}
          subtitle={`Input: ${inputTokens.toLocaleString()}, Output: ${outputTokens.toLocaleString()}`}
          icon={<Database size={24} color="#805ad5" />}
          color="#faf5ff"
        />
        
        <StatCard
          title="Coût Total"
          value={`$${totalCost.toFixed(2)}`}
          subtitle={`Moyenne: $${avgCost.toFixed(4)}/appel`}
          icon={<TrendingUp size={24} color="#38a169" />}
          color="#f0fff4"
        />
        
        <StatCard
          title="Coût Estimé Mensuel"
          value={`$${(totalCost * 30 / 30).toFixed(2)}`}
          subtitle="Projection basée sur période"
          icon={<AlertCircle size={24} color="#dd6b20" />}
          color="#fffaf0"
        />
      </div>

      <div style={{ background: '#fffaf0', border: '1px solid #fbd38d', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: '#744210' }}>Optimisations Possibles</h3>
        <ul style={{ marginLeft: '20px', color: '#744210', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Ratio Input/Output: {outputTokens > 0 ? (inputTokens / outputTokens).toFixed(2) : 'N/A'}</li>
          <li>Cacher les prompts système pour réduire les input tokens</li>
          <li>Utiliser des modèles plus petits pour les tâches simples</li>
          <li>Implémenter du rate limiting pour contrôler les coûts</li>
        </ul>
      </div>
    </div>
  );
}

// ========== HELPER COMPONENTS ==========

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
        <span style={{ color: '#4a5568' }}>{label}</span>
        <span style={{ fontWeight: '600' }}>{value} ({pct}%)</span>
      </div>
      <div style={{ background: '#edf2f7', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
        <div style={{ background: color, width: `${pct}%`, height: '100%', borderRadius: '6px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, color }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ 
          background: color, 
          padding: '8px', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      
      <div style={{ fontSize: '13px', color: '#718096', marginBottom: '6px' }}>
        {title}
      </div>
      
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2d3748', marginBottom: '4px' }}>
        {value}
      </div>
      
      <div style={{ fontSize: '12px', color: '#a0aec0' }}>
        {subtitle}
      </div>
    </div>
  );
}

function getConfidenceColor(confidence) {
  if (confidence >= 0.9) return '#c6f6d5';
  if (confidence >= 0.7) return '#bee3f8';
  if (confidence >= 0.5) return '#feebc8';
  return '#fed7d7';
}
