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


@router.get("/admin/stats", tags=["admin"])
async def get_admin_stats(db: Session = Depends(get_db)):
    """
    Statistiques d'administration pour le dashboard
    Retourne les comptes globaux et les événements récents
    """
    mongo_db = get_mongodb()
    
    # Comptes PostgreSQL
    total_events = db.query(func.count(Event.id)).scalar() or 0
    
    # Comptes MongoDB
    photos_collection = mongo_db.photos
    faces_collection = mongo_db.faces
    shares_collection = mongo_db.shares
    
    total_photos = photos_collection.count_documents({})
    total_faces = faces_collection.count_documents({})
    total_shares = shares_collection.count_documents({})
    total_downloads = 0
    
    # Calculer l'espace total utilisé (en MB) et les téléchargements
    total_storage_mb = 0
    all_photos = list(photos_collection.find({}, {"file_size": 1}))
    for photo in all_photos:
        total_storage_mb += photo.get("file_size", 0)
    total_storage_mb = round(total_storage_mb / (1024 * 1024), 2)
    
    # Compter les téléchargements totaux
    all_shares = list(shares_collection.find({}, {"downloads_count": 1}))
    for share in all_shares:
        total_downloads += share.get("downloads_count", 0)
    
    # Taille moyenne par photo
    avg_photo_size_mb = round(total_storage_mb / max(total_photos, 1), 2)
    
    # Récupérer les événements récents avec statistiques
    recent_events = db.query(Event).order_by(desc(Event.date)).limit(10).all()
    
    events_data = []
    for event in recent_events:
        event_photos = photos_collection.count_documents({"event_id": event.id})
        event_faces = faces_collection.count_documents({"event_id": event.id})
        event_shares = shares_collection.count_documents({"event_id": event.id})
        event_downloads = 0
        event_storage_mb = 0
        
        # Compter les téléchargements et l'espace utilisé pour cet événement
        event_shares_list = list(shares_collection.find({"event_id": event.id}, {"downloads_count": 1}))
        for share in event_shares_list:
            event_downloads += share.get("downloads_count", 0)
        
        # Calculer le stockage pour cet événement
        event_photos_list = list(photos_collection.find({"event_id": event.id}, {"file_size": 1}))
        for photo in event_photos_list:
            event_storage_mb += photo.get("file_size", 0)
        event_storage_mb = round(event_storage_mb / (1024 * 1024), 2)
        
        # Taille moyenne par photo dans cet événement
        event_avg_photo_size_mb = round(event_storage_mb / max(event_photos, 1), 2)
        
        events_data.append({
            "id": event.id,
            "code": event.code,
            "name": event.name,
            "date": event.date.isoformat() if event.date else None,
            "photo_count": event_photos,
            "faces_count": event_faces,
            "shares_count": event_shares,
            "downloads_count": event_downloads,
            "storage_mb": event_storage_mb,
            "avg_photo_size_mb": event_avg_photo_size_mb
        })
    
    return {
        "total_events": total_events,
        "total_photos": total_photos,
        "total_faces": total_faces,
        "total_storage_mb": total_storage_mb,
        "avg_photo_size_mb": avg_photo_size_mb,
        "total_shares": total_shares,
        "total_downloads": total_downloads,
        "recent_events": events_data
    }
