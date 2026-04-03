from sqlalchemy import Column, Integer, String, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class CMSSection(Base):
    __tablename__ = "cms_sections"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True) # e.g., 'hero', 'about'
    content = Column(JSON) # JSON format to hold dynamic values like title, subtitle, array of features, etc.

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="student") # "admin" or "student"
    name = Column(String)
    
    bookings = relationship("Booking", back_populates="user")

class ClassSession(Base):
    __tablename__ = "class_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String) # e.g. "Bachata Nivel 1"
    start_time = Column(DateTime, default=datetime.datetime.utcnow)
    total_spots = Column(Integer, default=20)
    available_spots = Column(Integer, default=20)
    target_role = Column(String, default="general") # chicos, chicas, general
    
    bookings = relationship("Booking", back_populates="class_session")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    class_session_id = Column(Integer, ForeignKey("class_sessions.id"))
    status = Column(String, default="active") # "active" or "cancelled"
    
    user = relationship("User", back_populates="bookings")
    class_session = relationship("ClassSession", back_populates="bookings")

# --- FASE 5: Clases Fijas y Matrículas ---
class ClassGroup(Base):
    __tablename__ = "class_groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True) # "Bachata 0", "Salsa 1"
    schedule_description = Column(String) # "Lunes y Miércoles 19h"
    max_students = Column(Integer, default=20)
    
    enrollments = relationship("Enrollment", back_populates="group")

class Enrollment(Base):
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    group_id = Column(Integer, ForeignKey("class_groups.id"))
    
    user = relationship("User", backref="enrollments")
    group = relationship("ClassGroup", back_populates="enrollments")

# --- FASE 6: Chat Directo ---
class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
