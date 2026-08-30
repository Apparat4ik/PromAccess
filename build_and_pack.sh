#!/bin/bash
set -e

echo "🔨 Сборка образов для x86_64 с прямым экспортом в архивы..."

# Собираем и сразу сохраняем бэкенд в backend.tar
docker buildx build --platform linux/amd64 -t asu_backend:latest -o type=docker,dest=backend.tar ./ASU_TP_backend

# Собираем и сразу сохраняем фронтенд в frontend.tar
docker buildx build --platform linux/amd64 -t asu_frontend:latest -o type=docker,dest=frontend.tar ./ASU_TP_frontend

echo "✅ Архивация завершена! Размеры файлов:"
ls -lh backend.tar frontend.tar

