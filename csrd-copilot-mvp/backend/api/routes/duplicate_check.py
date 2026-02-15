"""
API pour gérer les doublons lors de l'import de données
Permet de détecter, afficher et résoudre les conflits de datapoints
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
import datetime
from google.cloud import bigquery
import logging

logger = logging.getLogger(__name__)

try:
    from backend.api.utils.auth import get_current_user
    from backend.api.utils.rbac import UserProfile
except ImportError:
    from utils.auth import get_current_user
    from utils.rbac import UserProfile

router = APIRouter()

class DatapointToCheck(BaseModel):
    kpi_id: str
    value: str
    date: Optional[str] = None
    unit: Optional[str] = None
    comment: Optional[str] = None

class ExistingDatapoint(BaseModel):
    kpi_id: str
    value: str
    date: str
    unit: Optional[str] = None
    comment: Optional[str] = None
    user_email: str
    submission_timestamp: str

class ConflictItem(BaseModel):
    """Représente un conflit détecté"""
    new_data: DatapointToCheck
    existing_data: List[ExistingDatapoint]
    conflict_type: Literal["exact_match", "same_date_diff_value"]

class CheckDuplicatesRequest(BaseModel):
    datapoints: List[DatapointToCheck]

class CheckDuplicatesResponse(BaseModel):
    conflicts: List[ConflictItem]
    no_conflicts: List[DatapointToCheck]
    total_checked: int
    conflicts_count: int

class ResolutionDecision(BaseModel):
    kpi_id: str
    date: str
    action: Literal["add", "replace", "skip"]  # add = ajouter nouvelle ligne, replace = remplacer existante, skip = ignorer
    new_value: str
    new_unit: Optional[str] = None  
    new_comment: Optional[str] = None
    replace_timestamp: Optional[str] = None  # Si replace, quelle ligne remplacer (timestamp de l'existante)

class UpsertEntriesRequest(BaseModel):
    decisions: List[ResolutionDecision]

@router.post("/data/check-duplicates", response_model=CheckDuplicatesResponse)
async def check_duplicates(
    request: CheckDuplicatesRequest,
    user: UserProfile = Depends(get_current_user)
):
    """
    Vérifie si des datapoints existent déjà dans BigQuery (même kpi_id + même date).
    Retourne la liste des conflits avec les valeurs existantes.
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.manual_entries"
    
    conflicts = []
    no_conflicts = []
    
    # S'assurer que la table existe
    try:
        client.get_table(table_id)
    except Exception:
        logger.warning(f"Table {table_id} does not exist, no conflicts possible")
        # Si la table n'existe pas, aucun conflit possible
        return CheckDuplicatesResponse(
            conflicts=[],
            no_conflicts=request.datapoints,
            total_checked=len(request.datapoints),
            conflicts_count=0
        )
    
    # Vérifier chaque datapoint
    for datapoint in request.datapoints:
        # Par défaut, date = aujourd'hui si non fournie
        check_date = datapoint.date or datetime.date.today().isoformat()
        
        # Query pour trouver les entrées existantes (même kpi_id + même date)
        query = f"""
        SELECT 
            kpi_id,
            value,
            date,
            unit,
            comment,
            user_email,
            submission_timestamp
        FROM `{table_id}`
        WHERE kpi_id = @kpi_id
          AND date = @date
        ORDER BY submission_timestamp DESC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("kpi_id", "STRING", datapoint.kpi_id),
                bigquery.ScalarQueryParameter("date", "DATE", check_date),
            ]
        )
        
        try:
            results = client.query(query, job_config=job_config).result()
            existing = []
            
            for row in results:
                existing.append(ExistingDatapoint(
                    kpi_id=row.kpi_id,
                    value=row.value,
                    date=row.date.isoformat(),
                    unit=row.unit,
                    comment=row.comment,
                    user_email=row.user_email,
                    submission_timestamp=row.submission_timestamp.isoformat()
                ))
            
            if existing:
                # Conflit détecté !
                # Déterminer le type de conflit
                exact_match = any(
                    ex.value == datapoint.value and ex.unit == datapoint.unit 
                    for ex in existing
                )
                
                conflicts.append(ConflictItem(
                    new_data=datapoint,
                    existing_data=existing,
                    conflict_type="exact_match" if exact_match else "same_date_diff_value"
                ))
            else:
                # Pas de conflit
                no_conflicts.append(datapoint)
                
        except Exception as e:
            logger.error(f"Error checking duplicates for {datapoint.kpi_id}", extra={
                "error_type": type(e).__name__
            })
            # En cas d'erreur, on considère qu'il n'y a pas de conflit (pour ne pas bloquer)
            no_conflicts.append(datapoint)
    
    return CheckDuplicatesResponse(
        conflicts=conflicts,
        no_conflicts=no_conflicts,
        total_checked=len(request.datapoints),
        conflicts_count=len(conflicts)
    )


@router.post("/data/upsert-entries")
async def upsert_entries(
    request: UpsertEntriesRequest,
    user: UserProfile = Depends(get_current_user)
):
    """
    Applique les décisions de résolution de conflits :
    - 'add' : Ajoute une nouvelle ligne (même si doublon)
    - 'replace' : Remplace la ligne existante (UPDATE)
    - 'skip' : Ignore cette entrée
    """
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
    client = bigquery.Client(project=project_id)
    table_id = f"{project_id}.csrd_mvp.manual_entries"
    
    results = {
        "added": 0,
        "replaced": 0,
        "skipped": 0,
        "errors": []
    }
    
    # S'assurer que la table existe
    try:
        client.get_table(table_id)
    except Exception:
        # Créer la table si elle n'existe pas
        schema = [
            bigquery.SchemaField("kpi_id", "STRING"),
            bigquery.SchemaField("value", "STRING"),
            bigquery.SchemaField("date", "DATE"),
            bigquery.SchemaField("comment", "STRING"),
            bigquery.SchemaField("unit", "STRING"),
            bigquery.SchemaField("user_email", "STRING"),
            bigquery.SchemaField("submission_timestamp", "TIMESTAMP"),
        ]
        table = bigquery.Table(table_id, schema=schema)
        client.create_table(table)
        logger.info(f"Created table {table_id}")
    
    for decision in request.decisions:
        try:
            if decision.action == "skip":
                results["skipped"] += 1
                continue
            
            elif decision.action == "add":
                # INSERT nouvelle ligne
                row = {
                    "kpi_id": decision.kpi_id,
                    "value": decision.new_value,
                    "date": decision.date,
                    "unit": decision.new_unit,
                    "comment": decision.new_comment,
                    "user_email": user.email,
                    "submission_timestamp": datetime.datetime.now().isoformat()
                }
                
                errors = client.insert_rows_json(table_id, [row])
                if errors:
                    logger.error(f"Error inserting row", extra={"errors": str(errors)[:100]})
                    results["errors"].append(f"{decision.kpi_id} ({decision.date}): {errors}")
                else:
                    results["added"] += 1
            
            elif decision.action == "replace":
                # UPDATE ligne existante
                # On identifie la ligne par kpi_id + date + submission_timestamp
                if not decision.replace_timestamp:
                    results["errors"].append(f"{decision.kpi_id} ({decision.date}): Missing replace_timestamp")
                    continue
                
                update_query = f"""
                UPDATE `{table_id}`
                SET 
                    value = @new_value,
                    unit = @new_unit,
                    comment = @new_comment,
                    user_email = @user_email,
                    submission_timestamp = CURRENT_TIMESTAMP()
                WHERE kpi_id = @kpi_id
                  AND date = @date
                  AND submission_timestamp = @old_timestamp
                """
                
                job_config = bigquery.QueryJobConfig(
                    query_parameters=[
                        bigquery.ScalarQueryParameter("new_value", "STRING", decision.new_value),
                        bigquery.ScalarQueryParameter("new_unit", "STRING", decision.new_unit),
                        bigquery.ScalarQueryParameter("new_comment", "STRING", decision.new_comment),
                        bigquery.ScalarQueryParameter("user_email", "STRING", user.email),
                        bigquery.ScalarQueryParameter("kpi_id", "STRING", decision.kpi_id),
                        bigquery.ScalarQueryParameter("date", "DATE", decision.date),
                        bigquery.ScalarQueryParameter("old_timestamp", "TIMESTAMP", decision.replace_timestamp),
                    ]
                )
                
                client.query(update_query, job_config=job_config).result()
                results["replaced"] += 1
        
        except Exception as e:
            logger.error(f"Error upserting entry", extra={
                "kpi_id": decision.kpi_id,
                "action": decision.action,
                "error_type": type(e).__name__
            })
            results["errors"].append(f"{decision.kpi_id} ({decision.date}): {type(e).__name__}")
    
    # Return flattened structure for frontend
    return {
        "added": results["added"],
        "replaced": results["replaced"],
        "skipped": results["skipped"],
        "errors": results["errors"]
    }
