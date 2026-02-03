"""
Schémas Pydantic pour les événements
"""
from __future__ import annotations

import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class EventBase(BaseModel):
    """Base commune pour événements"""
    name: str = Field(..., min_length=3, max_length=255, description="Nom de l'événement")
    date: datetime.date = Field(..., description="Date de l'événement")
    photographer_id: Optional[int] = Field(None, description="ID du photographe")


class EventCreate(EventBase):
    """Schéma pour créer un événement"""
    pass


class EventUpdate(BaseModel):
    """Schéma pour mettre à jour un événement"""
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    date: Optional[datetime.date] = None
    photographer_id: Optional[int] = None


class EventResponse(EventBase):
    """Schéma de réponse pour un événement"""
    id: int
    code: str = Field(..., description="Code unique de l'événement")
    created_at: datetime.datetime
    updated_at: datetime.datetime
    
    model_config = ConfigDict(from_attributes=True)


class EventListResponse(BaseModel):
    """Schéma pour liste d'événements"""
    events: list[EventResponse]
    total: int
    page: int
    page_size: int
