# ECO Observatory Scraper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an automated pipeline that discovers ESG reports from public companies, extracts data using Document AI, scores reports with Gemini 1.5, and stores results in BigQuery.

**Architecture:** Four-module pipeline: (1) Discovery Module uses Playwright + BeautifulSoup to scrape IR pages for sustainability PDFs, (2) Ingestion Pipeline uploads to GCS and processes via Document AI, (3) ARS Grader uses Gemini 1.5 with RAG-lite to score against ESRS E1/G1, (4) Data Sink pushes results to BigQuery eco_provisional_scores table.

**Tech Stack:** Python 3.11+, Playwright, BeautifulSoup4, Google Document AI, Vertex AI (Gemini 1.5 Flash), BigQuery, Cloud Storage, FastAPI

**GCP Project:** csrd-copilot

**MVP Test Companies:** LVMH, SAP, ASML, Enel, Volkswagen

---

## Prerequisites Setup

### Task 0: Environment Setup

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/.env.example`
- Create: `csrd-copilot-mvp/backend/eco_observatory/requirements.txt`

**Step 1: Create requirements file**

```bash
cd csrd-copilot-mvp/backend
mkdir -p eco_observatory
cd eco_observatory
```

Create `requirements.txt`:
```txt
playwright==1.41.0
beautifulsoup4==4.12.3
google-cloud-documentai==2.24.0
google-cloud-storage==2.14.0
google-cloud-bigquery==3.17.0
google-cloud-aiplatform>=1.38.0
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-playwright==0.4.4
requests==2.31.0
lxml==5.1.0
python-dotenv==1.0.1
```

**Step 2: Install Playwright browsers**

Run: `pip install -r requirements.txt && playwright install chromium`
Expected: Chromium browser installed successfully

**Step 3: Create environment template**

Create `.env.example`:
```bash
GCP_PROJECT_ID=csrd-copilot
GCS_BUCKET_NAME=csrd-eco-observatory-pdfs
DOCUMENT_AI_PROCESSOR_ID=your_processor_id
BIGQUERY_DATASET=eco_observatory
BIGQUERY_TABLE=provisional_scores
VERTEX_AI_LOCATION=us-central1
```

**Step 4: Copy and configure .env**

Run: `cp .env.example .env`
Manual: Edit .env with actual values

**Step 5: Commit initial setup**

```bash
git add requirements.txt .env.example
git commit -m "feat: add eco observatory requirements and env template"
```

---

## Module 1: Discovery Module

### Task 1.1: Company Configuration

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/config/companies.json`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_company_config.py`

**Step 1: Write failing test for company config loading**

Create `tests/test_company_config.py`:
```python
import pytest
from eco_observatory.config.company_loader import CompanyLoader

def test_load_companies_returns_five_companies():
    loader = CompanyLoader()
    companies = loader.load_companies()
    assert len(companies) == 5

def test_company_has_required_fields():
    loader = CompanyLoader()
    companies = loader.load_companies()
    company = companies[0]
    assert "name" in company
    assert "domain" in company
    assert "ir_url" in company
    assert "country" in company
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_company_config.py -v`
Expected: FAIL - ModuleNotFoundError: No module named 'eco_observatory.config.company_loader'

**Step 3: Create company configuration JSON**

Create `config/companies.json`:
```json
{
  "companies": [
    {
      "name": "LVMH",
      "domain": "lvmh.com",
      "ir_url": "https://www.lvmh.com/investors/",
      "country": "FR",
      "search_terms": ["sustainability report 2024", "universal registration document", "ESG report"]
    },
    {
      "name": "SAP",
      "domain": "sap.com",
      "ir_url": "https://www.sap.com/investors.html",
      "country": "DE",
      "search_terms": ["integrated report 2024", "sustainability report", "non-financial statement"]
    },
    {
      "name": "ASML",
      "domain": "asml.com",
      "ir_url": "https://www.asml.com/en/investors",
      "country": "NL",
      "search_terms": ["annual report 2024", "sustainability supplement", "ESG report"]
    },
    {
      "name": "Enel",
      "domain": "enel.com",
      "ir_url": "https://www.enel.com/investors",
      "country": "IT",
      "search_terms": ["sustainability report 2024", "integrated annual report", "DNF"]
    },
    {
      "name": "Volkswagen",
      "domain": "volkswagen.com",
      "ir_url": "https://www.volkswagen-group.com/en/investors",
      "country": "DE",
      "search_terms": ["annual report 2024", "sustainability report", "non-financial report"]
    }
  ]
}
```

**Step 4: Implement company loader**

Create `config/__init__.py`:
```python
```

Create `config/company_loader.py`:
```python
import json
from pathlib import Path
from typing import List, Dict

class CompanyLoader:
    def __init__(self, config_path: str = None):
        if config_path is None:
            config_path = Path(__file__).parent / "companies.json"
        self.config_path = Path(config_path)

    def load_companies(self) -> List[Dict]:
        with open(self.config_path, 'r') as f:
            data = json.load(f)
        return data['companies']
```

**Step 5: Run tests to verify they pass**

Run: `pytest tests/test_company_config.py -v`
Expected: PASS (2 tests)

**Step 6: Commit company config**

```bash
git add config/ tests/test_company_config.py
git commit -m "feat: add company configuration and loader"
```

---

### Task 1.2: IR Page Scraper (Playwright)

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/scrapers/ir_scraper.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_ir_scraper.py`

**Step 1: Write failing test for IR page scraping**

Create `tests/test_ir_scraper.py`:
```python
import pytest
from eco_observatory.scrapers.ir_scraper import IRScraper

@pytest.mark.asyncio
async def test_scraper_initializes():
    scraper = IRScraper()
    assert scraper is not None
    await scraper.close()

@pytest.mark.asyncio
async def test_scraper_finds_pdf_links():
    scraper = IRScraper()
    # Use a simple test page
    links = await scraper.find_pdf_links(
        url="https://www.example.com",
        search_terms=["sustainability", "report"]
    )
    assert isinstance(links, list)
    await scraper.close()

@pytest.mark.asyncio
async def test_pdf_link_has_url_and_text():
    scraper = IRScraper()
    links = await scraper.find_pdf_links(
        url="https://www.lvmh.com/investors/",
        search_terms=["sustainability report", "2024"]
    )
    if len(links) > 0:
        link = links[0]
        assert "url" in link
        assert "text" in link
        assert link["url"].endswith(".pdf") or "pdf" in link["url"].lower()
    await scraper.close()
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_ir_scraper.py -v`
Expected: FAIL - ModuleNotFoundError: No module named 'eco_observatory.scrapers'

**Step 3: Implement IR scraper with Playwright**

Create `scrapers/__init__.py`:
```python
```

Create `scrapers/ir_scraper.py`:
```python
import asyncio
from playwright.async_api import async_playwright, Browser, Page
from typing import List, Dict
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IRScraper:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright = None
        self.browser = None

    async def _ensure_browser(self):
        """Lazy browser initialization"""
        if self.browser is None:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=self.headless)

    async def find_pdf_links(self, url: str, search_terms: List[str]) -> List[Dict]:
        """
        Find PDF links on IR page matching search terms
        Returns: List of {url: str, text: str, relevance_score: float}
        """
        await self._ensure_browser()

        page = await self.browser.new_page()
        pdf_links = []

        try:
            logger.info(f"Navigating to {url}")
            await page.goto(url, wait_until="networkidle", timeout=30000)

            # Wait for dynamic content
            await page.wait_for_timeout(2000)

            # Find all links
            links = await page.query_selector_all('a')

            for link in links:
                try:
                    href = await link.get_attribute('href')
                    text = (await link.text_content() or "").strip()

                    if not href:
                        continue

                    # Make absolute URL
                    if href.startswith('/'):
                        from urllib.parse import urljoin
                        href = urljoin(url, href)

                    # Check if PDF
                    is_pdf = href.endswith('.pdf') or 'pdf' in href.lower()

                    # Calculate relevance score
                    relevance = self._calculate_relevance(text, href, search_terms)

                    if is_pdf and relevance > 0:
                        pdf_links.append({
                            'url': href,
                            'text': text,
                            'relevance_score': relevance
                        })
                        logger.info(f"Found PDF: {text[:50]} - {href}")

                except Exception as e:
                    logger.debug(f"Error processing link: {e}")
                    continue

            # Sort by relevance
            pdf_links.sort(key=lambda x: x['relevance_score'], reverse=True)

        except Exception as e:
            logger.error(f"Error scraping {url}: {e}")

        finally:
            await page.close()

        return pdf_links

    def _calculate_relevance(self, text: str, url: str, search_terms: List[str]) -> float:
        """Calculate relevance score based on search terms"""
        score = 0.0
        combined = f"{text} {url}".lower()

        for term in search_terms:
            if term.lower() in combined:
                score += 1.0

        return score

    async def close(self):
        """Close browser and playwright"""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_ir_scraper.py -v -s`
Expected: PASS (3 tests) - Note: May be slow due to real web requests

**Step 5: Commit IR scraper**

```bash
git add scrapers/ tests/test_ir_scraper.py
git commit -m "feat: add IR page scraper with Playwright"
```

---

### Task 1.3: Discovery Orchestrator

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/discovery/orchestrator.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_discovery_orchestrator.py`

**Step 1: Write failing test for discovery orchestrator**

Create `tests/test_discovery_orchestrator.py`:
```python
import pytest
from eco_observatory.discovery.orchestrator import DiscoveryOrchestrator

@pytest.mark.asyncio
async def test_orchestrator_discovers_all_companies():
    orchestrator = DiscoveryOrchestrator()
    results = await orchestrator.discover_all()

    assert len(results) == 5
    assert all('company_name' in r for r in results)
    assert all('pdf_links' in r for r in results)
    await orchestrator.close()

@pytest.mark.asyncio
async def test_orchestrator_result_structure():
    orchestrator = DiscoveryOrchestrator()
    results = await orchestrator.discover_all()

    result = results[0]
    assert 'company_name' in result
    assert 'domain' in result
    assert 'pdf_links' in result
    assert 'discovered_at' in result
    assert isinstance(result['pdf_links'], list)
    await orchestrator.close()
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_discovery_orchestrator.py -v`
Expected: FAIL - ModuleNotFoundError: No module named 'eco_observatory.discovery'

**Step 3: Implement discovery orchestrator**

Create `discovery/__init__.py`:
```python
```

Create `discovery/orchestrator.py`:
```python
import asyncio
from datetime import datetime
from typing import List, Dict
import logging
from eco_observatory.config.company_loader import CompanyLoader
from eco_observatory.scrapers.ir_scraper import IRScraper

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DiscoveryOrchestrator:
    def __init__(self):
        self.company_loader = CompanyLoader()
        self.scraper = IRScraper()

    async def discover_all(self) -> List[Dict]:
        """
        Discover sustainability reports for all configured companies
        Returns: List of discovery results
        """
        companies = self.company_loader.load_companies()
        results = []

        for company in companies:
            logger.info(f"Discovering reports for {company['name']}")

            pdf_links = await self.scraper.find_pdf_links(
                url=company['ir_url'],
                search_terms=company['search_terms']
            )

            result = {
                'company_name': company['name'],
                'domain': company['domain'],
                'country': company['country'],
                'pdf_links': pdf_links,
                'discovered_at': datetime.utcnow().isoformat(),
                'total_pdfs_found': len(pdf_links)
            }

            results.append(result)
            logger.info(f"Found {len(pdf_links)} PDFs for {company['name']}")

        return results

    async def discover_single(self, company_name: str) -> Dict:
        """Discover reports for a single company"""
        companies = self.company_loader.load_companies()
        company = next((c for c in companies if c['name'] == company_name), None)

        if not company:
            raise ValueError(f"Company {company_name} not found in configuration")

        pdf_links = await self.scraper.find_pdf_links(
            url=company['ir_url'],
            search_terms=company['search_terms']
        )

        return {
            'company_name': company['name'],
            'domain': company['domain'],
            'country': company['country'],
            'pdf_links': pdf_links,
            'discovered_at': datetime.utcnow().isoformat(),
            'total_pdfs_found': len(pdf_links)
        }

    async def close(self):
        """Close scraper resources"""
        await self.scraper.close()
```

**Step 4: Run tests to verify they pass**

Run: `pytest tests/test_discovery_orchestrator.py -v -s`
Expected: PASS (2 tests) - Note: This will take several minutes

**Step 5: Create discovery CLI script**

Create `scripts/run_discovery.py`:
```python
#!/usr/bin/env python3
import asyncio
import json
from pathlib import Path
from eco_observatory.discovery.orchestrator import DiscoveryOrchestrator

async def main():
    print("🔍 Starting ECO Observatory Discovery...")

    orchestrator = DiscoveryOrchestrator()

    try:
        results = await orchestrator.discover_all()

        # Save results
        output_path = Path("data/discovery_results.json")
        output_path.parent.mkdir(exist_ok=True)

        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n✅ Discovery complete! Results saved to {output_path}")
        print(f"📊 Summary:")
        for result in results:
            print(f"  - {result['company_name']}: {result['total_pdfs_found']} PDFs found")

    finally:
        await orchestrator.close()

if __name__ == "__main__":
    asyncio.run(main())
```

**Step 6: Run discovery script manually**

Run: `cd csrd-copilot-mvp/backend/eco_observatory && python scripts/run_discovery.py`
Expected: JSON file created with discovered PDFs

**Step 7: Commit orchestrator**

```bash
git add discovery/ tests/test_discovery_orchestrator.py scripts/run_discovery.py
git commit -m "feat: add discovery orchestrator and CLI"
```

---

## Module 2: Ingestion Pipeline

### Task 2.1: GCS Upload Manager

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/ingestion/gcs_uploader.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_gcs_uploader.py`

**Step 1: Create GCS bucket**

Run:
```bash
gsutil mb -p csrd-copilot -l us-central1 gs://csrd-eco-observatory-pdfs
gsutil lifecycle set - gs://csrd-eco-observatory-pdfs <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 90}
      }
    ]
  }
}
EOF
```
Expected: Bucket created with 90-day lifecycle

**Step 2: Write failing test for GCS uploader**

Create `tests/test_gcs_uploader.py`:
```python
import pytest
from eco_observatory.ingestion.gcs_uploader import GCSUploader
from pathlib import Path

def test_uploader_initializes():
    uploader = GCSUploader(bucket_name="test-bucket")
    assert uploader.bucket_name == "test-bucket"

@pytest.mark.integration
def test_upload_pdf_from_url():
    uploader = GCSUploader(bucket_name="csrd-eco-observatory-pdfs")

    # Test URL (small PDF)
    test_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

    gcs_path = uploader.upload_from_url(
        url=test_url,
        company_name="TEST_COMPANY",
        report_type="sustainability_2024"
    )

    assert gcs_path.startswith("gs://")
    assert "TEST_COMPANY" in gcs_path
    assert gcs_path.endswith(".pdf")

@pytest.mark.integration
def test_upload_local_pdf():
    uploader = GCSUploader(bucket_name="csrd-eco-observatory-pdfs")

    # Create temp PDF for testing
    test_file = Path("/tmp/test_report.pdf")
    test_file.write_bytes(b"%PDF-1.4 test content")

    try:
        gcs_path = uploader.upload_from_file(
            file_path=str(test_file),
            company_name="TEST_COMPANY",
            report_type="test_report"
        )

        assert gcs_path.startswith("gs://")
        assert "TEST_COMPANY" in gcs_path
    finally:
        test_file.unlink(missing_ok=True)
```

**Step 3: Run test to verify it fails**

Run: `pytest tests/test_gcs_uploader.py -v -m "not integration"`
Expected: FAIL - ModuleNotFoundError

**Step 4: Implement GCS uploader**

Create `ingestion/__init__.py`:
```python
```

Create `ingestion/gcs_uploader.py`:
```python
import requests
from google.cloud import storage
from pathlib import Path
from datetime import datetime
import hashlib
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GCSUploader:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)

    def upload_from_url(self, url: str, company_name: str, report_type: str) -> str:
        """
        Download PDF from URL and upload to GCS
        Returns: GCS path (gs://bucket/path)
        """
        logger.info(f"Downloading PDF from {url}")

        # Download PDF
        response = requests.get(url, timeout=60, stream=True)
        response.raise_for_status()

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
        filename = f"{company_name}/{report_type}_{timestamp}_{url_hash}.pdf"

        # Upload to GCS
        blob = self.bucket.blob(filename)
        blob.upload_from_string(response.content, content_type='application/pdf')

        gcs_path = f"gs://{self.bucket_name}/{filename}"
        logger.info(f"Uploaded to {gcs_path}")

        return gcs_path

    def upload_from_file(self, file_path: str, company_name: str, report_type: str) -> str:
        """
        Upload local PDF file to GCS
        Returns: GCS path (gs://bucket/path)
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{company_name}/{report_type}_{timestamp}.pdf"

        # Upload to GCS
        blob = self.bucket.blob(filename)
        blob.upload_from_filename(str(file_path))

        gcs_path = f"gs://{self.bucket_name}/{filename}"
        logger.info(f"Uploaded {file_path} to {gcs_path}")

        return gcs_path

    def list_company_reports(self, company_name: str) -> list:
        """List all reports for a company"""
        blobs = self.bucket.list_blobs(prefix=f"{company_name}/")
        return [f"gs://{self.bucket_name}/{blob.name}" for blob in blobs]
```

**Step 5: Run tests**

Run: `pytest tests/test_gcs_uploader.py -v -m "not integration"`
Expected: PASS (1 test)

Run: `pytest tests/test_gcs_uploader.py -v -m integration`
Expected: PASS (2 tests) - requires GCP credentials

**Step 6: Commit GCS uploader**

```bash
git add ingestion/ tests/test_gcs_uploader.py
git commit -m "feat: add GCS uploader for PDF ingestion"
```

---

### Task 2.2: Document AI Processor

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/ingestion/document_ai_processor.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_document_ai.py`

**Step 1: Create Document AI processor**

Run:
```bash
# Create processor via gcloud
gcloud documentai processors create \
  --location=us \
  --display-name="ECO Observatory Layout Parser" \
  --type=LAYOUT_PARSER_PROCESSOR \
  --project=csrd-copilot
```
Expected: Processor created with ID (save this to .env as DOCUMENT_AI_PROCESSOR_ID)

**Step 2: Write failing test for Document AI**

Create `tests/test_document_ai.py`:
```python
import pytest
from eco_observatory.ingestion.document_ai_processor import DocumentAIProcessor
from pathlib import Path

def test_processor_initializes():
    processor = DocumentAIProcessor(
        project_id="test-project",
        location="us",
        processor_id="test-processor"
    )
    assert processor.project_id == "test-project"

@pytest.mark.integration
def test_process_pdf_from_gcs():
    import os
    processor = DocumentAIProcessor(
        project_id=os.getenv("GCP_PROJECT_ID"),
        location="us",
        processor_id=os.getenv("DOCUMENT_AI_PROCESSOR_ID")
    )

    # Use test PDF uploaded in previous step
    gcs_uri = "gs://csrd-eco-observatory-pdfs/TEST_COMPANY/test_report.pdf"

    result = processor.process_document(gcs_uri)

    assert "text" in result
    assert "pages" in result
    assert len(result["text"]) > 0

@pytest.mark.integration
def test_extracted_structure_has_sections():
    import os
    processor = DocumentAIProcessor(
        project_id=os.getenv("GCP_PROJECT_ID"),
        location="us",
        processor_id=os.getenv("DOCUMENT_AI_PROCESSOR_ID")
    )

    gcs_uri = "gs://csrd-eco-observatory-pdfs/TEST_COMPANY/test_report.pdf"
    result = processor.process_document(gcs_uri)

    assert "sections" in result
    assert isinstance(result["sections"], list)
```

**Step 3: Run test to verify it fails**

Run: `pytest tests/test_document_ai.py::test_processor_initializes -v`
Expected: FAIL - ModuleNotFoundError

**Step 4: Implement Document AI processor**

Create `ingestion/document_ai_processor.py`:
```python
from google.cloud import documentai_v1 as documentai
from google.cloud import storage
from typing import Dict, List
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DocumentAIProcessor:
    def __init__(self, project_id: str, location: str, processor_id: str):
        self.project_id = project_id
        self.location = location
        self.processor_id = processor_id

        # Initialize client
        self.client = documentai.DocumentProcessorServiceClient()
        self.processor_name = self.client.processor_path(
            project_id, location, processor_id
        )

    def process_document(self, gcs_uri: str) -> Dict:
        """
        Process PDF from GCS using Document AI
        Returns: Structured document data with text, tables, and sections
        """
        logger.info(f"Processing document: {gcs_uri}")

        # Create GCS document
        gcs_document = documentai.GcsDocument(
            gcs_uri=gcs_uri,
            mime_type="application/pdf"
        )

        gcs_documents = documentai.GcsDocuments(documents=[gcs_document])
        input_config = documentai.BatchDocumentsInputConfig(gcs_documents=gcs_documents)

        # Configure output (we'll use synchronous processing for MVP)
        request = documentai.ProcessRequest(
            name=self.processor_name,
            gcs_document=gcs_document
        )

        # Process document
        result = self.client.process_document(request=request)
        document = result.document

        # Extract structured data
        extracted = {
            "text": document.text,
            "pages": len(document.pages),
            "sections": self._extract_sections(document),
            "tables": self._extract_tables(document),
            "entities": self._extract_entities(document)
        }

        logger.info(f"Processed {len(document.pages)} pages, found {len(extracted['sections'])} sections")

        return extracted

    def _extract_sections(self, document) -> List[Dict]:
        """Extract document sections based on layout"""
        sections = []

        for page in document.pages:
            for block in page.blocks:
                # Get text for this block
                layout = block.layout
                text_anchor = layout.text_anchor
                text_segments = text_anchor.text_segments

                block_text = ""
                for segment in text_segments:
                    start_index = segment.start_index if hasattr(segment, 'start_index') else 0
                    end_index = segment.end_index
                    block_text += document.text[start_index:end_index]

                sections.append({
                    "text": block_text.strip(),
                    "page": page.page_number if hasattr(page, 'page_number') else 0,
                    "confidence": layout.confidence if hasattr(layout, 'confidence') else 0.0
                })

        return sections

    def _extract_tables(self, document) -> List[Dict]:
        """Extract tables from document"""
        tables = []

        for page in document.pages:
            if not hasattr(page, 'tables'):
                continue

            for table in page.tables:
                table_data = {
                    "page": page.page_number if hasattr(page, 'page_number') else 0,
                    "rows": [],
                    "headers": []
                }

                # Extract table structure (simplified for MVP)
                if hasattr(table, 'header_rows'):
                    for header_row in table.header_rows:
                        header_cells = []
                        for cell in header_row.cells:
                            cell_text = self._get_text_from_layout(cell.layout, document.text)
                            header_cells.append(cell_text)
                        table_data["headers"].append(header_cells)

                if hasattr(table, 'body_rows'):
                    for row in table.body_rows:
                        row_cells = []
                        for cell in row.cells:
                            cell_text = self._get_text_from_layout(cell.layout, document.text)
                            row_cells.append(cell_text)
                        table_data["rows"].append(row_cells)

                tables.append(table_data)

        return tables

    def _extract_entities(self, document) -> List[Dict]:
        """Extract named entities"""
        entities = []

        if hasattr(document, 'entities'):
            for entity in document.entities:
                entities.append({
                    "type": entity.type_ if hasattr(entity, 'type_') else "UNKNOWN",
                    "mention_text": entity.mention_text if hasattr(entity, 'mention_text') else "",
                    "confidence": entity.confidence if hasattr(entity, 'confidence') else 0.0
                })

        return entities

    def _get_text_from_layout(self, layout, full_text: str) -> str:
        """Extract text from layout object"""
        if not hasattr(layout, 'text_anchor'):
            return ""

        text_anchor = layout.text_anchor
        text_segments = text_anchor.text_segments

        result = ""
        for segment in text_segments:
            start_index = segment.start_index if hasattr(segment, 'start_index') else 0
            end_index = segment.end_index
            result += full_text[start_index:end_index]

        return result.strip()
```

**Step 5: Run tests**

Run: `pytest tests/test_document_ai.py::test_processor_initializes -v`
Expected: PASS

Run: `pytest tests/test_document_ai.py -v -m integration`
Expected: PASS (2 tests) - requires GCP credentials and processor ID

**Step 6: Commit Document AI processor**

```bash
git add ingestion/document_ai_processor.py tests/test_document_ai.py
git commit -m "feat: add Document AI processor for PDF extraction"
```

---

### Task 2.3: Ingestion Pipeline Orchestrator

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/ingestion/pipeline.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_ingestion_pipeline.py`

**Step 1: Write failing test for ingestion pipeline**

Create `tests/test_ingestion_pipeline.py`:
```python
import pytest
from eco_observatory.ingestion.pipeline import IngestionPipeline

def test_pipeline_initializes():
    pipeline = IngestionPipeline()
    assert pipeline is not None

@pytest.mark.integration
def test_pipeline_processes_single_pdf():
    pipeline = IngestionPipeline()

    test_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

    result = pipeline.ingest_from_url(
        url=test_url,
        company_name="TEST_COMPANY",
        report_type="test_sustainability_2024"
    )

    assert "gcs_path" in result
    assert "extracted_data" in result
    assert "status" in result
    assert result["status"] == "success"

@pytest.mark.integration
def test_pipeline_batch_ingest_from_discovery():
    import json
    from pathlib import Path

    pipeline = IngestionPipeline()

    # Load discovery results
    discovery_file = Path("data/discovery_results.json")
    if not discovery_file.exists():
        pytest.skip("Discovery results not found")

    with open(discovery_file) as f:
        discovery_results = json.load(f)

    # Process first company's first PDF
    first_company = discovery_results[0]
    if len(first_company['pdf_links']) == 0:
        pytest.skip("No PDFs found in discovery results")

    first_pdf = first_company['pdf_links'][0]

    result = pipeline.ingest_from_url(
        url=first_pdf['url'],
        company_name=first_company['company_name'],
        report_type="sustainability_2024"
    )

    assert result["status"] == "success"
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_ingestion_pipeline.py::test_pipeline_initializes -v`
Expected: FAIL - ModuleNotFoundError

**Step 3: Implement ingestion pipeline**

Create `ingestion/pipeline.py`:
```python
import os
from typing import Dict
from dotenv import load_dotenv
import logging
from eco_observatory.ingestion.gcs_uploader import GCSUploader
from eco_observatory.ingestion.document_ai_processor import DocumentAIProcessor

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IngestionPipeline:
    def __init__(self):
        self.gcs_uploader = GCSUploader(
            bucket_name=os.getenv("GCS_BUCKET_NAME", "csrd-eco-observatory-pdfs")
        )
        self.doc_ai_processor = DocumentAIProcessor(
            project_id=os.getenv("GCP_PROJECT_ID", "csrd-copilot"),
            location="us",
            processor_id=os.getenv("DOCUMENT_AI_PROCESSOR_ID")
        )

    def ingest_from_url(self, url: str, company_name: str, report_type: str) -> Dict:
        """
        Complete ingestion pipeline: download -> upload to GCS -> process with Document AI
        Returns: Pipeline result with GCS path and extracted data
        """
        try:
            logger.info(f"Starting ingestion for {company_name}: {url}")

            # Step 1: Upload to GCS
            gcs_path = self.gcs_uploader.upload_from_url(
                url=url,
                company_name=company_name,
                report_type=report_type
            )

            # Step 2: Process with Document AI
            extracted_data = self.doc_ai_processor.process_document(gcs_path)

            result = {
                "status": "success",
                "company_name": company_name,
                "report_type": report_type,
                "source_url": url,
                "gcs_path": gcs_path,
                "extracted_data": extracted_data,
                "pages_processed": extracted_data.get("pages", 0),
                "sections_found": len(extracted_data.get("sections", [])),
                "tables_found": len(extracted_data.get("tables", []))
            }

            logger.info(f"✅ Ingestion complete: {result['pages_processed']} pages, {result['sections_found']} sections")

            return result

        except Exception as e:
            logger.error(f"❌ Ingestion failed for {company_name}: {e}")
            return {
                "status": "failed",
                "company_name": company_name,
                "report_type": report_type,
                "source_url": url,
                "error": str(e)
            }

    def ingest_from_file(self, file_path: str, company_name: str, report_type: str) -> Dict:
        """Ingest from local file"""
        try:
            # Step 1: Upload to GCS
            gcs_path = self.gcs_uploader.upload_from_file(
                file_path=file_path,
                company_name=company_name,
                report_type=report_type
            )

            # Step 2: Process with Document AI
            extracted_data = self.doc_ai_processor.process_document(gcs_path)

            return {
                "status": "success",
                "company_name": company_name,
                "report_type": report_type,
                "gcs_path": gcs_path,
                "extracted_data": extracted_data
            }

        except Exception as e:
            logger.error(f"Ingestion failed: {e}")
            return {
                "status": "failed",
                "company_name": company_name,
                "error": str(e)
            }
```

**Step 4: Run tests**

Run: `pytest tests/test_ingestion_pipeline.py::test_pipeline_initializes -v`
Expected: PASS

Run: `pytest tests/test_ingestion_pipeline.py -v -m integration`
Expected: PASS (2 tests)

**Step 5: Create ingestion CLI script**

Create `scripts/run_ingestion.py`:
```python
#!/usr/bin/env python3
import json
from pathlib import Path
from eco_observatory.ingestion.pipeline import IngestionPipeline
import logging

logging.basicConfig(level=logging.INFO)

def main():
    print("📥 Starting ECO Observatory Ingestion Pipeline...")

    # Load discovery results
    discovery_file = Path("data/discovery_results.json")
    if not discovery_file.exists():
        print("❌ Discovery results not found. Run discovery first.")
        return

    with open(discovery_file) as f:
        discovery_results = json.load(f)

    pipeline = IngestionPipeline()
    ingestion_results = []

    # Process top PDF for each company (MVP: 1 per company)
    for company_result in discovery_results:
        company_name = company_result['company_name']
        pdf_links = company_result['pdf_links']

        if len(pdf_links) == 0:
            print(f"⚠️  No PDFs found for {company_name}")
            continue

        # Take the highest relevance PDF
        top_pdf = pdf_links[0]

        print(f"\n📄 Processing {company_name}: {top_pdf['text'][:50]}...")

        result = pipeline.ingest_from_url(
            url=top_pdf['url'],
            company_name=company_name,
            report_type="sustainability_2024"
        )

        ingestion_results.append(result)

    # Save results
    output_file = Path("data/ingestion_results.json")
    with open(output_file, 'w') as f:
        json.dump(ingestion_results, f, indent=2)

    print(f"\n✅ Ingestion complete! Results saved to {output_file}")
    print(f"📊 Processed {len(ingestion_results)} documents")

if __name__ == "__main__":
    main()
```

**Step 6: Run ingestion manually**

Run: `python scripts/run_ingestion.py`
Expected: Documents processed and results saved

**Step 7: Commit ingestion pipeline**

```bash
git add ingestion/pipeline.py tests/test_ingestion_pipeline.py scripts/run_ingestion.py
git commit -m "feat: add complete ingestion pipeline orchestrator"
```

---

## Module 3: ARS Grader (The Brain)

### Task 3.1: ESRS Scoring Rubric

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/grading/rubrics/esrs_e1_rubric.json`
- Create: `csrd-copilot-mvp/backend/eco_observatory/grading/rubrics/esrs_g1_rubric.json`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_rubric_loader.py`

**Step 1: Write failing test for rubric loader**

Create `tests/test_rubric_loader.py`:
```python
import pytest
from eco_observatory.grading.rubric_loader import RubricLoader

def test_rubric_loader_initializes():
    loader = RubricLoader()
    assert loader is not None

def test_load_e1_rubric():
    loader = RubricLoader()
    rubric = loader.load_rubric("E1")

    assert "criteria" in rubric
    assert "max_score" in rubric
    assert len(rubric["criteria"]) > 0

def test_load_g1_rubric():
    loader = RubricLoader()
    rubric = loader.load_rubric("G1")

    assert "criteria" in rubric
    assert len(rubric["criteria"]) > 0

def test_rubric_criteria_have_required_fields():
    loader = RubricLoader()
    rubric = loader.load_rubric("E1")

    criterion = rubric["criteria"][0]
    assert "name" in criterion
    assert "description" in criterion
    assert "points" in criterion
    assert "required_keywords" in criterion
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_rubric_loader.py -v`
Expected: FAIL - ModuleNotFoundError

**Step 3: Create ESRS E1 rubric**

Create `grading/rubrics/esrs_e1_rubric.json`:
```json
{
  "standard": "ESRS E1 - Climate Change",
  "max_score": 100,
  "criteria": [
    {
      "name": "Scope 1 Emissions Disclosure",
      "description": "Direct GHG emissions from owned or controlled sources",
      "points": 15,
      "required_keywords": ["scope 1", "direct emissions", "ghg emissions", "co2 emissions"],
      "critical": true
    },
    {
      "name": "Scope 2 Emissions Disclosure",
      "description": "Indirect GHG emissions from purchased electricity, steam, heating and cooling",
      "points": 15,
      "required_keywords": ["scope 2", "indirect emissions", "purchased electricity"],
      "critical": true
    },
    {
      "name": "Scope 3 Emissions Disclosure",
      "description": "All other indirect emissions in the value chain",
      "points": 20,
      "required_keywords": ["scope 3", "value chain emissions", "upstream", "downstream"],
      "critical": true
    },
    {
      "name": "Climate Transition Plan",
      "description": "Strategy and roadmap for transitioning to low-carbon economy",
      "points": 15,
      "required_keywords": ["transition plan", "decarbonization", "net zero", "climate strategy"],
      "critical": true
    },
    {
      "name": "Climate Risks and Opportunities",
      "description": "Assessment of climate-related risks and opportunities",
      "points": 10,
      "required_keywords": ["climate risk", "tcfd", "scenario analysis", "physical risk", "transition risk"],
      "critical": false
    },
    {
      "name": "Energy Consumption Breakdown",
      "description": "Total energy consumption with renewable vs non-renewable split",
      "points": 10,
      "required_keywords": ["energy consumption", "renewable energy", "energy mix"],
      "critical": false
    },
    {
      "name": "Materiality Assessment",
      "description": "Double materiality assessment for climate topics",
      "points": 10,
      "required_keywords": ["materiality", "material topics", "double materiality", "impact materiality"],
      "critical": false
    },
    {
      "name": "GHG Intensity Metrics",
      "description": "Emissions intensity per revenue, FTE, or other denominator",
      "points": 5,
      "required_keywords": ["intensity", "emissions per", "carbon intensity"],
      "critical": false
    }
  ]
}
```

**Step 4: Create ESRS G1 rubric**

Create `grading/rubrics/esrs_g1_rubric.json`:
```json
{
  "standard": "ESRS G1 - Business Conduct",
  "max_score": 100,
  "criteria": [
    {
      "name": "Anti-Corruption Policies",
      "description": "Policies and procedures to prevent corruption and bribery",
      "points": 20,
      "required_keywords": ["anti-corruption", "anti-bribery", "corruption prevention", "code of conduct"],
      "critical": true
    },
    {
      "name": "Whistleblowing Mechanism",
      "description": "Protected channels for reporting misconduct",
      "points": 15,
      "required_keywords": ["whistleblow", "speak up", "ethics hotline", "reporting mechanism"],
      "critical": true
    },
    {
      "name": "Tax Transparency",
      "description": "Country-by-country reporting and tax strategy disclosure",
      "points": 15,
      "required_keywords": ["tax", "country-by-country", "tax strategy", "effective tax rate"],
      "critical": false
    },
    {
      "name": "Political Contributions",
      "description": "Disclosure of political contributions and lobbying activities",
      "points": 10,
      "required_keywords": ["political contribution", "lobbying", "political engagement"],
      "critical": false
    },
    {
      "name": "Anti-Competitive Behavior",
      "description": "Policies against anti-competitive practices",
      "points": 10,
      "required_keywords": ["competition", "antitrust", "fair competition", "anti-competitive"],
      "critical": false
    },
    {
      "name": "Supply Chain Due Diligence",
      "description": "Human rights and environmental due diligence in supply chain",
      "points": 15,
      "required_keywords": ["supply chain", "due diligence", "supplier assessment", "responsible sourcing"],
      "critical": true
    },
    {
      "name": "Data Privacy and Security",
      "description": "Personal data protection and cybersecurity measures",
      "points": 10,
      "required_keywords": ["data privacy", "gdpr", "cybersecurity", "data protection"],
      "critical": false
    },
    {
      "name": "Board Oversight of ESG",
      "description": "Board-level governance of sustainability matters",
      "points": 5,
      "required_keywords": ["board", "governance", "oversight", "esg governance"],
      "critical": false
    }
  ]
}
```

**Step 5: Implement rubric loader**

Create `grading/__init__.py`:
```python
```

Create `grading/rubric_loader.py`:
```python
import json
from pathlib import Path
from typing import Dict

class RubricLoader:
    def __init__(self, rubrics_dir: str = None):
        if rubrics_dir is None:
            rubrics_dir = Path(__file__).parent / "rubrics"
        self.rubrics_dir = Path(rubrics_dir)

    def load_rubric(self, standard: str) -> Dict:
        """
        Load scoring rubric for a given ESRS standard
        Args:
            standard: E1, G1, S1, etc.
        Returns: Rubric dictionary
        """
        rubric_file = self.rubrics_dir / f"esrs_{standard.lower()}_rubric.json"

        if not rubric_file.exists():
            raise FileNotFoundError(f"Rubric not found: {rubric_file}")

        with open(rubric_file, 'r') as f:
            return json.load(f)

    def get_critical_criteria(self, standard: str) -> list:
        """Get only critical criteria for a standard"""
        rubric = self.load_rubric(standard)
        return [c for c in rubric["criteria"] if c.get("critical", False)]
```

**Step 6: Run tests**

Run: `pytest tests/test_rubric_loader.py -v`
Expected: PASS (4 tests)

**Step 7: Commit rubrics**

```bash
git add grading/ tests/test_rubric_loader.py
git commit -m "feat: add ESRS E1/G1 scoring rubrics"
```

---

### Task 3.2: Gemini ARS Grader

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/grading/ars_grader.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_ars_grader.py`

**Step 1: Write failing test for ARS grader**

Create `tests/test_ars_grader.py`:
```python
import pytest
from eco_observatory.grading.ars_grader import ARSGrader

def test_grader_initializes():
    grader = ARSGrader(model_name="gemini-1.5-flash")
    assert grader is not None

@pytest.mark.integration
def test_grade_document_returns_valid_structure():
    grader = ARSGrader(model_name="gemini-1.5-flash")

    # Sample extracted text
    sample_text = """
    Climate Change Report 2024

    Our Scope 1 emissions totaled 100,000 tonnes CO2e.
    Scope 2 emissions were 50,000 tonnes CO2e.
    We are developing a transition plan to achieve net zero by 2050.
    """

    result = grader.grade_document(
        extracted_text=sample_text,
        standard="E1"
    )

    assert "ars_score" in result
    assert "confidence_interval" in result
    assert "missing_critical_datapoints" in result
    assert "competitor_benchmark_logic" in result
    assert 0 <= result["ars_score"] <= 100
    assert 0.0 <= result["confidence_interval"] <= 1.0

@pytest.mark.integration
def test_grade_with_sections_and_tables():
    grader = ARSGrader()

    extracted_data = {
        "text": "Full document text with climate disclosures...",
        "sections": [
            {"text": "Scope 1 emissions: 100,000 tCO2e", "page": 1},
            {"text": "Scope 2 emissions: 50,000 tCO2e", "page": 2}
        ],
        "tables": [
            {
                "headers": [["Category", "2024", "2023"]],
                "rows": [["Scope 1", "100,000", "95,000"]]
            }
        ]
    }

    result = grader.grade_document(
        extracted_text=extracted_data["text"],
        standard="E1",
        sections=extracted_data["sections"],
        tables=extracted_data["tables"]
    )

    assert result["ars_score"] > 0
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/test_ars_grader.py::test_grader_initializes -v`
Expected: FAIL - ModuleNotFoundError

**Step 3: Implement Gemini-based ARS grader**

Create `grading/ars_grader.py`:
```python
import os
from typing import Dict, List, Optional
import json
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig
from eco_observatory.grading.rubric_loader import RubricLoader
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ARSGrader:
    def __init__(self, model_name: str = "gemini-1.5-flash", project_id: str = None):
        self.model_name = model_name
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "csrd-copilot")
        self.location = os.getenv("VERTEX_AI_LOCATION", "us-central1")

        # Initialize Vertex AI
        vertexai.init(project=self.project_id, location=self.location)

        # Initialize model
        self.model = GenerativeModel(model_name)
        self.rubric_loader = RubricLoader()

    def grade_document(
        self,
        extracted_text: str,
        standard: str,
        sections: Optional[List[Dict]] = None,
        tables: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Grade a sustainability report using Gemini and ESRS rubric

        Args:
            extracted_text: Full document text
            standard: ESRS standard (E1, G1, etc.)
            sections: Optional list of document sections
            tables: Optional list of extracted tables

        Returns:
            {
                "ars_score": 0-100,
                "confidence_interval": 0.0-1.0,
                "missing_critical_datapoints": List[str],
                "competitor_benchmark_logic": str,
                "criteria_scores": Dict[str, float]
            }
        """
        logger.info(f"Grading document against {standard} standard")

        # Load rubric
        rubric = self.rubric_loader.load_rubric(standard)

        # Build prompt
        prompt = self._build_grading_prompt(
            extracted_text=extracted_text,
            rubric=rubric,
            sections=sections,
            tables=tables
        )

        # Configure generation
        generation_config = GenerationConfig(
            temperature=0.1,  # Low temperature for consistency
            max_output_tokens=2048,
            response_mime_type="application/json"
        )

        # Generate grade
        response = self.model.generate_content(
            prompt,
            generation_config=generation_config
        )

        # Parse response
        try:
            result = json.loads(response.text)

            # Validate and normalize
            result = self._validate_result(result, rubric)

            logger.info(f"ARS Score: {result['ars_score']}/100 (confidence: {result['confidence_interval']})")

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            return self._default_result(rubric)

    def _build_grading_prompt(
        self,
        extracted_text: str,
        rubric: Dict,
        sections: Optional[List[Dict]],
        tables: Optional[List[Dict]]
    ) -> str:
        """Build the grading prompt for Gemini"""

        prompt = f"""You are an expert CSRD auditor evaluating a sustainability report against {rubric['standard']}.

**RUBRIC:**
"""

        # Add criteria
        for criterion in rubric['criteria']:
            critical_marker = "⚠️ CRITICAL" if criterion.get('critical') else ""
            prompt += f"""
- **{criterion['name']}** ({criterion['points']} points) {critical_marker}
  Description: {criterion['description']}
  Required keywords: {', '.join(criterion['required_keywords'])}
"""

        prompt += f"""

**DOCUMENT TO EVALUATE:**

{extracted_text[:15000]}  # Limit to first 15k chars for token limits

"""

        # Add structured data if available
        if sections:
            prompt += "\n**KEY SECTIONS:**\n"
            for section in sections[:20]:  # Top 20 sections
                prompt += f"- {section['text'][:200]}\n"

        if tables:
            prompt += "\n**EXTRACTED TABLES:**\n"
            for i, table in enumerate(tables[:5]):  # Top 5 tables
                prompt += f"Table {i+1}:\n{json.dumps(table, indent=2)[:500]}\n"

        prompt += """

**INSTRUCTIONS:**

1. Evaluate the document against each criterion in the rubric
2. Calculate points earned for each criterion (0 to max points)
3. Identify missing critical datapoints
4. Provide benchmark logic explaining the score

**OUTPUT FORMAT (JSON):**

{
  "ars_score": <0-100 integer>,
  "confidence_interval": <0.0-1.0 float>,
  "missing_critical_datapoints": [<list of missing critical items>],
  "competitor_benchmark_logic": "<2-3 sentence explanation of score>",
  "criteria_scores": {
    "<criterion_name>": <points_earned>,
    ...
  }
}

**SCORING RULES:**
- Only award points if clear evidence is found in the document
- Partial credit allowed (e.g., 7.5 out of 15 points)
- Missing critical datapoints reduce confidence
- Benchmark logic should compare to typical EU company disclosures

Now evaluate the document:
"""

        return prompt

    def _validate_result(self, result: Dict, rubric: Dict) -> Dict:
        """Validate and normalize the grading result"""

        # Ensure required fields
        if "ars_score" not in result:
            result["ars_score"] = 0

        if "confidence_interval" not in result:
            result["confidence_interval"] = 0.5

        if "missing_critical_datapoints" not in result:
            result["missing_critical_datapoints"] = []

        if "competitor_benchmark_logic" not in result:
            result["competitor_benchmark_logic"] = "Score calculated based on disclosed datapoints."

        if "criteria_scores" not in result:
            result["criteria_scores"] = {}

        # Clamp values
        result["ars_score"] = max(0, min(100, int(result["ars_score"])))
        result["confidence_interval"] = max(0.0, min(1.0, float(result["confidence_interval"])))

        return result

    def _default_result(self, rubric: Dict) -> Dict:
        """Return default result if grading fails"""
        return {
            "ars_score": 0,
            "confidence_interval": 0.0,
            "missing_critical_datapoints": [c["name"] for c in rubric["criteria"] if c.get("critical")],
            "competitor_benchmark_logic": "Grading failed - unable to evaluate document.",
            "criteria_scores": {}
        }
```

**Step 4: Run tests**

Run: `pytest tests/test_ars_grader.py::test_grader_initializes -v`
Expected: PASS

Run: `pytest tests/test_ars_grader.py -v -m integration`
Expected: PASS (2 tests) - requires GCP credentials

**Step 5: Commit ARS grader**

```bash
git add grading/ars_grader.py tests/test_ars_grader.py
git commit -m "feat: add Gemini-based ARS grader with ESRS scoring"
```

---

## Module 4: Data Sink (BigQuery)

### Task 4.1: BigQuery Schema Setup

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/data_sink/bigquery_schema.json`
- Create: `csrd-copilot-mvp/backend/eco_observatory/scripts/setup_bigquery_eco.py`

**Step 1: Create BigQuery dataset**

Run:
```bash
bq mk --dataset --location=us-central1 csrd-copilot:eco_observatory
```
Expected: Dataset created

**Step 2: Define table schema**

Create `data_sink/bigquery_schema.json`:
```json
[
  {
    "name": "company_name",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "Company name"
  },
  {
    "name": "country",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Company country code"
  },
  {
    "name": "report_url",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Source PDF URL"
  },
  {
    "name": "gcs_path",
    "type": "STRING",
    "mode": "REQUIRED",
    "description": "GCS path to stored PDF"
  },
  {
    "name": "report_type",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "Type of report (e.g., sustainability_2024)"
  },
  {
    "name": "ars_score_e1",
    "type": "INTEGER",
    "mode": "NULLABLE",
    "description": "Audit Readiness Score for E1 Climate (0-100)"
  },
  {
    "name": "ars_score_g1",
    "type": "INTEGER",
    "mode": "NULLABLE",
    "description": "Audit Readiness Score for G1 Business Conduct (0-100)"
  },
  {
    "name": "confidence_e1",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Confidence interval for E1 score (0.0-1.0)"
  },
  {
    "name": "confidence_g1",
    "type": "FLOAT",
    "mode": "NULLABLE",
    "description": "Confidence interval for G1 score (0.0-1.0)"
  },
  {
    "name": "missing_critical_e1",
    "type": "STRING",
    "mode": "REPEATED",
    "description": "List of missing critical E1 datapoints"
  },
  {
    "name": "missing_critical_g1",
    "type": "STRING",
    "mode": "REPEATED",
    "description": "List of missing critical G1 datapoints"
  },
  {
    "name": "benchmark_logic_e1",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "E1 score explanation"
  },
  {
    "name": "benchmark_logic_g1",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "G1 score explanation"
  },
  {
    "name": "pages_processed",
    "type": "INTEGER",
    "mode": "NULLABLE",
    "description": "Number of pages in report"
  },
  {
    "name": "processed_at",
    "type": "TIMESTAMP",
    "mode": "REQUIRED",
    "description": "When the report was processed"
  },
  {
    "name": "criteria_scores_e1",
    "type": "JSON",
    "mode": "NULLABLE",
    "description": "Detailed criterion scores for E1"
  },
  {
    "name": "criteria_scores_g1",
    "type": "JSON",
    "mode": "NULLABLE",
    "description": "Detailed criterion scores for G1"
  }
]
```

**Step 3: Create setup script**

Create `scripts/setup_bigquery_eco.py`:
```python
#!/usr/bin/env python3
from google.cloud import bigquery
import json
from pathlib import Path

def setup_bigquery_table():
    project_id = "csrd-copilot"
    dataset_id = "eco_observatory"
    table_id = "provisional_scores"

    client = bigquery.Client(project=project_id)

    # Load schema
    schema_file = Path(__file__).parent.parent / "data_sink" / "bigquery_schema.json"
    with open(schema_file) as f:
        schema_json = json.load(f)

    schema = [bigquery.SchemaField(**field) for field in schema_json]

    # Create table
    table_ref = f"{project_id}.{dataset_id}.{table_id}"
    table = bigquery.Table(table_ref, schema=schema)

    table = client.create_table(table, exists_ok=True)

    print(f"✅ Created table {table_ref}")
    print(f"Schema: {len(schema)} fields")

if __name__ == "__main__":
    setup_bigquery_table()
```

**Step 4: Run setup script**

Run: `python scripts/setup_bigquery_eco.py`
Expected: Table created successfully

**Step 5: Commit schema**

```bash
git add data_sink/ scripts/setup_bigquery_eco.py
git commit -m "feat: add BigQuery schema for ECO provisional scores"
```

---

### Task 4.2: BigQuery Writer

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/data_sink/bigquery_writer.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_bigquery_writer.py`

**Step 1: Write failing test**

Create `tests/test_bigquery_writer.py`:
```python
import pytest
from eco_observatory.data_sink.bigquery_writer import BigQueryWriter
from datetime import datetime

def test_writer_initializes():
    writer = BigQueryWriter()
    assert writer is not None

@pytest.mark.integration
def test_write_score_to_bigquery():
    writer = BigQueryWriter()

    test_record = {
        "company_name": "TEST_COMPANY",
        "country": "US",
        "report_url": "https://example.com/test.pdf",
        "gcs_path": "gs://test-bucket/test.pdf",
        "report_type": "sustainability_2024",
        "ars_score_e1": 75,
        "ars_score_g1": 80,
        "confidence_e1": 0.85,
        "confidence_g1": 0.90,
        "missing_critical_e1": ["Scope 3 Emissions"],
        "missing_critical_g1": [],
        "benchmark_logic_e1": "Good disclosure quality",
        "benchmark_logic_g1": "Strong governance practices",
        "pages_processed": 120,
        "processed_at": datetime.utcnow(),
        "criteria_scores_e1": {"Scope 1": 15, "Scope 2": 15},
        "criteria_scores_g1": {"Anti-Corruption": 20}
    }

    result = writer.write_record(test_record)
    assert result is True

@pytest.mark.integration
def test_batch_write():
    writer = BigQueryWriter()

    records = [
        {
            "company_name": f"TEST_COMPANY_{i}",
            "gcs_path": f"gs://test/file{i}.pdf",
            "ars_score_e1": 70 + i,
            "processed_at": datetime.utcnow()
        }
        for i in range(3)
    ]

    result = writer.write_batch(records)
    assert result is True
```

**Step 2: Run test**

Run: `pytest tests/test_bigquery_writer.py::test_writer_initializes -v`
Expected: FAIL - ModuleNotFoundError

**Step 3: Implement BigQuery writer**

Create `data_sink/__init__.py`:
```python
```

Create `data_sink/bigquery_writer.py`:
```python
import os
from google.cloud import bigquery
from typing import Dict, List
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BigQueryWriter:
    def __init__(
        self,
        project_id: str = None,
        dataset_id: str = None,
        table_id: str = None
    ):
        self.project_id = project_id or os.getenv("GCP_PROJECT_ID", "csrd-copilot")
        self.dataset_id = dataset_id or os.getenv("BIGQUERY_DATASET", "eco_observatory")
        self.table_id = table_id or os.getenv("BIGQUERY_TABLE", "provisional_scores")

        self.client = bigquery.Client(project=self.project_id)
        self.table_ref = f"{self.project_id}.{self.dataset_id}.{self.table_id}"

    def write_record(self, record: Dict) -> bool:
        """Write a single scoring record to BigQuery"""
        try:
            # Ensure processed_at is set
            if "processed_at" not in record:
                record["processed_at"] = datetime.utcnow()

            # Insert row
            errors = self.client.insert_rows_json(self.table_ref, [record])

            if errors:
                logger.error(f"BigQuery insert errors: {errors}")
                return False

            logger.info(f"✅ Written record for {record.get('company_name')} to BigQuery")
            return True

        except Exception as e:
            logger.error(f"Failed to write to BigQuery: {e}")
            return False

    def write_batch(self, records: List[Dict]) -> bool:
        """Write multiple records in batch"""
        try:
            # Ensure processed_at for all records
            for record in records:
                if "processed_at" not in record:
                    record["processed_at"] = datetime.utcnow()

            # Insert rows
            errors = self.client.insert_rows_json(self.table_ref, records)

            if errors:
                logger.error(f"BigQuery batch insert errors: {errors}")
                return False

            logger.info(f"✅ Written {len(records)} records to BigQuery")
            return True

        except Exception as e:
            logger.error(f"Failed to write batch to BigQuery: {e}")
            return False

    def query_company_scores(self, company_name: str) -> List[Dict]:
        """Query scores for a specific company"""
        query = f"""
        SELECT *
        FROM `{self.table_ref}`
        WHERE company_name = @company_name
        ORDER BY processed_at DESC
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("company_name", "STRING", company_name)
            ]
        )

        results = self.client.query(query, job_config=job_config)
        return [dict(row) for row in results]
```

**Step 4: Run tests**

Run: `pytest tests/test_bigquery_writer.py::test_writer_initializes -v`
Expected: PASS

Run: `pytest tests/test_bigquery_writer.py -v -m integration`
Expected: PASS (2 tests)

**Step 5: Commit BigQuery writer**

```bash
git add data_sink/bigquery_writer.py tests/test_bigquery_writer.py
git commit -m "feat: add BigQuery writer for ECO scores"
```

---

## Module 5: End-to-End Pipeline

### Task 5.1: Complete Pipeline Orchestrator

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/pipeline/eco_pipeline.py`
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_eco_pipeline.py`

**Step 1: Write failing test**

Create `tests/test_eco_pipeline.py`:
```python
import pytest
from eco_observatory.pipeline.eco_pipeline import ECOPipeline

@pytest.mark.asyncio
async def test_pipeline_initializes():
    pipeline = ECOPipeline()
    assert pipeline is not None
    await pipeline.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_pipeline_single_company():
    pipeline = ECOPipeline()

    try:
        result = await pipeline.process_company("LVMH")

        assert "discovery" in result
        assert "ingestion" in result
        assert "grading_e1" in result
        assert "grading_g1" in result
        assert "bigquery" in result
        assert result["bigquery"]["status"] == "success"
    finally:
        await pipeline.close()

@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_pipeline_all_companies():
    pipeline = ECOPipeline()

    try:
        results = await pipeline.process_all_companies()

        assert len(results) == 5
        assert all("company_name" in r for r in results)
    finally:
        await pipeline.close()
```

**Step 2: Run test**

Run: `pytest tests/test_eco_pipeline.py::test_pipeline_initializes -v`
Expected: FAIL - ModuleNotFoundError

**Step 3: Implement complete pipeline**

Create `pipeline/__init__.py`:
```python
```

Create `pipeline/eco_pipeline.py`:
```python
import asyncio
from typing import Dict, List
import logging
from datetime import datetime
from eco_observatory.discovery.orchestrator import DiscoveryOrchestrator
from eco_observatory.ingestion.pipeline import IngestionPipeline
from eco_observatory.grading.ars_grader import ARSGrader
from eco_observatory.data_sink.bigquery_writer import BigQueryWriter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ECOPipeline:
    """
    Complete ECO Observatory Pipeline
    Discovery -> Ingestion -> Grading -> BigQuery
    """

    def __init__(self):
        self.discovery = DiscoveryOrchestrator()
        self.ingestion = IngestionPipeline()
        self.grader_e1 = ARSGrader()
        self.grader_g1 = ARSGrader()
        self.bigquery = BigQueryWriter()

    async def process_company(self, company_name: str) -> Dict:
        """Process a single company through the complete pipeline"""
        logger.info(f"🚀 Starting ECO pipeline for {company_name}")

        result = {
            "company_name": company_name,
            "status": "in_progress",
            "started_at": datetime.utcnow().isoformat()
        }

        try:
            # Step 1: Discovery
            logger.info(f"Step 1/4: Discovery for {company_name}")
            discovery_result = await self.discovery.discover_single(company_name)
            result["discovery"] = discovery_result

            if len(discovery_result["pdf_links"]) == 0:
                result["status"] = "failed"
                result["error"] = "No PDFs found"
                return result

            # Take top PDF
            top_pdf = discovery_result["pdf_links"][0]

            # Step 2: Ingestion
            logger.info(f"Step 2/4: Ingestion for {company_name}")
            ingestion_result = self.ingestion.ingest_from_url(
                url=top_pdf["url"],
                company_name=company_name,
                report_type="sustainability_2024"
            )
            result["ingestion"] = ingestion_result

            if ingestion_result["status"] != "success":
                result["status"] = "failed"
                result["error"] = ingestion_result.get("error")
                return result

            extracted_data = ingestion_result["extracted_data"]

            # Step 3: Grading E1
            logger.info(f"Step 3/4: Grading E1 for {company_name}")
            grading_e1 = self.grader_e1.grade_document(
                extracted_text=extracted_data["text"],
                standard="E1",
                sections=extracted_data.get("sections"),
                tables=extracted_data.get("tables")
            )
            result["grading_e1"] = grading_e1

            # Step 3b: Grading G1
            logger.info(f"Step 3b/4: Grading G1 for {company_name}")
            grading_g1 = self.grader_g1.grade_document(
                extracted_text=extracted_data["text"],
                standard="G1",
                sections=extracted_data.get("sections"),
                tables=extracted_data.get("tables")
            )
            result["grading_g1"] = grading_g1

            # Step 4: Write to BigQuery
            logger.info(f"Step 4/4: Writing to BigQuery for {company_name}")
            bq_record = {
                "company_name": company_name,
                "country": discovery_result.get("country"),
                "report_url": top_pdf["url"],
                "gcs_path": ingestion_result["gcs_path"],
                "report_type": "sustainability_2024",
                "ars_score_e1": grading_e1["ars_score"],
                "ars_score_g1": grading_g1["ars_score"],
                "confidence_e1": grading_e1["confidence_interval"],
                "confidence_g1": grading_g1["confidence_interval"],
                "missing_critical_e1": grading_e1["missing_critical_datapoints"],
                "missing_critical_g1": grading_g1["missing_critical_datapoints"],
                "benchmark_logic_e1": grading_e1["competitor_benchmark_logic"],
                "benchmark_logic_g1": grading_g1["competitor_benchmark_logic"],
                "pages_processed": extracted_data.get("pages", 0),
                "processed_at": datetime.utcnow(),
                "criteria_scores_e1": grading_e1.get("criteria_scores", {}),
                "criteria_scores_g1": grading_g1.get("criteria_scores", {})
            }

            bq_success = self.bigquery.write_record(bq_record)
            result["bigquery"] = {
                "status": "success" if bq_success else "failed"
            }

            result["status"] = "success"
            result["completed_at"] = datetime.utcnow().isoformat()

            logger.info(f"✅ Pipeline complete for {company_name}: E1={grading_e1['ars_score']}, G1={grading_g1['ars_score']}")

        except Exception as e:
            logger.error(f"❌ Pipeline failed for {company_name}: {e}")
            result["status"] = "failed"
            result["error"] = str(e)

        return result

    async def process_all_companies(self) -> List[Dict]:
        """Process all configured companies"""
        from eco_observatory.config.company_loader import CompanyLoader

        loader = CompanyLoader()
        companies = loader.load_companies()

        results = []

        for company in companies:
            result = await self.process_company(company["name"])
            results.append(result)

        return results

    async def close(self):
        """Close all resources"""
        await self.discovery.close()
```

**Step 4: Run tests**

Run: `pytest tests/test_eco_pipeline.py::test_pipeline_initializes -v`
Expected: PASS

Run: `pytest tests/test_eco_pipeline.py -v -m integration`
Expected: PASS (2 tests) - may take 10-15 minutes

**Step 5: Create main CLI script**

Create `scripts/run_eco_pipeline.py`:
```python
#!/usr/bin/env python3
import asyncio
import json
from pathlib import Path
from eco_observatory.pipeline.eco_pipeline import ECOPipeline
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def main():
    print("""
╔═══════════════════════════════════════════════╗
║  ECO OBSERVATORY - CSRD AUDIT READINESS      ║
║  European CSRD Observatory Pipeline          ║
╚═══════════════════════════════════════════════╝
    """)

    pipeline = ECOPipeline()

    try:
        print("\n🚀 Starting complete pipeline for all companies...\n")

        results = await pipeline.process_all_companies()

        # Save results
        output_file = Path("data/eco_final_results.json")
        output_file.parent.mkdir(exist_ok=True)

        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)

        # Print summary
        print("\n" + "="*60)
        print("📊 PIPELINE SUMMARY")
        print("="*60 + "\n")

        for result in results:
            status_emoji = "✅" if result["status"] == "success" else "❌"
            company = result["company_name"]

            print(f"{status_emoji} {company}")

            if result["status"] == "success":
                e1_score = result["grading_e1"]["ars_score"]
                g1_score = result["grading_g1"]["ars_score"]
                print(f"   └─ E1 Climate Score: {e1_score}/100")
                print(f"   └─ G1 Conduct Score: {g1_score}/100")
            else:
                print(f"   └─ Error: {result.get('error', 'Unknown')}")

            print()

        print(f"✅ Results saved to: {output_file}")
        print("\n📈 Query results in BigQuery:")
        print("   bq query --use_legacy_sql=false \\")
        print("     'SELECT company_name, ars_score_e1, ars_score_g1 FROM `csrd-copilot.eco_observatory.provisional_scores`'")

    finally:
        await pipeline.close()

if __name__ == "__main__":
    asyncio.run(main())
```

**Step 6: Make script executable and test**

Run: `chmod +x scripts/run_eco_pipeline.py`

Run: `python scripts/run_eco_pipeline.py`
Expected: Complete pipeline execution for 5 companies

**Step 7: Commit complete pipeline**

```bash
git add pipeline/ tests/test_eco_pipeline.py scripts/run_eco_pipeline.py
git commit -m "feat: add complete ECO pipeline orchestrator"
```

---

## Testing & Validation

### Task 6.1: Integration Test Suite

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/tests/test_integration_full.py`

**Step 1: Create comprehensive integration test**

Create `tests/test_integration_full.py`:
```python
import pytest
import asyncio
from eco_observatory.pipeline.eco_pipeline import ECOPipeline

@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.asyncio
async def test_full_eco_pipeline_e2e():
    """
    Complete end-to-end test of ECO Observatory
    Tests all 5 companies through complete pipeline
    """
    pipeline = ECOPipeline()

    try:
        results = await pipeline.process_all_companies()

        # Assertions
        assert len(results) == 5, "Should process all 5 companies"

        successful = [r for r in results if r["status"] == "success"]
        assert len(successful) >= 3, "At least 3 companies should succeed"

        for result in successful:
            # Verify structure
            assert "grading_e1" in result
            assert "grading_g1" in result
            assert "bigquery" in result

            # Verify scores are valid
            assert 0 <= result["grading_e1"]["ars_score"] <= 100
            assert 0 <= result["grading_g1"]["ars_score"] <= 100

            # Verify BigQuery write
            assert result["bigquery"]["status"] == "success"

        print("\n✅ E2E Integration Test PASSED")
        print(f"   - {len(successful)}/{len(results)} companies processed successfully")

        for result in successful:
            print(f"   - {result['company_name']}: E1={result['grading_e1']['ars_score']}, G1={result['grading_g1']['ars_score']}")

    finally:
        await pipeline.close()

@pytest.mark.integration
def test_bigquery_data_quality():
    """Validate data quality in BigQuery after pipeline run"""
    from eco_observatory.data_sink.bigquery_writer import BigQueryWriter

    writer = BigQueryWriter()

    # Query all records
    from google.cloud import bigquery
    client = bigquery.Client(project="csrd-copilot")

    query = """
    SELECT
        company_name,
        ars_score_e1,
        ars_score_g1,
        confidence_e1,
        confidence_g1,
        pages_processed
    FROM `csrd-copilot.eco_observatory.provisional_scores`
    ORDER BY processed_at DESC
    LIMIT 10
    """

    results = list(client.query(query))

    assert len(results) > 0, "BigQuery should have records"

    for row in results:
        # Validate score ranges
        if row.ars_score_e1 is not None:
            assert 0 <= row.ars_score_e1 <= 100
        if row.ars_score_g1 is not None:
            assert 0 <= row.ars_score_g1 <= 100

        # Validate confidence ranges
        if row.confidence_e1 is not None:
            assert 0.0 <= row.confidence_e1 <= 1.0
        if row.confidence_g1 is not None:
            assert 0.0 <= row.confidence_g1 <= 1.0

    print(f"✅ Data Quality Check PASSED - {len(results)} records validated")
```

**Step 2: Run integration tests**

Run: `pytest tests/test_integration_full.py -v -s -m integration`
Expected: PASS (may take 15-20 minutes)

**Step 3: Commit integration tests**

```bash
git add tests/test_integration_full.py
git commit -m "test: add comprehensive E2E integration tests"
```

---

### Task 6.2: Documentation and README

**Files:**
- Create: `csrd-copilot-mvp/backend/eco_observatory/README.md`

**Step 1: Create comprehensive README**

Create `README.md`:
```markdown
# ECO Observatory - European CSRD Observatory

Automated pipeline for discovering, analyzing, and scoring sustainability reports against ESRS standards.

## Overview

The ECO Observatory is Component 1 of Project ECOPLY STRAT, designed to:
1. **Discover** sustainability reports from public company IR pages
2. **Ingest** PDFs to GCS and extract structured data with Document AI
3. **Grade** reports against ESRS E1 (Climate) and G1 (Business Conduct) using Gemini 1.5
4. **Store** Audit Readiness Scores (ARS) in BigQuery

## Architecture

```
Discovery Module (Playwright + BeautifulSoup)
    ↓
Ingestion Pipeline (GCS + Document AI)
    ↓
ARS Grader (Gemini 1.5 + ESRS Rubrics)
    ↓
Data Sink (BigQuery)
```

## Setup

### Prerequisites
- Python 3.11+
- GCP Project with APIs enabled:
  - Document AI
  - Vertex AI
  - Cloud Storage
  - BigQuery

### Installation

```bash
cd csrd-copilot-mvp/backend/eco_observatory

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env with your GCP settings
```

### GCP Setup

```bash
# Create GCS bucket
gsutil mb -p csrd-copilot -l us-central1 gs://csrd-eco-observatory-pdfs

# Create Document AI processor
gcloud documentai processors create \
  --location=us \
  --display-name="ECO Observatory Layout Parser" \
  --type=LAYOUT_PARSER_PROCESSOR \
  --project=csrd-copilot

# Create BigQuery dataset and table
python scripts/setup_bigquery_eco.py
```

## Usage

### Run Complete Pipeline

```bash
python scripts/run_eco_pipeline.py
```

This will:
1. Discover reports for 5 companies (LVMH, SAP, ASML, Enel, Volkswagen)
2. Download and process PDFs
3. Grade against ESRS E1 and G1
4. Write scores to BigQuery

### Run Individual Modules

**Discovery Only:**
```bash
python scripts/run_discovery.py
```

**Ingestion Only:**
```bash
python scripts/run_ingestion.py
```

### Query Results

```bash
bq query --use_legacy_sql=false \
  'SELECT company_name, ars_score_e1, ars_score_g1, confidence_e1, confidence_g1
   FROM `csrd-copilot.eco_observatory.provisional_scores`
   ORDER BY ars_score_e1 DESC'
```

## Testing

```bash
# Run all tests
pytest tests/ -v

# Run only unit tests
pytest tests/ -v -m "not integration"

# Run integration tests
pytest tests/ -v -m integration

# Run E2E test
pytest tests/test_integration_full.py -v -s -m integration
```

## Project Structure

```
eco_observatory/
├── config/              # Company configurations
├── discovery/           # Web scraping for IR pages
├── ingestion/           # GCS upload + Document AI
├── grading/             # ESRS rubrics + Gemini grader
├── data_sink/           # BigQuery writer
├── pipeline/            # End-to-end orchestrator
├── scripts/             # CLI tools
└── tests/               # Test suite
```

## ESRS Standards Covered

### E1 - Climate Change (100 points)
- Scope 1, 2, 3 emissions disclosure
- Climate transition plan
- Climate risks and opportunities
- Energy consumption
- Materiality assessment

### G1 - Business Conduct (100 points)
- Anti-corruption policies
- Whistleblowing mechanism
- Tax transparency
- Supply chain due diligence
- Data privacy

## Output Schema

BigQuery table: `eco_observatory.provisional_scores`

| Field | Type | Description |
|-------|------|-------------|
| company_name | STRING | Company name |
| ars_score_e1 | INTEGER | E1 score (0-100) |
| ars_score_g1 | INTEGER | G1 score (0-100) |
| confidence_e1 | FLOAT | E1 confidence (0.0-1.0) |
| confidence_g1 | FLOAT | G1 confidence (0.0-1.0) |
| missing_critical_e1 | ARRAY<STRING> | Missing E1 datapoints |
| missing_critical_g1 | ARRAY<STRING> | Missing G1 datapoints |
| benchmark_logic_e1 | STRING | E1 score explanation |
| benchmark_logic_g1 | STRING | G1 score explanation |

## Scaling to Production

The MVP processes 5 companies. To scale:

1. **Expand company list**: Add to `config/companies.json`
2. **Cloud Functions deployment**: Deploy as scheduled Cloud Function
3. **Batch processing**: Use Cloud Run for large-scale processing
4. **Add more standards**: Create rubrics for S1, E2, E3, etc.

## Hackathon Notes

- MVP Focus: 5 test companies
- Processing time: ~15-20 minutes for all companies
- Costs: Mainly Gemini API calls (~$0.10 per report)
- Modular design for easy extension

## License

Internal use only - Hackathon project for ECOPLY STRAT
```

**Step 2: Commit documentation**

```bash
git add README.md
git commit -m "docs: add comprehensive ECO Observatory README"
```

---

## Final Validation

### Task 7: Final Commit and Tag

**Step 1: Run full test suite**

Run: `pytest tests/ -v`
Expected: All tests pass

**Step 2: Run complete pipeline**

Run: `python scripts/run_eco_pipeline.py`
Expected: 5 companies processed, scores in BigQuery

**Step 3: Verify BigQuery data**

Run:
```bash
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) as total_records FROM `csrd-copilot.eco_observatory.provisional_scores`'
```
Expected: At least 5 records

**Step 4: Create final commit**

```bash
git add -A
git commit -m "feat: complete ECO Observatory MVP - discovery, ingestion, grading, BigQuery"
```

**Step 5: Tag release**

```bash
git tag -a v1.0.0-eco-mvp -m "ECO Observatory MVP - Hackathon Release"
git push origin main --tags
```

---

## Execution Summary

This plan provides:

1. ✅ **Discovery Module**: Playwright-based scraper for IR pages
2. ✅ **Ingestion Pipeline**: GCS upload + Document AI extraction
3. ✅ **ARS Grader**: Gemini 1.5 with ESRS E1/G1 rubrics
4. ✅ **Data Sink**: BigQuery storage with structured schema
5. ✅ **Complete Pipeline**: End-to-end orchestration
6. ✅ **Testing**: Unit, integration, and E2E tests
7. ✅ **Documentation**: Comprehensive README and setup guides

**Total Tasks**: 20 tasks across 7 modules
**Estimated Time**: 8-12 hours for implementation + testing
**Lines of Code**: ~2,000 Python + tests

Each task follows TDD principles with:
- Write failing test first
- Implement minimal code
- Verify tests pass
- Commit frequently

The plan is modular and scales from MVP (5 companies) to production (thousands).
