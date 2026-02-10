"""
Routes API publiques - Accessible sans authentification
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.models.database_models import Event, EventStatus
from datetime import datetime

router = APIRouter(tags=["public"])

# ==================== SCHEMAS ====================

class PublicEventResponse(BaseModel):
    id: int
    code: str
    name: str
    date: datetime
    location: str
    status: str
    total_photos: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# ==================== ROUTES PUBLIQUES ====================

@router.get("/events", response_model=dict)
async def list_public_events(db: Session = Depends(get_db)):
    """
    Lister tous les événements publics (ACTIVE et READY)
    Accessible sans authentification
    """
    try:
        # Seulement les événements activés et prêts
        events = db.query(Event).filter(
            Event.status.in_([EventStatus.ACTIVE, EventStatus.READY])
        ).order_by(Event.created_at.desc()).all()
        
        return {
            "success": True,
            "events": events
        }
    except Exception as e:
        return {
            "success": False,
            "events": [],
            "error": str(e)
        }

@router.get("/events/{event_code}")
async def get_public_event(event_code: str, db: Session = Depends(get_db)):
    """
    Récupérer un événement par code
    """
    try:
        event = db.query(Event).filter(Event.code == event_code).first()
        
        if not event:
            return {
                "success": False,
                "error": "Événement non trouvé"
            }
        
        return {
            "success": True,
            "event": event
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }
