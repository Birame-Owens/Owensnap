"""
Routes API pour les photos
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends, Form
from typing import List
from sqlalchemy.orm import Session
import os
from pathlib import Path
from datetime import datetime
from bson.objectid import ObjectId
from app.database import get_db, get_mongodb
from app.schemas import PhotoUploadResponse
from app.db.models import Event
from app.services.face_recognition import get_face_service
from PIL import Image
import io

router = APIRouter()

# Répertoire de stockage local (temporaire avant S3)
UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Configuration de compression
COMPRESSION_QUALITY = 85  # 1-100: qualité JPEG
MAX_WIDTH = 2048  # Largeur max en pixels
MAX_HEIGHT = 2048  # Hauteur max en pixels


def compress_image(file_content: bytes, quality: int = COMPRESSION_QUALITY) -> bytes:
    """Compresser une image pour réduire l'espace disque"""
    try:
        # Ouvrir l'image
        img = Image.open(io.BytesIO(file_content))
        
        # Redimensionner si nécessaire
        if img.width > MAX_WIDTH or img.height > MAX_HEIGHT:
            img.thumbnail((MAX_WIDTH, MAX_HEIGHT), Image.Resampling.LANCZOS)
        
        # Convertir RGBA en RGB si nécessaire
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Compresser et sauvegarder en JPEG
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"Erreur compression image: {e}")
        return file_content  # Retourner l'original si erreur



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
        
        # Lire et compresser le fichier
        original_content = await file.read()
        compressed_content = compress_image(original_content)
        
        # Calculer la économie d'espace
        compression_ratio = len(compressed_content) / len(original_content) if original_content else 1
        saved_mb = (len(original_content) - len(compressed_content)) / (1024 * 1024)
        
        # Sauvegarder le fichier compressé localement
        with open(file_path, "wb") as buffer:
            buffer.write(compressed_content)
        
        # Créer le document MongoDB
        # IMPORTANT: Sauvegarder le chemin relatif, pas le chemin absolu
        photo_doc = {
            "event_id": event_id,
            "filename": unique_filename,
            "original_filename": file.filename,
            "file_path": "uploads/photos/" + unique_filename,  # Chemin relatif
            "status": "pending",  # pending -> processing -> ready
            "uploaded_at": datetime.now(),
            "file_size": len(compressed_content),
            "original_size": len(original_content),
            "compression_ratio": round(compression_ratio, 2),
            "storage_saved_mb": round(saved_mb, 2)
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
    """Récupérer toutes les photos d'un événement (avec vérification de fichier et faces_count)"""
    
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    mongo_db = get_mongodb()
    photos_from_db = list(mongo_db.photos.find({"event_id": event_id}))
    faces_collection = mongo_db.faces
    
    # Vérifier que les fichiers existent réellement
    valid_photos = []
    for photo in photos_from_db:
        photo_id = photo["_id"]
        photo["_id"] = str(photo["_id"])
        file_path_str = photo.get("file_path", "")
        
        # Convertir en Path et rendre absolu si nécessaire
        file_path = Path(file_path_str)
        if not file_path.is_absolute():
            # Si c'est un chemin relatif, le rendre absolu depuis le répertoire courant
            file_path = Path.cwd() / file_path
        
        # Vérifier si le fichier existe
        if file_path.exists():
            photo["file_exists"] = True
        else:
            photo["file_exists"] = False
        
        # Compter les faces détectées pour cette photo
        faces_count = faces_collection.count_documents({"photo_id": photo_id})
        photo["faces_detected"] = faces_count
        
        valid_photos.append(photo)
    
    # Compter le total de faces
    total_faces = faces_collection.count_documents({"event_id": event_id})
    
    return {
        "event_id": event_id,
        "event_code": event.code,
        "photos": valid_photos,
        "total": len(photos_from_db),
        "valid": len([p for p in valid_photos if p.get("file_exists", False)]),
        "total_faces": total_faces
    }



@router.get("/event/{event_id}/verify")
async def verify_event_photos(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Vérifier l'intégrité des photos d'un événement"""
    
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    mongo_db = get_mongodb()
    photos_from_db = list(mongo_db.photos.find({"event_id": event_id}))
    
    missing_files = []
    valid_files = []
    
    for photo in photos_from_db:
        file_path_str = photo.get("file_path", "")
        filename = photo.get("filename", "")
        
        # Convertir en Path et rendre absolu si nécessaire
        file_path = Path(file_path_str)
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path
        
        if file_path.exists():
            valid_files.append({
                "id": str(photo.get("_id")),
                "filename": filename,
                "status": "OK"
            })
        else:
            missing_files.append({
                "id": str(photo.get("_id")),
                "filename": filename,
                "expected_path": str(file_path),
                "status": "MISSING"
            })
    
    return {
        "event_id": event_id,
        "event_code": event.code,
        "total_in_db": len(photos_from_db),
        "valid_files": len(valid_files),
        "missing_files": len(missing_files),
        "missing": missing_files
    }


@router.post("/event/{event_id}/cleanup-missing")
async def cleanup_missing_photos(
    event_id: int,
    db: Session = Depends(get_db)
):
    """Supprimer les photos manquantes de la base de données"""
    
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {event_id} non trouvé"
        )
    
    mongo_db = get_mongodb()
    photos_from_db = list(mongo_db.photos.find({"event_id": event_id}))
    
    deleted_count = 0
    deleted_files = []
    
    for photo in photos_from_db:
        file_path_str = photo.get("file_path", "")
        
        # Convertir en Path et rendre absolu si nécessaire
        file_path = Path(file_path_str)
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path
        
        # Si le fichier n'existe pas, supprimer l'enregistrement
        if not file_path.exists():
            result = mongo_db.photos.delete_one({"_id": photo["_id"]})
            if result.deleted_count > 0:
                deleted_count += 1
                deleted_files.append(photo.get("filename", "unknown"))
    
    return {
        "event_id": event_id,
        "deleted_count": deleted_count,
        "deleted_files": deleted_files,
        "message": f"{deleted_count} photo(s) orpheline(s) supprimée(s)"
    }


@router.post("/migrate-paths")
async def migrate_file_paths(db: Session = Depends(get_db)):
    """Migrer tous les chemins absolus vers des chemins relatifs (une seule fois)"""
    
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    
    # Trouver toutes les photos avec des chemins qui commencent par / ou C:
    all_photos = list(photos_collection.find({}))
    
    migrated_count = 0
    
    for photo in all_photos:
        file_path_str = photo.get("file_path", "")
        
        # Si c'est un chemin absolu (commence par / ou C: ou autre disque)
        if file_path_str and (file_path_str.startswith('/') or ':' in file_path_str):
            # Extraire le nom du fichier et reconstruire le chemin relatif
            filename = photo.get("filename", "")
            new_path = f"uploads/photos/{filename}"
            
            # Mettre à jour
            photos_collection.update_one(
                {"_id": photo["_id"]},
                {"$set": {"file_path": new_path}}
            )
            migrated_count += 1
    
    return {
        "migrated_count": migrated_count,
        "message": f"{migrated_count} chemin(s) converti(s) en chemin(s) relatif(s)"
    }


@router.delete("/{photo_id}")
async def delete_photo(photo_id: str, db: Session = Depends(get_db)):
    """Supprimer une photo par son ID MongoDB"""
    try:
        # Convertir l'ID en ObjectId MongoDB
        mongo_id = ObjectId(photo_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ID de photo invalide: {str(e)}"
        )
    
    mongo_db = get_mongodb()
    photos_collection = mongo_db.photos
    
    # Trouver la photo
    photo = photos_collection.find_one({"_id": mongo_id})
    if not photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Photo {photo_id} non trouvée"
        )
    
    # Supprimer le fichier physique s'il existe
    file_path_str = photo.get("file_path", "")
    if file_path_str:
        file_path = Path(file_path_str)
        if not file_path.is_absolute():
            file_path = Path.cwd() / file_path
        
        try:
            if file_path.exists():
                file_path.unlink()
        except Exception as e:
            print(f"Erreur suppression fichier {file_path}: {e}")
    
    # Supprimer la photo de MongoDB
    result = photos_collection.delete_one({"_id": mongo_id})
    
    # Supprimer les faces associées
    faces_collection = mongo_db.faces
    faces_collection.delete_many({"photo_id": mongo_id})
    
    return {
        "photo_id": photo_id,
        "deleted": result.deleted_count > 0,
        "message": "Photo supprimée avec succès"
    }
