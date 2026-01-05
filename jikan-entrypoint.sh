#!/bin/sh
php artisan migrate --force
exec /app/docker-entrypoint.sh
