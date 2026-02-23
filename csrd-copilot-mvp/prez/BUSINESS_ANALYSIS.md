# CSRD Copilot / Ecoply - Business Analysis Report

## Executive Summary

This hackathon project is **Ecoply (CSRD Copilot)**, an AI-powered enterprise SaaS platform that automates Corporate Sustainability Reporting Directive (CSRD) compliance for European companies. It combines Google Cloud AI (Gemini/Vertex AI), BigQuery data warehousing, and a sophisticated Dual-Core RAG (Retrieval-Augmented Generation) system to transform raw operational data into audit-ready sustainability reports. The solution addresses a massive regulatory pain point with an estimated compliance cost of EUR 320K-500K per large enterprise annually.

---

## 1. Product/Solution

### Problem Being Solved
The EU's CSRD regulation (effective January 2024) mandates that **~50,000 EU companies** produce detailed sustainability reports following the ESRS (European Sustainability Reporting Standards). This creates:
- **Massive manual effort**: Hundreds of hours compiling data across E (Environmental), S (Social), G (Governance) pillars
- **High consulting costs**: EUR 200K-500K+ annually for large enterprises
- **Audit risk**: Inconsistent data sourcing leads to audit failures
- **Compliance deadlines**: Tight regulatory timelines with penalties for non-compliance

### Core Value Proposition
**"CSRD Compliance, Simplified"** - The platform offers:

1. **Automated Data Ingestion**: Connectors to ERP/CRM systems (Salesforce, SAP - planned) + smart import via AI document extraction
2. **AI Draft Generation**: Dual-Core RAG system producing compliant, audit-ready narrative reports
3. **Complete Audit Trail**: Every generated sentence links back to source data with citations
4. **Gap Analysis Dashboard**: Real-time visibility into data completeness per ESRS standard
5. **Multi-format Export**: PDF, DOCX, XBRL/ESEF packages for regulatory submission

### Key Features (from code analysis)

| Feature | File Reference | Description |
|---------|---------------|-------------|
| Smart Extraction | `/backend/api/routes/smart_extraction.py` | AI-powered extraction from PDFs/Excel using Gemini Vision |
| Dual-Core RAG | `/backend/api/services/rag_client.py` | Compliance (legal text) + Strategist (best-in-class examples) |
| Text-to-SQL Chat | `/backend/api/routes/chat.py` | Natural language queries on sustainability data |
| EcoVadis Audit | `/backend/api/routes/ecovadis.py` | Pre-audit against EcoVadis methodology |
| Gap Analysis | `/backend/api/routes/analytics.py` | ESRS completeness scoring per standard |
| RBAC Security | `/backend/api/utils/rbac.py` | Role-based access (Admin/Editor/Reader) with E/S/G scopes |
| Audit Logging | `/backend/api/services/audit_trail.py` | BigQuery-based audit trail for compliance |

---

## 2. Target Market

### Primary Segments

| Segment | Size Estimate | Characteristics |
|---------|--------------|-----------------|
| **Large EU Enterprises** | ~11,700 companies | Revenue >EUR 40M, 250+ employees, mandatory CSRD from 2024 |
| **Listed SMEs** | ~11,000 companies | EU-listed small/medium companies, mandatory from 2026 |
| **Non-EU Subsidiaries** | ~10,000+ entities | Non-EU companies with significant EU presence |
| **Voluntary Reporters** | Growing segment | Companies seeking ESG credibility |

### Industry Verticals (based on code analysis)
The KPI definitions in `/backend/api/data/kpis.json` and ESRS schema files indicate focus on:
- **Manufacturing** (Scope 1/2/3 emissions, energy consumption)
- **Automotive** (VW 2023 report in RAG corpus)
- **Consumer Goods** (L'Oreal, Danone reports in RAG)
- **Industrial/Energy** (Schneider Electric in RAG)
- **Any carbon-intensive sector**

### Buyer Personas
1. **Chief Sustainability Officer (CSO)**: Primary decision-maker
2. **ESG/Compliance Teams**: Daily users
3. **CFO/Finance**: Budget owner (sustainability reporting budget)
4. **Internal Audit**: Data verification needs

---

## 3. Business Model

### Revenue Model (Inferred from feature set)

| Model | Description | Estimated Pricing |
|-------|-------------|-------------------|
| **SaaS Subscription** | Tiered by company size/standards covered | EUR 20K-100K/year |
| **Per-Standard Pricing** | E1 (Climate), S1 (Workforce), G1 (Governance) add-ons | EUR 5K-15K per standard |
| **Professional Services** | Implementation, custom connectors, training | EUR 500-1,500/day |
| **Connector Marketplace** | Premium integrations (SAP, Workday, etc.) | EUR 2K-10K per connector |

### Pricing Justification
- Current consulting costs: EUR 200K-500K+/year for large enterprises
- Platform reduces effort by 60-80% (based on AI automation claims)
- Target price point: 10-20% of consulting alternative = EUR 40K-100K/year

### Unit Economics (Estimated)
- **ACV (Average Contract Value)**: EUR 50K-80K
- **CAC**: EUR 10K-15K (enterprise sales cycle)
- **LTV:CAC**: 3:1 to 5:1 (3-5 year contracts typical for compliance tools)
- **Gross Margin**: 70-85% (cloud infrastructure costs manageable)

---

## 4. Technology Stack

### Architecture Overview

```
+-------------------+     +-------------------+     +-------------------+
|   FRONTEND        |     |   BACKEND API     |     |   AI/DATA LAYER   |
|   (React/Vite)    |---->|   (FastAPI)       |---->|   (Google Cloud)  |
+-------------------+     +-------------------+     +-------------------+
     |                           |                         |
     v                           v                         v
 - React 18              - FastAPI 2.x             - Vertex AI (Gemini)
 - React Router 6        - Firebase Auth          - BigQuery
 - Recharts              - Pydantic               - Cloud Storage
 - i18next (4 langs)     - uvicorn                - Discovery Engine
 - Lucide icons          - python-docx/fpdf       - Dataform (ETL)
```

### AI Architecture - Dual-Core RAG

```
CORE 1: COMPLIANCE ("Gendarme")          CORE 2: STRATEGY ("Benchmarking")
+---------------------------+            +---------------------------+
| Official ESRS PDFs        |            | A-Rated Company Reports   |
| (E1, G1 full legal text)  |            | (Danone, L'Oreal, VW)     |
+---------------------------+            +---------------------------+
            |                                        |
            v                                        v
     Legal Requirements                    Style/Structure Reference
            |                                        |
            +----------------+  +-------------------+
                             |  |
                             v  v
                    +-------------------+
                    |   GEMINI MODEL    |
                    |  (Prompt Pipeline)|
                    +-------------------+
                             |
                             v
                    +-------------------+
                    |  Company Data     |
                    |  (BigQuery)       |
                    +-------------------+
                             |
                             v
                    AUDIT-READY DRAFT
```

---

## 5. Competitive Advantage / Moat

### Technical Differentiators

| Advantage | Description | Evidence |
|-----------|-------------|----------|
| **Dual-Core RAG** | Unique architecture combining legal compliance + strategic benchmarking | `/backend/ai/rag_engine.py`, `/backend/api/services/rag_client.py` |
| **Auditor's Vigilance** | AI-powered audit risk detection (anomaly detection, compliance gaps) | `/ai/prompts/auditor_prompt.txt` |
| **Source Citation** | Every claim auto-linked to data source (format: `[[Source: file, Row: X]]`) | `/ai/prompts/base_system_prompt.txt` |
| **Multimodal Smart Import** | Vision AI extraction from scanned PDFs/images | `/backend/api/routes/smart_extraction.py` |
| **EcoVadis Integration** | Pre-audit against EcoVadis methodology for rating improvement | `/backend/api/routes/ecovadis.py` |
| **Enterprise RBAC** | Scope-based permissions (E/S/G data isolation) | `/backend/api/utils/rbac.py` |

### Strategic Moats

1. **First-Mover in AI-Native CSRD**: Most competitors are manual consulting or legacy GRC platforms
2. **Proprietary RAG Corpus**: Curated A-rated sustainability reports (Danone, L'Oreal, Schneider, VW) as style references
3. **Audit-Ready Output**: Built-in citation system designed for Big 4 auditor acceptance
4. **Google Cloud Partnership**: Deep Vertex AI integration positions for enterprise cloud deals

### Competitive Landscape

| Competitor Type | Examples | Ecoply Advantage |
|-----------------|----------|------------------|
| Consulting (Big 4) | EY, Deloitte, PWC | 80% cost reduction via AI |
| Legacy GRC | SAP, Workiva, Enablon | Modern UX, AI-native |
| Point Solutions | Sweep, Greenly | Broader ESRS coverage (E+S+G) |
| Spreadsheet DIY | Excel | Enterprise scalability, audit trail |

**Key Insight:**
- **Sweep**: EUR 73M raised (Series B) - validates market demand
- **Greenly**: 1,000+ customers - proves willingness to pay
- **Our edge**: Only solution covering ALL ESRS standards (not just carbon) with AI-native approach

---

## 6. Market Opportunity

### TAM/SAM/SOM Analysis

| Metric | Value | Calculation |
|--------|-------|-------------|
| **TAM (Total Addressable Market)** | EUR 15-20 Billion | 50,000 EU companies × EUR 300K average compliance cost |
| **SAM (Serviceable Addressable Market)** | EUR 3-5 Billion | ~15,000 large enterprises × EUR 250K SaaS alternative |
| **SOM (Serviceable Obtainable Market - Year 3)** | EUR 50-100M | 1,000-2,000 customers × EUR 50K ACV |

### Market Drivers

1. **Regulatory Mandate**: CSRD is law - no opt-out possible
2. **Penalty Exposure**: EUR 10M+ fines or 5% of global turnover for non-compliance
3. **Timeline Pressure**: Large companies reporting from 2024, SMEs from 2026
4. **Supply Chain Effect**: Large companies push requirements to suppliers

### Growth Projections

```
Year 1: 50-100 customers (Early Adopters, Large Enterprises)
        EUR 3-5M ARR

Year 2: 300-500 customers (Market Expansion, Mid-Market)
        EUR 15-25M ARR

Year 3: 1,000-2,000 customers (Scale, Geographic Expansion)
        EUR 50-100M ARR
```

---

## 7. Go-To-Market Strategy

### Phase 1 (2024): Beachhead - Enterprise ABM

**Target**: 50-100 large enterprises (CAC40, DAX30, AEX25)

**Secret Weapon: AI-Generated Custom Pages**
- Scrape public data (annual reports, IR pages, news)
- Generate personalized landing page for EACH target company
- Example: "Schneider Electric: Your Path to CSRD Excellence"
- Shows THEIR specific gaps, THEIR potential savings, THEIR timeline
- **Result**: Outbound feels inbound because the message is hyper-relevant

**Channels:**
- Direct sales (enterprise AEs targeting CSOs/CFOs)
- Big 4 consulting partnerships (referral network)
- Google Cloud co-sell motion

### Phase 2 (2025): Expansion - Mid-Market

**Target**: 300-500 mid-market companies

**Strategy:**
- Google Cloud Marketplace listing
- Productize the custom page generator → self-service tool
- Value-added reseller (VAR) partnerships

### Phase 3 (2026): Scale - SME Segment

**Target**: 1,000-2,000 SMEs

**Strategy:**
- Product-led growth (PLG)
- Freemium gap analysis tool
- Self-service onboarding

---

## 8. Growth Hacking Strategy

### 6 Viral B2B Mechanics

1. **AI-Powered Personalization**
   - Auto-generate custom pages for top 500 EU enterprises
   - Each prospect gets a "1-of-1" experience at scale

2. **Freemium Gap Analysis Tool**
   - Free ESRS readiness score (lead magnet)
   - Shows exactly what data is missing

3. **Supply Chain Cascade**
   - Large customers push Ecoply to their suppliers
   - Built-in network effects

4. **Compliance Community**
   - Annual CSRD Summit (thought leadership)
   - Weekly newsletter (compliance updates)

5. **Google Cloud Marketplace**
   - Instant enterprise credibility
   - Tap into Google's sales force

6. **Auditor Partnership Program**
   - Big 4 referral network
   - Auditors validate our output → recommend to clients

---

## 9. Traction & Roadmap

### Milestones

- **TODAY**: Hackathon prototype (MVP functional)
- **Q2 2024**: Pilot with 5 beta customers
- **Q3 2024**: Google Cloud partnership announced
- **Q4 2024**: First paying customers → EUR 500K ARR
- **2025**: 300+ customers → EUR 15M ARR
- **2026**: IPO-ready metrics → EUR 50M+ ARR

---

## 10. Key Strengths & Risks

### Strengths
1. **Strong Technical Foundation**: Clean architecture, Google Cloud native, modern stack
2. **Deep Domain Expertise**: Comprehensive KPI library (200+ indicators), legal text integration
3. **Audit-Ready Design**: Citation system and audit trail are rare in competitors
4. **Multilingual**: 4-language support (EN/FR/DE/ES) critical for EU market
5. **First-Mover**: AI-native CSRD solution in a validated market

### Risks / Mitigation
1. **Connector Coverage**: Only Salesforce implemented
   - *Mitigation*: SAP/Workday top priority post-hackathon
2. **Model Dependency**: Heavy reliance on Gemini 2.0
   - *Mitigation*: Fallback logic exists, multi-model support planned
3. **Market Education**: CSRD awareness still developing
   - *Mitigation*: Content marketing, compliance community
4. **Enterprise Sales Cycle**: 6-12 months typical
   - *Mitigation*: Freemium tool accelerates pipeline

---

## 11. The Ask

### What We're Seeking

1. **🤝 Pilot Partners**
   - 5-10 large enterprises for beta testing
   - Provide feedback, become reference customers

2. **💰 Strategic Investors**
   - Seed round: EUR 2-3M
   - 18-month runway to EUR 10M ARR

3. **☁️ Google Cloud Co-Innovation**
   - Partnership for enterprise go-to-market
   - Co-sell motion, marketplace listing

### Use of Funds
- 🧑‍💼 **Sales team**: 3 enterprise account executives
- 🔌 **Connector development**: SAP, Workday, Oracle integrations
- 📢 **Marketing**: CSRD Summit, content engine, demand gen

---

## Conclusion

Ecoply addresses a EUR 15-20B market opportunity created by mandatory EU regulation. With 50,000 companies legally required to comply and current solutions falling short (too expensive, too slow, not AI-native), we're positioned to capture a significant share of this exploding market.

Our competitive advantages—Dual-Core AI, full audit trail, hyper-personalized GTM—combined with validated market demand (Sweep: EUR 73M raised, Greenly: 1,000+ customers) make this a high-potential venture with clear product-market fit.

**The time is now. CSRD reports are due in 2024. Companies are desperate for solutions. Let's turn compliance chaos into competitive advantage.**

---

**Contact:**
- 🌐 www.ecoply.io
- 📧 contact@ecoply.io
- 💼 LinkedIn: /company/ecoply
