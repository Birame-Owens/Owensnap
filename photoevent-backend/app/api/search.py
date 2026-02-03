"""
Routes API pour la recherche faciale
"""
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from app.database import get_db, get_mongodb
from app.schemas import FaceSearchRequest, FaceSearchResponse
from app.db.models import Event
from app.services.face_recognition import get_face_service
from bson import ObjectId

router = APIRouter()


@router.post("/face", response_model=FaceSearchResponse)
async def search_by_face(
    search_request: FaceSearchRequest,
    db: Session = Depends(get_db)
):
    """
    Rechercher des photos contenant un visage similaire
    
    - Prend une image en base64
    - Extrait l'embedding du visage
    - Compare avec tous les visages de l'événement
    - Retourne les photos correspondantes
    """
    # Vérifier que l'événement existe
    event = db.query(Event).filter(Event.id == search_request.event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Événement {search_request.event_id} non trouvé"
        )
    
    # Obtenir le service de reconnaissance
    try:
        face_service = get_face_service()
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    # Extraire l'embedding du visage recherché
    query_embedding = face_service.extract_face_from_base64(search_request.face_image)
    
    if query_embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun visage détecté dans l'image fournie"
        )
    
    # Récupérer tous les visages de l'événement depuis MongoDB
    mongo_db = get_mongodb()
    faces_collection = mongo_db.faces
    
    # Trouver toutes les faces de cet événement
    event_faces = list(faces_collection.find({"event_id": search_request.event_id}))
    
    if not event_faces:
        return FaceSearchResponse(
            event_id=search_request.event_id,
            matches=[],
            total_matches=0,
            threshold_used=search_request.threshold
        )
    
    # Préparer les données pour la recherche
    photos_embeddings = {}
    for face_doc in event_faces:
        photo_id = str(face_doc['photo_id'])
        if photo_id not in photos_embeddings:
            photos_embeddings[photo_id] = []
        photos_embeddings[photo_id].append({
            'embedding': face_doc['embedding'],
            'bbox': face_doc['bbox']
        })
    
    # Convertir en liste de tuples
    embeddings_list = [(pid, faces) for pid, faces in photos_embeddings.items()]
    
    # Rechercher les correspondances
    matches = face_service.search_faces_in_event(
        query_embedding,
        embeddings_list,
        threshold=search_request.threshold
    )
    
    # Enrichir avec les infos des photos
    photos_collection = mongo_db.photos
    enriched_matches = []
    
    for match in matches:
        photo = photos_collection.find_one({"_id": ObjectId(match['photo_id'])})
        if photo:
            enriched_matches.append({
                'photo_id': match['photo_id'],
                'filename': photo.get('filename', ''),
                'similarity': match['similarity'],
                'bbox': match['bbox'],
                'face_index': match['face_index']
            })
    
    return FaceSearchResponse(
        event_id=search_request.event_id,
        matches=enriched_matches,
        total_matches=len(enriched_matches),
        threshold_used=search_request.threshold
    )
