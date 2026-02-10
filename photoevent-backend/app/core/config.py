"""
Configuration globale de l'application PhotoEvent Backend
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union, Any
from pydantic import field_validator, model_validator


class Settings(BaseSettings):
    """Configuration de l'application"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True
    )
    
    # Application
    APP_NAME: str = "PhotoEvent API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"
    
    # Serveur
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "photoevent"
    POSTGRES_USER: str = "photoevent_user"
    POSTGRES_PASSWORD: str = "change_me"
    
    @property
    def POSTGRES_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB: str = "photoevent"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # S3
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "photoevent-photos"
    S3_REGION: str = "us-east-1"
    
    # Sécurité
    SECRET_KEY: str = "change_this_secret_key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    
    # Traitement photos
    MAX_PHOTO_SIZE_MB: int = 50
    MAX_PHOTOS_PER_EVENT: int = 1000
    THUMBNAIL_SIZE: int = 400
    MAX_WORKERS: int = 4
    
    # Reconnaissance faciale
    FACE_DETECTION_CONFIDENCE: float = 0.5
    FACE_MATCH_THRESHOLD: float = 0.6
    MAX_FACES_PER_PHOTO: int = 20
    
    # Téléchargements
    DOWNLOAD_LINK_EXPIRY_DAYS: int = 7
    MAX_DOWNLOADS_PER_LINK: int = 10
    
    # CORS - peut être string CSV ou list
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:5173"]
    
    @model_validator(mode='before')
    @classmethod
    def parse_cors(cls, values: Any) -> Any:
        """Parse CORS origins depuis string ou list"""
        if isinstance(values, dict) and 'CORS_ORIGINS' in values:
            cors = values['CORS_ORIGINS']
            if isinstance(cors, str):
                values['CORS_ORIGINS'] = [origin.strip() for origin in cors.split(',')]
        return values


settings = Settings()
