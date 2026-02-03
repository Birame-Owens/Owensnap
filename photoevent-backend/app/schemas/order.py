"""
Schémas Pydantic pour les commandes
"""
from __future__ import annotations

import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class OrderBase(BaseModel):
    """Base commune pour commandes"""
    event_id: int = Field(..., description="ID de l'événement")
    photo_ids: list[str] = Field(..., description="Liste des IDs MongoDB des photos")
    method: str = Field(..., description="Méthode: 'qr' ou 'print'")


class OrderCreate(OrderBase):
    """Schéma pour créer une commande"""
    expires_in_days: int = Field(7, ge=1, le=30, description="Expiration en jours")


class OrderResponse(OrderBase):
    """Schéma de réponse pour une commande"""
    id: int
    download_token: str = Field(..., description="Token unique de téléchargement")
    expires_at: datetime.datetime
    created_at: datetime.datetime
    
    model_config = ConfigDict(from_attributes=True)


class OrderDownloadResponse(BaseModel):
    """Schéma pour télécharger les photos d'une commande"""
    order_id: int
    photo_urls: list[str] = Field(..., description="URLs de téléchargement des photos")
    expires_at: datetime.datetime
    photos_count: int
