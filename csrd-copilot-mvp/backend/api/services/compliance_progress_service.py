"""
Service pour calculer les métriques de progression de compliance CSRD
"""
from google.cloud import bigquery
from typing import Dict, List, Any
from datetime import datetime, date
import os
import json

class ComplianceProgressService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.client = bigquery.Client(project=self.project_id)
        
    def load_schema(self, standard: str):
        """Charge le schéma pour un standard donné"""
        try:
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            json_path = os.path.join(base_dir, "models", f"{standard}_schema.json")
            
            if not os.path.exists(json_path):
                json_path = os.path.join("/app", "models", f"{standard}_schema.json")
                
            with open(json_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading schema for {standard}: {e}")
            return None

    def get_overall_progress(self) -> Dict[str, Any]:
        """
        Calcule la progression globale sur tous les standards (E1, S1, G1)
        Retourne les métriques agrégées et par standard
        """
        standards = ["e1", "g1"]  # S1 sera ajouté plus tard
        results = {
            "standards": [],
            "overall": {
                "total_mandatory": 0,
                "total_covered": 0,
                "completeness_percentage": 0
            },
            "critical_missing": [],
            "last_updated": datetime.now().isoformat()
        }
        
        total_mandatory = 0
        total_covered = 0
        
        for standard in standards:
            progress = self._get_standard_progress(standard)
            results["standards"].append(progress)
            
            total_mandatory += progress["total_mandatory"]
            total_covered += progress["covered_count"]
            
            # Collecter les KPIs manquants critiques (les 3 premiers de chaque standard)
            for kpi in progress["missing_kpis"][:3]:
                results["critical_missing"].append({
                    "standard": standard.upper(),
                    "kpi_id": kpi["id"],
                    "kpi_name": kpi["name"],
                    "type": kpi.get("type", "narrative")
                })
        
        results["overall"]["total_mandatory"] = total_mandatory
        results["overall"]["total_covered"] = total_covered
        results["overall"]["completeness_percentage"] = (
            int((total_covered / total_mandatory) * 100) if total_mandatory > 0 else 0
        )
        
        return results
    
    def _get_standard_progress(self, standard: str) -> Dict[str, Any]:
        """Calcule la progression pour un standard donné"""
        schema = self.load_schema(standard)
        if not schema:
            return {
                "standard": standard.upper(),
                "completeness_score": 0,
                "total_mandatory": 0,
                "covered_count": 0,
                "missing_kpis": [],
                "status": "schema_error"
            }
        
        mandatory_kpis = [k for k in schema["kpis"] if k.get("mandatory")]
        total_mandatory = len(mandatory_kpis)
        covered_ids = set()
        
        # 1. Vérifier les entrées manuelles
        try:
            manual_table_id = f"{self.project_id}.csrd_mvp.manual_entries"
            manual_query = f"""
                SELECT DISTINCT kpi_id 
                FROM `{manual_table_id}`
                WHERE LOWER(kpi_id) LIKE '{standard}%'
            """
            manual_job = self.client.query(manual_query)
            for row in manual_job.result():
                covered_ids.add(row.kpi_id)
        except Exception as e:
            print(f"Warning: Could not query manual entries for {standard}: {e}")
        
        # 2. Vérifier les données dans BigQuery
        try:
            table_id = f"{self.project_id}.csrd_mvp.{standard}_raw"
            table = self.client.get_table(table_id)
            bq_columns = [schema_field.name for schema_field in table.schema]
            
            select_clauses = []
            for kpi in mandatory_kpis:
                if kpi['id'] in covered_ids:
                    continue
                
                if "fields" in kpi:
                    valid_fields = [f for f in kpi["fields"] if f in bq_columns]
                    if valid_fields:
                        checks = [f"COUNT({f})" for f in valid_fields]
                        select_clauses.append(f"({' + '.join(checks)}) as `{kpi['id']}`")
            
            if select_clauses:
                query = f"SELECT {', '.join(select_clauses)} FROM `{table_id}`"
                job = self.client.query(query)
                
                for row in job.result():
                    for kpi_id, count in row.items():
                        if count > 0:
                            covered_ids.add(kpi_id)
                            
        except Exception as e:
            if "Not found" not in str(e) and "404" not in str(e):
                print(f"Error checking {standard}_raw table: {e}")
        
        covered_count = len(covered_ids)
        missing_kpis = [k for k in mandatory_kpis if k['id'] not in covered_ids]
        score = int((covered_count / total_mandatory) * 100) if total_mandatory > 0 else 0
        
        return {
            "standard": standard.upper(),
            "completeness_score": score,
            "total_mandatory": total_mandatory,
            "covered_count": covered_count,
            "missing_kpis": missing_kpis,
            "status": "ok" if covered_count > 0 else "no_data"
        }
    
    def get_regulatory_timeline(self) -> List[Dict[str, Any]]:
        """
        Retourne la timeline des deadlines réglementaires CSRD
        Basé sur les exigences réelles de la directive CSRD
        """
        current_year = datetime.now().year
        
        # Deadlines CSRD officielles
        timeline = [
            {
                "id": "first_report",
                "title": "Premier rapport CSRD",
                "description": "Publication du premier rapport annuel de durabilité",
                "deadline": f"{current_year}-12-31",
                "status": "upcoming",
                "regulation": "Article 19a et 29a de la directive comptable (CSRD)",
                "category": "submission"
            },
            {
                "id": "data_collection",
                "title": "Collecte de données complète",
                "description": "Finalisation de la collecte des données pour tous les KPIs obligatoires",
                "deadline": f"{current_year}-10-31",
                "status": "critical",
                "regulation": "Préparation interne recommandée",
                "category": "preparation"
            },
            {
                "id": "assurance_externe",
                "title": "Assurance externe limitée",
                "description": "Audit externe obligatoire des informations de durabilité",
                "deadline": f"{current_year}-03-31",
                "status": "upcoming",
                "regulation": "Article 34 CSRD - Assurance limitée obligatoire",
                "category": "audit"
            }
        ]
        
        # Calculer le statut (passé, critique, à venir)
        today = date.today()
        for item in timeline:
            deadline_date = datetime.strptime(item["deadline"], "%Y-%m-%d").date()
            days_remaining = (deadline_date - today).days
            
            if days_remaining < 0:
                item["status"] = "passed"
            elif days_remaining <= 30:
                item["status"] = "critical"
            elif days_remaining <= 90:
                item["status"] = "warning"
            else:
                item["status"] = "upcoming"
            
            item["days_remaining"] = days_remaining
        
        # Trier par date
        timeline.sort(key=lambda x: x["deadline"])
        
        return timeline
