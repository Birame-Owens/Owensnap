"""
Modèles de données - Événements
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class EventStatus(str, Enum):
    """Statut d'un événement"""
    DRAFT = "draft"
    PROCESSING = "processing"
    READY = "ready"
    ARCHIVED = "archived"


class EventBase(BaseModel):
    """Base commune pour événements"""
    name: str = Field(..., min_length=3, max_length=100, description="Nom événement")
    date: datetime = Field(..., description="Date événement")
    location: Optional[str] = Field(None, max_length=200, description="Lieu")
    description: Optional[str] = Field(None, max_length=500, description="Description")


class EventCreate(EventBase):
    """Création événement"""
    pass


class EventUpdate(BaseModel):
    """Mise à jour événement"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    date: Optional[datetime] = None
    location: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[EventStatus] = None


class Event(EventBase):
    """Événement complet"""
    id: str = Field(..., description="ID événement")
    code: str = Field(..., description="Code unique événement")
    status: EventStatus = Field(default=EventStatus.DRAFT)
    photographer_id: str = Field(..., description="ID photographe")
    
    # Statistiques
    total_photos: int = Field(default=0)
    photos_processed: int = Field(default=0)
    total_faces: int = Field(default=0)
    kiosk_sessions: int = Field(default=0)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "evt_abc123",
                "code": "EVT2512A",
                "name": "Mariage Fatou & Mamadou",
                "date": "2025-12-25T14:00:00Z",
                "location": "Dakar, Sénégal",
                "status": "ready",
                "photographer_id": "phot_xyz789",
                "total_photos": 200,
                "photos_processed": 200,
                "total_faces": 456
            }
        }
