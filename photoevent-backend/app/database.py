"""
Configuration des connexions aux bases de données
PostgreSQL pour données relationnelles
MongoDB pour photos et embeddings
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL Configuration
POSTGRES_USER = os.getenv("POSTGRES_USER", "photoevent")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "photoevent123")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "photoevent_db")

SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"client_encoding": "utf8"}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# MongoDB Configuration
MONGO_HOST = os.getenv("MONGO_HOST", "localhost")
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_DB = os.getenv("MONGO_DB", "photoevent_db")

mongo_client = MongoClient(f"mongodb://{MONGO_HOST}:{MONGO_PORT}/")
mongo_db = mongo_client[MONGO_DB]

# Collections MongoDB
photos_collection = mongo_db["photos"]
faces_collection = mongo_db["faces"]

# Dependency pour FastAPI
def get_db():
    """Dépendance pour obtenir une session PostgreSQL"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_mongo():
    """Dépendance pour obtenir MongoDB"""
    return mongo_db

def get_mongodb():
    """Fonction helper pour obtenir MongoDB (non-dependency)"""
    return mongo_db
