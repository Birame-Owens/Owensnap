"""
Test de Reconnaissance Faciale - Comparaison InsightFace vs DeepFace
Test la précision avant déploiement en production
"""

import os
import sys
from pathlib import Path
import numpy as np
import cv2
import time

# Ajouter le backend au path
sys.path.insert(0, str(Path(__file__).parent / "photoevent-backend"))


def test_insightface():
    """Test InsightFace (ArcFace)"""
    print("\n" + "="*60)
    print("🔬 TEST InsightFace (ArcFace) - 99% précision")
    print("="*60)
    
    try:
        import insightface
        print("✅ InsightFace importé avec succès")
    except ImportError:
        print("❌ InsightFace non installé")
        print("   Installez : pip install insightface onnxruntime-gpu")
        return False
    
    try:
        # Charger modèle
        print("\n📥 Chargement du modèle ArcFace (300MB, première fois seulement)...")
        model = insightface.app.FaceAnalysis(
            name='buffalo_l',
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )
        model.prepare(ctx_id=0, det_size=(640, 640))
        print("✅ Modèle chargé")
        
        # Tester avec une image
        test_photo_dir = Path("poc-test/photos-toutes")
        if not test_photo_dir.exists() or not list(test_photo_dir.glob("*.jpg")):
            print("\n⚠️ Pas de photos de test dans poc-test/photos-toutes/")
            print("   Ajoutez des photos pour tester")
            return True
        
        # Prendre 2 photos
        photos = list(test_photo_dir.glob("*.jpg"))[:2]
        if len(photos) < 2:
            print(f"⚠️ Seulement {len(photos)} photo(s), besoin de 2 minimum")
            return True
        
        print(f"\n📷 Test avec photos : {photos[0].name} et {photos[1].name}")
        
        # Extraire embeddings
        start = time.time()
        img1 = cv2.imread(str(photos[0]))
        faces1 = model.get(img1)
        time1 = time.time() - start
        
        if not faces1:
            print(f"❌ Pas de visage détecté dans {photos[0].name}")
            return True
        
        emb1 = faces1[0].embedding
        print(f"✅ Visage 1 détecté (confiance: {faces1[0].det_score:.2%}) en {time1*1000:.1f}ms")
        
        start = time.time()
        img2 = cv2.imread(str(photos[1]))
        faces2 = model.get(img2)
        time2 = time.time() - start
        
        if not faces2:
            print(f"❌ Pas de visage détecté dans {photos[1].name}")
            return True
        
        emb2 = faces2[0].embedding
        print(f"✅ Visage 2 détecté (confiance: {faces2[0].det_score:.2%}) en {time2*1000:.1f}ms")
        
        # Comparer
        sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        sim = max(0.0, sim)
        
        print(f"\n📊 Résultats :")
        print(f"   Similarité : {sim:.3f} ({sim*100:.1f}%)")
        print(f"   Seuil match : 0.55 (InsightFace)")
        print(f"   Résultat : {'✅ MÊME PERSONNE' if sim > 0.55 else '❌ PERSONNE DIFFÉRENTE'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur InsightFace : {e}")
        import traceback
        traceback.print_exc()
        return False


def test_deepface():
    """Test DeepFace (FaceNet512)"""
    print("\n" + "="*60)
    print("🔬 TEST DeepFace (FaceNet512) - 95% précision")
    print("="*60)
    
    try:
        from deepface import DeepFace
        print("✅ DeepFace importé avec succès")
    except ImportError:
        print("❌ DeepFace non installé")
        print("   Installez : pip install deepface tensorflow")
        return False
    
    try:
        # Tester avec une image
        test_photo_dir = Path("poc-test/photos-toutes")
        if not test_photo_dir.exists() or not list(test_photo_dir.glob("*.jpg")):
            print("\n⚠️ Pas de photos de test dans poc-test/photos-toutes/")
            return True
        
        photos = list(test_photo_dir.glob("*.jpg"))[:2]
        if len(photos) < 2:
            print(f"⚠️ Seulement {len(photos)} photo(s), besoin de 2 minimum")
            return True
        
        print(f"\n📷 Test avec photos : {photos[0].name} et {photos[1].name}")
        
        # Extraire embeddings
        start = time.time()
        result1 = DeepFace.represent(
            img_path=str(photos[0]),
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
            align=True
        )
        time1 = time.time() - start
        
        if not result1:
            print(f"❌ Pas de visage détecté dans {photos[0].name}")
            return True
        
        emb1 = np.array(result1[0]['embedding'])
        print(f"✅ Visage 1 détecté en {time1*1000:.1f}ms")
        
        start = time.time()
        result2 = DeepFace.represent(
            img_path=str(photos[1]),
            model_name="Facenet512",
            detector_backend="opencv",
            enforce_detection=False,
            align=True
        )
        time2 = time.time() - start
        
        if not result2:
            print(f"❌ Pas de visage détecté dans {photos[1].name}")
            return True
        
        emb2 = np.array(result2[0]['embedding'])
        print(f"✅ Visage 2 détecté en {time2*1000:.1f}ms")
        
        # Comparer
        sim = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        sim = max(0.0, sim)
        
        print(f"\n📊 Résultats :")
        print(f"   Similarité : {sim:.3f} ({sim*100:.1f}%)")
        print(f"   Seuil match : 0.70 (DeepFace)")
        print(f"   Résultat : {'✅ MÊME PERSONNE' if sim > 0.70 else '❌ PERSONNE DIFFÉRENTE'}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur DeepFace : {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Tests des modèles"""
    print("""
╔════════════════════════════════════════════════════════════════╗
║     TESTS DE RECONNAISSANCE FACIALE - PhotoEvent              ║
║     InsightFace (99%) vs DeepFace (95%)                       ║
╚════════════════════════════════════════════════════════════════╝
""")
    
    print("📋 Vérifications préalables...")
    print(f"   Python : {sys.version.split()[0]}")
    print(f"   NumPy : {np.__version__}")
    
    # Test photos
    test_photo_dir = Path("poc-test/photos-toutes")
    if test_photo_dir.exists():
        photos_count = len(list(test_photo_dir.glob("*.jpg")))
        print(f"   Photos de test : {photos_count} trouvées")
    else:
        print(f"   ⚠️  Dossier test photos non trouvé : {test_photo_dir.absolute()}")
    
    # Tests
    print("\n🚀 Lancement des tests...")
    
    insightface_ok = test_insightface()
    deepface_ok = test_deepface()
    
    # Résumé
    print("\n" + "="*60)
    print("📊 RÉSUMÉ")
    print("="*60)
    
    if insightface_ok:
        print("✅ InsightFace : Disponible et fonctionnel")
        print("   → RECOMMANDÉ pour votre usage (99% précision)")
    else:
        print("❌ InsightFace : Non disponible")
    
    if deepface_ok:
        print("✅ DeepFace : Disponible et fonctionnel")
        print("   → Fallback acceptable (95% précision)")
    else:
        print("❌ DeepFace : Non disponible")
    
    if not (insightface_ok or deepface_ok):
        print("\n⚠️  AUCUN MODÈLE DISPONIBLE")
        print("Installez au moins l'un des deux :")
        print("  - pip install insightface onnxruntime-gpu")
        print("  - pip install deepface tensorflow")
        return False
    
    print("\n✅ Tests terminés avec succès !")
    print("\nProchaines étapes :")
    print("  1. Copier ~60 photos dans poc-test/photos-toutes/")
    print("  2. Lancer : python poc-test/test_reconnaissance.py")
    print("  3. Vérifier taux de découverte de photos")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
