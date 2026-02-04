"""
Application principale FastAPI - PhotoEvent Backend
Point d'entrée de l'API avec sécurité avancée
Les modèles de reconnaissance faciale sont lazy-loaded
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.middleware.rate_limiter import rate_limit_middleware
from pathlib import Path
import sys

# Désactiver les avertissements TensorFlow
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Créer l'application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API Backend pour PhotoEvent Kiosk - Reconnaissance faciale événements",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ajouter le middleware de rate limiting
app.middleware("http")(rate_limit_middleware)


@app.get("/")
async def root():
    """Page d'accueil API"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": f"{settings.API_PREFIX}/docs"
    }


@app.get("/health")
async def health_check():
    """Vérification santé de l'API"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


@app.get(f"{settings.API_PREFIX}/")
async def api_root():
    """Racine API v1"""
    return {
        "message": "PhotoEvent API v1",
        "endpoints": {
            "auth": f"{settings.API_PREFIX}/auth",
            "events": f"{settings.API_PREFIX}/events",
            "photos": f"{settings.API_PREFIX}/photos",
            "search": f"{settings.API_PREFIX}/search",
            "orders": f"{settings.API_PREFIX}/orders",
        }
    }


# Import des routers
from app.api import events, photos, search, orders, auth
app.include_router(auth.router, prefix=f"{settings.API_PREFIX}/auth", tags=["auth"])
app.include_router(events.router, prefix=f"{settings.API_PREFIX}/events", tags=["events"])
app.include_router(photos.router, prefix=f"{settings.API_PREFIX}/photos", tags=["photos"])
app.include_router(search.router, prefix=f"{settings.API_PREFIX}/search", tags=["search"])
app.include_router(orders.router, prefix=f"{settings.API_PREFIX}/orders", tags=["orders"])

# Servir les fichiers statiques (photos uploadées)
UPLOAD_DIR = Path("uploads/photos")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


if __name__ == "__main__":
    import uvicorn
    import logging
    logging.basicConfig(level=logging.DEBUG)
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False,  # Désactiver le reload pour éviter les problèmes au démarrage
        log_level="debug"
    )
