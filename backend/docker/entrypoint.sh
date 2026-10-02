#!/bin/sh
set -e

echo "=== Apex Infra Backend Starting ==="

cd /var/www/html

# Create system run & log directories for Supervisor and Nginx
mkdir -p /var/log/supervisor
mkdir -p /run/nginx

# Ensure storage directories exist (especially when persistent volume is mounted)
mkdir -p storage/app/public
mkdir -p storage/framework/cache/data
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache
mkdir -p database

# Create SQLite database if using SQLite and not present
if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    touch database/database.sqlite
fi

# Set full permissions for web server and php-fpm
chown -R www-data:www-data storage bootstrap/cache database
chmod -R 777 storage bootstrap/cache database

# Clear old cache to avoid stale configs
php artisan config:clear || true
php artisan cache:clear || true

echo "--- Running database migrations ---"
php artisan migrate --force || true

echo "--- Seeding demo data ---"
php artisan db:seed --class=DemoDataSeeder --force 2>/dev/null || true

echo "--- Creating storage symlink ---"
php artisan storage:link 2>/dev/null || true

echo "--- Optimizing for production ---"
php artisan config:cache || true
php artisan route:cache || true

echo "=== Starting Nginx + PHP-FPM via Supervisor ==="
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
