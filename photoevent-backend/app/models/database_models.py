"""
ORM SQLAlchemy Models - Event, Photo, Face, KioskSession
Pour PostgreSQL backend avec face recognition et photo management
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, Text, Boolean, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from enum import Enum
from app.database import Base


# ==================== ENUMS ====================

class EventStatus(str, Enum):
    """État d'un événement"""
    PLANNED = "PLANNED"      # Créé, pas encore commencé
    ACTIVE = "ACTIVE"        # En cours (photos uploadées)
    PROCESSING = "PROCESSING"  # Traitement facial en cours
    READY = "READY"          # Prêt pour téléchargement
    ARCHIVED = "ARCHIVED"    # Archivé/Supprimé (soft delete)


class PhotoQuality(str, Enum):
    """Qualités disponibles pour téléchargement"""
    PREVIEW = "PREVIEW"      # 60%
    STANDARD = "STANDARD"    # 85%
    PROFESSIONAL = "PROFESSIONAL"  # 95%


# ==================== MODELS ====================

class Event(Base):
    """Événements créés par les admins"""
    __tablename__ = "events_admin"
    
    # Identitant
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("admin_users.id"), nullable=False, index=True)
    
    # Infos générales
    code = Column(String(20), unique=True, nullable=False, index=True)  # EVT-2026-001
    pin_code = Column(String(6), nullable=False)  # Random 6 digits
    qr_secret = Column(String(100), unique=True, nullable=False)  # For QR generation
    
    name = Column(String(255), nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    location = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(SQLEnum(EventStatus), default=EventStatus.PLANNED, index=True)
    
    # Statistiques
    total_photos = Column(Integer, default=0)
    faces_detected = Column(Integer, default=0)
    total_downloads = Column(Integer, default=0)
    active_sessions = Column(Integer, default=0)
    
    # Prix
    price_amount = Column(Float, default=200000)  # FCFA
    currency = Column(String(3), default="XOF")
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan", lazy="dynamic")
    kiosk_sessions = relationship("KioskSession", back_populates="event", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Event(id={self.id}, code={self.code}, name={self.name}, admin_id={self.admin_id})>"


class Photo(Base):
    """Photos uploadées pour un événement"""
    __tablename__ = "photos_admin"
    
    # Identifiant
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events_admin.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Fichier
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, nullable=False)  # bytes
    mime_type = Column(String(50), default="image/jpeg")
    
    # Face Recognition
    faces_detected = Column(Integer, default=0)
    face_data = Column(JSON, nullable=True)  # Embedding ou metadata des visages
    
    # Qualités disponibles (variants générés)
    quality_variants = Column(JSON, default={})  # {"PREVIEW": path, "STANDARD": path, "PROFESSIONAL": path}
    
    # Downloads tracking
    downloads_preview = Column(Integer, default=0)
    downloads_standard = Column(Integer, default=0)
    downloads_professional = Column(Integer, default=0)
    
    # Batch upload
    batch_id = Column(String(50), nullable=True, index=True)  # UUID for grouping batch uploads
    batch_index = Column(Integer, nullable=True)  # Order within batch
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    processed_at = Column(DateTime, nullable=True)  # When face recognition completed
    
    # Relations
    event = relationship("Event", back_populates="photos")
    faces = relationship("Face", back_populates="photo", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Photo(id={self.id}, event_id={self.event_id}, filename={self.filename})>"


class Face(Base):
    """Visages détectés dans les photos"""
    __tablename__ = "faces_detected"
    
    id = Column(Integer, primary_key=True, index=True)
    photo_id = Column(Integer, ForeignKey("photos_admin.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Détection
    face_index = Column(Integer, nullable=False)  # 0, 1, 2... dans la photo
    confidence = Column(Float, nullable=False)  # 0.0 - 1.0
    
    # Bounding box
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_width = Column(Float, nullable=False)
    bbox_height = Column(Float, nullable=False)
    
    # Face embedding (pour reconnaissance)
    embedding = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relations
    photo = relationship("Photo", back_populates="faces")
    
    def __repr__(self):
        return f"<Face(id={self.id}, photo_id={self.photo_id}, confidence={self.confidence})>"


class KioskSession(Base):
    """Sessions kioskavec face recognition pour auto-tagging"""
    __tablename__ = "kiosk_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events_admin.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Session tracking
    session_code = Column(String(20), unique=True, nullable=False)  # For QR code
    visitor_name = Column(String(255), nullable=True)
    visitor_email = Column(String(255), nullable=True)
    
    # Face template (auto-captured)
    face_template = Column(JSON, nullable=True)  # Reference embedding
    
    # Status
    is_active = Column(Boolean, default=True)
    matched_photos = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    last_matched = Column(DateTime, nullable=True)
    
    # Relations
    event = relationship("Event", back_populates="kiosk_sessions")
    
    def __repr__(self):
        return f"<KioskSession(id={self.id}, event_id={self.event_id}, session_code={self.session_code})>"
