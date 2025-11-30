import os
import json
import vertexai
import pypdf
from vertexai.generative_models import GenerativeModel, SafetySetting
import vertexai.preview.generative_models as generative_models
from google.cloud import bigquery

class RAGClient:
    def __init__(self, project_id: str, location: str = "europe-west1"):
        print(">>> RAG CLIENT INIT: Starting initialization sequence <<<")
        self.project_id = project_id
        self.location = location
        
        # Initialize Vertex AI
        # Force us-central1 for model availability
        vertexai.init(project=project_id, location="us-central1")
        
        # DEBUG: List available models to see what we can access
        try:
            print(f"DEBUG: Listing available models in {project_id}/us-central1...")
            from vertexai.preview.generative_models import GenerativeModel
            # Note: list_models is not directly on GenerativeModel in all versions, 
            # but let's try to just print that we are initialized.
            # Actually, let's try to list them via the model garden API if possible, 
            # or just proceed. The best debug is the error message we already have.
            pass
        except Exception as e:
            print(f"DEBUG: Could not list models: {e}")

        # Try to initialize with the best available model, fallback to others if needed
        # This prevents 404 errors if a specific model version is not available in the project/region
        self.model = None
        models_to_try = ["gemini-2.0-flash-lite-001", "gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"]
        
        for model_name in models_to_try:
            try:
                # We just instantiate the class here, the actual check happens on generation usually,
                # but let's keep it simple. We will use the first one.
                # Actually, GenerativeModel constructor doesn't validate immediately.
                # So we just set it to the first preference.
                # But to be safe against the 404 which happens at runtime, we'll stick to 1.5-flash
                # and handle the error in generate_draft if possible? 
                # No, the error happens at generation time.
                pass
            except Exception:
                continue
        
        # We'll default to the first one but we will add fallback logic in generate_draft
        self.model_name = "gemini-2.0-flash-lite-001"
        self.model = GenerativeModel(self.model_name)
        
        self.bq_client = bigquery.Client(project=project_id)

    def _load_prompt(self, prompt_name: str) -> str:
        """Loads a prompt from the ai/prompts directory."""
        # Assuming the code runs from backend/api or similar, adjust path as needed
        # For Cloud Run, we might need to copy prompts into the container
        # Here we try a relative path that works if we are at project root or similar structure
        
        # Try to find the prompt file
        possible_paths = [
            f"ai/prompts/{prompt_name}",
            f"../../ai/prompts/{prompt_name}", # If running from backend/api
            f"prompts/{prompt_name}" # If copied to a local prompts dir in Docker
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                with open(path, "r") as f:
                    return f.read()
        
        # Fallback if file not found (should not happen in prod if built correctly)
        return ""

    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extracts text from a PDF file."""
        try:
            reader = pypdf.PdfReader(pdf_path)
            text = ""
            # Limit to first 50 pages for MVP to avoid token limits if PDF is huge
            # or just read all if we trust Gemini 1.5 Flash context window (1M tokens)
            # Let's read all for now, assuming standard documents are < 100 pages.
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text
        except Exception as e:
            print(f"Error reading PDF {pdf_path}: {e}")
            return ""

    def _get_compliance_context(self, standard: str) -> str:
        """Loads the official PDF text for the standard."""
        standard = standard.upper()
        # Try to find the PDF file
        # We copied it to backend/api/rag_compliance/{standard}/esrs_{standard.lower()}_full_text.pdf
        filename = f"esrs_{standard.lower()}_full_text.pdf"
        
        possible_paths = [
            f"rag_compliance/{standard}/{filename}", # If running from backend/api (Docker)
            f"../../ai/rag_compliance/{standard}/{filename}", # Local dev fallback
            f"ai/rag_compliance/{standard}/{filename}" # Another fallback
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                print(f"Loading compliance PDF from: {path}")
                return self._extract_text_from_pdf(path)
        
        print(f"Warning: Compliance PDF for {standard} not found.")
        return "(Official text not found. Relying on internal knowledge.)"

    def get_company_data(self, standard: str) -> str:
        """Fetches the latest company data for the standard from BigQuery."""
        table_id = f"{self.project_id}.csrd_mvp.{standard}_raw" # Using raw for MVP if validated is empty
        
        query = f"""
            SELECT * FROM `{table_id}`
            ORDER BY ingestion_timestamp DESC
            LIMIT 1
        """
        try:
            query_job = self.bq_client.query(query)
            rows = [dict(row) for row in query_job]
            if not rows:
                return "No data found."
            
            # Convert to JSON string for the prompt
            # Handle datetime objects
            def json_serial(obj):
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat()
                raise TypeError ("Type not serializable")

            return json.dumps(rows[0], default=json_serial, indent=2)
        except Exception as e:
            return f"Error fetching data: {str(e)}"

    def generate_draft(self, topic: str, standard: str) -> dict:
        """
        Orchestrates the generation process:
        1. Fetch Data
        2. Load Prompts
        3. Call Gemini
        """
        
        # 1. Fetch Context
        company_data = self.get_company_data(standard)
        
        # 1b. Fetch Legal Context (PDF)
        legal_context = self._get_compliance_context(standard)
        
        # 2. Load Prompts
        system_prompt = self._load_prompt("base_system_prompt.txt")
        strategist_prompt = self._load_prompt("strategist_prompt.txt")
        auditor_prompt = self._load_prompt("auditor_prompt.txt")
        
        # 3. Construct the Final Prompt (Strategist)
        # We combine the system instructions with the specific task
        full_prompt = f"""
        {system_prompt}

        ---
        TASK:
        {strategist_prompt}

        ---
        INPUT CONTEXT:
        TOPIC: {topic}
        STANDARD: {standard.upper()}
        
        COMPANY DATA (BigQuery):
        {company_data}
        
        LEGAL CONTEXT (Official ESRS {standard.upper()} Text):
        {legal_context}
        
        Please generate the draft now.
        """

        # 3b. Construct the Auditor Prompt
        full_auditor_prompt = f"""
        {system_prompt}

        ---
        TASK:
        {auditor_prompt}

        ---
        INPUT CONTEXT:
        TOPIC: {topic}
        STANDARD: {standard.upper()}
        
        COMPANY DATA (BigQuery):
        {company_data}
        
        LEGAL CONTEXT (Official ESRS {standard.upper()} Text):
        {legal_context}
        
        Please generate the audit report now.
        """

        # 4. Call Gemini with Fallback
        models_to_try = ["gemini-2.0-flash-lite-001", "gemini-1.5-flash", "gemini-1.0-pro", "gemini-pro"]
        last_error = None

        for model_name in models_to_try:
            try:
                print(f"Attempting generation with model: {model_name}")
                model = GenerativeModel(model_name)
                
                # Generate Draft (Strategist)
                response_draft = model.generate_content(full_prompt)
                
                # Generate Audit (Auditor) - Sequential call
                # We use the same model instance for consistency
                print("Generating Audit Report...")
                response_audit = model.generate_content(full_auditor_prompt)

                return {
                    "draft": response_draft.text,
                    "audit_report": response_audit.text,
                    "source_data": company_data,
                    "model_used": model_name
                }
            except Exception as e:
                print(f"Gemini Error with {model_name}: {str(e)}")
                last_error = e
                # Continue to next model
                continue
        
        # If all failed
        raise RuntimeError(f"All Gemini models failed. Last error: {str(last_error)}")
