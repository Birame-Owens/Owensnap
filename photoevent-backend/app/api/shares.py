from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
from bson import ObjectId
import uuid
from ..database import mongo_db

router = APIRouter(tags=["shares"])

# Collections
photos_collection = mongo_db["photos"]
faces_collection = mongo_db["faces"]
events_collection = mongo_db["events"]
shares_collection = mongo_db["shares"]

class ShareRequest(BaseModel):
    event_id: int | str
    face_id: str
    selected_photo_ids: list[str]

@router.post("")
async def create_share(request: ShareRequest):
    """
    Créer un partage unique pour un client
    """
    try:
        # Vérifier que l'événement existe
        event = events_collection.find_one({"_id": ObjectId(request.event_id)})
        if not event:
            raise HTTPException(status_code=404, detail="Événement non trouvé")

        # Vérifier que les photos existent et appartiennent à cet événement
        photos = photos_collection.find({
            "_id": {"$in": [ObjectId(pid) for pid in request.selected_photo_ids]},
            "event_id": int(request.event_id)
        })
        
        photos_list = list(photos)
        if len(photos_list) != len(selected_photo_ids):
            raise HTTPException(status_code=400, detail="Certaines photos n'existent pas")

        # Créer le partage avec un code unique
        share_code = str(uuid.uuid4())[:8].upper()
        
        share_data = {
            "share_code": share_code,
            "event_id": int(request.event_id),
            "face_id": request.face_id,
            "selected_photo_ids": [ObjectId(pid) for pid in request.selected_photo_ids],
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(hours=48),  # 48h expiration
            "downloads_count": 0,
            "is_expired": False
        }

        result = shares_collection.insert_one(share_data)
        
        return {
            "share_code": share_code,
            "id": str(result.inserted_id),
            "expires_at": share_data["expires_at"].isoformat()
        }
    except Exception as e:
        print(f"Erreur création partage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{share_code}")
async def get_share(share_code: str):
    """
    Récupérer les photos d'un partage
    """
    try:
        share = shares_collection.find_one({"share_code": share_code})
        
        if not share:
            raise HTTPException(status_code=404, detail="Code de partage invalide")
        
        # Vérifier l'expiration
        if datetime.utcnow() > share["expires_at"]:
            raise HTTPException(status_code=410, detail="Ce partage a expiré")
        
        # Récupérer les photos
        photos = photos_collection.find({
            "_id": {"$in": share["selected_photo_ids"]}
        })
        
        photos_list = []
        for photo in photos:
            photos_list.append({
                "_id": str(photo["_id"]),
                "filename": photo.get("filename", ""),
                "file_size": photo.get("file_size", 0),
                "original_size": photo.get("original_size", 0),
                "created_at": photo.get("created_at", "").isoformat() if isinstance(photo.get("created_at"), datetime) else ""
            })
        
        # Incrémenter le compteur de téléchargements
        shares_collection.update_one(
            {"_id": share["_id"]},
            {"$inc": {"downloads_count": 1}}
        )
        
        return {
            "share_code": share_code,
            "event_id": share["event_id"],
            "face_id": share["face_id"],
            "selected_photos": photos_list,
            "created_at": share["created_at"].isoformat(),
            "expires_at": share["expires_at"].isoformat(),
            "downloads_count": share["downloads_count"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur récupération partage: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("")
async def list_shares(
    event_id: str = Query(None),
    limit: int = Query(50, ge=1, le=100)
):
    """
    Lister les partages (admin)
    """
    try:
        query = {}
        if event_id:
            query["event_id"] = int(event_id)
        
        shares = list(shares_collection.find(query).limit(limit).sort("created_at", -1))
        
        return {
            "shares": [
                {
                    "_id": str(share["_id"]),
                    "share_code": share["share_code"],
                    "event_id": share["event_id"],
                    "created_at": share["created_at"].isoformat(),
                    "expires_at": share["expires_at"].isoformat(),
                    "is_expired": datetime.utcnow() > share["expires_at"],
                    "photos_count": len(share.get("selected_photo_ids", [])),
                    "downloads_count": share.get("downloads_count", 0)
                }
                for share in shares
            ]
        }
    except Exception as e:
        print(f"Erreur listing partages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{share_code}")
async def delete_share(share_code: str):
    """
    Supprimer un partage (admin)
    """
    try:
        result = shares_collection.delete_one({"share_code": share_code})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Partage non trouvé")
        
        return {"message": "Partage supprimé"}
    except Exception as e:
        print(f"Erreur suppression partage: {e}")
        raise HTTPException(status_code=500, detail=str(e))
