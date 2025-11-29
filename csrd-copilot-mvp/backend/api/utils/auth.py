import os
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Initialize Firebase Admin SDK
# On Cloud Run, it uses Application Default Credentials automatically
try:
    firebase_admin.get_app()
except ValueError:
    # If not already initialized
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
    if project_id:
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred, {
            'projectId': project_id,
        })
    else:
        # Local dev fallback (requires GOOGLE_APPLICATION_CREDENTIALS env var set)
        firebase_admin.initialize_app()

security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the Firebase ID token sent in the Authorization header.
    """
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
