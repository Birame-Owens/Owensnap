"""
Module d'authentification JWT pour FastAPI
Sécurité de l'API avec tokens JWT
"""
from datetime import datetime, timedelta
from typing import Optional, NamedTuple
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from app.core.config import settings

class HTTPAuthCredentials(NamedTuple):
    """Credentials HTTP Bearer"""
    scheme: str
    credentials: str

# Configuration JWT
SECRET_KEY = getattr(settings, 'JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

class TokenData:
    """Données du token JWT"""
    def __init__(self, username: Optional[str] = None, event_id: Optional[str] = None):
        self.username = username
        self.event_id = event_id

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """
    Créer un token JWT
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def verify_token(credentials: HTTPAuthCredentials) -> TokenData:
    """
    Vérifier le token JWT
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        event_id: str = payload.get("event_id")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalide",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expiré ou invalide",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return TokenData(username=username, event_id=event_id)

async def get_current_user(token_data: TokenData = Depends(verify_token)):
    """
    Obtenir l'utilisateur courant à partir du token
    """
    if token_data.username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise"
        )
    return token_data
