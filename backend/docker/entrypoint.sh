#!/bin/sh
set -e

echo "=== Apex Infra Backend Starting ==="

# Create storage directories if not present
mkdir -p storage/app/public
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache

# Ensure correct permissions
chown -R www-data:www-data storage bootstrap/cache
chmod -R 755 storage bootstrap/cache

# Create SQLite file if using SQLite
if [ "${DB_CONNECTION}" = "sqlite" ]; then
    touch database/database.sqlite
    chown www-data:www-data database/database.sqlite
fi

# Run Laravel setup
php artisan config:clear
php artisan cache:clear

echo "--- Running database migrations ---"
php artisan migrate --force

echo "--- Seeding demo data (if tables are empty) ---"
php artisan db:seed --class=DemoDataSeeder --force 2>/dev/null || echo "Seeding skipped (data may already exist)"

echo "--- Caching config & routes for production ---"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "--- Creating storage symlink ---"
php artisan storage:link 2>/dev/null || true

echo "=== Starting Nginx + PHP-FPM ==="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
