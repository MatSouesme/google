"""
Service de gestion des commentaires et discussions sur les KPIs
Système collaboratif type Google Sheets
"""
from google.cloud import bigquery
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
import os
import logging

# Configure logger
logger = logging.getLogger(__name__)

class CommentService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.client = bigquery.Client(project=self.project_id)
        self.table_id = f"{self.project_id}.csrd_mvp.kpi_comments"
        self.events_table_id = f"{self.project_id}.csrd_mvp.comment_events"
        
    def ensure_table_exists(self):
        """Crée la table si elle n'existe pas"""
        try:
            self.client.get_table(self.table_id)
        except Exception:
            # Lire et exécuter le script SQL
            sql_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "sql",
                "create_comments_table.sql"
            )
            
            if os.path.exists(sql_path):
                with open(sql_path, 'r', encoding='utf-8') as f:
                    sql = f.read()
                    # Exécuter chaque statement séparément
                    for statement in sql.split(';'):
                        if statement.strip():
                            try:
                                self.client.query(statement).result()
                            except Exception as e:
                                logger.warning(f"Warning creating comments table: {type(e).__name__}")
    
    def create_comment(
        self,
        kpi_id: str,
        comment_text: str,
        author_email: str,
        author_name: str,
        author_role: str,
        comment_type: str = "comment",
        parent_comment_id: Optional[str] = None,
        data_source: Optional[str] = None,
        reference_id: Optional[str] = None,
        datapoint_id: Optional[str] = None,
        datapoint_value: Optional[str] = None,
        mentioned_users: Optional[List[str]] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Crée un nouveau commentaire ou une réponse dans un thread
        """
        self.ensure_table_exists()
        
        comment_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Extraction des mentions @utilisateur
        if not mentioned_users:
            mentioned_users = []
            words = comment_text.split()
            mentioned_users = [w[1:] for w in words if w.startswith('@') and '@' in w]
        
        row = {
            "comment_id": comment_id,
            "parent_comment_id": parent_comment_id,
            "kpi_id": kpi_id,
            "data_source": data_source,
            "reference_id": reference_id,
            "datapoint_id": datapoint_id,
            "datapoint_value": datapoint_value,
            "comment_text": comment_text,
            "comment_type": comment_type,
            "author_email": author_email,
            "author_name": author_name,
            "author_role": author_role,
            "is_resolved": False,
            "resolved_by": None,
            "resolved_at": None,
            "created_at": now,
            "updated_at": now,
            "mentioned_users": mentioned_users,
            "attachments": [],
            "tags": tags or []
        }
        
        try:
            errors = self.client.insert_rows_json(self.table_id, [row])
            if errors:
                raise Exception(f"BigQuery insert errors: {errors}")
            
            return {
                "success": True,
                "comment_id": comment_id,
                "comment": row
            }
        except Exception as e:
            logger.error(f"Error creating comment", extra={"error_type": type(e).__name__})
            raise
    
    def get_comments_for_kpi(
        self,
        kpi_id: str,
        include_resolved: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Récupère tous les commentaires pour un KPI donné, organisés en threads.
        Enrichit avec le statut de résolution basé sur l'historique des événements.
        """
        query = f"""
        SELECT 
            c.*,
            ARRAY_AGG(
                STRUCT(
                    e.event_type, 
                    e.user_email as resolved_by, 
                    e.event_timestamp as resolved_at,
                    e.notes as resolution_notes
                )
                ORDER BY e.event_timestamp DESC 
                LIMIT 1
            ) as latest_event
        FROM `{self.table_id}` c
        LEFT JOIN `{self.events_table_id}` e 
            ON c.comment_id = e.comment_id 
            AND e.event_type IN ('resolve', 'unresolve')
        WHERE c.kpi_id = @kpi_id
        GROUP BY 
            c.comment_id, c.parent_comment_id, c.kpi_id, c.data_source, 
            c.reference_id, c.comment_text, c.comment_type, c.author_email,
            c.author_name, c.author_role, c.is_resolved, c.resolved_by,
            c.resolved_at, c.created_at, c.updated_at, c.mentioned_users,
            c.attachments, c.tags, c.datapoint_id, c.datapoint_value
        ORDER BY c.created_at ASC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("kpi_id", "STRING", kpi_id)
            ]
        )
        
        try:
            job = self.client.query(query, job_config=job_config)
            comments = []
            for row in job.result():
                comment = dict(row)
                
                # Enrichir avec le statut de résolution depuis les événements
                if comment.get('latest_event') and len(comment['latest_event']) > 0:
                    latest = comment['latest_event'][0]
                    comment['is_resolved'] = latest.get('event_type') == 'resolve'
                    comment['resolved_by'] = latest.get('resolved_by')
                    comment['resolved_at'] = latest.get('resolved_at')
                    comment['resolution_notes'] = latest.get('resolution_notes')
                else:
                    comment['is_resolved'] = False
                
                # Nettoyer latest_event (ne pas l'exposer dans l'API)
                comment.pop('latest_event', None)
                
                # Filtrer si nécessaire
                if not include_resolved and comment['is_resolved'] and comment['comment_type'] != 'comment':
                    continue
                    
                comments.append(comment)
            
            # Organiser en structure de threads
            return self._organize_threads(comments)
        except Exception as e:
            logger.error(f"Error fetching comments for KPI", extra={
                "kpi_id": kpi_id,
                "error_type": type(e).__name__
            })
            return []
    
    def _organize_threads(self, comments: List[Dict]) -> List[Dict]:
        """
        Organise les commentaires plats en structure hiérarchique (threads)
        """
        # Créer un mapping id -> comment
        comment_map = {c["comment_id"]: c for c in comments}
        
        # Ajouter un champ replies à chaque comment
        for c in comments:
            c["replies"] = []
        
        # Construire l'arbre
        root_comments = []
        for comment in comments:
            if comment["parent_comment_id"]:
                # C'est une réponse
                parent = comment_map.get(comment["parent_comment_id"])
                if parent:
                    parent["replies"].append(comment)
            else:
                # C'est un commentaire racine
                root_comments.append(comment)
        
        return root_comments
    
    def get_comments_by_datapoint(self, datapoint_id: str) -> List[Dict[str, Any]]:
        """
        Récupère tous les commentaires pour un datapoint spécifique.
        Enrichit avec le statut de résolution basé sur l'historique des événements.
        Utilisé pour afficher les commentaires au survol d'une valeur.
        """
        query = f"""
        SELECT 
            c.*,
            ARRAY_AGG(
                STRUCT(
                    e.event_type, 
                    e.user_email as resolved_by, 
                    e.event_timestamp as resolved_at
                )
                ORDER BY e.event_timestamp DESC 
                LIMIT 1
            ) as latest_event
        FROM `{self.table_id}` c
        LEFT JOIN `{self.events_table_id}` e 
            ON c.comment_id = e.comment_id 
            AND e.event_type IN ('resolve', 'unresolve')
        WHERE c.datapoint_id = @datapoint_id
        GROUP BY 
            c.comment_id, c.parent_comment_id, c.kpi_id, c.data_source, 
            c.reference_id, c.comment_text, c.comment_type, c.author_email,
            c.author_name, c.author_role, c.is_resolved, c.resolved_by,
            c.resolved_at, c.created_at, c.updated_at, c.mentioned_users,
            c.attachments, c.tags, c.datapoint_id, c.datapoint_value
        ORDER BY c.created_at ASC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("datapoint_id", "STRING", datapoint_id)
            ]
        )
        
        try:
            results = self.client.query(query, job_config=job_config).result()
            comments = []
            for row in results:
                comment = dict(row)
                
                # Enrichir avec le statut de résolution depuis les événements
                if comment.get('latest_event') and len(comment['latest_event']) > 0:
                    latest = comment['latest_event'][0]
                    comment['is_resolved'] = latest.get('event_type') == 'resolve'
                    comment['resolved_by'] = latest.get('resolved_by')
                    if latest.get('resolved_at'):
                        comment['resolved_at'] = latest['resolved_at'].isoformat()
                else:
                    comment['is_resolved'] = False
                    comment['resolved_by'] = None
                    comment['resolved_at'] = None
                
                # Nettoyer latest_event
                comment.pop('latest_event', None)
                
                # Convertir les timestamps
                if comment.get("created_at"):
                    comment["created_at"] = comment["created_at"].isoformat()
                if comment.get("updated_at"):
                    comment["updated_at"] = comment["updated_at"].isoformat()
                    
                comments.append(comment)
            return comments
        except Exception as e:
            logger.error(f"Error fetching comments for datapoint", extra={
                "datapoint_id": datapoint_id[:8] + "...",
                "error_type": type(e).__name__
            })
            return []
    
    def resolve_comment(
        self,
        comment_id: str,
        resolved_by: str,
        resolution_notes: Optional[str] = None
    ) -> bool:
        """
        Enregistre un événement de résolution dans l'audit trail.
        N'update PAS le commentaire original - ajoute une ligne dans comment_events.
        Permet de calculer les temps de résolution et tracer l'historique.
        """
        event_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Récupérer des infos sur le commentaire pour calculer le temps de résolution
        comment_query = f"""
        SELECT created_at, comment_type, kpi_id, author_email
        FROM `{self.table_id}`
        WHERE comment_id = @comment_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id)
            ]
        )
        
        try:
            # Récupérer le commentaire
            comment_result = list(self.client.query(comment_query, job_config=job_config).result())
            if not comment_result:
                logger.warning(f"Comment not found for resolution")
                return False
            
            comment = comment_result[0]
            created_at = comment.created_at
            resolution_time_hours = (datetime.utcnow() - created_at).total_seconds() / 3600
            
            # Insérer l'événement de résolution
            event_row = {
                "event_id": event_id,
                "comment_id": comment_id,
                "event_type": "resolve",
                "user_email": resolved_by,
                "user_name": None,  # Peut être enrichi si disponible
                "event_timestamp": now,
                "notes": resolution_notes or f"Résolu par {resolved_by}",
                "metadata": {
                    "resolution_time_hours": round(resolution_time_hours, 2),
                    "comment_type": comment.comment_type,
                    "kpi_id": comment.kpi_id,
                    "original_author": comment.author_email
                }
            }
            
            errors = self.client.insert_rows_json(self.events_table_id, [event_row])
            if errors:
                logger.error(f"Error inserting resolution event", extra={"errors": str(errors)[:100]})
                return False
            
            logger.info(f"Resolution event recorded", extra={
                "resolution_time_hours": round(resolution_time_hours, 1)
            })
            return True
            
        except Exception as e:
            logger.error(f"Error resolving comment", extra={"error_type": type(e).__name__})
            return False
    
    def update_comment(
        self,
        comment_id: str,
        comment_text: str
    ) -> bool:
        """
        Modifie le texte d'un commentaire existant
        """
        query = f"""
        UPDATE `{self.table_id}`
        SET 
            comment_text = @comment_text,
            updated_at = CURRENT_TIMESTAMP()
        WHERE comment_id = @comment_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id),
                bigquery.ScalarQueryParameter("comment_text", "STRING", comment_text),
            ]
        )
        
        try:
            self.client.query(query, job_config=job_config).result()
            return True
        except Exception as e:
            logger.error(f"Error updating comment", extra={"error_type": type(e).__name__})
            return False
    
    def delete_comment(
        self,
        comment_id: str,
        user_email: str
    ) -> bool:
        """
        Supprime un commentaire (seulement par son auteur ou admin)
        """
        # Vérifier d'abord que l'utilisateur est l'auteur
        check_query = f"""
        SELECT author_email 
        FROM `{self.table_id}` 
        WHERE comment_id = @comment_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id),
            ]
        )
        
        try:
            result = list(self.client.query(check_query, job_config=job_config).result())
            if not result or result[0].author_email != user_email:
                logger.warning(f"Unauthorized delete attempt")
                return False
            
            # Supprimer le commentaire et ses réponses
            delete_query = f"""
            DELETE FROM `{self.table_id}`
            WHERE comment_id = @comment_id 
               OR parent_comment_id = @comment_id
            """
            
            self.client.query(delete_query, job_config=job_config).result()
            return True
        except Exception as e:
            logger.error(f"Error deleting comment", extra={"error_type": type(e).__name__})
            return False
    
    def get_thread_summary(self, kpi_id: str) -> Dict[str, Any]:
        """
        Récupère un résumé du thread de discussion pour un KPI
        """
        query = f"""
        SELECT 
            COUNT(DISTINCT comment_id) as total_comments,
            COUNT(DISTINCT CASE WHEN parent_comment_id IS NULL THEN comment_id END) as thread_count,
            COUNT(DISTINCT CASE WHEN is_resolved = FALSE AND comment_type IN ('question', 'alert') THEN comment_id END) as unresolved_count,
            MAX(created_at) as last_activity,
            ARRAY_AGG(DISTINCT author_email IGNORE NULLS LIMIT 10) as participants
        FROM `{self.table_id}`
        WHERE kpi_id = @kpi_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("kpi_id", "STRING", kpi_id),
            ]
        )
        
        try:
            result = list(self.client.query(query, job_config=job_config).result())
            if result:
                row = result[0]
                return {
                    "kpi_id": kpi_id,
                    "total_comments": row.total_comments,
                    "thread_count": row.thread_count,
                    "unresolved_count": row.unresolved_count,
                    "last_activity": row.last_activity.isoformat() if row.last_activity else None,
                    "participants": row.participants
                }
            return {
                "kpi_id": kpi_id,
                "total_comments": 0,
                "thread_count": 0,
                "unresolved_count": 0,
                "last_activity": None,
                "participants": []
            }
        except Exception as e:
            logger.error(f"Error getting thread summary", extra={"error_type": type(e).__name__})
            return {
                "kpi_id": kpi_id,
                "total_comments": 0,
                "thread_count": 0,
                "unresolved_count": 0,
                "error": str(e)
            }
    
    def get_user_mentions(self, user_email: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Récupère tous les commentaires où l'utilisateur a été mentionné
        """
        query = f"""
        SELECT *
        FROM `{self.table_id}`
        WHERE @user_email IN UNNEST(mentioned_users)
        ORDER BY created_at DESC
        LIMIT @limit
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("user_email", "STRING", user_email),
                bigquery.ScalarQueryParameter("limit", "INT64", limit),
            ]
        )
        
        try:
            job = self.client.query(query, job_config=job_config)
            return [dict(row) for row in job.result()]
        except Exception as e:
            logger.error(f"Error fetching mentions", extra={"error_type": type(e).__name__})
            return []
    
    def get_comment_events(self, comment_id: str) -> List[Dict[str, Any]]:
        """
        Récupère l'historique complet des événements pour un commentaire
        (résolutions, réouvertures, éditions)
        """
        query = f"""
        SELECT *
        FROM `{self.events_table_id}`
        WHERE comment_id = @comment_id
        ORDER BY event_timestamp ASC
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id)
            ]
        )
        
        try:
            results = self.client.query(query, job_config=job_config).result()
            events = []
            for row in results:
                event = dict(row)
                if hasattr(row, 'event_timestamp') and row.event_timestamp:
                    event['event_timestamp'] = row.event_timestamp.isoformat()
                events.append(event)
            return events
        except Exception as e:
            logger.error(f"Error fetching comment events", extra={"error_type": type(e).__name__})
            return []
    
    def is_comment_resolved(self, comment_id: str) -> bool:
        """
        Vérifie si un commentaire est actuellement résolu en regardant l'historique des événements.
        Un commentaire est résolu si le dernier événement est 'resolve' (et pas 'unresolve').
        """
        query = f"""
        SELECT event_type
        FROM `{self.events_table_id}`
        WHERE comment_id = @comment_id
          AND event_type IN ('resolve', 'unresolve')
        ORDER BY event_timestamp DESC
        LIMIT 1
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id)
            ]
        )
        
        try:
            results = list(self.client.query(query, job_config=job_config).result())
            if results:
                return results[0].event_type == 'resolve'
            return False
        except Exception as e:
            logger.error(f"Error checking resolution status", extra={"error_type": type(e).__name__})
            return False
    
    def get_resolution_metrics(self, kpi_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """
        Calcule des métriques sur les temps de résolution des commentaires.
        Utile pour les dashboards et le suivi de la qualité.
        """
        kpi_filter = f"AND JSON_EXTRACT_SCALAR(metadata, '$.kpi_id') = '{kpi_id}'" if kpi_id else ""
        
        query = f"""
        SELECT 
            COUNT(*) as total_resolutions,
            AVG(CAST(JSON_EXTRACT_SCALAR(metadata, '$.resolution_time_hours') AS FLOAT64)) as avg_resolution_hours,
            MIN(CAST(JSON_EXTRACT_SCALAR(metadata, '$.resolution_time_hours') AS FLOAT64)) as min_resolution_hours,
            MAX(CAST(JSON_EXTRACT_SCALAR(metadata, '$.resolution_time_hours') AS FLOAT64)) as max_resolution_hours,
            COUNTIF(CAST(JSON_EXTRACT_SCALAR(metadata, '$.resolution_time_hours') AS FLOAT64) < 24) as resolved_within_24h,
            COUNTIF(CAST(JSON_EXTRACT_SCALAR(metadata, '$.resolution_time_hours') AS FLOAT64) < 72) as resolved_within_72h
        FROM `{self.events_table_id}`
        WHERE event_type = 'resolve'
          AND event_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL {days} DAY)
          {kpi_filter}
        """
        
        try:
            results = list(self.client.query(query).result())
            if results and results[0].total_resolutions > 0:
                row = results[0]
                return {
                    "period_days": days,
                    "kpi_id": kpi_id,
                    "total_resolutions": row.total_resolutions,
                    "avg_resolution_hours": round(row.avg_resolution_hours, 2) if row.avg_resolution_hours else 0,
                    "min_resolution_hours": round(row.min_resolution_hours, 2) if row.min_resolution_hours else 0,
                    "max_resolution_hours": round(row.max_resolution_hours, 2) if row.max_resolution_hours else 0,
                    "resolved_within_24h": row.resolved_within_24h,
                    "resolved_within_72h": row.resolved_within_72h,
                    "resolution_rate_24h": round(row.resolved_within_24h / row.total_resolutions * 100, 1),
                    "resolution_rate_72h": round(row.resolved_within_72h / row.total_resolutions * 100, 1)
                }
            return {
                "period_days": days,
                "kpi_id": kpi_id,
                "total_resolutions": 0,
                "message": "Aucune résolution dans cette période"
            }
        except Exception as e:
            logger.error(f"Error calculating resolution metrics", extra={"error_type": type(e).__name__})
            return {"error": "Calculation error"}
