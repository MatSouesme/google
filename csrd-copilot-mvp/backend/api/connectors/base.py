from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
import datetime

class BaseConnector(ABC):
    """
    Abstract base class for all external data connectors.
    Enforces a standard workflow: Connect -> Fetch -> Transform -> Load.
    """

    def __init__(self, project_id: str):
        self.project_id = project_id

    @abstractmethod
    def authenticate(self) -> bool:
        """Authenticates with the external service."""
        pass

    @abstractmethod
    def fetch_data(self, params: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Fetches raw data from the external service."""
        pass

    @abstractmethod
    def transform_data(self, raw_data: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Transforms raw external data into the CSRD BigQuery schema.
        Returns a tuple: (standard_data, extra_data)
        """
        pass

    def add_metadata(self, rows: List[Dict[str, Any]], source_name: str) -> List[Dict[str, Any]]:
        """Adds standard audit trail metadata to rows."""
        current_time = datetime.datetime.utcnow().isoformat()
        for row in rows:
            row['ingestion_timestamp'] = current_time
            row['source_file'] = f"CONNECTOR:{source_name}" # Special tag for connectors
            # row['upload_id'] could be a sync_id
        return rows
