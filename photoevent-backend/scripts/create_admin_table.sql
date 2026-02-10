-- Créer la table Admin pour l'authentification des administrateurs
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index sur username pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);

-- Insérer un administrateur par défaut (password: admin123)
-- Vous devez générer le hash bcrypt pour le mot de passe
-- Utilisez: python -c "from passlib.context import CryptContext; pwd_context = CryptContext(schemes=['bcrypt']); print(pwd_context.hash('admin123'))"
INSERT INTO admin_users (username, password_hash, full_name, is_active) 
VALUES ('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkSuNYMhAg82FxBvH5QLX4qGSLnvvI/.PnS', 'Administrateur', TRUE)
ON CONFLICT (username) DO NOTHING;
