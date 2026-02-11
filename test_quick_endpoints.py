#!/usr/bin/env python3
"""
Test rapide des endpoints
"""
import requests
import time

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 80)
print("TEST: Endpoints")
print("=" * 80)

# Test 1: Admin stats
print("\n1️⃣ Test /events/admin/stats")
try:
    response = requests.get(f"{BASE_URL}/events/admin/stats", timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Stats reçues:")
        print(f"   Total events: {data.get('total_events')}")
        print(f"   Total photos: {data.get('total_photos')}")
        print(f"   Total storage: {data.get('total_storage_mb')} MB")
    else:
        print(f"❌ Erreur: {response.text[:200]}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 2: List events
print("\n2️⃣ Test /events/")
try:
    response = requests.get(f"{BASE_URL}/events/", timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Events reçus: {len(data.get('events', []))} événements")
    else:
        print(f"❌ Erreur: {response.text[:200]}")
except Exception as e:
    print(f"❌ Exception: {e}")

print("\n" + "=" * 80)
print("Tests terminés")
print("Vérifiez que tous les endpoints répondent correctement")
