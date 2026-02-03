import requests
import base64
import cv2
from pathlib import Path
import json

event_id = 1
photo_path = Path("poc-test/photos-toutes") / "WhatsApp Image 2025-12-25 at 15.37.19.jpeg"

# Lire la photo
img = cv2.imread(str(photo_path))
_, buffer = cv2.imencode('.jpg', img)
base64_image = base64.b64encode(buffer).decode()

# Envoyer à l'API avec plus de détails
response = requests.post(
    'http://localhost:8000/api/v1/search/face',
    json={
        'event_id': event_id,
        'face_image': base64_image,
        'threshold': 0.30  # Très bas pour tester
    }
)

print(f"Status: {response.status_code}")
data = response.json()
print(f"Event ID: {data['event_id']}")
print(f"Total matches: {data['total_matches']}")
print(f"Threshold used: {data['threshold_used']}")
if data['matches']:
    print(f"Top match: {data['matches'][0]}")
else:
    print(" NO MATCHES FOUND")
    
# Essayer aussi avec seuil encore plus bas
print("\n--- Trying with threshold 0.1 ---")
response2 = requests.post(
    'http://localhost:8000/api/v1/search/face',
    json={
        'event_id': event_id,
        'face_image': base64_image,
        'threshold': 0.1
    }
)
data2 = response2.json()
print(f"Total matches: {data2['total_matches']}")
