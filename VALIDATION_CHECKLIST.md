# ✅ CHECKLIST DE VALIDATION - QR SHARE SYSTEM

**Date du test**: _______________  
**Tester par**: _______________  

---

## 🔍 PHASE 1: Vérification technique (5 min)

### Backend
- [ ] Terminal ouvert: `cd photoevent-backend`
- [ ] Commande lancée: `python main.py`
- [ ] ✅ Message: "Application startup complete"
- [ ] ✅ Server écoute: http://0.0.0.0:8000
- [ ] ✅ URL réachable: http://localhost:8000/health

**Logs visibles:**
```
[INFO]     Application startup complete
[INFO]     Uvicorn running on http://0.0.0.0:8000
```

### Frontend
- [ ] Terminal ouvert: `cd photoevent-frontend`
- [ ] Commande lancée: `npm run dev`
- [ ] ✅ Message: "VITE v6.0.5 ready"
- [ ] ✅ URL locale: http://localhost:3000
- [ ] Browser ouvert: http://localhost:3000

**Logs visibles:**
```
➜  Local:   http://localhost:3000/
```

### Dépendances vérifié
- [ ] ✅ npm list qrcode → qrcode@1.5.4
- [ ] ✅ python -c "from app.api import shares" → OK
- [ ] ✅ pip list | grep pymongo → Installé

---

## 📱 PHASE 2: Test KIOSK (10 min)

### A. Navigation
- [ ] Ouvrir http://localhost:3000/kiosk
- [ ] Voir le titre "Owen'Snap"
- [ ] Voir le tagline "Reconnaissance faciale"
- [ ] Input "Code événement" visible
- [ ] Bouton "🎬 Démarrer la caméra" visible

### B. Code événement
- [ ] Entrer code: `JK0LHAWK`
- [ ] ✅ Code en majuscules appliqué
- [ ] Clicker "Démarrer la caméra"
- [ ] ⏳ Vérification du code...
- [ ] ✅ Pas d'erreur, caméra demandée

**Accepter la permission caméra** si popup

### C. Capture vidéo
- [ ] Caméra vidéo s'affiche
- [ ] Prévisualisation en temps réel
- [ ] Bouton "📸 Capturer le visage" visible
- [ ] Clicker le bouton

**Console backend**:
```
[INFO] Face search for event_id=...
```

### D. Résultats recherche
- [ ] Photos affichées (minimum 2-3)
- [ ] Chaque photo: image + % similarité
- [ ] Checkbox sur chaque photo
- [ ] Boutons [⬇️ Télécharger] et [🖨️ Imprimer]

**Interaction**:
- [ ] Cliquer sur 1ère photo → checkbox ☑️
- [ ] Cliquer sur 2e photo → checkbox ☑️
- [ ] Sélection comptée: "Générer code pour 2 photos"

---

## 🔗 PHASE 3: Génération du QR (⭐ CŒUR)

### Avant clic
- [ ] Bouton [🔗 Générer code pour 2 photos] visible
- [ ] Bouton [🔄 Réinitialiser] visible
- [ ] Pas d'erreur affichée

### Après clic [Générer]
- [ ] Bouton passe à "⏳ Génération..."
- [ ] Attendre 1-2 secondes
- [ ] ✅ Pas d'erreur 500!

**Console frontend (F12 → Console)**:
```
✅ 📤 Création du partage...
✅ Event ID: 1
✅ Photos sélectionnées: ["id1", "id2"]
✅ ✅ Partage créé: ABC123XY
```

**Console backend (Terminal 1)**:
```
[INFO] Création partage pour event_id=1, 2 photos
[INFO] Photos trouvées: 2 sur 2 demandées
[INFO] Partage créé: ABC123XY
```

### Affichage du QR
- [ ] Section "✨ Code de partage généré" s'affiche
- [ ] Titre "📱 Code QR à scanner"
- [ ] ✅ QR code visible (image carrée)
- [ ] QR code lisible et net
- [ ] Bordure bleue autour

**Validation visuelle**:
- Size: ~300px × 300px
- Couleur: Noir et blanc
- Format: Carré avec motifs

### Infos partage
- [ ] Code affiché: "ABC123XY" (ou autre)
- [ ] Photos: "2"
- [ ] Valide: "48 heures"
- [ ] Lien: "http://localhost:3000/share/ABC123XY"

### Boutons d'action
- [ ] [📋 Copier lien] visible
- [ ] [🌐 Ouvrir] visible
- [ ] [🔄 Nouveau scan] visible

---

## 🌐 PHASE 4: Partage public (7 min)

### Scénario A: Via lien direct
- [ ] Clicker [🌐 Ouvrir]
- [ ] Nouvelle fenêtre/onglet s'ouvre
- [ ] URL: http://localhost:3000/share/ABC123XY
- [ ] ⏳ Page charge...

**Console backend**:
```
[INFO] Partage consulté: ABC123XY, downloads: 1
```

### Scénario B: Via copie lien
- [ ] Clicker [📋 Copier lien]
- [ ] Alert: "✅ Lien copié"
- [ ] Coller dans barre URL nouvelle fenêtre
- [ ] Même résultat qu'A

### Affichage galerie partagée
- [ ] Titre: "Vos photos privé"
- [ ] Code partage: "ABC123XY"
- [ ] Compte: "Expire dans: 47h 55min"
- [ ] Téléchargées: "0 fois" (avant clic)

### Photos affichées
- [ ] Photos en grille (2-3 visibles)
- [ ] Chaque photo: image + info
- [ ] Bouton [⬇️ Télécharger] par photo
- [ ] Tailles informées

### Téléchargement
- [ ] Clicker [⬇️] sur 1ère photo
- [ ] ⏳ Téléchargement en cours
- [ ] Fichier sauvegardé (~/Downloads)
- [ ] Compteur passe à: "Téléchargées: 1 fois"
- [ ] Cliquer sur 2e → "Téléchargées: 2 fois"

**Note**: Compteur augmente côté serveur

---

## 🧪 PHASE 5: Test des cas d'erreur (5 min)

### Erreur 1: Code invalide
**Test**: Ouvrir http://localhost:3000/share/INVALID123
- [ ] Affiche erreur: "Code de partage invalide"
- [ ] Pas de crash

**Backend logs**:
```
[INFO] Code invalide: INVALID123
```

### Erreur 2: Partage expiré
**Test**: Simuler expiration (modifier MongoDB ou attendre 48h)
- [ ] Affiche erreur: "Ce partage a expiré"
- [ ] Pas de photos affichées

**Backend logs**:
```
[INFO] Partage expiré: ABC123XY
```

### Erreur 3: Pas de sélection
**Test**: Dans Kiosk, pas de sélection
- [ ] Bouton [Générer code] est DÉSACTIVÉ (grisé)
- [ ] Cliquer dessus: "❌ Veuillez sélectionner..."
- [ ] Pas de POST envoyé

### Erreur 4: Caméra refusée
**Test**: Refuser la permission caméra
- [ ] Affiche erreur: "❌ Caméra indisponible"
- [ ] Pas de crash app
- [ ] Bouton "Démarrer caméra" reste actif (peut réessayer)

---

## 📊 PHASE 6: Performance (3 min)

### Timing mesurés
- [ ] Validation event code: < 500ms
- [ ] Lancement caméra: < 1s
- [ ] Capture + recherche face: < 3s
- [ ] Génération QR: < 500ms
- [ ] Chargement galerie: < 1s

**Acceptable si**:
- Backend moderne (SSD, CPU multiples)
- MongoDB local ou cloud rapide

---

## 📸 PHASE 7: Qualité visuelle (2 min)

### Kiosk interface
- [ ] Layout responsive (width 100%)
- [ ] Textes lisibles
- [ ] Couleurs cohérentes
- [ ] Pas de texte coupé
- [ ] Emoji affichent correctement

### QR code
- [ ] Bien positionné
- [ ] Taille adéquate
- [ ] Codes qr trop grandes pas (max 400px recommandé)
- [ ] Contraste OK (noir/blanc)
- [ ] Courbe pas floutée

### Galerie partagée
- [ ] Grille confortable
- [ ] Photos redimensionnées uniformément
- [ ] Padding/margin correct
- [ ] Boutons accessibles (pas trop petits)

---

## 🔗 PHASE 8: Integration complète (5 min)

### Flux de bout en bout
1. [ ] Entrée code événement ✅
2. [ ] Démarrage caméra ✅
3. [ ] Capture visage ✅
4. [ ] Affichage photos ✅
5. [ ] Sélection photos ✅
6. [ ] Génération QR ✅
7. [ ] Affichage QR ✅
8. [ ] Ouverture galerie ✅
9. [ ] Téléchargement photos ✅
10. [ ] Vérification MongoDB ✅

### Vérification MongoDB
```bash
# Terminal 4
mongo
> use photoevent
> db.shares.findOne({})

# Doit avoir:
{
  _id: ObjectId(...),
  share_code: "ABC123XY",
  event_id: 1,
  selected_photo_ids: [...],
  downloads_count: 2,
  ...
}
```

---

## ✅ SIGNATURE DE VALIDATION

Si tous les points cochés ✅ :

**Le système est OPÉRATIONNEL et PRÊT POUR PRODUCTION** 🚀

```
Tester: _____________________
Date:   _____________________
Validé par: _____________________

Signature: _____________________
```

---

## 🎯 Résumé rapide pour l'équipe

```
✅ L'utilisateur peut:
   1. Scanner visage au kiosk
   2. Voir les photos qui le concernent
   3. Sélectionner ses photos
   4. Générer un code QR
   5. Partager via QR ou lien
   6. Client accède et télécharge les photos

🎉 C'est le CŒUR du système Owen'Snap!
```

---

**Status**: Production Ready v1.0  
**Maintenance**: Mensuelle recommendée  
**Support**: Consultez CORRECTION_SUMMARY.md
