"""
Routes API pour les commandes (QR codes et téléchargements)
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import secrets
from app.database import get_db, get_mongodb
from app.schemas import OrderCreate, OrderResponse, OrderDownloadResponse
from app.db.models import Order, Event
from bson import ObjectId

router = APIRouter()


def generate_download_token() -> str:
    """Générer un token de téléchargement unique"""
    return secrets.token_urlsafe(32)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db)
):
    """
    Créer une commande (QR code ou impression)
    
    - Génère un token unique
    - Associe les photos sélectionnées
    - Définit une date d'expiration
    """
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == order.event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {order.event_id} non trouvé"
        )
    
    # Vérifier que les photos existent
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    
    for photo_id in order.photo_ids:
        try:
            photo = photos_collection.find_one({"_id": ObjectId(photo_id)})
            if not photo:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Photo {photo_id} non trouvée"
                )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID photo invalide: {photo_id}"
            )
    
    # Générer le token
    download_token = generate_download_token()
    
    # Calculer l'expiration
    expires_at = datetime.now() + timedelta(days=order.expires_in_days)
    
    # Créer la commande
    db_order = Order(
        event_id=order.event_id,
        download_token=download_token,
        photo_ids=order.photo_ids,
        method=order.method,
        expires_at=expires_at
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    return db_order


@router.get("/{download_token}", response_model=OrderDownloadResponse)
async def get_order_by_token(
    download_token: str,
    db: Session = Depends(get_db)
):
    """
    Récupérer une commande par son token de téléchargement
    """
    order = db.query(Order).filter(Order.download_token == download_token).first()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commande non trouvée"
        )
    
    # Vérifier l'expiration
    if datetime.now() > order.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Ce lien de téléchargement a expiré"
        )
    
    # Récupérer les URLs des photos
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    
    photo_urls = []
    for photo_id in order.photo_ids:
        try:
            photo = photos_collection.find_one({"_id": ObjectId(photo_id)})
            if photo:
                # TODO: Générer URL S3 signée temporaire
                photo_urls.append(f"/photos/{photo_id}/download")
        except Exception:
            continue
    
    return OrderDownloadResponse(
        order_id=order.id,
        photo_urls=photo_urls,
        expires_at=order.expires_at,
        photos_count=len(photo_urls)
    )


@router.get("/", response_model=List[OrderResponse])
async def list_orders(
    event_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Lister les commandes (optionnellement filtrées par événement)
    """
    query = db.query(Order)
    
    if event_id:
        query = query.filter(Order.event_id == event_id)
    
    orders = query.order_by(Order.created_at.desc()).all()
    
    return orders
