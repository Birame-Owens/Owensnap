# 📋 Instructions Finales - Configuration Bases de Données

## ✅ MongoDB - FAIT ✓
- Collections créées : `photos`, `faces`
- Index créés : 4 index par collection
- **Rien à faire, c'est bon !**

---

## 🔧 PostgreSQL - À Finaliser

### Étape 1 : Ouvrir pgAdmin

### Étape 2 : Se connecter à `photoevent_db`
- Clic droit sur `photoevent_db`
- Choisir "Query Tool"

### Étape 3 : Copier-coller ce script et exécuter (F5)

```sql
-- Table des événements
CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    photographer_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Table des commandes (QR codes)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    download_token VARCHAR(255) UNIQUE NOT NULL,
    photo_ids TEXT[],
    method VARCHAR(20) CHECK (method IN ('qr', 'print')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(download_token);
CREATE INDEX IF NOT EXISTS idx_orders_event ON orders(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_expires ON orders(expires_at);

-- Table des jobs d'impression
CREATE TABLE IF NOT EXISTS print_jobs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status);

-- Fonction trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vérifier
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

### Étape 4 : Vérifier le résultat

Vous devriez voir :
```
tablename
-----------
events
orders  
print_jobs
```

---

## 🧪 Test Final

Une fois les tables créées, relancez :

```powershell
cd "c:\mes-projets\Owen snap\photoevent-backend"
python test_db.py
```

Vous devriez voir :
```
✅ PostgreSQL connecté !
   Tables trouvées: events, orders, print_jobs
✅ MongoDB connecté !
   Collections: faces, photos
```

---

Dites-moi quand c'est fait ! 🚀
