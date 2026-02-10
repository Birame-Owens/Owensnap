"""
Routes API pour la gestion des événements
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc
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
    event = db.query(Event).filter(Event.code == event_code).first()
    
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


@router.get("/admin/stats")
async def get_admin_stats(db: Session = Depends(get_db)):
    """Récupérer les statistiques globales pour le dashboard admin"""
    mongo_db = get_mongodb()
    
    # Compter les événements
    total_events = db.query(Event).count()
    
    # Récupérer le compte de photos et de faces depuis MongoDB
    photos_collection = mongo_db.photos
    faces_collection = mongo_db.faces
    
    total_photos = photos_collection.count_documents({})
    total_faces = faces_collection.count_documents({})
    
    # Calculer le stockage estimé (chaque photo ~1.5 MB)
    estimated_storage_mb = total_photos * 1.5
    
    # Récupérer le nombre de photos uploadées aujourd'hui
    from datetime import datetime, timedelta
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_photos = photos_collection.count_documents({
        "uploaded_at": {"$gte": today_start}
    })
    
    # Récupérer les événements récents
    recent_events = db.query(Event).order_by(desc(Event.date)).limit(5).all()
    
    # Pour chaque événement, compter les photos
    events_data = []
    for event in recent_events:
        photo_count = photos_collection.count_documents({"event_id": event.id})
        face_count = faces_collection.count_documents({"event_id": event.id})
        events_data.append({
            "id": event.id,
            "name": event.name,
            "code": event.code,
            "date": event.date.isoformat(),
            "photo_count": photo_count,
            "faces_count": face_count
        })
    
    return {
        "total_events": total_events,
        "total_photos": total_photos,
        "total_faces": total_faces,
        "estimated_storage_mb": round(estimated_storage_mb, 2),
        "today_photos": today_photos,
        "recent_events": events_data
    }
