from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from app.db.db_connect import Base, engine
from datetime import datetime


# Модели базы данных (ORM)

class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # ENGINEER, SECURITY_OFFICER, ADMIN
    description = Column(Text)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role_id = Column(Integer, ForeignKey("roles.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    role = relationship("Role")

class Equipment(Base):
    __tablename__ = "equipment"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    inventory_number = Column(String, unique=True, index=True)
    ip_address = Column(String)
    status = Column(String, default="ACTIVE")

class AccessRequest(Base):
    __tablename__ = "access_requests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED, REVOKED
    reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String)
    entity_type = Column(String)
    entity_id = Column(Integer)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class JwtBlacklist(Base):
    __tablename__ = "jwt_blacklist"
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    user_id = Column(Integer, ForeignKey("users.id"))
     
Base.metadata.create_all(bind=engine)