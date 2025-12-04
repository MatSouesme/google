import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, FileText, ShieldCheck, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/generator" className="btn-animated btn-primary" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>
            {t('home.hero.startBtn')} <ArrowRight size={20} />
          </Link>
          <Link to="/connectors" className="btn-animated btn-secondary" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>
            {t('home.hero.connectBtn')}
          </Link>
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

      {/* How it Works */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--text-color)' }}>{t('home.howItWorks.title')}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>01</div>
            <div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>{t('home.howItWorks.step1.title')}</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step1.text')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>02</div>
            <div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>{t('home.howItWorks.step2.title')}</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step2.text')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>03</div>
            <div>
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>{t('home.howItWorks.step3.title')}</h4>
              <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{t('home.howItWorks.step3.text')}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;
