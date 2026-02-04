"""
Backend simplifié pour test - Owen'Snap v1.5
Sans DeepFace/TensorFlow - Juste les optimisations
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZIPMiddleware
from app.core.config import settings
from app.middleware.rate_limiter import rate_limit_middleware
from pydantic import BaseModel
from datetime import timedelta
import base64
from PIL import Image
import io

# Import auth
from app.auth.jwt_manager import create_access_token

# Créer l'application
app = FastAPI(
    title=settings.APP_NAME,
    version="1.5-TEST",
    description="Owen'Snap - Test Mode (optimisations actives)",
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compression GZIP
app.add_middleware(GZIPMiddleware, minimum_size=1000)

# Rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# ============= HEALTH & ROOT =============

@app.get("/")
async def root():
    """Page d'accueil API"""
    return {
        "app": settings.APP_NAME,
        "version": "1.5-TEST",
        "mode": "TEST MODE (optimizations enabled)",
        "status": "🟢 RUNNING",
        "features": {
            "jwt_auth": "✅ Enabled",
            "rate_limiting": "✅ Enabled (10 req/min per IP)",
            "image_compression": "✅ Enabled",
            "mongodb_indexes": "✅ Available"
        },
        "docs": f"{settings.API_PREFIX}/docs"
    }

@app.get("/health")
async def health_check():
    """Vérification santé"""
    return {
        "status": "🟢 healthy",
        "version": "1.5",
        "timestamp": "now"
    }

# ============= API ROOT =============

@app.get(f"{settings.API_PREFIX}/")
async def api_root():
    """Racine API"""
    return {
        "message": "🎯 Owen'Snap API v1.5",
        "status": "✅ ACTIVE",
        "test_endpoints": {
            "1_auth_login": f"{settings.API_PREFIX}/auth/login",
            "2_compress_image": f"{settings.API_PREFIX}/compress-image",
            "3_test_rate_limit": "/health (call 11+ times)",
        }
    }

# ============= AUTH ENDPOINTS =============

class LoginRequest(BaseModel):
    username: str
    password: str
    event_id: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in_minutes: int

VALID_CREDENTIALS = {
    "photographer": "photo123",
    "admin": "admin123"
}

@app.post(f"{settings.API_PREFIX}/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    🔐 JWT Authentication
    
    **Test credentials:**
    - username: 'photographer', password: 'photo123'
    - username: 'admin', password: 'admin123'
    """
    if req.username not in VALID_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"❌ User '{req.username}' not found"
        )
    
    if VALID_CREDENTIALS[req.username] != req.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Invalid password"
        )
    
    token_data = {
        "sub": req.username,
        "event_id": req.event_id
    }
    
    access_token = create_access_token(
        token_data,
        timedelta(hours=8)
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=480
    )

# ============= IMAGE COMPRESSION ENDPOINTS =============

from app.services.image_compressor import ImageCompressor

class CompressionRequest(BaseModel):
    image_base64: str
    quality: int = 75
    max_dimension: int = 800

class CompressionResponse(BaseModel):
    compressed_base64: str
    original_size_kb: float
    compressed_size_kb: float
    compression_ratio_percent: float
    dimensions: tuple

@app.post(f"{settings.API_PREFIX}/compress-image", response_model=CompressionResponse)
async def compress_image(req: CompressionRequest):
    """
    📸 Image Compression with Quality Control
    
    **Quality presets:**
    - quality 90: 20-30% reduction (high quality)
    - quality 75: 60-70% reduction (balanced) ⭐ RECOMMENDED
    - quality 60: 80-90% reduction (aggressive)
    """
    try:
        compressed_b64, stats = ImageCompressor.compress_base64(
            req.image_base64,
            quality=req.quality,
            max_dimension=req.max_dimension
        )
        
        return CompressionResponse(
            compressed_base64=compressed_b64,
            original_size_kb=stats['original_size_kb'],
            compressed_size_kb=stats['compressed_size_kb'],
            compression_ratio_percent=stats['compression_ratio_percent'],
            dimensions=stats['dimensions']
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"❌ Compression failed: {str(e)}"
        )

# ============= TEST UTILITIES =============

def create_test_image(size: int = 300) -> str:
    """Créer une image de test en base64"""
    image = Image.new('RGB', (size, size), color='blue')
    buffer = io.BytesIO()
    image.save(buffer, format='JPEG', quality=85)
    return base64.b64encode(buffer.getvalue()).decode()

@app.get(f"{settings.API_PREFIX}/test-image")
async def get_test_image():
    """Obtenir une image de test en base64"""
    return {
        "image_base64": create_test_image(),
        "size": "300x300",
        "format": "JPEG",
        "quality": 85
    }

# ============= STARTUP =============

if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*70)
    print("🚀 Owen'Snap Backend v1.5 - TEST MODE")
    print("="*70)
    print("\n✅ Features Enabled:")
    print("   • JWT Authentication (Bearer tokens, 8h TTL)")
    print("   • Rate Limiting (10 req/min per IP)")
    print("   • Image Compression (70% reduction)")
    print("   • GZIP compression middleware")
    print("\n📍 Server: http://localhost:8000")
    print("📖 API Docs: http://localhost:8000/api/docs")
    print("\n🧪 Test Endpoints:")
    print("   1. POST /api/auth/login - JWT authentication")
    print("   2. GET /api/test-image - Get test image")
    print("   3. POST /api/compress-image - Compress image")
    print("   4. GET /health - Rate limit test (call 11+ times)")
    print("\n" + "="*70 + "\n")
    
    uvicorn.run(
        "main_test:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
