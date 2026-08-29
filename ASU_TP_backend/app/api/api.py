from fastapi import APIRouter, Depends
from app.api.routes import auth, request, audit, users
from app.db.models import Equipment
from app.schemas.request import EquipmentResponse
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from typing import List

# главный роутер для всего API
api_router = APIRouter()

# Подключаем к нему все дочерние роутеры с указанием префиксов и тегов для Swagger-документации
api_router.include_router(auth.router, prefix="/auth", tags=["Авторизация"])
api_router.include_router(request.router, prefix="/requests", tags=["Заявки на доступ"])
api_router.include_router(audit.router, prefix="/audit-log", tags=["Журнал аудита"])
api_router.include_router(users.router, prefix="/users", tags=["Список ролей пользлователей"])

@api_router.get("/equipment", response_model=List[EquipmentResponse])
def get_equipment(db: Session = Depends(get_db)):
    return db.query(Equipment).filter(Equipment.status == "ACTIVE").all()