import sys
import os
sys.path.insert(0, os.getcwd())

try:
    import backend.api.services.rag_client
    print("Import successful")
except ImportError as e:
    print(f"Import failed: {e}")
