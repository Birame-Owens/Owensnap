"""
Endpoints d'authentification et d'obtention de tokens JWT
"""
from fastapi import APIRouter, HTTPException, status
from app.auth.jwt_manager import create_access_token
from pydantic import BaseModel
from datetime import timedelta

router = APIRouter()

class AuthRequest(BaseModel):
    """Requête d'authentification"""
    username: str
    password: str
    event_id: str = "temp"  # Optionnel, sera défini au Kiosk/Dashboard

class TokenResponse(BaseModel):
    """Réponse avec le token"""
    access_token: str
    token_type: str
    expires_in_minutes: int

# Credentials de test (à remplacer par une vraie base de données)
VALID_CREDENTIALS = {
    "photographer": "photo123",
    "admin": "admin123"
}

@router.post("/login", response_model=TokenResponse)
async def login(auth_request: AuthRequest):
    """
    Obtenir un token JWT
    
    - username: 'photographer' ou 'admin'
    - password: 'photo123' ou 'admin123'
    - event_id: ID de l'événement
    """
    # Vérifier les credentials
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
    
    # Créer le token
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
        expires_in_minutes=480  # 8 heures
    )

@router.get("/verify")
async def verify_token(access_token: str):
    """
    Vérifier qu'un token est valide
    """
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
