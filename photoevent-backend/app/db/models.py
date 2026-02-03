"""
Modèles SQLAlchemy pour PostgreSQL
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, ARRAY, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


class Event(Base):
    """Table des événements"""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    date = Column(Date, nullable=False, index=True)
    photographer_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relations
    orders = relationship("Order", back_populates="event", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Event(id={self.id}, code={self.code}, name={self.name})>"


class Order(Base):
    """Table des commandes (tokens QR/téléchargement)"""
    __tablename__ = "orders"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    download_token = Column(String(255), unique=True, nullable=False, index=True)
    photo_ids = Column(ARRAY(Text), nullable=False)  # Array de MongoDB ObjectIds
    method = Column(String(20), nullable=False)  # 'qr' ou 'print'
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    
    # Relations
    event = relationship("Event", back_populates="orders")
    print_jobs = relationship("PrintJob", back_populates="order", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Order(id={self.id}, token={self.download_token}, method={self.method})>"


class PrintJob(Base):
    """Table des jobs d'impression"""
    __tablename__ = "print_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, printing, completed, failed
    created_at = Column(DateTime, default=func.now(), nullable=False)
    completed_at = Column(DateTime, nullable=True)
    
    # Relations
    order = relationship("Order", back_populates="print_jobs")
    
    def __repr__(self):
        return f"<PrintJob(id={self.id}, order_id={self.order_id}, status={self.status})>"
