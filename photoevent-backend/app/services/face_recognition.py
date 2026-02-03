"""
Service de reconnaissance faciale avec InsightFace (ArcFace)
Meilleure précision pour identification personnelle (99%)
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict
import base64
import tempfile
import os

# Essayer InsightFace d'abord (meilleur modèle)
try:
    import insightface
    INSIGHTFACE_AVAILABLE = True
except ImportError:
    INSIGHTFACE_AVAILABLE = False
    print("⚠️ InsightFace non installé. Utilisez: pip install insightface onnxruntime-gpu")

# Fallback sur DeepFace
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("⚠️ DeepFace non installé. Utilisez: pip install deepface tensorflow")

from app.core.config import settings


def normalize_embedding(embedding: List[float]) -> List[float]:
    """
    Normaliser un embedding en L2 (norme = 1)
    Crucial pour la comparaison cosinus correcte
    """
    if isinstance(embedding, list):
        embedding = np.array(embedding, dtype=np.float32)
    elif isinstance(embedding, np.ndarray):
        embedding = embedding.astype(np.float32)
    
    # Calculer la norme L2
    norm = np.linalg.norm(embedding)
    if norm == 0:
        return embedding.tolist()
    
    # Normaliser
    normalized = embedding / norm
    return normalized.tolist()


class FaceRecognitionService:
    """Service reconnaissance faciale avec InsightFace (ArcFace) ou DeepFace (FaceNet512)
    
    InsightFace : 99% de précision, ultra-rapide (recommandé)
    DeepFace : Fallback 95% de précision si InsightFace non disponible
    """
    
    def __init__(self):
        """Initialisation du meilleur modèle disponible"""
        self.use_insightface = False
        self.model = None
        
        # Préférer InsightFace (meilleure précision)
        if INSIGHTFACE_AVAILABLE:
            try:
                # Modèle ArcFace - le meilleur pour reconnaissance personnelle
                self.model = insightface.app.FaceAnalysis(
                    name='buffalo_l',  # Grand modèle haute précision
                    providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
                )
                self.model.prepare(ctx_id=0, det_size=(640, 640))  # GPU ou CPU auto
                self.use_insightface = True
                print("✅ InsightFace (ArcFace) activé - Précision : 99%")
            except Exception as e:
                print(f"⚠️ Erreur InsightFace: {e}, utilisation DeepFace en fallback")
                self.use_insightface = False
        
        # Fallback sur DeepFace
        if not self.use_insightface:
            if DEEPFACE_AVAILABLE:
                self.model_name = "Facenet512"  # 512-dim embeddings
                print(f"✅ DeepFace activé avec {self.model_name} - Précision : 95%")
            else:
                raise ImportError(
                    "Installez InsightFace OU DeepFace:\n"
                    "  - pip install insightface onnxruntime-gpu  # Recommandé (99%)\n"
                    "  - pip install deepface tensorflow          # Fallback (95%)"
                )
    
    
    def extract_faces_from_image(self, image_path: str) -> List[Dict]:
        """
        Extraire tous les visages d'une image avec embeddings haute précision
        
        Returns:
            Liste de dicts avec bbox, embedding, confidence
        """
        try:
            if self.use_insightface:
                return self._extract_insightface(image_path)
            else:
                return self._extract_deepface(image_path)
                
        except Exception as e:
            print(f"⚠️ Erreur extraction visages: {e}")
            return []
    
    
    def _extract_insightface(self, image_path: str) -> List[Dict]:
        """Extraction avec InsightFace (ArcFace)"""
        img = cv2.imread(str(image_path))
        if img is None:
            return []
        
        faces = self.model.get(img)
        result = []
        
        for face in faces:
            bbox = face.bbox.astype(int)
            # Normaliser l'embedding en L2
            embedding = normalize_embedding(face.embedding.astype(np.float32).tolist())
            result.append({
                'bbox': [int(bbox[0]), int(bbox[1]), 
                        int(bbox[2] - bbox[0]), int(bbox[3] - bbox[1])],
                'embedding': embedding,  # ✅ Normalisé
                'confidence': float(face.det_score)
            })
        
        return result
    
    
    def _extract_deepface(self, image_path: str) -> List[Dict]:
        """Extraction avec DeepFace (FaceNet512) - Fallback"""
        try:
            representations = DeepFace.represent(
                img_path=str(image_path),
                model_name=self.model_name,
                detector_backend="opencv",
                enforce_detection=False,
                align=True
            )
            
            faces = []
            for face_data in representations:
                bbox = face_data['facial_area']
                # Normaliser l'embedding en L2
                embedding = normalize_embedding(face_data['embedding'])
                faces.append({
                    'bbox': [
                        int(bbox['x']), 
                        int(bbox['y']), 
                        int(bbox['w']), 
                        int(bbox['h'])
                    ],
                    'embedding': embedding,  # ✅ Normalisé
                    'confidence': face_data.get('face_confidence', 0.9)
                })
            
            return faces
        except Exception as e:
            print(f"⚠️ Erreur DeepFace: {e}")
            return []
    
    
    def extract_face_from_base64(self, base64_image: str) -> Optional[List[float]]:
        """
        Extraire l'embedding d'un visage depuis une image base64
        
        Returns:
            Embedding normalisé (liste de floats) ou None si pas de visage
        """
        try:
            # Décoder base64
            image_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return None
            
            if self.use_insightface:
                # InsightFace directement en mémoire
                faces = self.model.get(image)
                if len(faces) == 0:
                    return None
                # ✅ Normaliser l'embedding
                embedding = faces[0].embedding.astype(np.float32).tolist()
                return normalize_embedding(embedding)
            
            else:
                # DeepFace a besoin d'un fichier temporaire
                with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                    cv2.imwrite(tmp.name, image)
                    tmp_path = tmp.name
                
                try:
                    representations = DeepFace.represent(
                        img_path=tmp_path,
                        model_name=self.model_name,
                        detector_backend="opencv",
                        enforce_detection=False,
                        align=True
                    )
                    
                    if len(representations) == 0:
                        return None
                    
                    # ✅ Normaliser l'embedding
                    embedding = representations[0]['embedding']
                    return normalize_embedding(embedding)
                    
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                    
        except Exception as e:
            print(f"⚠️ Erreur extraction visage base64: {e}")
            return None
    
    
    def compare_faces(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Comparer deux embeddings et retourner un score de similarité
        
        Score: 0.0 (très différent) -> 1.0 (identique)
        
        Pour InsightFace (ArcFace) : seuil = 0.5-0.6
        Pour DeepFace (FaceNet512) : seuil = 0.6-0.75
        """
        if embedding1 is None or embedding2 is None:
            return 0.0
        
        # Convertir en numpy si besoin
        if isinstance(embedding1, list):
            embedding1 = np.array(embedding1, dtype=np.float32)
        if isinstance(embedding2, list):
            embedding2 = np.array(embedding2, dtype=np.float32)
        
        # Les embeddings modernes sont normalisés L2, similarité cosinus est optimale
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Similarité cosinus normalisée
        cosine_sim = np.dot(embedding1, embedding2) / (norm1 * norm2)
        
        # InsightFace : sortie déjà en [0, 1]
        # DeepFace : peut être en [-1, 1], normaliser
        similarity = float(max(0.0, cosine_sim))
        
        return similarity
    
    
    def search_faces_in_event(
        self,
        query_embedding: np.ndarray,
        event_photos_embeddings: List[Tuple[str, List[Dict]]],
        threshold: float = None  # Auto-adapté au modèle
    ) -> List[Dict]:
        """
        Rechercher un visage parmi toutes les photos d'un événement
        
        Seuils recommandés:
        - InsightFace (ArcFace) : 0.50-0.60
        - DeepFace (FaceNet512) : 0.65-0.75
        
        Returns:
            Liste de matches triés par score
        """
        # Seuil auto-adapté au modèle
        if threshold is None:
            threshold = 0.55 if self.use_insightface else 0.70
        
        matches = []
        
        for photo_id, faces in event_photos_embeddings:
            for face_idx, face_data in enumerate(faces):
                embedding = np.array(face_data['embedding'])
                similarity = self.compare_faces(query_embedding, embedding)
                
                if similarity >= threshold:
                    matches.append({
                        'photo_id': photo_id,
                        'face_index': face_idx,
                        'similarity': similarity,
                        'bbox': face_data['bbox'],
                        'confidence': float(face_data.get('confidence', 0.9))
                    })
        
        # Trier par score décroissant
        matches.sort(key=lambda x: x['similarity'], reverse=True)
        
        return matches


# Instance globale (singleton)
_face_service = None

def get_face_service() -> FaceRecognitionService:
    """Obtenir l'instance du service de reconnaissance faciale"""
    global _face_service
    if _face_service is None:
        if DEEPFACE_AVAILABLE:
            _face_service = FaceRecognitionService()
        else:
            raise ImportError("DeepFace requis. Installez: pip install deepface")
    return _face_service


