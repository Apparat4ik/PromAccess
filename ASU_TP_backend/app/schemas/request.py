from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RequestCreate(BaseModel):
    equipment_id: int
    start_time: datetime
    end_time: datetime
    reason: str

class RequestStatusUpdate(BaseModel):
    status: str

class RequestResponse(BaseModel):
    id: int
    user_id: int
    equipment_id: int
    start_time: datetime
    end_time: datetime
    status: str
    reason: str
    class Config:
        orm_mode = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    ip_address: str
    timestamp: datetime

    class Config:
        orm_mode = True

class EquipmentResponse(BaseModel):
    id: int
    name: str
    inventory_number: str

    class Config:
        orm_mode = True

class RoleUpdateRequest(BaseModel):
    new_role: str
