# Configuration des bases de données

## PostgreSQL (pgAdmin)

### 1. Créer l'utilisateur et la base de données

Ouvrir pgAdmin et exécuter :

```sql
-- Créer l'utilisateur
CREATE USER photoevent WITH PASSWORD 'photoevent123';

-- Créer la base de données
CREATE DATABASE photoevent_db OWNER photoevent;

-- Donner tous les privilèges
GRANT ALL PRIVILEGES ON DATABASE photoevent_db TO photoevent;
```

### 2. Exécuter le script d'initialisation

1. Dans pgAdmin, se connecter à `photoevent_db`
2. Ouvrir Query Tool
3. Copier le contenu de `scripts/init_postgres.sql`
4. Exécuter (F5)

### 3. Vérifier les tables

```sql
-- Lister les tables
\dt

-- Devrait afficher :
-- events
-- orders
-- print_jobs
```

---

## MongoDB (MongoDB Compass)

### 1. Se connecter à MongoDB

- Ouvrir MongoDB Compass
- Connexion : `mongodb://localhost:27017`

### 2. Créer la base de données

1. Cliquer "Create Database"
2. Database Name : `photoevent_db`
3. Collection Name : `photos`
4. Cliquer "Create Database"

### 3. Exécuter le script d'initialisation

**Méthode A : MongoDB Compass**
1. Sélectionner `photoevent_db`
2. Ouvrir "Mongosh" (en bas)
3. Copier le contenu de `scripts/init_mongodb.js`
4. Coller et exécuter

**Méthode B : Terminal mongosh**
```bash
mongosh
use photoevent_db
# Copier-coller le contenu de scripts/init_mongodb.js
```

### 4. Vérifier les collections

Dans MongoDB Compass, vous devriez voir :
- Collection `photos` avec index
- Collection `faces` avec index

---

## Vérification finale

### Test PostgreSQL

```sql
-- Tester insertion événement
INSERT INTO events (code, name, date) 
VALUES ('TEST001', 'Test Événement', '2025-12-25');

-- Vérifier
SELECT * FROM events;
```

### Test MongoDB

Dans Mongosh :
```javascript
// Tester insertion photo
db.photos.insertOne({
    event_id: 1,
    filename: "test.jpg",
    status: "ready",
    faces_count: 2,
    uploaded_at: new Date()
});

// Vérifier
db.photos.find().pretty();
```

---

## Variables d'environnement

Mettre à jour `.env` si nécessaire :

```env
# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=photoevent
POSTGRES_PASSWORD=photoevent123
POSTGRES_DB=photoevent_db

# MongoDB
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=photoevent_db
```

---

## Dépannage

### PostgreSQL - Erreur connexion
```bash
# Vérifier que PostgreSQL tourne
# Windows : Services → PostgreSQL

# Tester connexion
psql -U photoevent -d photoevent_db -h localhost
```

### MongoDB - Erreur connexion
```bash
# Vérifier que MongoDB tourne
# Windows : Services → MongoDB

# Tester connexion
mongosh mongodb://localhost:27017
```
