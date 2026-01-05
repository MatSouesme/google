# 🌿 Ecoply - Your Intelligent CSRD Copilot

Welcome to **Ecoply**, the solution that turns the CSRD compliance nightmare into a smooth, AI-assisted experience.

The CSRD (Corporate Sustainability Reporting Directive) requires companies to collect thousands of data points and draft complex reports. Ecoply was designed to automate this tedious work, allowing you to focus on your CSR strategy rather than data entry.

---

## 🚀 Why Ecoply?

CSR compliance shouldn't be a barrier. Ecoply uses the power of Generative AI (Google Vertex AI) to:
1.  **Understand your documents**: Stop wasting time copy-pasting figures from invoices or PDF reports.
2.  **Centralize your data**: A single source of truth for all your ESRS indicators (E1, S1, G1...).
3.  **Draft for you**: Generate report drafts compliant with European standards in seconds.

---

## ✨ Key Features

### 🧠 Smart Import
Drag and drop any file (PDF, Excel, CSV). Our AI analyzes the content, automatically detects relevant indicators (e.g., "Energy Consumption", "Pay Gap"), and maps them to official ESRS standards.
*   *Technology: Gemini 2.0 Flash via Vertex AI.*

### 📊 Data Points Hub
A centralized dashboard to track your progress.
*   Visualize which KPIs are completed or missing.
*   Validate data extracted by AI.
*   Intuitive manual entry for missing data.

### ✍️ Report Generator (RAG)
Need to draft the "G1 - Business Conduct" section?
*   Select a topic.
*   The AI combines your real data (BigQuery) with official legal texts.
*   Get a structured, sourced draft ready for review.

### 📈 Impact Dashboard
Visualize your carbon emissions (Scope 1, 2, 3) and other key metrics via interactive charts.

---

## 🛠️ Under the Hood (Tech Stack)

Ecoply is built on a modern and scalable architecture hosted on **Google Cloud Platform**.

*   **Frontend**: React + Vite (Fast and reactive interface).
*   **Backend**: FastAPI on Cloud Run (Robust Python API).
*   **Intelligence**:
    *   **LLM**: Gemini 2.0 Flash (Google's fastest and most efficient model).
    *   **RAG**: Retrieval Augmented Generation to anchor answers in the reality of your data.
*   **Data**:
    *   **BigQuery**: Data warehouse to store KPIs and regulatory texts.
    *   **Cloud Storage**: Secure storage for raw files.
*   **Auth**: Firebase Authentication.

---

## 🏁 How to Start?

### Prerequisites
*   Node.js & npm
*   Python 3.11+
*   A Google Cloud project with Vertex AI and BigQuery enabled.

### Quick Installation

1.  **Clone the project**
    ```bash
    git clone https://github.com/your-repo/csrd-copilot-mvp.git
    cd csrd-copilot-mvp
    ```

2.  **Start the Backend**
    ```bash
    cd backend
    pip install -r api/requirements.txt
    uvicorn api.main:app --reload
    ```

3.  **Start the Frontend**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

4.  **Open your browser** at `http://localhost:5173` and start exploring!

---

## 🔮 What's Next (Roadmap)

*   [ ] **API Connectors**: Direct connection to Salesforce, SAP, and carbon accounting tools.
*   [ ] **Multi-User**: Validation workflow with roles (Contributor, Auditor).
*   [ ] **XBRL Export**: Automatic tagging of the final report in the European digital format.

---

*Made with ❤️ and lots of ☕ for a more sustainable future.*
