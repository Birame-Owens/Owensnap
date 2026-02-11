#!/usr/bin/env python3
"""
Script de diagnostic pour vérifier les ObjectIds et les images
"""
import sys
sys.path.insert(0, r'c:\mes-projets\Owen snap\photoevent-backend')

from app.database import get_mongodb
from bson import ObjectId
import json

mongo_db = get_mongodb()

print("=" * 80)
print("DIAGNOSTIC: Images et ObjectIds")
print("=" * 80)

# 1. Vérifier les photos dans MongoDB
print("\n📷 PHOTOS DANS MONGODB:")
print("-" * 80)

photos = list(mongo_db.photos.find().limit(5))
print(f"Total photos: {mongo_db.photos.count_documents({})}")
print(f"Affichant les 5 premières:\n")

for i, photo in enumerate(photos, 1):
    print(f"{i}. ObjectId: {photo['_id']}")
    print(f"   Filename: {photo.get('filename', 'N/A')}")
    print(f"   Event ID: {photo.get('event_id', 'N/A')}")
    print(f"   URL expected: /uploads/photos/{photo.get('filename', 'N/A')}")
    print()

# 2. Vérifier les partages dans MongoDB
print("\n🔗 PARTAGES DANS MONGODB:")
print("-" * 80)

shares = list(mongo_db.shares.find().limit(3))
print(f"Total partages: {mongo_db.shares.count_documents({})}")

if shares:
    for i, share in enumerate(shares, 1):
        print(f"\n{i}. Share Code: {share.get('share_code', 'N/A')}")
        print(f"   Event ID: {share.get('event_id', 'N/A')}")
        print(f"   Photo IDs sélectionnées: {share.get('selected_photo_ids', [])}")
        print(f"   Created: {share.get('created_at', 'N/A')}")
        print(f"   Expires: {share.get('expires_at', 'N/A')}")
        
        # Vérifier si les photos existent
        selected_ids = share.get('selected_photo_ids', [])
        if selected_ids:
            print(f"   Vérification des photos:")
            for photo_id in selected_ids:
                try:
                    photo = mongo_db.photos.find_one({"_id": photo_id})
                    if photo:
                        print(f"     ✅ {photo_id} -> {photo.get('filename', 'N/A')}")
                    else:
                        print(f"     ❌ {photo_id} -> NON TROUVÉE")
                except Exception as e:
                    print(f"     ❌ {photo_id} -> ERREUR: {e}")
else:
    print("Aucun partage trouvé")

# 3. Vérifier les faces
print("\n\n😊 FACES DANS MONGODB:")
print("-" * 80)

faces = list(mongo_db.faces.find().limit(3))
print(f"Total faces: {mongo_db.faces.count_documents({})}")

if faces:
    for i, face in enumerate(faces, 1):
        print(f"{i}. Face ID: {face['_id']}")
        print(f"   Photo ID: {face.get('photo_id', 'N/A')}")
        print(f"   Event ID: {face.get('event_id', 'N/A')}")
        print(f"   Confidence: {face.get('confidence', 0):.2%}")
        print()
