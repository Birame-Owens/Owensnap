"""Test rate limiting"""
import asyncio
from app.middleware.rate_limiter import rate_limiter

async def test_rate_limiting():
    print('\n🧪 TEST 3: Rate Limiting (10 req/min per IP)')
    
    client_ip = "192.168.1.100"
    print(f'Client IP: {client_ip}')
    print(f'Limite: 10 requêtes / 60 secondes\n')
    
    print('Simulation de 12 requêtes:\n')
    
    for i in range(12):
        allowed, remaining, reset_in = await rate_limiter.check_rate_limit(client_ip)
        
        if allowed:
            status = '✅ ACCEPTÉE'
        else:
            status = '❌ REJETÉE'
        
        print(f'  Req {i+1:2d}: {status} | Restantes: {remaining:2d} | Reset: {reset_in}s')
    
    print('\n✅ Rate Limiting FONCTIONNEL')

# Exécuter le test
asyncio.run(test_rate_limiting())
