"""
Middleware de Rate Limiting pour FastAPI
10 requêtes par minute par IP
"""
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
from typing import Dict, Tuple
import asyncio

class RateLimiter:
    """
    Rate limiter simple basé sur les IPs
    Limite: 10 requêtes par minute par IP
    """
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}  # IP -> [timestamps]
        self.lock = asyncio.Lock()
    
    async def check_rate_limit(self, client_ip: str) -> Tuple[bool, int, int]:
        """
        Vérifier si le client a dépassé le rate limit
        Retourne: (allowed, remaining, reset_in_seconds)
        """
        async with self.lock:
            now = datetime.utcnow()
            
            # Initialiser la liste si nécessaire
            if client_ip not in self.requests:
                self.requests[client_ip] = []
            
            # Nettoyer les anciennes requêtes
            cutoff = now - timedelta(seconds=self.window_seconds)
            self.requests[client_ip] = [
                req_time for req_time in self.requests[client_ip]
                if req_time > cutoff
            ]
            
            # Vérifier le limit
            current_count = len(self.requests[client_ip])
            
            if current_count >= self.max_requests:
                # Calculer le temps avant réinitialisation
                oldest_request = self.requests[client_ip][0]
                reset_time = oldest_request + timedelta(seconds=self.window_seconds)
                reset_in = (reset_time - now).total_seconds()
                return False, 0, max(int(reset_in), 1)
            
            # Ajouter la requête
            self.requests[client_ip].append(now)
            remaining = self.max_requests - current_count - 1
            
            return True, remaining, self.window_seconds
    
    async def cleanup_old_ips(self):
        """Nettoyer les IPs inactives toutes les heures"""
        while True:
            await asyncio.sleep(3600)
            async with self.lock:
                now = datetime.utcnow()
                cutoff = now - timedelta(hours=1)
                
                to_delete = [
                    ip for ip, requests in self.requests.items()
                    if all(req < cutoff for req in requests)
                ]
                
                for ip in to_delete:
                    del self.requests[ip]

# Instance globale du rate limiter
rate_limiter = RateLimiter(max_requests=10, window_seconds=60)

async def rate_limit_middleware(request: Request, call_next):
    """
    Middleware pour appliquer le rate limiting
    """
    # Obtenir l'IP du client
    client_ip = request.client.host if request.client else "unknown"
    
    # Vérifier le rate limit
    allowed, remaining, reset_in = await rate_limiter.check_rate_limit(client_ip)
    
    # Ajouter les headers de rate limit
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_limiter.max_requests)
    response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
    response.headers["X-RateLimit-Reset"] = str(int((datetime.utcnow() + timedelta(seconds=reset_in)).timestamp()))
    
    if not allowed:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "detail": f"Rate limit exceeded. Retry after {reset_in} seconds",
                "retry_after": reset_in
            },
            headers={
                "Retry-After": str(reset_in),
                "X-RateLimit-Limit": str(rate_limiter.max_requests),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int((datetime.utcnow() + timedelta(seconds=reset_in)).timestamp()))
            }
        )
    
    return response
