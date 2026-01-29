from enum import Enum
from typing import List, Optional
from fastapi import HTTPException
from pydantic import BaseModel
import json
import os

class Role(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    READER = "reader"

class Scope(str, Enum):
    GLOBAL = "global"
    ENVIRONMENT = "environment" # E1-E5
    SOCIAL = "social"           # S1-S4
    GOVERNANCE = "governance"   # G1

class UserProfile(BaseModel):
    uid: str
    email: str
    role: Role
    scopes: List[Scope] = []

    def has_permission(self, required_action: str, target_scope: Scope) -> bool:
        """
        Checks if the user has permission to perform an action on a target scope.
        Actions: 'read', 'write', 'delete'
        """
        # 1. Admin has all permissions
        if self.role == Role.ADMIN:
            return True
        
        # 2. Check Role capability
        if required_action in ['write', 'delete'] and self.role == Role.READER:
            return False
            
        # 3. Check Scope
        # If user has GLOBAL scope, they can access everything
        if Scope.GLOBAL in self.scopes:
            return True
            
        # Specific scope check
        if target_scope in self.scopes:
            return True
            
        return False

RBAC_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "rbac_users.json")

def load_rbac_db():
    if not os.path.exists(RBAC_DB_PATH):
        print(f"RBAC Warning: Database file not found at {RBAC_DB_PATH}")
        return {}
    try:
        with open(RBAC_DB_PATH, 'r') as f:
            data = json.load(f)
            # print(f"RBAC Loaded: {len(data)} users from {RBAC_DB_PATH}")
            return data
    except Exception as e:
        print(f"RBAC Error: Could not load database: {e}")
        return {}

def save_rbac_db(db):
    with open(RBAC_DB_PATH, 'w') as f:
        json.dump(db, f, indent=2)

def update_user_role(email: str, role: Role, scopes: List[Scope]):
    db = load_rbac_db()
    db[email] = {
        "role": role.value,
        "scopes": [s.value for s in scopes]
    }
    save_rbac_db(db)

def get_all_users():
    """Returns all users from the RBAC database, including hardcoded admins."""
    users = load_rbac_db()
    
    # Add hardcoded admins if not already in the database
    hardcoded_admins = {
        "msouesme@albertschool.com": {
            "role": "admin",
            "scopes": ["global"]
        },
        "admin@csrd.demo": {
            "role": "admin",
            "scopes": ["global"]
        }
    }
    
    for email, data in hardcoded_admins.items():
        if email not in users:
            users[email] = data
    
    return users

def get_user_profile(decoded_token: dict) -> UserProfile:
    uid = decoded_token.get("uid")
    email = decoded_token.get("email", "")
    
    # 1. Try to get roles from Firebase Custom Claims (Production Way)
    claims = decoded_token.get("roles", {}) 
    
    role_str = claims.get("role")
    scopes_list = claims.get("scopes", [])

    if role_str:
        return UserProfile(
            uid=uid,
            email=email,
            role=Role(role_str),
            scopes=[Scope(s) for s in scopes_list]
        )

    # 2. Check File DB
    db = load_rbac_db()
    if email in db:
        user_data = db[email]
        return UserProfile(
            uid=uid,
            email=email,
            role=Role(user_data["role"]),
            scopes=[Scope(s) for s in user_data.get("scopes", [])]
        )

    # 3. Fallback logic
    # Hardcoded Admins for MVP/Dev logic
    if email == "msouesme@albertschool.com" or email.startswith("demo") or uid == "demo123":
         return UserProfile(uid=uid, email=email, role=Role.ADMIN, scopes=[Scope.GLOBAL])

    # Default to Reader/Global if unknown (or restrict access)
    return UserProfile(uid=uid, email=email, role=Role.READER, scopes=[Scope.GLOBAL])
