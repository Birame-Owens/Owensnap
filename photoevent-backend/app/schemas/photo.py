"""
Schémas Pydantic pour les photos
"""
from __future__ import annotations

import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class PhotoUploadResponse(BaseModel):
    """Réponse après upload d'une photo"""
    photo_id: str = Field(..., description="ID MongoDB de la photo")
    filename: str
    event_id: int
    status: str = Field(..., description="Status: 'pending', 'processing', 'ready', 'error'")
    uploaded_at: datetime.datetime


class FaceDetectionResponse(BaseModel):
    """Résultat de détection de visages"""
    photo_id: str
    faces_count: int
    faces: list[dict] = Field(..., description="Liste des embeddings et bounding boxes")


class FaceSearchRequest(BaseModel):
    """Requête de recherche faciale"""
    event_id: int = Field(..., description="ID de l'événement")
    face_image: str = Field(..., description="Image du visage en base64")
    threshold: float = Field(0.6, ge=0.0, le=1.0, description="Seuil de similarité")


class FaceSearchResponse(BaseModel):
    """Résultat de recherche faciale"""
    event_id: int
    matches: list[dict] = Field(..., description="Photos correspondantes avec scores")
    total_matches: int
    threshold_used: float
