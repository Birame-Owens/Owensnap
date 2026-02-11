#!/usr/bin/env python3
"""
Test pour vérifier les endpoints de photos
"""
import sys
sys.path.insert(0, r'c:\mes-projets\Owen snap\photoevent-backend')

import requests
from app.database import get_mongodb
from bson import ObjectId

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
mongo_db = get_mongodb()

print("=" * 80)
print("TEST: Endpoints photos")
print("=" * 80)

# 1. Récupérer une photo d'un partage
print("\n1️⃣ Cherchons un partage existant...")

share = mongo_db.shares.find_one()
if not share:
    print("❌ Aucun partage trouvé!")
    sys.exit(1)

print(f"✅ Partage trouvé: {share['share_code']}")
print(f"   Photos: {share['selected_photo_ids']}")

# 2. Tester le endpoint /thumbnail
if share['selected_photo_ids']:
    photo_id = share['selected_photo_ids'][0]
    
    print(f"\n2️⃣ Test endpoint /thumbnail avec photo_id: {photo_id}")
    try:
        url = f"{BASE_URL}/photos/{photo_id}/thumbnail"
        print(f"   URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Réponse reçue: {len(response.content)} bytes")
            print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
        else:
            print(f"   ❌ Erreur: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")
    
    # 3. Tester le endpoint /download-hq
    print(f"\n3️⃣ Test endpoint /download-hq avec photo_id: {photo_id}")
    try:
        url = f"{BASE_URL}/photos/{photo_id}/download-hq"
        print(f"   URL: {url}")
        response = requests.get(url, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Réponse reçue: {len(response.content)} bytes")
            print(f"   Content-Type: {response.headers.get('content-type', 'unknown')}")
        else:
            print(f"   ❌ Erreur: {response.text[:200]}")
    except Exception as e:
        print(f"   ❌ Exception: {e}")

# 4. Chercher un partage par share code
print(f"\n4️⃣ Test endpoint /shares/{{code}} avec code: {share['share_code']}")
try:
    url = f"{BASE_URL}/shares/{share['share_code']}"
    print(f"   URL: {url}")
    response = requests.get(url, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"   ✅ Partage récupéré:")
        print(f"      Share code: {data.get('share_code')}")
        print(f"      Photos: {len(data.get('selected_photos', []))}")
    else:
        print(f"   ❌ Erreur: {response.text[:200]}")
except Exception as e:
    print(f"   ❌ Exception: {e}")

print("\n" + "=" * 80)
print("✅ Tests terminés")
