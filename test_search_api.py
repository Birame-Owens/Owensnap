import requests
import base64
import cv2
from pathlib import Path

# Tester si on peut chercher une photo comme requête
event_id = 1
photo_path = Path("poc-test/photos-toutes") / "WhatsApp Image 2025-12-25 at 15.37.19.jpeg"

if not photo_path.exists():
    print(f"Erreur : {photo_path} introuvable")
else:
    # Lire la photo
    img = cv2.imread(str(photo_path))
    _, buffer = cv2.imencode('.jpg', img)
    base64_image = base64.b64encode(buffer).decode()
    
    # Envoyer à l'API
    response = requests.post(
        'http://localhost:8000/api/v1/search/face',
        json={
            'event_id': event_id,
            'face_image': base64_image,
            'threshold': 0.50
        }
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")