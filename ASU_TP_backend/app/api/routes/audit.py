from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.core.dependencies import get_db, require_role
from app.schemas.audit import AuditLogResponse
from app.db.models import AuditLog

router = APIRouter()

#  Получение всего журнала действий (только для Администратора)
@router.get("/", response_model=List[AuditLogResponse])
def get_all_logs(
    limit: int = 100, 
    skip: int = 0, 
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()

# Фильтрация инцидентов по конкретному пользователю
@router.get("/user/{user_id}", response_model=List[AuditLogResponse])
def get_user_logs(
    user_id: int, 
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).filter(AuditLog.user_id == user_id).all()
