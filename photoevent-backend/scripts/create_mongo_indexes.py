"""
Script pour créer les indexes MongoDB
Améliore les performances de recherche
"""
from pymongo import MongoClient
from app.core.config import settings

def create_indexes():
    """Créer les indexes MongoDB optimisés"""
    client = MongoClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DATABASE]
    
    print("🔧 Création des indexes MongoDB...")
    
    # Index sur event_id pour les recherches par événement
    faces_collection = db["faces"]
    faces_collection.create_index([("event_id", 1)], 
                                   name="idx_event_id")
    print("✅ Index créé: event_id")
    
    # Index composé event_id + similarity pour les recherches paginées
    faces_collection.create_index([("event_id", 1), ("similarity", -1)], 
                                   name="idx_event_similarity")
    print("✅ Index créé: event_id + similarity")
    
    # Index TTL sur photos (optionnel, expire après 90 jours)
    photos_collection = db["photos"]
    photos_collection.create_index([("created_at", 1)], 
                                    expireAfterSeconds=7776000,  # 90 jours
                                    name="idx_expiry_photos")
    print("✅ Index TTL créé: photos (expire après 90 jours)")
    
    # Index sur photo_id pour recherches rapides
    faces_collection.create_index([("photo_id", 1)], 
                                   name="idx_photo_id")
    print("✅ Index créé: photo_id")
    
    # Afficher tous les indexes
    print("\n📊 Indexes MongoDB créés:")
    for idx in faces_collection.list_indexes():
        print(f"  - {idx['name']}: {idx['key']}")
    
    client.close()
    print("\n✅ Indexation complète!")

if __name__ == "__main__":
    create_indexes()
