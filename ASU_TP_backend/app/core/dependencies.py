from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.db.db_connect import SessionLocal
from app.db.models import User, Role, JwtBlacklist, AuditLog
from app.core.config import SECRET_KEY, ALGORITHM, logger
from jose import jwt, JWTError
from typing import List


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



# Функция для ведения журнала аудита
def log_audit(db: Session, request: Request, action: str, entity_type: str, entity_id: int, user_id: int = None):
    ip_address = request.client.host if request.client else "unknown"
    log_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        ip_address=ip_address
    )
    db.add(log_entry)
    db.commit()

# Зависимость для получения текущего пользователя из JWT
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 1. Проверка в черном списке
    is_blacklisted = db.query(JwtBlacklist).filter(JwtBlacklist.token == token).first()
    if is_blacklisted:
        logger.warning(f"Попытка доступа с отозванным токеном")
        raise credentials_exception

    # 2. Декодирование токена
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# Зависимость для проверки ролей (Авторизация)
def require_role(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        user_role = db.query(Role).filter(Role.id == current_user.role_id).first()
        if not user_role or user_role.name not in allowed_roles:
            logger.warning(f"Отказ в доступе: Пользователь {current_user.email} пытался выполнить действие, требующее ролей {allowed_roles}")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Недостаточно прав для выполнения данного действия")
        return current_user
    return role_checker

import time
from collections import defaultdict

# Простой in-memory rate limiter для защиты от брутфорса
LOGIN_ATTEMPTS = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 60

def rate_limit_login(request: Request):
    ip = request.client.host if request.client else "unknown"
    current_time = time.time()
    
    # Очистка старых попыток
    LOGIN_ATTEMPTS[ip] = [t for t in LOGIN_ATTEMPTS[ip] if current_time - t < WINDOW_SECONDS]
    
    if len(LOGIN_ATTEMPTS[ip]) >= MAX_ATTEMPTS:
        logger.warning(f"Слишком много попыток входа с IP {ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Слишком много попыток входа. Пожалуйста, подождите 1 минуту."
        )
    
    LOGIN_ATTEMPTS[ip].append(current_time)