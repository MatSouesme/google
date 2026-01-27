# Strategist RAG - Reference Reports

This folder (`ai/rag_strategist/reports/`) is the source for **Core 2: The Strategist**.

## How it works
1.  **Drop PDF files here.** These should be "A-rated" sustainability reports (e.g., from top-performing global companies).
2.  The RAG engine automatically scans this folder during report generation.
3.  It extracts text from these reports to understand:
    *   Industry-standard phrasing
    *   Narrative structures
    *   How to present data effectively
4.  This context is fed into the "Strategist" component of the AI to improve the quality of the generated draft.

## File Recommendations
*   **Format:** PDF
*   **Content:** Full Annual Sustainability Reports or Integrated Reports.
*   **Naming:** Clear names like `Company_Year_Report.pdf` (e.g., `Danone_2023.pdf`).

## Current Status
The system currently reads the text from these files directly whenever a draft is generated.
