"""
Script de test des connexions aux bases de données
"""
from app.database import engine, mongo_db, photos_collection, faces_collection
from sqlalchemy import text
import sys

def test_postgres():
    """Test connexion PostgreSQL"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1;"))
            result.fetchone()
            print("✅ PostgreSQL connecté !")
            
            # Tester les tables
            result = conn.execute(text("""
                SELECT tablename FROM pg_tables 
                WHERE schemaname = 'public'
                ORDER BY tablename;
            """))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"   Tables trouvées: {', '.join(tables)}")
            else:
                print("   ⚠️  Aucune table - Exécutez scripts/create_tables.sql")
            
            return True
    except Exception as e:
        print(f"❌ Erreur PostgreSQL: {e}")
        return False

def test_mongodb():
    """Test connexion MongoDB"""
    try:
        # Test connexion
        mongo_db.command('ping')
        print("\n✅ MongoDB connecté !")
        
        # Lister collections
        collections = mongo_db.list_collection_names()
        if collections:
            print(f"   Collections: {', '.join(collections)}")
            
            # Vérifier index photos
            if 'photos' in collections:
                indexes = list(photos_collection.list_indexes())
                print(f"   Index photos: {len(indexes)} index")
            
            # Vérifier index faces
            if 'faces' in collections:
                indexes = list(faces_collection.list_indexes())
                print(f"   Index faces: {len(indexes)} index")
        else:
            print("   ⚠️  Aucune collection - Exécutez scripts/init_mongodb.js")
        
        return True
    except Exception as e:
        print(f"❌ Erreur MongoDB: {e}")
        return False

def main():
    print("=" * 60)
    print("  🔍 TEST CONNEXIONS BASES DE DONNÉES")
    print("=" * 60)
    
    postgres_ok = test_postgres()
    mongodb_ok = test_mongodb()
    
    print("\n" + "=" * 60)
    if postgres_ok and mongodb_ok:
        print("✅ TOUTES LES CONNEXIONS FONCTIONNENT !")
        print("\nProchaine étape : Créer les tables si pas encore fait")
        print("  → PostgreSQL: Exécuter scripts/create_tables.sql dans pgAdmin")
        print("  → MongoDB: Exécuter scripts/init_mongodb.js dans Mongosh")
        sys.exit(0)
    else:
        print("❌ ERREURS DE CONNEXION")
        print("\nVérifiez :")
        print("  - PostgreSQL et MongoDB sont démarrés")
        print("  - Fichier .env correctement configuré")
        print("  - Identifiants corrects")
        sys.exit(1)

if __name__ == "__main__":
    main()
