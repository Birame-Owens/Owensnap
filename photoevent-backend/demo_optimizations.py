"""
Script de démonstration des optimisations Owen'Snap
Teste tous les modules nouvellement ajoutés
"""
import json
import base64
from PIL import Image
import io
import time

def create_demo_image():
    """Créer une image de test"""
    image = Image.new('RGB', (300, 300), color='blue')
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=90)
    return base64.b64encode(buffer.getvalue()).decode()

def demo_jwt_auth():
    """Démonstration de l'authentification JWT"""
    print("\n" + "="*70)
    print("🔐 DÉMONSTRATION: AUTHENTIFICATION JWT")
    print("="*70)
    
    from app.auth.jwt_manager import create_access_token
    from datetime import timedelta
    
    # Créer un token
    token_data = {
        "sub": "photographer",
        "event_id": "JK0LHAWK"
    }
    
    token = create_access_token(
        data=token_data,
        expires_delta=timedelta(hours=8)
    )
    
    print(f"\n✅ Token créé avec succès!")
    print(f"Type: Bearer")
    print(f"Durée: 8 heures")
    print(f"Token (raccourci): {token[:50]}...")
    
    # Vérifier le token
    from jose import jwt
    from app.auth.jwt_manager import SECRET_KEY, ALGORITHM
    
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print(f"\n✅ Token décodé:")
    print(f"  - Utilisateur: {payload['sub']}")
    print(f"  - Événement: {payload['event_id']}")
    print(f"  - Expiration: {payload['exp']}")
    
    return token

def demo_rate_limiter():
    """Démonstration du rate limiting"""
    print("\n" + "="*70)
    print("⏱️ DÉMONSTRATION: RATE LIMITING")
    print("="*70)
    
    import asyncio
    from app.middleware.rate_limiter import rate_limiter
    
    async def test_rate_limit():
        client_ip = "192.168.1.100"
        print(f"\nTesting rate limiting pour IP: {client_ip}")
        print(f"Limite: 10 requêtes / 60 secondes\n")
        
        for i in range(12):
            allowed, remaining, reset_in = await rate_limiter.check_rate_limit(client_ip)
            status = "✅ ACCEPTÉE" if allowed else "❌ REJETÉE"
            print(f"  Requête {i+1:2d}: {status} | Restantes: {remaining:2d} | Reset: {reset_in}s")
    
    asyncio.run(test_rate_limit())

def demo_image_compression():
    """Démonstration de la compression d'images"""
    print("\n" + "="*70)
    print("📸 DÉMONSTRATION: COMPRESSION D'IMAGES")
    print("="*70)
    
    from app.services.image_compressor import ImageCompressor, QUALITY_TESTS
    
    test_image = create_demo_image()
    original_size = len(base64.b64decode(test_image)) / 1024
    
    print(f"\nImage de test: {original_size:.2f} KB")
    print("\nTesting des niveaux de qualité:\n")
    
    for preset_name, preset_config in QUALITY_TESTS.items():
        print(f"📌 Preset: {preset_name.upper()}")
        print(f"   - Qualité: {preset_config['quality']}")
        
        compressed_b64, stats = ImageCompressor.compress_base64(
            test_image,
            quality=preset_config['quality'],
            max_dimension=preset_config['max_dim']
        )
        
        print(f"   - Taille original: {stats['original_size_kb']} KB")
        print(f"   - Taille compressée: {stats['compressed_size_kb']} KB")
        print(f"   - Réduction: {stats['compression_ratio_percent']}%")
        print(f"   - Dimensions: {stats['dimensions']}")
        print()

def demo_mongo_indexes():
    """Démonstration des indexes MongoDB"""
    print("\n" + "="*70)
    print("🗂️ DÉMONSTRATION: INDEXES MONGODB")
    print("="*70)
    
    try:
        from pymongo import MongoClient
        from app.core.config import settings
        
        print(f"\n📡 Connexion à MongoDB: {settings.MONGODB_URL}")
        client = MongoClient(settings.MONGODB_URL)
        db = client[settings.MONGODB_DATABASE]
        
        # Afficher les indexes de la collection faces
        faces_collection = db["faces"]
        indexes = list(faces_collection.list_indexes())
        
        print(f"\n✅ Indexes trouvés sur la collection 'faces': {len(indexes)}\n")
        
        for idx in indexes:
            print(f"  📌 {idx['name']}")
            print(f"     Keys: {idx['key']}")
            if 'expireAfterSeconds' in idx:
                print(f"     TTL: {idx['expireAfterSeconds']}s ({idx['expireAfterSeconds']/86400:.0f} jours)")
            print()
        
        # Statistiques
        stats = faces_collection.collection_stats()
        print(f"✅ Statistiques de la collection 'faces':")
        print(f"   - Nombre de documents: {stats.get('count', 0)}")
        print(f"   - Taille: {stats.get('size', 0) / 1024 / 1024:.2f} MB")
        
        client.close()
        
    except Exception as e:
        print(f"⚠️ Erreur: {str(e)}")
        print(f"   (S'assurer que MongoDB est en cours d'exécution)")

def demo_load_test_info():
    """Informations sur les tests de charge"""
    print("\n" + "="*70)
    print("📊 TESTS DE CHARGE - Information")
    print("="*70)
    
    print(f"""
Pour exécuter un test de charge complet:

  $ python tests/load_test.py --users 100 --requests 10

Options disponibles:
  --users <n>        Nombre d'utilisateurs (défaut: 100)
  --requests <n>     Requêtes par utilisateur (défaut: 10)
  --url <url>        URL de base (défaut: http://localhost:8000)

Exemple avec 500 utilisateurs:
  $ python tests/load_test.py --users 500 --requests 20

Le test génère un rapport JSON: load_test_report.json

Métriques mesurées:
  ✓ Latence (min, avg, median, p95, p99, max)
  ✓ Débit (requêtes par seconde)
  ✓ Taux d'erreur
  ✓ Codes de statut HTTP
  ✓ Performance endpoint par endpoint
""")

def main():
    """Exécuter toutes les démonstrations"""
    print("\n" + "="*70)
    print("🚀 DÉMONSTRATION DES OPTIMISATIONS OWEN'SNAP")
    print("="*70)
    
    demos = [
        ("JWT Authentication", demo_jwt_auth),
        ("Rate Limiting", demo_rate_limiter),
        ("Image Compression", demo_image_compression),
        ("MongoDB Indexes", demo_mongo_indexes),
        ("Load Testing Info", demo_load_test_info),
    ]
    
    for demo_name, demo_func in demos:
        try:
            demo_func()
        except Exception as e:
            print(f"\n❌ Erreur dans {demo_name}: {str(e)}")
    
    print("\n" + "="*70)
    print("✅ DÉMONSTRATION COMPLÈTE")
    print("="*70)
    print(f"""
Résumé des améliorations:

1. 🔐 Authentification JWT
   - Tokens 8h (configurable)
   - HS256 encryption
   - Support Bearer tokens

2. ⏱️ Rate Limiting
   - 10 req/min par IP
   - Fenêtre glissante 60s
   - Headers X-RateLimit-*

3. 📸 Compression Images
   - Réduction 70% (balanced)
   - Qualité JPEG optimisée
   - 3 presets disponibles

4. 🗂️ Indexes MongoDB
   - event_id (recherche par événement)
   - event_id + similarity (tri pertinence)
   - photo_id (recherche rapide)
   - TTL 90 jours

5. 📊 Tests de Charge
   - Simulation 100 utilisateurs
   - Métriques détaillées
   - Rapport JSON

Pour plus d'informations, consultez: OPTIMIZATIONS_GUIDE.md
""")

if __name__ == "__main__":
    main()
