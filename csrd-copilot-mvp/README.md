# 🌿 Ecoply - Your Intelligent CSRD Copilot

Welcome to **Ecoply**, the solution that turns the CSRD compliance nightmare into a smooth, AI-assisted experience.

The CSRD (Corporate Sustainability Reporting Directive) requires companies to collect thousands of data points and draft complex reports. Ecoply was designed to automate this tedious work, allowing you to focus on your CSR strategy rather than data entry.

---

## 🚀 Why Ecoply?

CSR compliance shouldn't be a barrier. Ecoply uses the power of Generative AI (Google Vertex AI) to:
1.  **Understand your documents**: Stop wasting time copy-pasting figures from invoices or PDF reports.
2. **Map** your data with the existing datapoints and ask you for confirmation.
3.  **Centralize your data**: A single source of truth for all your ESRS indicators (E1, S1, G1...).
4. **Compare your data** with the CSRD law to ensure compliance. 
5.  **Draft for you**: Generate report drafts compliant with European standards in seconds.

---

## Key Features - What makes our tool a good option to improve your report and gain time

### 🧠 Smart Import -> The neuronal connection of the report
Drag and drop any file (PDF, Excel, CSV), txt. Our AI analyzes the content, automatically detects relevant indicators (e.g., "Energy Consumption", "Pay Gap", "Employees"), and maps them to official ESRS standards.
*   *Technology: Gemini 2.0 Flash via Vertex AI. We will switch for Gemini 3.0 for the End User test to make sure that the User Experience is the best possible.*

### 📊 Data Points Hub -> The brain, the storage
A centralized dashboard to track your progress.
*   Visualize which KPIs are completed or missing.
*   Validate data extracted by AI.
*   Intuitive manual entry for missing data.

### ✍️ Report Generator (RAG) -> The Data intelligence 
Need to draft the "G1 - Business Conduct" section?
*   Select a topic.
*   Select the language you want
*   The AI combines your real data (BigQuery) with official legal texts.
*   Get a structured, sourced draft ready for review.
*   Challenge yourself with our auditor agent : 3 main pain points, be ready to solve them to pass the auditor step!

### 📈 Impact Dashboard -> A way to understand quickly what you have
Visualize your carbon emissions (Scope 1, 2, 3) and other key metrics via interactive charts.

---

## 🛠️ Under the Hood (Tech Stack) -> How did we build that? 

Ecoply is built on a modern and scalable architecture hosted on **Google Cloud Platform**.

*   **Frontend**: React + Vite (Fast and reactive interface).
*   **Backend**: FastAPI on Cloud Run (Robust Python API).
*   **Intelligence**:
    *   **LLM**: Gemini 2.0 Flash for the DEV step. Switching to Gemini 3.0 for the INT step with End User.
    *   **RAG**: Retrieval Augmented Generation to anchor answers in the reality of your data. -> No hallucination : the model takes all the docs you're giving, the laws texts and much more. 
*   **Data**:
    *   **BigQuery**: Data warehouse to store KPIs and regulatory texts. Everything you put in Ecoply can be retrieved in BigQuery. 
    *   **Cloud Storage**: Secure storage for raw files.
*   **Auth**: Firebase Authentication : One User = One access. 

---

## 🏁 How to Start? -> Want to try Ecoply? 

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

## 🔮 What's Next (Roadmap) -> A MVP product that will be improved with a lot of features 

*   [ ] **API Connectors**: Direct connection to Salesforce, SAP, HR, and carbon accounting tools.
*   [ ] **Multi-User**: Validation workflow with roles (Contributor, Auditor).
*   [ ] **XBRL Export**: Automatic tagging of the final report in the European digital format.
*   [ ] **Upgrade of the OCR Process** : Improvement of the OCR feature to be sure that every document can be read. 