from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
import logging
from ..database import get_db, get_mongodb
from sqlalchemy.orm import Session

router = APIRouter(tags=["shares"])

logger = logging.getLogger(__name__)

async def get_mongo_db():
    return get_mongodb()

class ShareRequest(BaseModel):
    event_id: int
    face_id: str
    selected_photo_ids: list[str]

class ShareResponse(BaseModel):
    share_code: str
    id: str
    expires_at: str

@router.post("", response_model=ShareResponse)
async def create_share(request: ShareRequest):
    """
    Créer un partage unique pour un client
    Génère un QR code avec un lien de partage 48h
    """
    try:
        mongo_db = get_mongodb()
        photos_collection = mongo_db["photos"]
        shares_collection = mongo_db["shares"]
        
        logger.info(f"Création partage pour event_id={request.event_id}, {len(request.selected_photo_ids)} photos")
        logger.info(f"Photo IDs reçus: {request.selected_photo_ids}")
        
        # Valider et convertir les ObjectIds
        object_ids = []
        for pid in request.selected_photo_ids:
            try:
                # Si c'est déjà un string hex valide (24 chars), le convertir en ObjectId
                if isinstance(pid, str) and len(pid) == 24:
                    try:
                        oid = ObjectId(pid)
                        object_ids.append(oid)
                        logger.debug(f"Converti '{pid}' en ObjectId")
                    except Exception as e:
                        logger.error(f"ObjectId conversion error pour '{pid}': {str(e)}")
                        raise HTTPException(status_code=400, detail=f"ID de photo invalide: {pid}")
                else:
                    logger.error(f"Photo ID invalide (format): {pid} (type: {type(pid).__name__}, len: {len(pid) if isinstance(pid, str) else 'N/A'})")
                    raise HTTPException(status_code=400, detail=f"ID de photo invalide: {pid}")
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Erreur validation photo ID '{pid}': {str(e)}")
                raise HTTPException(status_code=400, detail=f"ID de photo invalide: {pid}")
        
        logger.info(f"ObjectIds convertis: {object_ids}")
        
        # Vérifier que les photos existent et appartiennent à cet événement
        query = {
            "_id": {"$in": object_ids},
            "event_id": request.event_id
        }
        logger.debug(f"MongoDB query: {query}")
        
        photos = list(photos_collection.find(query))
        
        logger.info(f"Photos trouvées: {len(photos)} sur {len(object_ids)} demandées")
        
        if len(photos) != len(object_ids):
            missing = len(object_ids) - len(photos)
            logger.warning(f"{missing} photos manquantes ou n'appartenant pas à l'événement")
            raise HTTPException(
                status_code=400, 
                detail=f"Certaines photos n'existent pas ou n'appartiennent pas à cet événement. Trouvées: {len(photos)}/{len(object_ids)}"
            )

        # Créer le partage avec un code unique (format: XXX-XXX-XXX pour QR)
        share_code = str(uuid.uuid4())[:8].upper()
        
        share_data = {
            "share_code": share_code,
            "event_id": request.event_id,
            "face_id": request.face_id,
            "selected_photo_ids": object_ids,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=48),
            "downloads_count": 0,
            "is_expired": False
        }

        logger.debug(f"Share data à insérer: {share_data}")
        result = shares_collection.insert_one(share_data)
        
        logger.info(f"Partage créé: {share_code} (ID: {result.inserted_id})")
        
        return ShareResponse(
            share_code=share_code,
            id=str(result.inserted_id),
            expires_at=share_data["expires_at"].isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur création partage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@router.get("/{share_code}")
async def get_share(share_code: str):
    """
    Récupérer les photos d'un partage (page publique)
    """
    try:
        mongo_db = get_mongodb()
        shares_collection = mongo_db["shares"]
        photos_collection = mongo_db["photos"]
        
        share = shares_collection.find_one({"share_code": share_code})
        
        if not share:
            raise HTTPException(status_code=404, detail="Code de partage invalide")
        
        # Vérifier l'expiration
        if datetime.utcnow() > share["expires_at"]:
            raise HTTPException(status_code=410, detail="Ce partage a expiré (48h max)")
        
        # Récupérer les photos
        photos = list(photos_collection.find({
            "_id": {"$in": share.get("selected_photo_ids", [])}
        }))
        
        photos_list = []
        for photo in photos:
            photos_list.append({
                "_id": str(photo["_id"]),
                "filename": photo.get("filename", ""),
                "file_size": photo.get("file_size", 0),
                "original_size": photo.get("original_size", 0),
                "created_at": photo.get("created_at", "").isoformat() if isinstance(photo.get("created_at"), datetime) else ""
            })
        
        logger.info(f"Partage consulté: {share_code}, downloads: {share.get('downloads_count', 0)}")
        
        return {
            "share_code": share_code,
            "event_id": share["event_id"],
            "face_id": share["face_id"],
            "selected_photos": photos_list,
            "created_at": share.get("created_at", "").isoformat() if isinstance(share.get("created_at"), datetime) else "",
            "expires_at": share["expires_at"].isoformat(),
            "downloads_count": share.get("downloads_count", 0),
            "time_remaining_hours": round((share["expires_at"] - datetime.utcnow()).total_seconds() / 3600, 1)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur récupération partage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@router.get("")
async def list_shares(event_id: int = Query(None), limit: int = Query(50, ge=1, le=100)):
    """
    Lister les partages d'un événement (admin)
    """
    try:
        mongo_db = get_mongodb()
        shares_collection = mongo_db["shares"]
        
        query = {}
        if event_id:
            query["event_id"] = event_id
        
        shares = list(shares_collection.find(query).limit(limit).sort("created_at", -1))
        
        return {
            "shares": [
                {
                    "_id": str(share["_id"]),
                    "share_code": share["share_code"],
                    "event_id": share["event_id"],
                    "created_at": share.get("created_at", "").isoformat() if isinstance(share.get("created_at"), datetime) else "",
                    "expires_at": share["expires_at"].isoformat(),
                    "is_expired": datetime.utcnow() > share["expires_at"],
                    "photos_count": len(share.get("selected_photo_ids", [])),
                    "downloads_count": share.get("downloads_count", 0)
                }
                for share in shares
            ]
        }
    except Exception as e:
        logger.error(f"Erreur listing partages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@router.delete("/{share_code}")
async def delete_share(share_code: str):
    """
    Supprimer un partage
    """
    try:
        mongo_db = get_mongodb()
        shares_collection = mongo_db["shares"]
        
        result = shares_collection.delete_one({"share_code": share_code})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Partage non trouvé")
        
        logger.info(f"Partage supprimé: {share_code}")
        
        return {"message": "Partage supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur suppression partage: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@router.post("/{share_code}/track-download")
async def track_download(share_code: str, photo_id: str = Query(...)):
    """
    Enregistrer un téléchargement de photo pour un partage
    """
    try:
        mongo_db = get_mongodb()
        shares_collection = mongo_db["shares"]
        
        # Incrémenter le compteur de téléchargement
        result = shares_collection.update_one(
            {"share_code": share_code},
            {"$inc": {"downloads_count": 1}}
        )
        
        if result.matched_count == 0:
            logger.warning(f"Partage non trouvé pour track-download: {share_code}")
            # Ne pas rater l'erreur, juste log
        else:
            logger.info(f"Download tracké pour {share_code}, photo: {photo_id}")
        
        return {"success": True, "message": "Téléchargement enregistré"}
    except Exception as e:
        logger.error(f"Erreur track-download: {str(e)}")
        # Ne pas bloquer le téléchargement si le tracking échoue
        return {"success": False, "message": "Tracking échoué (mais fichier téléchargé)"}
