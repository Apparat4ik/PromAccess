from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user, require_role, log_audit
from app.db.models import AccessRequest, User, Role
from app.schemas.request import RequestCreate, RequestStatusUpdate, RequestResponse

router = APIRouter()

@router.post("/", response_model=RequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(request_data: RequestCreate, request: Request, current_user: User = Depends(require_role(["ENGINEER"])), db: Session = Depends(get_db)):
    """Создание заявки на доступ (Только для Инженера)"""
    if request_data.start_time >= request_data.end_time:
        raise HTTPException(status_code=400, detail="Дата начала не может быть позже даты окончания.")
        
    new_req = AccessRequest(
        user_id=current_user.id,
        equipment_id=request_data.equipment_id,
        start_time=request_data.start_time,
        end_time=request_data.end_time,
        reason=request_data.reason
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    
    # Записываем в журнал аудита ( entity_id = ID новой заявки)
    log_audit(db, request, action="REQUEST_CREATED", entity_type="access_requests", entity_id=new_req.id, user_id=current_user.id)
    return new_req

@router.put("/{req_id}/status", response_model=RequestResponse)
def update_request_status(req_id: int, status_update: RequestStatusUpdate, request: Request, current_user: User = Depends(require_role(["SECURITY_OFFICER", "ADMIN"])), db: Session = Depends(get_db)):
    """Изменение статуса заявки (Только для Специалиста ИБ или Администратора)"""
    db_req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
        
    old_status = db_req.status
    db_req.status = status_update.status
    db.commit()
    db.refresh(db_req)
    
    # Логируем изменение статуса
    log_audit(db, request, action=f"STATUS_CHANGED_{old_status}_TO_{status_update.status}", entity_type="access_requests", entity_id=db_req.id, user_id=current_user.id)
    return db_req

@router.get("/", response_model=List[RequestResponse])
def get_requests(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Получение списка заявок. Инженер видит только свои, ИБ/Админ - все."""
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    
    if role and role.name == "ENGINEER":
        requests = db.query(AccessRequest).filter(AccessRequest.user_id == current_user.id).all()
    else:
        requests = db.query(AccessRequest).all()
        
    return requests

@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(req_id: int, request: Request, current_user: User = Depends(require_role(["ENGINEER", "ADMIN"])), db: Session = Depends(get_db)):
    """Удаление заявки (Инженер может удалить только свою)"""
    db_req = db.query(AccessRequest).filter(AccessRequest.id == req_id).first()
    if not db_req:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
        
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role.name == "ENGINEER" and db_req.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы можете удалять только свои заявки")
        
    db.delete(db_req)
    db.commit()
    
    log_audit(db, request, action="REQUEST_DELETED", entity_type="access_requests", entity_id=req_id, user_id=current_user.id)
    return None

