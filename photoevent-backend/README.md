# 📸 PhotoEvent Backend

API Backend pour PhotoEvent Kiosk - Système de reconnaissance faciale pour événements

## 🚀 Démarrage Rapide

### 1. Installation dépendances

```bash
pip install -r requirements.txt
```

### 2. Configuration

Copier `.env.example` vers `.env` et ajuster les variables

### 3. Lancer le serveur

```bash
python main.py
```

Ou avec uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 📚 Documentation API

Une fois le serveur lancé :
- Swagger UI : http://localhost:8000/api/v1/docs
- ReDoc : http://localhost:8000/api/v1/redoc

## 🏗️ Structure

```
photoevent-backend/
├── app/
│   ├── api/           # Routes API
│   │   └── events.py  # Gestion événements
│   ├── core/          # Configuration
│   │   └── config.py  # Settings
│   ├── models/        # Modèles de données
│   │   ├── event.py
│   │   └── photo.py
│   ├── services/      # Logique métier
│   │   └── face_recognition.py  # IA reconnaissance
│   ├── workers/       # Workers Celery
│   └── db/            # Connexions DB
├── tests/             # Tests
├── uploads/           # Uploads temporaires
├── main.py            # Point d'entrée
├── requirements.txt   # Dépendances
└── .env              # Configuration
```

## 🔧 Technologies

- **FastAPI** : Framework web moderne
- **MediaPipe** : Reconnaissance faciale IA
- **MongoDB** : Base NoSQL (photos, embeddings)
- **PostgreSQL** : Base SQL (événements, commandes)
- **Redis** : Cache & queue
- **Celery** : Workers asynchrones
- **S3/MinIO** : Stockage photos

## 📋 Endpoints Disponibles

### Événements
- `POST /api/v1/events` - Créer événement
- `GET /api/v1/events` - Lister événements
- `GET /api/v1/events/{id}` - Détails événement
- `PATCH /api/v1/events/{id}` - Modifier événement
- `DELETE /api/v1/events/{id}` - Supprimer événement
- `GET /api/v1/events/{id}/stats` - Statistiques

### À venir
- Photos upload & traitement
- Recherche faciale
- Génération QR codes
- Commandes téléchargement

## 🧪 Tests

```bash
pytest tests/
```

## 📝 État Développement

- [x] Structure projet
- [x] Configuration
- [x] Modèles données
- [x] API événements
- [x] Service reconnaissance faciale
- [ ] Upload photos
- [ ] Worker traitement
- [ ] Recherche faciale
- [ ] Génération QR
- [ ] Tests unitaires

## 🔐 Sécurité

- JWT Authentication (à implémenter)
- CORS configuré
- Rate limiting (à implémenter)
- Validation données Pydantic

## 📞 Support

Projet : PhotoEvent Kiosk V0
Version : 0.1.0
Date : Décembre 2025
