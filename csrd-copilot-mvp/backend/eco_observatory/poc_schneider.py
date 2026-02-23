"""
POC Scraper - Schneider Electric 2024 Sustainability Report
Télécharge le PDF, extrait le texte, score basique ESRS E1/G1
"""

import requests
import pdfplumber
import tempfile
import os
import json
from pathlib import Path

PDF_URL = "https://www.se.com/ww/en/assets/564/document/513141/2024-sustainability-report.pdf?p_enDocType=EDMS&p_File_Name=2024%20Sustainable%20Development%20Report"

# Indicateurs ESRS E1 (Climat) et G1 (Gouvernance)
SCORING_RUBRIC = {
    "scope_1": {
        "keywords": ["scope 1", "scope 2", "scope 3", "direct emissions", "émissions directes"],
        "weight": 15,
        "description": "Scope 1/2/3 mentionnés"
    },
    "transition_plan": {
        "keywords": ["transition plan", "net zero", "net-zero", "carbon neutral", "neutralité carbone"],
        "weight": 15,
        "description": "Plan de transition / Net Zero"
    },
    "materiality": {
        "keywords": ["materiality", "material topics", "double materiality", "matérialité"],
        "weight": 15,
        "description": "Matrice de matérialité"
    },
    "targets": {
        "keywords": ["2030 target", "2025 target", "reduction target", "objectif", "target"],
        "weight": 10,
        "description": "Objectifs chiffrés"
    },
    "governance": {
        "keywords": ["board", "governance", "gouvernance", "comité", "committee", "oversight"],
        "weight": 10,
        "description": "Gouvernance ESG"
    },
    "biodiversity": {
        "keywords": ["biodiversity", "biodiversité", "nature", "ecosystem"],
        "weight": 10,
        "description": "Biodiversité"
    },
    "supply_chain": {
        "keywords": ["supply chain", "chaîne d'approvisionnement", "suppliers", "fournisseurs"],
        "weight": 10,
        "description": "Chaîne d'approvisionnement"
    },
    "verified_data": {
        "keywords": ["assured", "verified", "third-party", "audit", "assurance", "vérif"],
        "weight": 10,
        "description": "Données vérifiées par tiers"
    },
    "esrs_reference": {
        "keywords": ["esrs", "csrd", "efrag", "european sustainability"],
        "weight": 5,
        "description": "Référence explicite ESRS/CSRD"
    },
}


def download_pdf(url: str) -> str:
    """Télécharge le PDF et retourne le chemin temporaire."""
    print(f"Téléchargement du PDF...")
    headers = {"User-Agent": "Mozilla/5.0 (compatible; CSRD-POC/1.0)"}
    response = requests.get(url, headers=headers, timeout=60, stream=True)
    response.raise_for_status()

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    for chunk in response.iter_content(chunk_size=8192):
        tmp.write(chunk)
    tmp.close()

    size_mb = os.path.getsize(tmp.name) / (1024 * 1024)
    print(f"PDF téléchargé : {size_mb:.1f} MB -> {tmp.name}")
    return tmp.name


def extract_text(pdf_path: str, max_pages: int = 50) -> str:
    """Extrait le texte des N premières pages du PDF."""
    print(f"Extraction du texte (max {max_pages} pages)...")
    text_chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        pages_to_read = min(total, max_pages)
        print(f"  {total} pages au total, lecture des {pages_to_read} premières")
        for i, page in enumerate(pdf.pages[:pages_to_read]):
            text = page.extract_text()
            if text:
                text_chunks.append(text)
    return "\n".join(text_chunks).lower()


def score_report(text: str) -> dict:
    """Score le rapport sur 100 selon la rubrique ESRS."""
    results = {}
    total_score = 0

    for key, criterion in SCORING_RUBRIC.items():
        found = any(kw in text for kw in criterion["keywords"])
        score = criterion["weight"] if found else 0
        total_score += score
        results[key] = {
            "found": found,
            "score": score,
            "max": criterion["weight"],
            "description": criterion["description"]
        }

    return {"ars_score": total_score, "details": results}


def run():
    # 1. Download
    pdf_path = download_pdf(PDF_URL)

    try:
        # 2. Extract
        text = extract_text(pdf_path, max_pages=60)

        # 3. Score
        print("\nAnalyse ESRS E1/G1...")
        result = score_report(text)

        # 4. Output
        print("\n" + "="*50)
        print(f"  SCHNEIDER ELECTRIC - ARS Score: {result['ars_score']}/100")
        print("="*50)
        for key, detail in result["details"].items():
            status = "[OK]" if detail["found"] else "[--]"
            print(f"  {status} {detail['description']:<40} +{detail['score']}/{detail['max']}")

        print("\nJSON complet:")
        output = {
            "company": "Schneider Electric",
            "report_url": PDF_URL,
            "ars_score": result["ars_score"],
            "confidence_interval": round(result["ars_score"] / 100, 2),
            "details": result["details"],
            "missing_critical_datapoints": [
                v["description"] for v in result["details"].values() if not v["found"]
            ]
        }
        print(json.dumps(output, indent=2, ensure_ascii=False))

        # Sauvegarde
        out_path = Path(__file__).parent.parent / "data" / "schneider_poc_result.json"
        out_path.parent.mkdir(exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"\nRésultat sauvegardé : {out_path}")

    finally:
        os.unlink(pdf_path)


if __name__ == "__main__":
    run()
