"""
POC PhotoEvent - Test Reconnaissance Faciale SIMPLIFIÉ
Version compatible toutes configurations
"""

import cv2
import numpy as np
from pathlib import Path
import time

class ReconnaissanceSimple:
    def __init__(self):
        print("🚀 Initialisation du détecteur de visages...")
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
    def capturer_visage_webcam(self):
        """Capture visage via webcam"""
        print("\n📷 Ouverture webcam...")
        print("➡️  Placez votre visage devant la caméra")
        print("➡️  Appuyez sur ESPACE pour capturer")
        print("➡️  Appuyez sur Q pour quitter")
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Erreur : Impossible d'ouvrir la webcam")
            return None
        
        captured_image = None
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
            
            h, w = frame.shape[:2]
            center = (w // 2, h // 2)
            radius = 150
            
            if len(faces) > 0:
                cv2.circle(frame, center, radius, (0, 255, 0), 3)
                cv2.putText(frame, "Visage detecte - ESPACE pour capturer", 
                           (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.7, (0, 255, 0), 2)
                
                for (x, y, w_face, h_face) in faces:
                    cv2.rectangle(frame, (x, y), (x + w_face, y + h_face), 
                                (0, 255, 0), 2)
            else:
                cv2.circle(frame, center, radius, (0, 0, 255), 3)
                cv2.putText(frame, "Aucun visage - Rapprochez-vous", 
                           (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.7, (0, 0, 255), 2)
            
            cv2.imshow('PhotoEvent Kiosk - Capture', frame)
            
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord(' ') and len(faces) > 0:
                print("✅ Photo capturée !")
                captured_image = frame.copy()
                white = np.ones_like(frame) * 255
                cv2.imshow('PhotoEvent Kiosk - Capture', white)
                cv2.waitKey(200)
                break
            elif key == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()
        
        return captured_image
    
    def extraire_visages(self, image):
        """Extrait TOUS les visages d'une image"""
        if isinstance(image, (str, Path)):
            image = cv2.imread(str(image))
        
        if image is None:
            return []
        
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return []
        
        faces_roi = []
        for (x, y, w, h) in faces:
            face_roi = image[y:y+h, x:x+w]
            face_roi = cv2.resize(face_roi, (128, 128))
            faces_roi.append(face_roi)
        
        return faces_roi
    
    def comparer_visages(self, face1, face2):
        """Compare deux visages - score 0-1"""
        if face1 is None or face2 is None:
            return 0.0
        
        if len(face1.shape) == 3:
            face1_gray = cv2.cvtColor(face1, cv2.COLOR_BGR2GRAY)
        else:
            face1_gray = face1
            
        if len(face2.shape) == 3:
            face2_gray = cv2.cvtColor(face2, cv2.COLOR_BGR2GRAY)
        else:
            face2_gray = face2
        
        face1_gray = cv2.resize(face1_gray, (128, 128))
        face2_gray = cv2.resize(face2_gray, (128, 128))
        
        face1_gray = cv2.equalizeHist(face1_gray)
        face2_gray = cv2.equalizeHist(face2_gray)
        
        scores = []
        
        # Méthode 1: Différence absolue
        diff = cv2.absdiff(face1_gray, face2_gray)
        diff_score = np.mean(diff)
        score1 = max(0, 1 - (diff_score / 80.0))
        scores.append(score1)
        
        # Méthode 2: Corrélation
        face1_flat = face1_gray.flatten().astype(float)
        face2_flat = face2_gray.flatten().astype(float)
        
        if np.std(face1_flat) > 0 and np.std(face2_flat) > 0:
            correlation = np.corrcoef(face1_flat, face2_flat)[0, 1]
            score2 = (correlation + 1) / 2
            scores.append(score2)
        
        # Méthode 3: Histogramme
        hist1 = cv2.calcHist([face1_gray], [0], None, [256], [0, 256])
        hist2 = cv2.calcHist([face2_gray], [0], None, [256], [0, 256])
        hist1 = cv2.normalize(hist1, hist1).flatten()
        hist2 = cv2.normalize(hist2, hist2).flatten()
        score3 = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        scores.append(score3)
        
        similarite = np.average(scores, weights=[1, 2, 1])
        
        return max(0, min(1, similarite))
    
    def rechercher_photos(self, image_reference, dossier_photos, seuil=0.50):
        """Recherche photos avec multi-visages + déduplication"""
        print("\n🔍 Extraction visage référence...")
        faces_ref = self.extraire_visages(image_reference)
        
        if not faces_ref:
            print("❌ Aucun visage détecté")
            return []
        
        face_ref = faces_ref[0]
        print("✅ Visage référence extrait")
        
        photos_set = set()
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            for p in Path(dossier_photos).glob(ext):
                photos_set.add(p)
        
        photos = sorted(list(photos_set))
        
        if not photos:
            print(f"❌ Aucune photo trouvée")
            return []
        
        print(f"\n📊 Analyse de {len(photos)} photos uniques...")
        print("⏳ Recherche dans TOUS les visages...\n")
        
        matches_dict = {}
        debut = time.time()
        
        for i, photo_path in enumerate(photos):
            if (i + 1) % 5 == 0:
                elapsed = time.time() - debut
                vitesse = (i + 1) / elapsed
                restant = (len(photos) - i - 1) / vitesse if vitesse > 0 else 0
                print(f"   {i+1}/{len(photos)} photos... (~{int(restant)}s)")
            
            try:
                faces_photo = self.extraire_visages(photo_path)
                
                if faces_photo:
                    max_similarite = 0
                    for face_photo in faces_photo:
                        similarite = self.comparer_visages(face_ref, face_photo)
                        max_similarite = max(max_similarite, similarite)
                    
                    if max_similarite >= seuil:
                        photo_key = str(photo_path)
                        if photo_key not in matches_dict or max_similarite > matches_dict[photo_key]['similarite']:
                            matches_dict[photo_key] = {
                                'photo': photo_path.name,
                                'chemin': photo_key,
                                'similarite': max_similarite,
                                'confiance': f"{max_similarite * 100:.1f}%"
                            }
            except:
                pass
        
        matches = sorted(matches_dict.values(), key=lambda x: x['similarite'], reverse=True)
        
        duree_totale = time.time() - debut
        print(f"\n⏱️  Analyse: {duree_totale:.1f}s")
        print(f"📈 Vitesse: {len(photos)/duree_totale:.1f} photos/s")
        
        return matches
    
    def afficher_resultats(self, matches):
        """Affiche résultats"""
        if not matches:
            print("\n❌ Aucune photo trouvée")
            print("💡 Ajuster seuil (ligne 340)")
            return
        
        print(f"\n✅ {len(matches)} photo(s) trouvée(s) !\n")
        print("=" * 70)
        
        for i, match in enumerate(matches[:30], 1):
            print(f"{i}. {match['photo']:<40} {match['confiance']}")
        
        if len(matches) > 30:
            print(f"\n... et {len(matches) - 30} autres")
        
        return matches
    
    def visualiser_galerie(self, matches, max_photos=12):
        """Affiche galerie"""
        if not matches:
            return
        
        print("\n🖼️  Galerie (appuyez sur touche pour fermer)...")
        
        top_matches = matches[:max_photos]
        
        cols = 4
        rows = (len(top_matches) + cols - 1) // cols
        
        thumb_w, thumb_h = 250, 250
        
        galerie = np.ones((rows * thumb_h, cols * thumb_w, 3), dtype=np.uint8) * 50
        
        for idx, match in enumerate(top_matches):
            row = idx // cols
            col = idx % cols
            
            img = cv2.imread(match['chemin'])
            if img is not None:
                img = cv2.resize(img, (thumb_w, thumb_h))
                
                cv2.putText(img, match['confiance'], 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.8, (0, 255, 0), 2)
                
                y_start = row * thumb_h
                x_start = col * thumb_w
                galerie[y_start:y_start+thumb_h, x_start:x_start+thumb_w] = img
        
        cv2.imshow('PhotoEvent - Vos Photos', galerie)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


def main():
    """Fonction principale"""
    print("=" * 70)
    print("     📸 PhotoEvent Kiosk - POC Reconnaissance")
    print("=" * 70)
    
    dossier_photos = Path("photos-toutes")
    
    if not dossier_photos.exists():
        print(f"❌ Dossier introuvable")
        return
    
    nb_photos = len(list(dossier_photos.glob("*.jpg")) + 
                   list(dossier_photos.glob("*.jpeg")) +
                   list(dossier_photos.glob("*.png")) +
                   list(dossier_photos.glob("*.JPG")) +
                   list(dossier_photos.glob("*.JPEG")) +
                   list(dossier_photos.glob("*.PNG")))
    
    print(f"\n📁 {nb_photos} photos détectées")
    
    if nb_photos == 0:
        print("❌ Aucune photo ! Copiez photos dans photos-toutes/")
        return
    
    systeme = ReconnaissanceSimple()
    
    # ÉTAPE 1
    print("\n" + "=" * 70)
    print("ÉTAPE 1 : Capture visage")
    print("=" * 70)
    
    image_reference = systeme.capturer_visage_webcam()
    
    if image_reference is None:
        print("❌ Capture annulée")
        return
    
    Path("resultats").mkdir(exist_ok=True)
    cv2.imwrite("resultats/reference_capturee.jpg", image_reference)
    print("💾 Référence sauvegardée")
    
    # ÉTAPE 2
    print("\n" + "=" * 70)
    print("ÉTAPE 2 : Recherche photos")
    print("=" * 70)
    
    seuil = 0.30
    print(f"🎯 Seuil: {seuil} (30%)")
    
    matches = systeme.rechercher_photos(
        image_reference=image_reference,
        dossier_photos=dossier_photos,
        seuil=seuil
    )
    
    # ÉTAPE 3
    print("\n" + "=" * 70)
    print("ÉTAPE 3 : Résultats")
    print("=" * 70)
    
    systeme.afficher_resultats(matches)
    
    if matches:
        reponse = input("\n📌 Voir galerie ? (o/n) : ").lower()
        if reponse == 'o':
            systeme.visualiser_galerie(matches)
    
    # Statistiques
    print("\n" + "=" * 70)
    print("📊 STATISTIQUES")
    print("=" * 70)
    print(f"Photos analysées : {nb_photos}")
    print(f"Photos trouvées  : {len(matches)}")
    
    if nb_photos > 0:
        taux = (len(matches) / nb_photos) * 100
        print(f"Taux détection   : {taux:.1f}%")
    
    print("\n📈 ÉVALUATION :")
    if len(matches) > 0:
        print("✅ Système fonctionnel")
    else:
        print("⚠️  Aucun match - Ajuster seuil ou vérifier photos")
    
    print("\n💡 Ajustements (ligne 340) :")
    print("   - Trop de faux positifs : seuil = 0.55")
    print("   - Pas assez trouvé      : seuil = 0.45")
    
    print("\n✅ Test terminé !")


if __name__ == "__main__":
    main()
