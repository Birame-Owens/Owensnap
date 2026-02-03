-- Script d'initialisation PostgreSQL
-- À exécuter dans pgAdmin (Query Tool)

-- 1. Créer l'utilisateur (si pas déjà existant)
DO
$$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'photoevent') THEN
      CREATE USER photoevent WITH PASSWORD 'poiuy';
   END IF;
END
$$;

-- 2. Créer la base de données
CREATE DATABASE photoevent_db OWNER photoevent;

-- Table des événements
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    photographer_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur le code événement (recherches fréquentes)
CREATE INDEX idx_events_code ON events(code);
CREATE INDEX idx_events_date ON events(date);

-- Table des commandes (QR codes)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
    download_token VARCHAR(255) UNIQUE NOT NULL,
    photo_ids TEXT[], -- Array de photo IDs MongoDB
    method VARCHAR(20) CHECK (method IN ('qr', 'print')),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur le token de téléchargement
CREATE INDEX idx_orders_token ON orders(download_token);
CREATE INDEX idx_orders_event ON orders(event_id);
CREATE INDEX idx_orders_expires ON orders(expires_at);

-- Table des jobs d'impression
CREATE TABLE print_jobs (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('pending', 'printing', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Index sur le statut
CREATE INDEX idx_print_jobs_status ON print_jobs(status);

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger sur events
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Afficher les tables créées
\dt
