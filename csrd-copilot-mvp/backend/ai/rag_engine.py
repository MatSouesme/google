import os
import logging
from typing import List, Dict, Any
from google.cloud import discoveryengine_v1beta as discoveryengine
from google.cloud import bigquery
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
LOCATION = "global" # or "eu"
COMPLIANCE_STORE_ID = "csrd-compliance-store"
STRATEGIST_STORE_ID = "csrd-strategist-store"

class DualCoreRAG:
    def __init__(self):
        self.bq_client = bigquery.Client()
        # Initialize Vertex AI Search client
        self.search_client = discoveryengine.SearchServiceClient()
        
        # Initialize Gemini (Placeholder - assumes API key or Vertex AI setup)
        # In a real GCP environment, we'd use vertexai.preview.generative_models
        # For this MVP, we'll simulate the generation or use a placeholder if key is missing
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if self.api_key:
            genai.configure(api_key=self.api_key)

    def search_store(self, data_store_id: str, query: str) -> str:
        """
        Searches a Vertex AI Search data store and returns concatenated snippets.
        """
        try:
            serving_config = self.search_client.serving_config_path(
                project=PROJECT_ID,
                location=LOCATION,
                data_store=data_store_id,
                serving_config="default_config",
            )

            request = discoveryengine.SearchRequest(
                serving_config=serving_config,
                query=query,
                page_size=3,
            )
            
            # For MVP simulation (if store doesn't exist yet), return dummy text
            # response = self.search_client.search(request)
            # snippets = []
            # for result in response.results:
            #     data = result.document.derived_struct_data
            #     snippets.append(data.get("snippets", [{}])[0].get("snippet", ""))
            # return "\n".join(snippets)
            
            return f"[Simulated Search Result from {data_store_id} for '{query}']"

        except Exception as e:
            logger.error(f"Search failed for {data_store_id}: {e}")
            return ""

    def query_user_data(self, standard: str) -> str:
        """
        Queries BigQuery for validated user data.
        """
        try:
            table_id = f"{PROJECT_ID}.csrd_mvp.{standard.lower()}_validated"
            query = f"SELECT * FROM `{table_id}` LIMIT 5"
            query_job = self.bq_client.query(query)
            rows = [dict(row) for row in query_job]
            
            if not rows:
                return "No user data found."
                
            # Format as string for the prompt
            return str(rows)
        except Exception as e:
            logger.error(f"BigQuery query failed: {e}")
            return "Error retrieving user data."

    def generate_draft(self, topic: str, standard: str) -> Dict[str, Any]:
        """
        Orchestrates the Dual-Core RAG process.
        """
        logger.info(f"Generating draft for {topic} ({standard})")

        # 1. Query Core 1 (Compliance)
        compliance_context = self.search_store(COMPLIANCE_STORE_ID, topic)
        
        # 2. Query Core 2 (Strategist)
        strategist_context = self.search_store(STRATEGIST_STORE_ID, topic)
        
        # 3. Query User Data
        user_data = self.query_user_data(standard)

        # 4. Synthesize with Gemini
        prompt = f"""
        You are an expert CSRD consultant. Draft a section for the {standard.upper()} standard on the topic: "{topic}".
        
        Use the following inputs:
        
        [COMPLIANCE FACTS (ESRS Legal Text)]
        {compliance_context}
        
        [STRATEGIC EXAMPLES (Best-in-class Reports)]
        {strategist_context}
        
        [USER DATA (Validated Company Data)]
        {user_data}
        
        Draft a professional, compliant, and strategic response.
        """
        
        # Call Gemini (Simulated for MVP if no key)
        if self.api_key:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            draft_content = response.text
        else:
            draft_content = f"Simulated Draft for '{topic}' based on inputs.\n\nContext Used:\n- Compliance: {len(compliance_context)} chars\n- Strategist: {len(strategist_context)} chars\n- User Data: {len(user_data)} chars"

        return {
            "topic": topic,
            "standard": standard,
            "draft": draft_content,
            "sources": {
                "compliance": compliance_context,
                "strategist": strategist_context,
                "user_data": user_data
            }
        }
