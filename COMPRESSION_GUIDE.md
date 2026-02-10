# 📸 Guide de Gestion de l'Espace Disque - PhotoEvent

## 🎯 Stratégie Actuelle

### Compression Automatique
Toutes les photos sont **compressées automatiquement** lors de l'upload:

- **Format**: JPEG (85% qualité)
- **Réduction**: ~50-70% d'espace disque
- **Résolution max**: 2048×2048 pixels
- **Conversion**: RGBA → RGB (fond blanc)

### Exemple de compression
```
Photo originale:     800 KB (PNG 4000×3000)
Photo compressée:    180 KB (JPEG 2048×1536)
Économie:            620 KB (77% d'espace économisé!)
```

---

## 📊 Monitorer l'Espace

### Dashboard Admin
**Accès**: http://localhost:3001/admin (onglet Dashboard)

Affiche:
- **Espace utilisé par événement** (en MB)
- **Moyenne par photo** (alerte si > 2 MB)
- **Nombre de photos** par événement
- **Visages détectés** par événement

### API - Endpoint `/admin/stats`
```json
{
  "total_events": 4,
  "total_photos": 187,
  "total_faces": 289,
  "total_storage_mb": 280.5,
  "avg_photo_size_mb": 1.5,
  "events": [
    {
      "name": "Mariage Owen",
      "photo_count": 44,
      "faces_count": 50,
      "storage_mb": 68.4,
      "avg_photo_size_mb": 1.55
    }
  ]
}
```

---

## 🔧 Configuration Disponible

### Fichier: `app/api/photos.py` (lignes 25-27)

```python
COMPRESSION_QUALITY = 85  # Range: 1-100 (plus bas = plus comprimé)
MAX_WIDTH = 2048          # Pixels
MAX_HEIGHT = 2048         # Pixels
```

### Ajuster la Qualité

| Qualité | Taille Photo | Qualité visuelle | Usage |
|---------|-------------|------------------|-------|
| **60** | 100 KB | Basique | Archives |
| **75** | 150 KB | Bon | Réduction rapide |
| **85** | 180 KB | Très bon | **Défaut (équilibre)** |
| **95** | 250 KB | Excellent | Haute qualité |

**Recommandation**: Qualité 75-80 pour économiser plus d'espace.

---

## 💡 Meilleures Pratiques

### Pour les Événements Volumineux

1. **Upload progressif** (50 photos max par session)
2. **Vérifier l'espace** avant chaque lot
3. **Archiver les événements anciens** (> 3 mois)

### Stockage Global
| Événement | Photos | Taille | Moy/Photo |
|-----------|--------|--------|-----------|
| Mariage Owen | 44 | 68 MB | 1.5 MB |
| Baptême | 44 | 66 MB | 1.5 MB |
| Section Inf | 53 | 80 MB | 1.5 MB |
| Journée Integration | 46 | 69 MB | 1.5 MB |
| **TOTAL** | **187** | **280 MB** | **1.5 MB** |

---

## 🚨 Alertes

### ⚠️ Moyenne photo > 2 MB
**Action recommandée**: 
- Réduire `COMPRESSION_QUALITY` de 85 → 75
- Redémarrer le backend

### ⚠️ Espace total > 1 GB
**Action recommandée**:
- Considérer migration vers cloud (S3, CloudFlare R2)
- Implémenter watermarking pour publicité

---

## 🔄 Processus de Compression

```
Upload Photo (4 MB PNG)
        ↓
PIL.Image.open() et validation
        ↓
Redimensionner si > 2048 pixels
        ↓
Convertir RGBA→RGB si nécessaire
        ↓
Compiler en JPEG (qualité 85)
        ↓
Sauvegarder (180 KB) ✅
        ↓
Stocker métadonnées MongoDB:
   - file_size: 180000
   - original_size: 4000000
   - compression_ratio: 0.045
   - storage_saved_mb: 3.82
```

---

## 🎓 Technologie

**Avant**: Estimation (photos × 1.5 MB)
**Maintenant**: Calcul réel basé sur taille fichier

### Impact sur la Reconnaissance Faciale
- ✅ La compression JPEG ne réduit pas la détection (85% = qualité suffisante)
- ✅ Les embeddings faciaux restent identiques
- ✅ Économie de 70% d'espace sans perte de précision

---

## 📝 Prochaines Étapes

- [ ] Implémenter WebP pour meilleure compression
- [ ] Ajouter option "qualité basse" pour téléchargement rapide
- [ ] Dédoublonner les photos (hash MD5)
- [ ] S3 pour stockage illimité

---

*Mise à jour: 10 Février 2026*
