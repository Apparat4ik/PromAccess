from app.api.routes.auth import logger
from fastapi import FastAPI, Request, HTTPException
from app.db.db_connect import engine, Base
from app.api.api import api_router # Импортируем только один агрегатор
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="АСУ ТП Access Control API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", # Стандартный порт Vite
        "http://localhost:3000", # На всякий случай, если используешь другой порт
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Подключаем глобальный роутер ко всему приложению с базовым префиксом /api
app.include_router(api_router, prefix="/api")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Внутренняя ошибка сервера: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутренняя ошибка сервера. Обратитесь к администратору."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )