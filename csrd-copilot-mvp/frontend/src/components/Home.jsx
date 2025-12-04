import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Database, FileText, ShieldCheck, Zap } from 'lucide-react';

const Home = () => {
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
          CSRD Compliance, Simplified.
        </h1>
        <p style={{ 
          fontSize: '1.25rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '800px', 
          margin: '0 auto 2.5rem',
          lineHeight: '1.6'
        }}>
          Ecoply is your intelligent copilot for Corporate Sustainability Reporting Directive (CSRD) compliance. 
          We combine advanced AI with secure data integration to streamline your sustainability reporting journey.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/generator" className="btn-animated btn-primary" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>
            Start Generating Reports <ArrowRight size={20} />
          </Link>
          <Link to="/connectors" className="btn-animated btn-secondary" style={{ textDecoration: 'none', fontSize: '1.1rem' }}>
            Connect Data Sources
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
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>Automated Data Ingestion</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Connect directly to your ERP, CRM, and HR systems (Salesforce, SAP, etc.) or upload CSVs. 
            We automatically map your raw data to ESRS data points, saving you hundreds of hours of manual entry.
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
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>AI Draft Generation</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Our advanced LLM (Gemini Pro) analyzes your data against official ESRS standards (E1, G1, etc.) 
            to generate compliant, audit-ready narrative drafts in seconds.
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
          <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-color)' }}>Audit Trail & Vigilance</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Every generated sentence is linked back to its source data. 
            Our "Auditor's Vigilance" system flags potential inconsistencies or missing data points before you publish.
          </p>
        </div>
      </div>

      {/* How it Works */}
      <div style={{ marginBottom: '4rem' }}>
        <h2 style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '3rem', color: 'var(--text-color)' }}>How It Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>01</div>
                <div>
                    <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Connect Your Data</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Use our secure connectors or upload wizard to bring your operational data into the platform.</p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>02</div>
                <div>
                    <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Select a Standard</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Choose the ESRS standard (e.g., E1 Climate Change) and the specific disclosure requirement you need to report on.</p>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)', minWidth: '50px' }}>03</div>
                <div>
                    <h4 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--text-color)' }}>Generate & Review</h4>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Let the AI draft your report. Review the cited sources, check the auditor's notes, and approve the final text.</p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default Home;
