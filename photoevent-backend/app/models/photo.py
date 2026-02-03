"""
Modèles de données - Photos
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum


class PhotoStatus(str, Enum):
    """Statut traitement photo"""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class FaceEmbedding(BaseModel):
    """Embedding d'un visage détecté"""
    embedding: List[float] = Field(..., description="Vecteur embedding (128D)")
    bbox: List[int] = Field(..., description="Bounding box [x, y, w, h]")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Score confiance")


class PhotoMetadata(BaseModel):
    """Métadonnées EXIF photo"""
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    datetime_original: Optional[datetime] = None
    iso: Optional[int] = None
    focal_length: Optional[str] = None
    aperture: Optional[str] = None


class PhotoBase(BaseModel):
    """Base commune photos"""
    event_id: str = Field(..., description="ID événement")
    filename: str = Field(..., description="Nom fichier original")


class PhotoCreate(PhotoBase):
    """Création photo"""
    pass


class Photo(PhotoBase):
    """Photo complète"""
    id: str = Field(..., description="ID photo")
    status: PhotoStatus = Field(default=PhotoStatus.PENDING)
    
    # URLs stockage
    original_url: str = Field(..., description="URL photo originale")
    thumbnail_url: Optional[str] = Field(None, description="URL miniature")
    
    # Métadonnées
    file_size: int = Field(..., description="Taille fichier (bytes)")
    width: Optional[int] = Field(None, description="Largeur image")
    height: Optional[int] = Field(None, description="Hauteur image")
    metadata: Optional[PhotoMetadata] = None
    
    # Reconnaissance faciale
    faces_count: int = Field(default=0, description="Nombre visages détectés")
    faces: List[FaceEmbedding] = Field(default_factory=list)
    
    # Traitement
    processing_time: Optional[float] = Field(None, description="Temps traitement (s)")
    error_message: Optional[str] = Field(None, description="Message erreur")
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "photo_abc123",
                "event_id": "evt_xyz789",
                "filename": "IMG_0001.jpg",
                "status": "ready",
                "original_url": "https://s3.../photos/evt_xyz789/IMG_0001.jpg",
                "thumbnail_url": "https://s3.../thumbs/evt_xyz789/IMG_0001_thumb.jpg",
                "file_size": 2048000,
                "width": 4000,
                "height": 3000,
                "faces_count": 3
            }
        }


class FaceSearchRequest(BaseModel):
    """Requête recherche faciale"""
    event_id: str = Field(..., description="ID événement")
    face_image: str = Field(..., description="Image visage (base64 ou URL)")
    threshold: float = Field(default=0.6, ge=0.0, le=1.0, description="Seuil similarité")
    max_results: int = Field(default=100, ge=1, le=500, description="Nombre max résultats")


class FaceSearchResult(BaseModel):
    """Résultat recherche faciale"""
    photo_id: str = Field(..., description="ID photo")
    similarity: float = Field(..., ge=0.0, le=1.0, description="Score similarité")
    thumbnail_url: str = Field(..., description="URL miniature")
    
    class Config:
        json_schema_extra = {
            "example": {
                "photo_id": "photo_abc123",
                "similarity": 0.87,
                "thumbnail_url": "https://s3.../thumbs/IMG_0001_thumb.jpg"
            }
        }
