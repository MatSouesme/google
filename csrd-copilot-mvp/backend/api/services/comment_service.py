"""
Service de gestion des commentaires et discussions sur les KPIs
Système collaboratif type Google Sheets
"""
from google.cloud import bigquery
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
import os

class CommentService:
    def __init__(self):
        self.project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "csrd-copilot")
        self.client = bigquery.Client(project=self.project_id)
        self.table_id = f"{self.project_id}.csrd_mvp.kpi_comments"
        
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
                                print(f"Warning creating comments table: {e}")
    
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
            print(f"Error creating comment: {e}")
            raise
    
    def get_comments_for_kpi(
        self,
        kpi_id: str,
        include_resolved: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Récupère tous les commentaires pour un KPI donné, organisés en threads
        """
        conditions = [f"kpi_id = '{kpi_id}'"]
        if not include_resolved:
            conditions.append("(is_resolved = FALSE OR comment_type = 'comment')")
        
        query = f"""
        SELECT *
        FROM `{self.table_id}`
        WHERE {' AND '.join(conditions)}
        ORDER BY created_at ASC
        """
        
        try:
            job = self.client.query(query)
            comments = [dict(row) for row in job.result()]
            
            # Organiser en structure de threads
            return self._organize_threads(comments)
        except Exception as e:
            print(f"Error fetching comments for {kpi_id}: {e}")
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
    
    def resolve_comment(
        self,
        comment_id: str,
        resolved_by: str
    ) -> bool:
        """
        Marque un commentaire/question/alerte comme résolu
        """
        query = f"""
        UPDATE `{self.table_id}`
        SET 
            is_resolved = TRUE,
            resolved_by = @resolved_by,
            resolved_at = CURRENT_TIMESTAMP(),
            updated_at = CURRENT_TIMESTAMP()
        WHERE comment_id = @comment_id
        """
        
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("comment_id", "STRING", comment_id),
                bigquery.ScalarQueryParameter("resolved_by", "STRING", resolved_by),
            ]
        )
        
        try:
            self.client.query(query, job_config=job_config).result()
            return True
        except Exception as e:
            print(f"Error resolving comment {comment_id}: {e}")
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
            print(f"Error updating comment {comment_id}: {e}")
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
                print(f"User {user_email} cannot delete comment {comment_id}")
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
            print(f"Error deleting comment {comment_id}: {e}")
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
            print(f"Error getting thread summary for {kpi_id}: {e}")
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
            print(f"Error fetching mentions for {user_email}: {e}")
            return []
