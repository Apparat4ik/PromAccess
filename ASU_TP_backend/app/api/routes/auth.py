from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM, logger
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.dependencies import get_db, get_current_user, log_audit, oauth2_scheme, rate_limit_login
from app.db.models import User, Role, JwtBlacklist
from app.schemas.user import UserCreate, TokenResponse

router = APIRouter()

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Запрещаем открытую регистрацию администраторов и безопасников
    if user_data.role_name in ["ADMIN", "SECURITY_OFFICER"]:
        raise HTTPException(
            status_code=403, 
            detail="Регистрация с привилегированными ролями запрещена. Обратитесь к администратору."
        )
    
    # Валидация входных данных: разрешаем регистрировать только USER или ENGINEER
    if user_data.role_name not in ["USER", "ENGINEER"]:
        user_data.role_name = "USER" # Защита от ввода несуществующих ролей

    # Создание роли, если её нет
    role = db.query(Role).filter(Role.name == user_data.role_name).first()
    if not role:
        role = Role(name=user_data.role_name, description="Автосозданная базовая роль")
        db.add(role)
        db.commit()
        db.refresh(role)
        
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
        
    hashed_password = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, password_hash=hashed_password, role_id=role.id)
    db.add(new_user)
    db.commit()
    return {"detail": "Пользователь успешно зарегистрирован"}

@router.post("/login", response_model=TokenResponse)
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), _: None = Depends(rate_limit_login)):
    """Вход пользователя в систему и получение пары токенов"""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        logger.warning(f"Неудачная попытка входа для пользователя {form_data.username}")
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else "USER"
    
    # Генерация Access токена
    access_token = create_access_token(
        data={"sub": user.email, "role": role_name},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Генерация Refresh токена. В payload добавляем тип токена.
    refresh_token = create_access_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    log_audit(db, request, action="LOGIN_SUCCESS", entity_type="users", entity_id=user.id, user_id=user.id)
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/refresh", response_model=TokenResponse)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """Механизм продления сессии"""
    refresh_token = request.cookies.get("refresh_token")
    credentials_exception = HTTPException(status_code=401, detail="Недействительный refresh токен")
    
    if not refresh_token:
        raise credentials_exception
    
    is_blacklisted = db.query(JwtBlacklist).filter(JwtBlacklist.token == refresh_token).first()
    if is_blacklisted:
        raise credentials_exception

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise credentials_exception
        
    role = db.query(Role).filter(Role.id == user.role_id).first()
    
    new_access_token = create_access_token(
        data={"sub": user.email, "role": role.name if role else "USER"},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    new_refresh_token = create_access_token(
        data={"sub": user.email, "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    
    blacklist_token = JwtBlacklist(
        token=refresh_token,
        expires_at=datetime.utcnow() + timedelta(days=7),
        user_id=user.id
    )
    db.add(blacklist_token)
    db.commit()
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    
    return {"access_token": new_access_token, "token_type": "bearer"}



@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(request: Request, response: Response, token: str = Depends(oauth2_scheme), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Выход из системы (отзыв токена)"""
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    exp = payload.get("exp")
    
    blacklist_token = JwtBlacklist(
        token=token,
        expires_at=datetime.utcfromtimestamp(exp),
        user_id=current_user.id
    )
    db.add(blacklist_token)
    db.commit()
    log_audit(db, request, action="LOGOUT", entity_type="users", entity_id=current_user.id, user_id=current_user.id)
    
    response.delete_cookie("refresh_token")
    return {"detail": "Токен успешно отозван"}
