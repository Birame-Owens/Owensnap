# 🚀 Guide Rapide - Test Reconnaissance Faciale

## Étapes à suivre :

### 1. Préparer vos photos (FAIT ✅)
- Vous avez déjà des photos dans un dossier
- Il vous en faut environ 60

### 2. Copier vos photos
```
Copier vos 60 photos dans :
c:\mes-projets\Owen snap\poc-test\photos-toutes\
```

### 3. Lancer le test
```powershell
cd "c:\mes-projets\Owen snap\poc-test"
python test_reconnaissance.py
```

## Ce qui va se passer :

1. **Webcam s'ouvre**
   - Un cercle apparaît au centre
   - Placez votre visage dans le cercle
   - Quand il devient VERT = visage détecté
   - Appuyez sur ESPACE pour capturer

2. **Recherche automatique** (1-2 min)
   - Le système analyse vos 60 photos
   - Compare avec votre visage capturé
   - Affiche progression en temps réel

3. **Résultats**
   - Liste des photos où vous apparaissez
   - Score de confiance pour chaque photo
   - Option galerie visuelle

## Ajuster la précision :

Si trop de photos trouvées (faux positifs) :
- Ouvrir `test_reconnaissance.py`
- Ligne 221 : changer `seuil = 0.65` en `seuil = 0.75`

Si pas assez de photos trouvées :
- Ligne 221 : changer `seuil = 0.65` en `seuil = 0.55`

## Touches clavier :

- **ESPACE** : Capturer photo webcam
- **Q** : Quitter webcam
- **O/N** : Voir galerie visuelle (oui/non)

## Dépannage :

**Webcam ne s'ouvre pas ?**
- Vérifier qu'aucune autre app utilise la webcam
- Donner autorisation Windows si demandé

**Erreur "Aucun visage détecté" ?**
- Améliorer éclairage
- Se rapprocher de la caméra
- Retirer lunettes/masque si possible

**Python introuvable ?**
- Installer Python depuis python.org
- Cocher "Add to PATH" lors installation
