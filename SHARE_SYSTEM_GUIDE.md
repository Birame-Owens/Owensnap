# 🔗 Guide - Système de Partage QR Code

## 📋 Vue d'ensemble

Le système de partage QR fonctionne en 5 étapes :

```
1. Utilisateur entre code événement
2. Scan du visage (reconnaissance faciale)
3. Photos matchées s'affichent
4. Utilisateur sélectionne les photos
5. Génération d'un code QR à 48h
6. QR peut être scanné pour télécharger les photos
```

---

## 🐛 Bugs corrigés

### 1. **Erreur 500 - Partage**
**Problème**: 
```python
# AVANT (shares.py, ligne 40)
if len(photos_list) != len(selected_photo_ids):  # ❌ Variable indéfinie
```

**Correction**:
```python
# APRÈS
if len(photos_list) != len(request.selected_photo_ids):  # ✅ Correct
```

---

### 2. **Manque de logging et gestion d'erreurs**
**Problème**: Impossible de diagnostiquer les erreurs 500

**Correction**:
- ✅ Ajout de logging structuré (`logger.info`, `logger.error`)
- ✅ Messages d'erreur explicites retournés au frontend
- ✅ Try/except sécurisé avec contexte

---

### 3. **Pas de QR code affiché au frontend**
**Problème**: Le code QR n'était jamais généré ni affiché

**Correction**:
- ✅ Import `QRCode` depuis `qrcode` (déjà dans package.json)
- ✅ Ajout `qrCanvasRef` pour afficher le QR
- ✅ Génération dynamique avec `QRCode.toCanvas()`

---

## 🔧 Technologies utilisées

### Backend (Python/FastAPI)
```python
# /api/v1/shares
POST /    # Créer un partage
GET /{code}  # Consulter les photos
GET /     # Lister (admin)
DELETE /{code}  # Supprimer
```

**Données MongoDB (shares collection)**:
```json
{
  "_id": ObjectId,
  "share_code": "ABC123XY",
  "event_id": 1,
  "face_id": "auto_detected",
  "selected_photo_ids": [ObjectId, ObjectId],
  "created_at": "2026-02-11T10:30:00",
  "expires_at": "2026-02-13T10:30:00",
  "downloads_count": 0,
  "is_expired": false
}
```

### Frontend (React/TypeScript)
```tsx
// Kiosk.tsx - generateShareCode()
1. Valide event_id
2. POST /shares avec les IDs de photos sélectionnées
3. Reçoit share_code
4. Génère QR code avec QRCode.toCanvas()
5. Affiche le QR code et le lien
```

**URL publique de partage**:
```
http://localhost:3000/share/{share_code}
```

**Page de consultation** (ShareGallery.tsx):
```
GET /api/v1/shares/{share_code}
→ Affiche les photos
→ Vérifie expiration (48h)
→ Incrémente downloads_count
```

---

## 📊 Flux complet

### Côté Kiosk (création)
```
Kiosk.tsx (generateShareCode)
    ↓
POST /api/v1/shares
    ├─ Validate event_id ✅
    ├─ Validate photo IDs ✅
    ├─ Check photos exist ✅
    ├─ Create share in MongoDB
    └─ Return {share_code, expires_at}
    ↓
Frontend génère QR code
    ↓
Affiche le QR à l'écran
```

### Côté Client (consultation)
```
Scanner QR ou ouvrir lien
    ↓
/share/{code} → ShareGallery.tsx
    ↓
GET /api/v1/shares/{code}
    ├─ Validate code ✅
    ├─ Check expiration ✅
    ├─ Fetch photos ✅
    ├─ Increment downloads_count ✅
    └─ Return photos
    ↓
Affiche galerie téléchargeable
```

---

## 🧪 Test manuel

### 1. **Démarrer les services**
```bash
# Terminal 1: Backend
cd photoevent-backend
python main.py

# Terminal 2: Frontend
cd photoevent-frontend
npm run dev
```

### 2. **Test du flux complet**
```
1. Aller à http://localhost:3000/kiosk
2. Entrer code événement (ex: JK0LHAWK)
3. Cliquer "Démarrer caméra"
4. Capturer visage
5. Sélectionner des photos
6. Cliquer "Générer code"
7. ✅ QR code devrait s'afficher
8. 📱 Scanner avec mobile ou ouvrir lien de partage
9. ✅ Galerie devrait charger
```

### 3. **Vérifier les logs**
```
Backend console:
✅ [INFO] Création partage pour event_id=1, 3 photos
✅ [INFO] Photos trouvées: 3 sur 3 demandées
✅ [INFO] Partage créé: ABC123XY

Frontend console:
✅ 📤 Création du partage...
✅ ✅ Partage créé: {share_code: "ABC123XY", ...}
```

---

## 🚨 Dépannage

### Erreur: 500 Internal Server Error
**Diagnostic**:
```bash
# Vérifier les logs du backend
tail -f photoevent-backend/logs.txt
```

**Causes possibles**:
1. Photo ID invalide (pas un ObjectId MongoDB)
   → Solution: Vérifier que `photo_id` est en format MongoDB `string` de 24 caractères
   
2. Photo n'appartient pas à l'événement
   → Solution: Vérifier event_id correspond

3. MongoDB non disponible
   → Solution: `pip install pymongo`, vérifier connection string

---

### Erreur: QR code ne s'affiche pas
**Diagnostic**:
```tsx
// Vérifier dans les DevTools
console.log('qrCanvasRef:', qrCanvasRef.current)
```

**Causes possibles**:
1. Canvas ref non attachée
   → Solution: Vérifier `<canvas ref={qrCanvasRef} />` dans le JSX

2. QRCode.toCanvas() erreur
   → Solution: Installer `npm install qrcode`

3. URL invalide
   → Solution: Vérifier format: `http://localhost:3000/share/{code}`

---

## 📈 Optimisations futures

1. **Compression des images en haute qualité**
   - Endpoint `/photos/{id}/download-hq` pour 95% qualité
   
2. **Notification push**
   - Envoyer SMS avec lien au client
   - Slack/Email notification

3. **Analytics**
   - Tracker les téléchargements
   - Heats maps des résultats de recherche

4. **Partages privés**
   - Code d'accès requis
   - Limite des téléchargements

---

## ✅ Checklist mise en production

- [ ] Tests avec 50+ photos
- [ ] Tests concurrence (X utilisateurs simultanés)
- [ ] Monitoring MongoDB (indices, performance)
- [ ] CORS configuré pour domaine
- [ ] Rate limiting activé
- [ ] Sauvegardes MongoDB quotidiens
- [ ] Logs centralisés (Sentry)
- [ ] Cleanup des partages expirés (Celery task)

---

**Status**: ✅ FONCTIONNEL (v1)  
**Dernière mise à jour**: 11/02/2026  
**Auteur**: Système d'analyse IA
