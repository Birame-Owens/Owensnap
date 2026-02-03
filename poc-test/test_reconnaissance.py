"""
POC PhotoEvent - Test Reconnaissance Faciale avec Webcam
Appuyez sur ESPACE pour capturer votre visage, puis voir vos photos
"""

import cv2
import numpy as np
from pathlib import Path
import time

# Import MediaPipe avec gestion version
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    USE_NEW_API = True
except:
    import mediapipe as mp
    USE_NEW_API = False

class TestReconnaissanceFaciale:
    def __init__(self):
        print("🚀 Initialisation système de reconnaissance...")
        
    def capturer_visage_webcam(self):
        """Capture visage via webcam (comme au kiosque)"""
        print("\n📷 Ouverture webcam...")
        print("➡️  Placez votre visage devant la caméra")
        print("➡️  Appuyez sur ESPACE pour capturer")
        print("➡️  Appuyez sur Q pour quitter")
        
        cap = cv2.VideoCapture(0)
        
        if not cap.isOpened():
            print("❌ Erreur : Impossible d'ouvrir la webcam")
            return None
        
        captured_image = None
        
        with self.mp_face_detection.FaceDetection(
            min_detection_confidence=0.5
        ) as face_detection:
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Détecter visage en temps réel
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = face_detection.process(rgb_frame)
                
                # Dessiner cercle guide au centre
                h, w = frame.shape[:2]
                center = (w // 2, h // 2)
                radius = 150
                
                if results.detections:
                    # Visage détecté - cercle vert
                    cv2.circle(frame, center, radius, (0, 255, 0), 3)
                    cv2.putText(frame, "Visage detecte - Appuyez ESPACE", 
                               (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                               0.7, (0, 255, 0), 2)
                    
                    # Dessiner rectangle autour du visage
                    for detection in results.detections:
                        bbox = detection.location_data.relative_bounding_box
                        x = int(bbox.xmin * w)
                        y = int(bbox.ymin * h)
                        width = int(bbox.width * w)
                        height = int(bbox.height * h)
                        cv2.rectangle(frame, (x, y), (x + width, y + height), 
                                    (0, 255, 0), 2)
                else:
                    # Pas de visage - cercle rouge
                    cv2.circle(frame, center, radius, (0, 0, 255), 3)
                    cv2.putText(frame, "Aucun visage detecte", 
                               (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 
                               0.7, (0, 0, 255), 2)
                
                cv2.imshow('PhotoEvent Kiosk - Capture', frame)
                
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord(' ') and results.detections:
                    # ESPACE pressé + visage détecté
                    print("✅ Photo capturée !")
                    captured_image = frame.copy()
                    
                    # Effet flash
                    white = np.ones_like(frame) * 255
                    cv2.imshow('PhotoEvent Kiosk - Capture', white)
                    cv2.waitKey(200)
                    break
                    
                elif key == ord('q'):
                    break
        
        cap.release()
        cv2.destroyAllWindows()
        
        return captured_image
    
    def extraire_embedding(self, image):
        """Extrait embedding d'un visage"""
        if isinstance(image, (str, Path)):
            image = cv2.imread(str(image))
        
        if image is None:
            return None
        
        with self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5
        ) as face_mesh:
            
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_image)
            
            if not results.multi_face_landmarks:
                return None
            
            # Extraire coordonnées du premier visage
            landmarks = []
            for landmark in results.multi_face_landmarks[0].landmark:
                landmarks.extend([landmark.x, landmark.y, landmark.z])
            
            return np.array(landmarks)
    
    def calculer_similarite(self, emb1, emb2):
        """Calcule similarité entre 2 embeddings (0-1, plus haut = plus similaire)"""
        if emb1 is None or emb2 is None:
            return 0.0
        
        # Distance euclidienne normalisée
        distance = np.linalg.norm(emb1 - emb2)
        # Convertir en score de similarité (0-1)
        similarite = max(0, 1 - (distance / 2.0))
        return similarite
    
    def rechercher_photos(self, image_reference, dossier_photos, seuil=0.7):
        """Recherche photos contenant le visage"""
        print("\n🔍 Extraction embedding visage référence...")
        emb_ref = self.extraire_embedding(image_reference)
        
        if emb_ref is None:
            print("❌ Aucun visage détecté dans l'image de référence")
            return []
        
        print(f"✅ Embedding extrait : {len(emb_ref)} dimensions")
        
        # Lister toutes les photos
        photos = list(Path(dossier_photos).glob("*.jpg"))
        photos += list(Path(dossier_photos).glob("*.png"))
        photos += list(Path(dossier_photos).glob("*.jpeg"))
        
        if not photos:
            print(f"❌ Aucune photo trouvée dans {dossier_photos}")
            return []
        
        print(f"\n📊 Analyse de {len(photos)} photos...")
        print("⏳ Cela peut prendre 1-2 minutes...")
        
        matches = []
        
        for i, photo_path in enumerate(photos):
            # Afficher progression
            if (i + 1) % 10 == 0:
                print(f"   {i+1}/{len(photos)} photos analysées...")
            
            try:
                emb_photo = self.extraire_embedding(photo_path)
                
                if emb_photo is not None:
                    similarite = self.calculer_similarite(emb_ref, emb_photo)
                    
                    if similarite >= seuil:
                        matches.append({
                            'photo': photo_path.name,
                            'chemin': str(photo_path),
                            'similarite': similarite,
                            'confiance': f"{similarite * 100:.1f}%"
                        })
            except Exception as e:
                # Ignorer photos corrompues
                pass
        
        # Trier par similarité décroissante
        matches = sorted(matches, key=lambda x: x['similarite'], reverse=True)
        
        return matches
    
    def afficher_resultats(self, matches):
        """Affiche résultats de manière visuelle"""
        if not matches:
            print("\n❌ Aucune photo trouvée avec votre visage")
            print("💡 Essayez de baisser le seuil de confiance")
            return
        
        print(f"\n✅ {len(matches)} photo(s) trouvée(s) avec votre visage !\n")
        print("=" * 60)
        
        for i, match in enumerate(matches[:20], 1):  # Limiter à 20 résultats
            print(f"{i}. {match['photo']}")
            print(f"   Confiance: {match['confiance']}")
            print(f"   Chemin: {match['chemin']}")
            print("-" * 60)
        
        if len(matches) > 20:
            print(f"... et {len(matches) - 20} autres photos")
        
        return matches
    
    def visualiser_resultats(self, matches, max_affichage=9):
        """Affiche galerie photos trouvées"""
        if not matches:
            return
        
        print("\n🖼️  Affichage des photos trouvées (appuyez sur une touche pour fermer)...")
        
        # Prendre les N meilleures photos
        top_matches = matches[:max_affichage]
        
        # Calculer grille (3x3 par exemple)
        cols = 3
        rows = (len(top_matches) + cols - 1) // cols
        
        # Taille de chaque thumbnail
        thumb_w, thumb_h = 300, 300
        
        # Créer image galerie
        galerie = np.zeros((rows * thumb_h, cols * thumb_w, 3), dtype=np.uint8)
        
        for idx, match in enumerate(top_matches):
            row = idx // cols
            col = idx % cols
            
            # Charger et redimensionner photo
            img = cv2.imread(match['chemin'])
            if img is not None:
                img = cv2.resize(img, (thumb_w, thumb_h))
                
                # Ajouter texte confiance
                cv2.putText(img, f"{match['confiance']}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                           0.7, (0, 255, 0), 2)
                
                # Placer dans galerie
                y_start = row * thumb_h
                x_start = col * thumb_w
                galerie[y_start:y_start+thumb_h, x_start:x_start+thumb_w] = img
        
        cv2.imshow('PhotoEvent - Vos Photos', galerie)
        cv2.waitKey(0)
        cv2.destroyAllWindows()


def main():
    """Fonction principale"""
    print("=" * 60)
    print("  📸 PhotoEvent Kiosk - POC Reconnaissance Faciale")
    print("=" * 60)
    
    # Chemins
    dossier_photos = Path("photos-toutes")
    
    if not dossier_photos.exists():
        print(f"❌ Dossier {dossier_photos} introuvable")
        print("💡 Créez le dossier et ajoutez vos photos")
        return
    
    # Initialiser système
    systeme = TestReconnaissanceFaciale()
    
    # Étape 1 : Capturer visage webcam
    print("\n" + "=" * 60)
    print("ÉTAPE 1 : Capture de votre visage")
    print("=" * 60)
    
    image_reference = systeme.capturer_visage_webcam()
    
    if image_reference is None:
        print("❌ Capture annulée")
        return
    
    # Sauvegarder image référence
    cv2.imwrite("resultats/reference_capturee.jpg", image_reference)
    print("💾 Image référence sauvegardée dans resultats/")
    
    # Étape 2 : Recherche dans photos
    print("\n" + "=" * 60)
    print("ÉTAPE 2 : Recherche de vos photos")
    print("=" * 60)
    
    # Ajuster seuil selon besoin (0.6-0.8 recommandé)
    seuil = 0.65
    print(f"🎯 Seuil de confiance : {seuil}")
    
    matches = systeme.rechercher_photos(
        image_reference=image_reference,
        dossier_photos=dossier_photos,
        seuil=seuil
    )
    
    # Étape 3 : Afficher résultats
    print("\n" + "=" * 60)
    print("ÉTAPE 3 : Résultats")
    print("=" * 60)
    
    systeme.afficher_resultats(matches)
    
    # Visualiser galerie
    if matches:
        print("\n📌 Voulez-vous voir la galerie visuelle ? (o/n)")
        choix = input("Choix : ").lower()
        if choix == 'o':
            systeme.visualiser_resultats(matches)
    
    # Statistiques finales
    print("\n" + "=" * 60)
    print("📊 STATISTIQUES")
    print("=" * 60)
    nb_photos_total = len(list(dossier_photos.glob("*.jpg")) + 
                          list(dossier_photos.glob("*.png")) +
                          list(dossier_photos.glob("*.jpeg")))
    nb_trouvees = len(matches)
    
    print(f"Photos totales analysées : {nb_photos_total}")
    print(f"Photos avec votre visage : {nb_trouvees}")
    
    if nb_photos_total > 0:
        taux = (nb_trouvees / nb_photos_total) * 100
        print(f"Taux de détection : {taux:.1f}%")
    
    print("\n✅ Test terminé !")
    print("💡 Vous pouvez ajuster le seuil (ligne 221) si trop/pas assez de photos")


if __name__ == "__main__":
    main()
