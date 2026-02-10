"""
Endpoints d'authentification et d'obtention de tokens JWT
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.auth.jwt_manager import create_access_token
from app.core.config import settings
from app.database import get_db
from app.db.models import Admin
from pydantic import BaseModel
from datetime import timedelta
from passlib.context import CryptContext

router = APIRouter()

# Hash password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthRequest(BaseModel):
    """Requête d'authentification"""
    username: str
    password: str
    event_id: str = "temp"


class AdminLoginRequest(BaseModel):
    """Requête d'authentification admin"""
    username: str
    password: str


class TokenResponse(BaseModel):
    """Réponse avec le token"""
    access_token: str
    token_type: str
    expires_in_minutes: int
    admin_id: int = 0
    admin_name: str = ""


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier le mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hasher le mot de passe"""
    return pwd_context.hash(password)


@router.post("/login", response_model=TokenResponse)
async def login(auth_request: AuthRequest):
    """Obtenir un token JWT"""
    VALID_CREDENTIALS = {
        "photographer": "photo123",
        "admin": "admin123"
    }
    
    if auth_request.username not in VALID_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur invalide"
        )
    
    if VALID_CREDENTIALS[auth_request.username] != auth_request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mot de passe invalide"
        )
    
    token_data = {
        "sub": auth_request.username,
        "event_id": auth_request.event_id
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(hours=8)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=480,
        admin_id=0,
        admin_name=auth_request.username
    )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    """Authentification admin avec username/password depuis la base de données"""
    
    # Chercher l'admin dans la base de données
    admin = db.query(Admin).filter(Admin.username == request.username).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe invalide"
        )
    
    # Vérifier si l'admin est actif
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Compte désactivé"
        )
    
    # Vérifier le mot de passe
    if not verify_password(request.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe invalide"
        )
    
    # Créer le token
    token_data = {
        "sub": admin.username,
        "admin_id": admin.id,
        "role": "admin",
    }
    
    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(hours=24)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=1440,
        admin_id=admin.id,
        admin_name=admin.full_name
    )


@router.get("/verify")
async def verify_token(access_token: str):
    """Vérifier qu'un token est valide"""
    from app.auth.jwt_manager import verify_token
    from fastapi.security import HTTPBearer, HTTPAuthCredentials
    
    try:
        credentials = HTTPAuthCredentials(scheme="Bearer", credentials=access_token)
        token_data = await verify_token(credentials)
        return {
            "valid": True,
            "username": token_data.username,
            "event_id": token_data.event_id
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide"
        )
