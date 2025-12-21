
import sys
import os

# Add backend to path
sys.path.append(os.path.abspath("backend"))

print("Attempting to import backend.api.main...")
try:
    from backend.api.main import app
    print("Successfully imported app!")
except Exception as e:
    print(f"Failed to import app: {e}")
    import traceback
    traceback.print_exc()
