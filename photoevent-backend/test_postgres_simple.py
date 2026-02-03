"""
Test simple PostgreSQL sans récupération de données encodées
"""
import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        port="5432",
        database="photoevent_db",
        user="photoevent",
        password="poiuy",
        options="-c client_encoding=WIN1252"
    )
    print("✅ PostgreSQL : Connexion réussie !")
    
    cursor = conn.cursor()
    cursor.execute("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
    tables = [row[0] for row in cursor.fetchall()]
    
    if tables:
        print(f"✅ Tables trouvées : {', '.join(tables)}")
    else:
        print("⚠️  Aucune table - Exécutez le script SQL dans pgAdmin")
        print("\nScript à exécuter dans Query Tool de photoevent_db :")
        print("→ Voir scripts/create_tables.sql")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"❌ Erreur : {e}")
    print("\nVérifiez :")
    print("  - PostgreSQL est démarré")
    print("  - Base 'photoevent_db' existe")
    print("  - User 'photoevent' avec password 'poiuy'")
