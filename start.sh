#!/bin/bash
set -e
if [ -f "backend.tar" ] && [ -f "frontend.tar" ]; then
    docker load -i backend.tar
    docker load -i frontend.tar
fi


SSL_DIR="./ssl"
CERT_FILE="$SSL_DIR/cert.pem"
KEY_FILE="$SSL_DIR/key.pem"

if [ ! -d "$SSL_DIR" ]; then
    mkdir -p "$SSL_DIR"
fi

# Генерация SSL сертификатов
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Генерация самоподписанного SSL-сертификата..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$KEY_FILE" -out "$CERT_FILE" \
        -subj "/C=RU/O=ASU/CN=localhost"
fi

ENV_FILE=".env"
# Настройка .env файла
if [ ! -f "$ENV_FILE" ]; then
    echo "Создание файла $ENV_FILE..."
    
    RANDOM_DB_PASS=$(openssl rand -hex 16)
    RANDOM_JWT_SECRET=$(openssl rand -hex 32)
    
    cat <<EOF > "$ENV_FILE"
DB_USER=asu_admin
DB_PASSWORD=$RANDOM_DB_PASS
DB_NAME=asu_db
JWT_SECRET=$RANDOM_JWT_SECRET
EOF
    echo "Файл $ENV_FILE успешно сгенерирован!"
fi

# Запуск Docker Compose
echo "🐳 Запуск контейнеров Docker..."
docker compose up -d --no-build

echo ""
echo "Развертывание успешно завершено!"

