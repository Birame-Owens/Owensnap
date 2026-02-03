"""
Diagnostic POC - Vérifier pourquoi certaines photos ne matchent pas
"""

import cv2
import numpy as np
from pathlib import Path

def analyser_photo(photo_path, face_ref):
    """Analyse détaillée d'une photo"""
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    image = cv2.imread(str(photo_path))
    if image is None:
        return None
    
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces) == 0:
        return {
            'photo': photo_path.name,
            'visages_detectes': 0,
            'score_max': 0,
            'raison': "❌ Aucun visage détecté"
        }
    
    # Comparer avec chaque visage
    scores = []
    for (x, y, w, h) in faces:
        face_roi = image[y:y+h, x:x+w]
        face_roi = cv2.resize(face_roi, (128, 128))
        face_roi_gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)
        face_roi_gray = cv2.equalizeHist(face_roi_gray)
        
        # Calculer similarité simple
        diff = cv2.absdiff(face_ref, face_roi_gray)
        score = max(0, 1 - (np.mean(diff) / 80.0))
        scores.append(score)
    
    score_max = max(scores)
    
    raison = ""
    if score_max >= 0.55:
        raison = f"✅ Match ({score_max*100:.1f}%)"
    elif score_max >= 0.45:
        raison = f"⚠️  Borderline ({score_max*100:.1f}%) - Ajuster seuil"
    else:
        raison = f"❌ Pas de match ({score_max*100:.1f}%) - Autre personne"
    
    return {
        'photo': photo_path.name,
        'visages_detectes': len(faces),
        'score_max': score_max,
        'raison': raison
    }


def main():
    print("=" * 70)
    print("  🔬 DIAGNOSTIC RECONNAISSANCE FACIALE")
    print("=" * 70)
    
    # Charger référence
    ref_path = Path("resultats/reference_capturee.jpg")
    if not ref_path.exists():
        print("\n❌ Pas de référence trouvée. Lancez d'abord test_simple.py")
        return
    
    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    face_cascade = cv2.CascadeClassifier(cascade_path)
    
    img_ref = cv2.imread(str(ref_path))
    gray = cv2.cvtColor(img_ref, cv2.COLOR_BGR2GRAY)
    faces_ref = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    if len(faces_ref) == 0:
        print("❌ Pas de visage dans référence")
        return
    
    x, y, w, h = faces_ref[0]
    face_ref = img_ref[y:y+h, x:x+w]
    face_ref = cv2.resize(face_ref, (128, 128))
    face_ref = cv2.cvtColor(face_ref, cv2.COLOR_BGR2GRAY)
    face_ref = cv2.equalizeHist(face_ref)
    
    # Analyser toutes les photos
    dossier = Path("photos-toutes")
    photos = sorted(list(dossier.glob("*.jpg")) + list(dossier.glob("*.jpeg")) + 
                   list(dossier.glob("*.png")) + list(dossier.glob("*.JPG")) + 
                   list(dossier.glob("*.JPEG")) + list(dossier.glob("*.PNG")))
    
    print(f"\n📊 Analyse détaillée de {len(photos)} photos\n")
    
    resultats = []
    for photo in photos:
        result = analyser_photo(photo, face_ref)
        if result:
            resultats.append(result)
    
    # Trier par score
    resultats = sorted(resultats, key=lambda x: x['score_max'], reverse=True)
    
    # Afficher résultats
    print("=" * 90)
    print(f"{'PHOTO':<45} {'VISAGES':<10} {'SCORE':<10} {'STATUT'}")
    print("=" * 90)
    
    matches = 0
    borderline = 0
    no_match = 0
    no_face = 0
    
    for r in resultats:
        score_str = f"{r['score_max']*100:.1f}%" if r['visages_detectes'] > 0 else "N/A"
        print(f"{r['photo'][:43]:<45} {r['visages_detectes']:<10} {score_str:<10} {r['raison']}")
        
        if "Match" in r['raison']:
            matches += 1
        elif "Borderline" in r['raison']:
            borderline += 1
        elif "Aucun visage" in r['raison']:
            no_face += 1
        else:
            no_match += 1
    
    # Statistiques
    print("\n" + "=" * 90)
    print("📈 STATISTIQUES")
    print("=" * 90)
    print(f"✅ Matches (≥55%)           : {matches} photos")
    print(f"⚠️  Borderline (45-54%)      : {borderline} photos")
    print(f"❌ Pas de match (<45%)       : {no_match} photos")
    print(f"🚫 Aucun visage détecté     : {no_face} photos")
    print(f"\nTOTAL                       : {len(resultats)} photos")
    
    print("\n💡 RECOMMANDATIONS :")
    if borderline > 0:
        print(f"   → {borderline} photos sont 'borderline' - Baisser seuil à 0.45-0.48")
    if no_face > 5:
        print(f"   → {no_face} photos sans visage détecté - Problème qualité/angle")
    if matches < len(resultats) * 0.3:
        print("   → Peu de matches - Vérifier que ce sont bien VOS photos")
    
    print("\n✅ Diagnostic terminé !")


if __name__ == "__main__":
    main()
