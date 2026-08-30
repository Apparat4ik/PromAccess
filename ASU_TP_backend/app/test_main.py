import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from app.main import app
from app.core.dependencies import get_db
from app.core.security import get_password_hash
from app.db.db_connect import Base
from app.db.models import Role, Equipment, User

# Настройка изолированной тестовой базы данных SQLite
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_db.sqlite"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Подмена реальной базы данных на тестовую
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

# Подготовка БД перед каждым тестом
@pytest.fixture(autouse=True)
def setup_db():
    # Очищаем и создаем таблицы заново для чистоты экспериментов
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    # Создаем базовую роль для тестов
    role = Role(name="USER", description="Базовая роль")
    db.add(role)
    db.commit()
    db.close()

# Сами тесты
def test_register_user():
    """Тест успешной регистрации пользователя"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com", 
            "password": "password123", 
            "role_name": "USER"
        }
    )
    assert response.status_code == 201
    assert response.json() == {"detail": "Пользователь успешно зарегистрирован"}

def test_register_admin_forbidden():
    """Тест защиты от открытой регистрации администраторов"""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "hacker@example.com", 
            "password": "password123", 
            "role_name": "ADMIN"
        }
    )
    assert response.status_code == 403

def test_login_success():
    """Тест успешного входа и получения JWT токена"""
    # Сначала регистрируем
    client.post(
        "/api/auth/register",
        json={"email": "login_test@example.com", "password": "password123", "role_name": "USER"}
    )
    
    # Пытаемся войти (FastAPI OAuth2 требует передачи данных через form-data, а не json)
    response = client.post(
        "/api/auth/login",
        data={"username": "login_test@example.com", "password": "password123"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

def get_auth_headers(email: str, role_name: str):
    """
    Создает пользователя напрямую в БД (для обхода запрета регистрации админов)
    и возвращает заголовки с JWT токеном для тестового клиента.
    """
    db = TestingSessionLocal()
    
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name, description="Test Role")
        db.add(role)
        db.commit()
        
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email, 
            password_hash=get_password_hash("testpass"), 
            role_id=role.id
        )
        db.add(user)
        db.commit()
    db.close()
    
    response = client.post(
        "/api/auth/login",
        data={"username": email, "password": "testpass"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_request():
    """Тест создания заявки (POST /api/requests)"""
    headers = get_auth_headers("eng_create@example.com", "ENGINEER")
    
    # Подготавливаем связанное оборудование
    db = TestingSessionLocal()
    equip = Equipment(name="ПЛК Test", inventory_number="INV-T1", ip_address="10.0.0.1", status="ACTIVE")
    db.add(equip)
    db.commit()
    db.refresh(equip)
    equip_id = equip.id
    db.close()
    
    payload = {
        "equipment_id": equip_id,
        "start_time": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "end_time": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "reason": "Тестовое обслуживание"
    }
    
    response = client.post("/api/requests", json=payload, headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["reason"] == "Тестовое обслуживание"
    assert data["status"] == "PENDING"
    assert "id" in data


def test_get_requests():
    """Тест получения списка заявок (GET /api/requests)"""
    headers = get_auth_headers("eng_read@example.com", "ENGINEER")
    
    response = client.get("/api/requests", headers=headers)
    assert response.status_code == 200
    
    data = response.json()
    assert isinstance(data, list)


def test_update_request_status():
    """Тест изменения статуса заявки специалистом ИБ (PUT)"""
    eng_headers = get_auth_headers("eng_upd@example.com", "ENGINEER")
    
    # Инженер создает оборудование и заявку
    db = TestingSessionLocal()
    equip = Equipment(name="SCADA Test", inventory_number="INV-T2", ip_address="10.0.0.2", status="ACTIVE")
    db.add(equip)
    db.commit()
    db.refresh(equip)
    equip_id = equip.id
    db.close()

    req_response = client.post(
        "/api/requests",
        json={
            "equipment_id": equip_id,
            "start_time": (datetime.utcnow() + timedelta(hours=1)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(hours=5)).isoformat(),
            "reason": "Для обновления статуса"
        },
        headers=eng_headers
    )
    request_id = req_response.json()["id"]

    # Специалист ИБ обновляет статус
    sec_headers = get_auth_headers("sec_officer@example.com", "SECURITY_OFFICER")
    update_response = client.put(
        f"/api/requests/{request_id}/status",
        json={"status": "APPROVED"},
        headers=sec_headers
    )
    
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "APPROVED"


def test_delete_request():
    """Тест удаления заявки (DELETE)"""
    eng_headers = get_auth_headers("eng_del@example.com", "ENGINEER")
    
    db = TestingSessionLocal()
    equip = Equipment(name="HMI Test", inventory_number="INV-T3", ip_address="10.0.0.3", status="ACTIVE")
    db.add(equip)
    db.commit()
    db.refresh(equip)
    equip_id = equip.id
    db.close()

    req_response = client.post(
        "/api/requests",
        json={
            "equipment_id": equip_id,
            "start_time": (datetime.utcnow() + timedelta(days=3)).isoformat(),
            "end_time": (datetime.utcnow() + timedelta(days=4)).isoformat(),
            "reason": "Под удаление"
        },
        headers=eng_headers
    )
    request_id = req_response.json()["id"]

    delete_response = client.delete(f"/api/requests/{request_id}", headers=eng_headers)
    assert delete_response.status_code == 200

    # Проверка, что заявка действительно удалена из общего списка
    get_response = client.get("/api/requests", headers=eng_headers)
    existing_ids = [r["id"] for r in get_response.json()]
    assert request_id not in existing_ids