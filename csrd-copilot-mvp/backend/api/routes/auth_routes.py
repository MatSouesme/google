from fastapi import APIRouter, Depends

# Fix import path for Docker environment
try:
    from backend.api.utils.auth import get_current_user
    from backend.api.utils.rbac import UserProfile
except ImportError:
    from utils.auth import get_current_user
    from utils.rbac import UserProfile

router = APIRouter()

@router.get("/auth/profile", response_model=UserProfile)
def get_user_profile_endpoint(user: UserProfile = Depends(get_current_user)):
    """
    Returns the RBAC profile of the current user.
    """
    return user
