"""
Routes API pour la gestion des événements
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from app.schemas import EventCreate, EventUpdate, EventResponse, EventListResponse
from app.db.models import Event
from app.database import get_db, get_mongodb
import secrets
import string

router = APIRouter()


def generate_event_code() -> str:
    """Génère un code événement unique (8 caractères alphanumériques)"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(8))


@router.post("/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """Créer un nouveau événement"""
    # Générer un code unique
    while True:
        code = generate_event_code()
        existing = db.query(Event).filter(Event.code == code).first()
        if not existing:
            break
    
    # Créer l'événement
    db_event = Event(
        code=code,
        name=event.name,
        date=event.date,
        photographer_id=event.photographer_id
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event


@router.get("/", response_model=EventListResponse)
async def list_events(
    page: int = Query(1, ge=1, description="Numéro de page"),
    page_size: int = Query(20, ge=1, le=100, description="Taille de page"),
    db: Session = Depends(get_db)
):
    """Lister tous les événements (paginé) avec comptes de photos et faces"""
    # Compter le total
    total = db.query(Event).count()
    
    # Récupérer la page
    offset = (page - 1) * page_size
    events = db.query(Event).order_by(desc(Event.date)).offset(offset).limit(page_size).all()
    
    # Enrichir avec comptes de photos et faces
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    faces_collection = mongo_db.faces
    
    for event in events:
        event.photo_count = photos_collection.count_documents({"event_id": event.id})
        event.faces_count = faces_collection.count_documents({"event_id": event.id})
    
    return EventListResponse(
        events=events,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: int, db: Session = Depends(get_db)):
    """Récupérer un événement par ID"""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    return event


@router.get("/code/{event_code}", response_model=EventResponse)
async def get_event_by_code(event_code: str, db: Session = Depends(get_db)):
    """Récupérer un événement par code"""
    # Normaliser le code en majuscules
    code_normalized = event_code.upper().strip()
    event = db.query(Event).filter(Event.code == code_normalized).first()
    
    if not event:
        # Fallback: chercher avec insensibilité à la casse en base de données
        event = db.query(Event).filter(
            func.upper(Event.code) == code_normalized
        ).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement avec code {event_code} non trouvé"
        )
    
    return event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(event_id: int, event_update: EventUpdate, db: Session = Depends(get_db)):
    """Mettre à jour un événement"""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    # Mettre à jour les champs fournis
    update_data = event_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(event, field, value)
    
    db.commit()
    db.refresh(event)
    
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(event_id: int, db: Session = Depends(get_db)):
    """Supprimer un événement"""
    event = db.query(Event).filter(Event.id == event_id).first()
    
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    db.delete(event)
    db.commit()

