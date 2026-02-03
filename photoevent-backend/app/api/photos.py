"""
Routes API pour les photos
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from typing import List
from sqlalchemy.orm import Session
import os
from pathlib import Path
from datetime import datetime
from app.database import get_db, get_mongodb
from app.schemas import PhotoUploadResponse
from app.db.models import Event
from app.services.face_recognition import get_face_service

router = APIRouter()

# Répertoire de stockage local (temporaire avant S3)
UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload", response_model=List[PhotoUploadResponse])
async def upload_photos(
    event_id: int = Form(..., description="ID de l'événement"),
    files: List[UploadFile] = File(..., description="Photos à uploader"),
    db: Session = Depends(get_db)
):
    """Upload multiple photos pour un événement"""
    
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    # Vérifier le nombre de fichiers
    if len(files) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 photos par upload"
        )
    
    uploaded_photos = []
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    
    for file in files:
        # Vérifier l'extension
        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            continue
        
        # Générer un nom unique
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_filename = f"{event.code}_{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Sauvegarder le fichier localement
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Créer le document MongoDB
        photo_doc = {
            "event_id": event_id,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": str(file_path),
            "status": "pending",  # pending -> processing -> ready
            "uploaded_at": datetime.now(),
            "file_size": len(content)
        }
        
        result = photos_collection.insert_one(photo_doc)
        photo_doc["_id"] = str(result.inserted_id)
        
        # Traiter les visages immédiatement
        try:
            face_service = get_face_service()
            faces = face_service.extract_faces_from_image(str(file_path))
            
            # Sauvegarder chaque visage dans MongoDB
            faces_collection = mongo_db.faces
            for face in faces:
                face_doc = {
                    "photo_id": result.inserted_id,
                    "event_id": event_id,
                    "embedding": face['embedding'],
                    "bbox": face['bbox'],
                    "confidence": face['confidence'],
                    "created_at": datetime.now()
                }
                faces_collection.insert_one(face_doc)
            
            # Mettre à jour le statut de la photo
            photos_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"status": "ready", "faces_count": len(faces)}}
            )
            
        except Exception as e:
            print(f"Erreur traitement visages pour {unique_filename}: {e}")
            photos_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"status": "error"}}
            )
        
        uploaded_photos.append(PhotoUploadResponse(
            photo_id=str(result.inserted_id),
            filename=unique_filename,
            event_id=event_id,
            status="ready",
            uploaded_at=datetime.now()
        ))
    
    if not uploaded_photos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucune photo valide uploadée"
        )
    
    return uploaded_photos


@router.get("/event/{event_id}")
async def get_event_photos(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Récupérer toutes les photos d'un événement"""
    
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    mongo_db = get_mongodb()
    photos = list(mongo_db.photos.find({"event_id": event_id}))
    
    # Convertir ObjectId en string
    for photo in photos:
        photo["_id"] = str(photo["_id"])
    
    return {
        "event_id": event_id,
        "event_code": event.code,
        "photos": photos,
        "total": len(photos)
    }
