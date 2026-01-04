import os
import glob
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from pypdf import PdfReader

# --- CRITICAL: USING VERTEX AI SDK (ENTERPRISE) ---
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ecovadis_agent")

router = APIRouter(
    prefix="/ecovadis",
    tags=["ecovadis"]
)

# Configuration
# Hardcoded PROJECT_ID that we validated via debug script
PROJECT_ID = "csrd-copilot" 
LOCATION = "us-central1"

# Initialize Vertex AI
try:
    print(f">>> DEBUG: Initializing Vertex AI for {PROJECT_ID}...", flush=True)
    vertexai.init(project=PROJECT_ID, location=LOCATION)
    print(f">>> DEBUG: Vertex AI Initialized!", flush=True)
except Exception as e:
    logger.error(f"Failed to init Vertex AI: {e}")
    print(f">>> DEBUG: Failed to init Vertex AI: {e}", flush=True)

# Data Paths
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data")
ECOVADIS_DIR = os.path.join(DATA_DIR, "ecovadis")
COMPANY_DOCS_DIR = os.path.join(DATA_DIR, "company_docs")

# Models
class AuditResult(BaseModel):
    criterion_id: str
    criterion_name: str
    status: str
    evidence: str
    suggestion: str
    source_doc: Optional[str] = None

class DocFormality(BaseModel):
    doc_name: str
    has_date: bool
    has_logo: bool
    has_signature: bool
    comment: str

class ScanResponse(BaseModel):
    results: List[AuditResult]
    formality_check: List[DocFormality]
    total_docs_scanned: int

# Demo Criteria
DEMO_CRITERIA = [
    {
        "id": "ENV300",
        "name": "Politique Énergie & GES",
        "description": "L'entreprise dispose-t-elle d'une politique avec des objectifs qualitatifs et quantitatifs pour réduire sa consommation d'énergie et ses émissions de GES ?"
    },
    {
        "id": "ENV630",
        "name": "Reporting Émissions GES (Scope 1, 2 & 3)",
        "description": "Veuillez déclarer les indicateurs de GES bruts pour le Scope 1, le Scope 2, et le Scope 3 (en tCO2e)."
    },
    {
        "id": "LAB601",
        "name": "Diversité & Inclusion (Employés minoritaires)",
        "description": "Démontrer les indicateurs relatifs au pourcentage d'employés issus de groupes minoritaires ou vulnérables."
    }
]

def extract_text_from_pdfs(directory: str) -> str:
    combined_text = ""
    start_path = os.path.abspath(directory)
    if not os.path.exists(start_path):
        return ""
    pdf_files = glob.glob(os.path.join(start_path, "*.pdf"))
    for pdf_file in pdf_files:
        try:
            reader = PdfReader(pdf_file)
            filename = os.path.basename(pdf_file)
            combined_text += f"\n--- DOCUMENT: {filename} ---\n"
            for page in reader.pages:
                combined_text += page.extract_text() or ""
        except Exception as e:
            logger.error(f"Error reading {pdf_file}: {e}")
    return combined_text

@router.post("/scan", response_model=ScanResponse)
async def run_ecovadis_scan():
    logger.info(">>> START ECOVADIS SCAN (Vertex Mode) <<<")
    
    # 1. Ingest Documents
    company_context = extract_text_from_pdfs(COMPANY_DOCS_DIR)
    ecovadis_context = extract_text_from_pdfs(ECOVADIS_DIR)
    
    print(f">>> DEBUG: EcoVadis RAG Context Loaded. Read {len(ecovadis_context)} chars from methodology docs.", flush=True)
    if "Principes de la notation" in ecovadis_context:
        print(">>> DEBUG: VERIFIED - 'Principes de la notation EcoVadis.pdf' content is present in context.", flush=True)
    
    if not company_context:
        company_context = "Aucun document interne trouvé."
        
    doc_count = len(glob.glob(os.path.join(COMPANY_DOCS_DIR, "*.pdf")))

    # 2. Analyze with Vertex AI
    # Robust Model Selection: Try 2026 models first (2.5/2.0), then 1.5
    model = None
    # Based on User Doc (Jan 2026) -> 2.5 is latest stable
    CANDIDATE_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-1.5-active", "gemini-pro"]
    
    for model_name in CANDIDATE_MODELS:
        try:
            print(f">>> DEBUG: Testing availability of model: {model_name}...", flush=True)
            candidate = GenerativeModel(model_name)
            # Test ping
            candidate.generate_content("Ping")
            model = candidate
            print(f">>> DEBUG: SUCCESS! Using model: {model_name}", flush=True)
            break
        except Exception as e:
             print(f">>> DEBUG: Model {model_name} failed: {e}", flush=True)
             
    if not model:
        logger.error("ALL MODELS FAILED")
        print(">>> DEBUG: FATAL - No working Gemini model found. Trying default 'gemini-pro' as last hail mary.", flush=True)
        model = GenerativeModel("gemini-pro") 
    
    scan_results = []
    formality_results = []

    # 3. Analyze Document Formality (Global Check)
    logger.info("Step 3.1: Analyzing Formality (Date, Logo, Signature)...")
    try:
        formality_prompt = f"""
        Tu es un expert en conformité documentaire.
        Analyse les documents internes suivants pour vérifier leur validité formelle.
        
        DOCUMENTS :
        {company_context[:20000]}
        
        TACHE :
        Pour chaque document identifié (séparé par "--- DOCUMENT: ... ---"), vérifie :
        1. Présence d'une DATE explicite (année en cours ou récente).
        2. Présence du LOGO ou Nom officiel de l'entreprise.
        3. Présence d'une SIGNATURE ou mention de validation par la direction.
        
        REPONSE JSON (List[Object]) :
        [
            {{
                "doc_name": "nom_du_fichier.pdf",
                "has_date": true/false,
                "has_logo": true/false,
                "has_signature": true/false,
                "comment": "Court commentaire explicatif"
            }},
            ...
        ]
        """
        print(f">>> DEBUG: Calling Vertex AI for Formality Check...", flush=True)
        f_response = model.generate_content(formality_prompt)
        f_text = f_response.text.strip().replace("```json", "").replace("```", "")
        import json
        f_data = json.loads(f_text)
        for item in f_data:
            formality_results.append(DocFormality(**item))
        print(f">>> DEBUG: Formality Check Success! Found {len(formality_results)} docs.", flush=True)
        
    except Exception as e:
        print(f">>> DEBUG: Formality Check Failed: {e}", flush=True)
        # Fallback empty or error
        formality_results = []

    # 4. Analyze each criterion
    for criterion in DEMO_CRITERIA:
        cid = criterion['id']
        logger.info(f"Analyzing Criterion: {cid}")
        
        prompt = f"""
        Tu es un auditeur expert EcoVadis.
        
        MÉTHODOLOGIE :
        {ecovadis_context[:10000]}
        
        DOCUMENTS INTERNES :
        {company_context[:40000]}
        
        CRITÈRE :
        ID: {cid}
        Nom : {criterion['name']}
        Description : {criterion['description']}
        
        TACHE :
        1. Vérifie la VALIDITÉ FORMELLE (Logo, Date, Signature).
           - Si absent, point NEGATIF.
        2. Vérifie la conformité sur le fond.
        3. Statut : Conforme / Partiel / Non Conforme.
        4. Extrait la preuve.
        5. Suggestion d'amélioration.
        
        FORMAT JSON :
        {{ "status": "...", "evidence": "...", "suggestion": "..." }}
        """
        
        try:
            print(f">>> DEBUG: Calling Vertex AI for {cid}...", flush=True)
            response = model.generate_content(prompt)
            print(f">>> DEBUG: Vertex Success for {cid}", flush=True)
            
            text_response = response.text.strip()
            # Clean Markdown
            text_response = text_response.replace("```json", "").replace("```", "")
            
            import json
            try:
                data = json.loads(text_response)
                status = data.get("status", "Incertain")
                evidence = data.get("evidence", "...")
                suggestion = data.get("suggestion", "")
            except:
                status = "Incertain"
                evidence = text_response[:200]
                suggestion = "Erreur parsing JSON"

            scan_results.append(AuditResult(
                criterion_id=criterion['id'],
                criterion_name=criterion['name'],
                status=status,
                evidence=evidence,
                suggestion=suggestion,
                source_doc="Internal Docs (Vertex AI)"
            ))
            
        except Exception as e:
            logger.error(f"API Error: {e}")
            print(f">>> DEBUG: API ERROR for {cid}: {e}", flush=True)
            
            # --- FALLBACK ---
            scan_results.append(AuditResult(
                criterion_id=criterion['id'],
                criterion_name=criterion['name'],
                status="Erreur",
                evidence=f"Erreur API: {str(e)} (Mode Dégradé)",
                suggestion="Vérifier la connexion Vertex AI."
            ))

    return ScanResponse(
        results=scan_results, 
        formality_check=formality_results,
        total_docs_scanned=doc_count
    )
