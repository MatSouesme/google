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

    def _get_strategist_context(self, standard: str) -> str:
        """
        Retrieves "Strategist" context: A-rated reports and best practices.
        Sources:
        1. ai/rag_strategist/extracts/{standard}_good_examples.txt
        2. ai/rag_strategist/reports/*.pdf
        """
        context = ""
        standard_lower = standard.lower()
        
        # 1. Load specific extracts if they exist
        # Check standard definitions paths first as they are most likely root relative in docker
        paths_to_check = [
            f"ai/rag_strategist/extracts/{standard_lower}_good_examples.txt",
            f"../../ai/rag_strategist/extracts/{standard_lower}_good_examples.txt"
        ]
        
        for path in paths_to_check:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if content.strip():
                            context += f"--- BEST PRACTICE EXTRACTS ({standard.upper()}) ---\n{content}\n\n"
                except Exception as e:
                    print(f"Error reading strategist extract {path}: {e}")

        # 2. Load PDF Reports (A-rated examples)
        reports_dir_options = [
            "ai/rag_strategist/reports", 
            "../../ai/rag_strategist/reports"
        ]
        
        target_dir = None
        for d in reports_dir_options:
            if os.path.exists(d):
                target_dir = d
                break
            
        if target_dir:
            try:
                pdf_files = [f for f in os.listdir(target_dir) if f.lower().endswith('.pdf')]
                # Limit to 3 reports to keep context manageable but rich
                for pdf_file in pdf_files[:3]: 
                    pdf_path = os.path.join(target_dir, pdf_file)
                    print(f"Loading Strategist Report: {pdf_path}")
                    try:
                        # Extract text
                        text = self._extract_text_from_pdf(pdf_path)
                        if text:
                            # Use a reasonable chunk. Gemini 1.5/2.0 can handle huge context, 
                            # but let's be efficient. 50k chars is ~20 pages of dense text.
                            truncated_text = text[:50000] 
                            context += f"--- REFERENCE REPORT: {pdf_file} ---\n{truncated_text}\n\n"
                    except Exception as e:
                        print(f"Error processing strategist report {pdf_file}: {e}")
            except Exception as e:
                print(f"Error accessing reports directory: {e}")

        if not context:
            return "(No specific strategist examples found. Relying on general best practices in the prompt.)"
            
        return context

    def get_company_data(self, standard: str) -> str:
        """Fetches company data from data_lineage table (primary source of truth).
        Falls back to {standard}_raw only if no lineage data exists."""
        
        # Primary: use data_lineage (same source as lineage panel)
        lineage_table = f"{self.project_id}.csrd_mvp.data_lineage"
        std_upper = standard.upper()
        
        query = f"""
            SELECT kpi_id, value, unit, source_filename, snippet, confidence
            FROM `{lineage_table}`
            WHERE UPPER(kpi_id) LIKE '{std_upper}%'
            ORDER BY kpi_id, ingestion_timestamp DESC
        """
        try:
            query_job = self.bq_client.query(query)
            rows = [dict(row) for row in query_job]
            
            if rows:
                # Deduplicate: keep latest entry per kpi_id+value
                seen = set()
                unique_rows = []
                for row in rows:
                    key = f"{row.get('kpi_id')}:{row.get('value')}"
                    if key not in seen:
                        seen.add(key)
                        unique_rows.append(row)
                
                # Format as structured KPI data for the prompt
                kpi_data = {}
                for row in unique_rows:
                    kpi_id = row.get('kpi_id', 'UNKNOWN')
                    if kpi_id not in kpi_data:
                        kpi_data[kpi_id] = []
                    kpi_data[kpi_id].append({
                        "value": row.get('value'),
                        "unit": row.get('unit', ''),
                        "source": row.get('source_filename', ''),
                        "snippet": row.get('snippet', '')[:200] if row.get('snippet') else ''
                    })
                
                def json_serial(obj):
                    if hasattr(obj, 'isoformat'):
                        return obj.isoformat()
                    raise TypeError("Type not serializable")
                
                return json.dumps(kpi_data, default=json_serial, indent=2, ensure_ascii=False)
            
            # Fallback: use {standard}_raw if no lineage data
            print(f"[RAG] No data_lineage entries for {std_upper}, falling back to {standard}_raw")
            raw_table = f"{self.project_id}.csrd_mvp.{standard}_raw"
            fallback_query = f"""
                SELECT * FROM `{raw_table}`
                ORDER BY ingestion_timestamp DESC
                LIMIT 1
            """
            query_job = self.bq_client.query(fallback_query)
            rows = [dict(row) for row in query_job]
            if not rows:
                return "No data found."
            
            def json_serial(obj):
                if hasattr(obj, 'isoformat'):
                    return obj.isoformat()
                raise TypeError("Type not serializable")

            return json.dumps(rows[0], default=json_serial, indent=2)
        except Exception as e:
            return f"Error fetching data: {str(e)}"

    def generate_draft(self, topic: str, standard: str, language: str = "fr") -> dict:
        """
        Orchestrates the generation process:
        1. Fetch Data
        2. Load Prompts
        3. Call Gemini
        Language: 'fr' for French, 'en' for English, 'de' for German, 'es' for Spanish
        """
        
        # 1. Fetch Context
        company_data = self.get_company_data(standard)
        
        # 1b. Fetch Legal Context (PDF) - CORE 1 (GENDARME)
        legal_context = self._get_compliance_context(standard)

        # 1c. Fetch Strategist Context (PDF/Extracts) - CORE 2 (STRATEGIST)
        strategist_context = self._get_strategist_context(standard)
        
        # 1d. Fetch Lineage Data for frontend traceability
        lineage_values = []
        try:
            from services.lineage_service import LineageService
            lineage_svc = LineageService()
            lineage_entries = lineage_svc.get_all_for_standard(standard)
            
            seen_values = set()
            for entry in lineage_entries:
                val = entry.get('value', '')
                kpi = entry.get('kpi_id', '')
                unit = entry.get('unit', '') or ''
                key = f"{kpi}:{val}"
                if key not in seen_values:
                    seen_values.add(key)
                    lineage_values.append({
                        "kpi_id": kpi,
                        "value": val,
                        "unit": unit,
                        "source_filename": entry.get('source_filename', ''),
                        "page_number": entry.get('page_number'),
                        "confidence": entry.get('confidence'),
                    })
            print(f"[LINEAGE] {len(lineage_values)} values for frontend traceability ({standard})", flush=True)
        except Exception as e:
            print(f"[LINEAGE] Error loading lineage: {e}", flush=True)
        
        # 2. Load Prompts
        system_prompt = self._load_prompt("base_system_prompt.txt")
        strategist_prompt = self._load_prompt("strategist_prompt.txt")
        auditor_prompt = self._load_prompt("auditor_prompt.txt")
        consistency_prompt = self._load_prompt("consistency_check_prompt.txt")
        
        # 3. Construct the Final Prompt (Strategist)
        # We combine the system instructions with the specific task
        language_instructions = {
            "fr": "Write the report in FRENCH.",
            "en": "Write the report in ENGLISH.",
            "de": "Write the report in GERMAN.",
            "es": "Write the report in SPANISH."
        }
        language_instruction = language_instructions.get(language, "Write the report in ENGLISH.")
        
        full_prompt = f"""
        {system_prompt}

        ---
        TASK:
        {strategist_prompt}

        IMPORTANT: {language_instruction}

        ---
        INPUT CONTEXT:
        TOPIC: {topic}
        STANDARD: {standard.upper()}
        
        COMPANY DATA (BigQuery):
        {company_data}
        

        
        ---
        DUAL-CORE RAG CONTEXT:

        CORE 1: COMPLIANCE (GENDARME)
        LEGAL CONTEXT (Official ESRS {standard.upper()} Text):
        {legal_context}

        CORE 2: STRATEGY (BENCHMARKING) - STYLE REFERENCE ONLY
        ⚠️ LEGAL & PRIVACY WARNING:
        The text below comes from external companies (e.g. competitors or leaders).
        - DO NOT USE any data, KPIs, specific numbers, company names, or location names from these examples.
        - DO NOT mention these companies in the output.
        - USE ONLY: The tone of voice, sentence structure, narrative flow, and professional phrasing.
        - Your goal is to mimic the *structure* and *quality* of the writing, NOT the content.

        STRATEGIST CONTEXT (A-Rated Reports & Best Practices):
        {strategist_context}
        ---
        
        Please generate the draft now in the specified language.
        """

        # 3b. Construct the Auditor Prompt
        full_auditor_prompt = f"""
        {system_prompt}

        ---
        TASK:
        {auditor_prompt}

        IMPORTANT: {language_instruction}

        ---
        INPUT CONTEXT:
        TOPIC: {topic}
        STANDARD: {standard.upper()}
        
        COMPANY DATA (BigQuery):
        {company_data}
        
        LEGAL CONTEXT (Official ESRS {standard.upper()} Text):
        {legal_context}
        
        Please generate the audit report now in the specified language.
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
                draft_text = response_draft.text
                
                # Generate Audit (Auditor) - Sequential call
                # We use the same model instance for consistency
                print("Generating Audit Report...")
                response_audit = model.generate_content(full_auditor_prompt)

                # Generate Consistency Check (Critic)
                print("Running Consistency Check...")
                full_consistency_prompt = f"""
                {consistency_prompt}
                
                ---
                RAW COMPANY DATA:
                {company_data}
                
                GENERATED DRAFT:
                {draft_text}
                """
                response_consistency = model.generate_content(full_consistency_prompt)
                consistency_json = response_consistency.text.replace("```json", "").replace("```", "").strip()

                return {
                    "draft": draft_text,
                    "audit_report": response_audit.text,
                    "consistency_check": consistency_json,
                    "source_data": company_data,
                    "lineage_values": lineage_values,
                    "model_used": model_name
                }
            except Exception as e:
                print(f"Gemini Error with {model_name}: {str(e)}")
                last_error = e
                # Continue to next model
                continue
        
        # If all failed
        raise RuntimeError(f"All Gemini models failed. Last error: {str(last_error)}")

    def search_documents(self, query: str) -> str:
        """
        Searches uploaded user documents for the query.
        Uses a simple keyword search on BigQuery for MVP.
        """
        try:
            # Simple keyword search
            # In production, use Vector Search
            sql = f"""
                SELECT filename, content_text
                FROM `{self.project_id}.csrd_mvp.documents_content`
                WHERE LOWER(content_text) LIKE @query
                LIMIT 3
            """
            
            job_config = bigquery.QueryJobConfig(
                query_parameters=[
                    bigquery.ScalarQueryParameter("query", "STRING", f"%{query.lower()}%")
                ]
            )
            
            query_job = self.bq_client.query(sql, job_config=job_config)
            results = [dict(row) for row in query_job]
            
            if not results:
                return "I couldn't find any relevant information in your uploaded documents."
            
            # Summarize results with Gemini
            context = ""
            for row in results:
                # Take a snippet around the match? 
                # For MVP, we just feed the first 2000 chars of the doc to Gemini
                context += f"--- Document: {row['filename']} ---\n{row['content_text'][:2000]}...\n\n"
            
            prompt = f"""
            You are a helpful assistant answering questions based on the user's uploaded documents.
            
            User Question: "{query}"
            
            Context from Documents:
            {context}
            
            Answer the question based ONLY on the context provided. If the answer is not in the context, say so.
            """
            
            model = GenerativeModel("gemini-2.0-flash-lite-001")
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Document search failed: {e}")
            return "Sorry, I encountered an error searching your documents."

    def generate_sql_response(self, user_query: str) -> dict:
        """
        Generates a response to a natural language query about data by:
        1. Converting NL to SQL
        2. Executing SQL on BigQuery
        3. Summarizing the result
        """
        
        # 1. Get Schema Context
        # We fetch the schema of our main tables to inform the LLM
        tables = ["e1_raw", "salesforce_extra", "manual_entries"]
        schema_context = ""
        
        for table_name in tables:
            try:
                table_id = f"{self.project_id}.csrd_mvp.{table_name}"
                table = self.bq_client.get_table(table_id)
                schema_context += f"Table: {table_name}\nColumns:\n"
                for schema_field in table.schema:
                    schema_context += f"- {schema_field.name} ({schema_field.field_type})\n"
                schema_context += "\n"
            except Exception as e:
                print(f"Warning: Could not fetch schema for {table_name}: {e}")

        # 2. Generate SQL
        sql_prompt = f"""
        You are a BigQuery SQL expert. 
        Your task is to convert the user's natural language question into a valid BigQuery SQL query.
        
        Project ID: {self.project_id}
        Dataset: csrd_mvp
        
        Schema Context:
        {schema_context}
        
        Rules:
        - Use standard SQL.
        - Always use the full table path: `{self.project_id}.csrd_mvp.table_name`.
        - If the user asks about emissions, check 'e1_raw'.
        - If the user asks about revenue, employees, water, gas, check 'salesforce_extra'.
        - If the user asks about a specific KPI ID (e.g. "E1-6-1") or a topic not in the other tables, check 'manual_entries'.
        - For 'manual_entries', filter by `kpi_id` if provided in the question.
        - For 'manual_entries', SELECT `value`, `date`, `unit`, `comment`.
        - Return ONLY the SQL query, no markdown, no explanation.
        - Use IFNULL(column, 0) for summations.
        
        User Question: "{user_query}"
        
        SQL Query:
        """
        
        model = GenerativeModel("gemini-2.0-flash-lite-001")
        try:
            response_sql = model.generate_content(sql_prompt)
            generated_sql = response_sql.text.replace("```sql", "").replace("```", "").strip()
            print(f"Generated SQL: {generated_sql}")
        except Exception as e:
            # Fallback to 1.5 flash if 2.0 fails
            print(f"Gemini 2.0 failed, trying 1.5: {e}")
            model = GenerativeModel("gemini-1.5-flash")
            response_sql = model.generate_content(sql_prompt)
            generated_sql = response_sql.text.replace("```sql", "").replace("```", "").strip()

        # 3. Execute SQL
        try:
            query_job = self.bq_client.query(generated_sql)
            results = [dict(row) for row in query_job]
            
            # Handle empty results
            if not results:
                return {
                    "answer": "I couldn't find any data matching your request.",
                    "sql": generated_sql,
                    "data": []
                }
                
        except Exception as e:
            return {
                "answer": f"I tried to query the data but encountered an error: {str(e)}",
                "sql": generated_sql,
                "data": []
            }

        # 4. Summarize Results
        summary_prompt = f"""
        You are a data analyst.
        User Question: "{user_query}"
        SQL Query Executed: "{generated_sql}"
        Data Results: {json.dumps(results, default=str)}
        
        Please provide a concise, natural language answer to the user's question based on the data results.
        If the result is a single number, just state it clearly.
        If it's a list, summarize the key trends.
        """
        
        try:
            response_summary = model.generate_content(summary_prompt)
            return {
                "answer": response_summary.text,
                "sql": generated_sql,
                "data": results
            }
        except Exception as e:
             return {
                "answer": "I found the data but couldn't summarize it. Please check the raw results.",
                "sql": generated_sql,
                "data": results
            }
