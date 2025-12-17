import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Database, FileText, ShieldCheck, Zap, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Alert from './Alert';
import { useDataStatus } from '../hooks/useDataStatus';

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasImportedData, hasDataPoints } = useDataStatus();
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Alertes de guidance */}
      {showAlert && !hasImportedData && (
        <Alert
          type="info"
          title={t('alerts.home.noData.title')}
          message={t('alerts.home.noData.message')}
          action={{
            label: t('alerts.home.noData.action'),
            onClick: () => navigate('/smart-import')
          }}
          onClose={() => setShowAlert(false)}
        />
      )}

      {showAlert && hasImportedData && !hasDataPoints && (
        <Alert
          type="warning"
          title={t('alerts.home.noDataPoints.title')}
          message={t('alerts.home.noDataPoints.message')}
          action={{
            label: t('alerts.home.noDataPoints.action'),
            onClick: () => navigate('/data-points')
          }}
          onClose={() => setShowAlert(false)}
        />
      )}

      {showAlert && hasImportedData && hasDataPoints && (
        <Alert
          type="success"
          title={t('alerts.home.ready.title')}
          message={t('alerts.home.ready.message')}
          action={{
            label: t('alerts.home.ready.action'),
            onClick: () => navigate('/final-report')
          }}
          onClose={() => setShowAlert(false)}
        />
      )}

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        marginBottom: '3rem',
        background: 'linear-gradient(180deg, var(--surface-color) 0%, var(--bg-color) 100%)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: '800',
          marginBottom: '1.5rem',
          background: 'linear-gradient(90deg, var(--primary-color) 0%, #34d399 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {t('home.hero.title')}
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--text-secondary)',
          maxWidth: '800px',
          margin: '0 auto 2.5rem',
          lineHeight: '1.6'
        }}>
          {t('home.hero.subtitle')}
        </p>
        
        {/* CTA adaptatif selon l'état */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {!hasImportedData ? (
            <>
              <button 
                onClick={() => navigate('/smart-import')}
                className="btn-animated btn-primary" 
                style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Database size={20} />
                Commencer : Importer vos données
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-animated btn-secondary" 
                style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FileText size={20} />
                Voir la démo
              </button>
            </>
          ) : !hasDataPoints ? (
            <>
              <button 
                onClick={() => navigate('/data-points')}
                className="btn-animated btn-primary" 
                style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Database size={20} />
                Configurer les Data Points
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => navigate('/smart-import')}
                className="btn-animated btn-secondary" 
                style={{ fontSize: '1.1rem' }}
              >
                Importer plus de données
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => navigate('/final-report')}
                className="btn-animated btn-primary" 
                style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FileText size={20} />
                Voir votre rapport
                <ArrowRight size={20} />
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="btn-animated btn-secondary" 
                style={{ fontSize: '1.1rem' }}
              >
                Tableau de bord
              </button>
            </>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>

        {/* Feature 1 */}
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          transition: 'transform 0.3s ease'
        }}>
          <div style={{
            width: '50px', height: '50px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
            color: 'var(--primary-color)'
          }}>
            <Database size={28} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('home.features.ingestion.title')}</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {t('home.features.ingestion.text')}
          </p>
        </div>

        {/* Feature 2 */}
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '50px', height: '50px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
            color: '#3b82f6'
          }}>
            <Zap size={28} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('home.features.generation.title')}</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {t('home.features.generation.text')}
          </p>
        </div>

        {/* Feature 3 */}
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--surface-color)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: '50px', height: '50px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1.5rem',
            color: '#ef4444'
          }}>
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>{t('home.features.audit.title')}</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {t('home.features.audit.text')}
          </p>
        </div>
      </div>

      {/* How it Works - Workflow interactif */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--text-color)' }}>{t('home.howItWorks.title')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Step 1 - Smart Import */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            padding: '1.5rem', 
            backgroundColor: hasImportedData ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-color)', 
            borderRadius: '12px', 
            border: `2px solid ${hasImportedData ? 'var(--success-color)' : 'var(--border-color)'}`,
            position: 'relative'
          }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: hasImportedData ? 'var(--success-color)' : 'var(--primary-color)', 
              minWidth: '50px' 
            }}>
              {hasImportedData ? '✓' : '01'}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                {t('home.howItWorks.step1.title')}
              </h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step1.text')}</p>
            </div>
            {!hasImportedData && (
              <button 
                onClick={() => navigate('/smart-import')}
                className="btn-animated btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Commencer <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Step 2 - Data Points */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            padding: '1.5rem', 
            backgroundColor: hasDataPoints ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-color)', 
            borderRadius: '12px', 
            border: `2px solid ${hasDataPoints ? 'var(--success-color)' : 'var(--border-color)'}`,
            opacity: !hasImportedData ? 0.5 : 1
          }}>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold', 
              color: hasDataPoints ? 'var(--success-color)' : 'var(--primary-color)', 
              minWidth: '50px' 
            }}>
              {hasDataPoints ? '✓' : '02'}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                {t('home.howItWorks.step2.title')}
              </h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step2.text')}</p>
            </div>
            {hasImportedData && !hasDataPoints && (
              <button 
                onClick={() => navigate('/data-points')}
                className="btn-animated btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Configurer <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Step 3 - Final Report */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            padding: '1.5rem', 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '12px', 
            border: '2px solid var(--border-color)',
            opacity: !hasDataPoints ? 0.5 : 1
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>03</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                {t('home.howItWorks.step3.title')}
              </h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step3.text')}</p>
            </div>
            {hasDataPoints && (
              <button 
                onClick={() => navigate('/final-report')}
                className="btn-animated btn-primary"
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                Consulter <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Step 4 - Dashboard (bonus) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2rem', 
            padding: '1.5rem', 
            backgroundColor: 'var(--surface-color)', 
            borderRadius: '12px', 
            border: '1px solid var(--border-color)',
            opacity: 0.8
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-color)', minWidth: '50px' }}>
              <BarChart size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>
                Tableau de bord
              </h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                Visualisez vos indicateurs ESG avec des graphiques interactifs et des analyses en temps réel.
              </p>
            </div>
            <button 
              onClick={() => navigate('/dashboard')}
              className="btn-animated btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Explorer
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;
