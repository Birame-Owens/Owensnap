"""
Test FastAPI simplifié - Sans DeepFace/TensorFlow
Pour tester JWT auth + Rate Limiting + Compression
"""
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.middleware.rate_limiter import rate_limit_middleware
from app.auth.jwt_manager import create_access_token, HTTPAuthCredentials
from app.services.image_compressor import ImageCompressor
from pydantic import BaseModel
from datetime import timedelta
import base64
from PIL import Image
import io

# Créer l'app
app = FastAPI(
    title="Owen'Snap Test API",
    version="1.5"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.middleware("http")(rate_limit_middleware)

# ============= ENDPOINTS =============

@app.get("/")
async def root():
    """Santé"""
    return {
        "status": "✅ Owen'Snap API v1.5 is running!",
        "features": ["JWT Auth", "Rate Limiting", "Image Compression"],
        "endpoints": {
            "auth_login": "/auth/login (POST)",
            "compress_image": "/compress-image (POST)",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "version": "1.5"}

# ============= AUTH =============

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

@app.post("/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """
    🔐 TEST: JWT Authentication
    
    Credentials:
    - username: 'photographer', password: 'photo123'
    - username: 'admin', password: 'admin123'
    """
    if req.username not in VALID_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="❌ Invalid username"
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

# ============= COMPRESSION =============

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

@app.post("/compress-image", response_model=CompressionResponse)
async def compress_image(req: CompressionRequest):
    """
    📸 TEST: Image Compression with Quality Control
    
    Presets:
    - quality 90: 20-30% reduction (high quality)
    - quality 75: 60-70% reduction (balanced) ⭐
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

# ============= TEST ENDPOINTS =============

@app.get("/test-endpoints")
async def test_endpoints():
    """Liste de tous les endpoints de test"""
    return {
        "🧪 Available Tests": {
            "1_jwt_auth": {
                "endpoint": "POST /auth/login",
                "body": {
                    "username": "photographer",
                    "password": "photo123",
                    "event_id": "JK0LHAWK"
                }
            },
            "2_rate_limiting": {
                "endpoint": "GET /health",
                "description": "Call multiple times - 11th request will be rate limited (429)"
            },
            "3_image_compression": {
                "endpoint": "POST /compress-image",
                "body": {
                    "image_base64": "<base64_image_data>",
                    "quality": 75,
                    "max_dimension": 800
                }
            }
        }
    }

if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting Owen'Snap Test API v1.5")
    print("=" * 70)
    print("Features enabled:")
    print("  ✅ JWT Authentication (Bearer tokens)")
    print("  ✅ Rate Limiting (10 req/min per IP)")
    print("  ✅ Image Compression (70% reduction)")
    print("\n📍 Visit: http://localhost:8000")
    print("📖 Docs: http://localhost:8000/docs")
    print("=" * 70 + "\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
