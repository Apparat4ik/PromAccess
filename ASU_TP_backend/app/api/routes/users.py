from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_role, log_audit
from app.db.models import User, Role
from app.schemas.request import RoleUpdateRequest

router = APIRouter()

@router.get("")
def get_all_users(
    current_user: User = Depends(require_role(["ADMIN"])), 
    db: Session = Depends(get_db)
):
    users = db.query(User).all()
    result = []
    for u in users:
        role = db.query(Role).filter(Role.id == u.role_id).first()
        result.append({
            "id": u.id, 
            "email": u.email, 
            "role": role.name if role else "USER"
        })
    return result

@router.put("/{user_id}/role")
def update_user_role(
    user_id: int, 
    request_data: RoleUpdateRequest, 
    request: Request,
    current_user: User = Depends(require_role(["ADMIN"])), 
    db: Session = Depends(get_db)
):
    # Изменение роли пользователя
    user_to_update = db.query(User).filter(User.id == user_id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
        
    new_role_obj = db.query(Role).filter(Role.name == request_data.new_role).first()
    if not new_role_obj:
        raise HTTPException(status_code=400, detail="Недопустимая роль")
        
    user_to_update.role_id = new_role_obj.id
    db.commit()
    
    log_audit(db, request, action=f"ROLE_CHANGED_TO_{request_data.new_role}", entity_type="users", entity_id=user_id, user_id=current_user.id)
    
    return {"message": "Роль успешно обновлена"}