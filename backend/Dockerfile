# Build from the repo root or from backend/: docker build -f backend/Dockerfile backend/
FROM php:8.2-cli

RUN apt-get update && apt-get install -y --no-install-recommends \
        unzip libsqlite3-dev \
    && docker-php-ext-install pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
COPY . /app/

RUN composer install --no-interaction --optimize-autoloader \
    && cp -n .env.example .env \
    && php artisan key:generate --ansi \
    && touch database/database.sqlite

EXPOSE 8000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
