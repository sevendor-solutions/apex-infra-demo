@echo off
title JK Future Infra - Reset & Seed Database
cd /d "%~dp0"
echo ===================================================
echo   Resetting & Seeding Database (PHP Laravel)
echo ===================================================
"C:\Users\Dhora\php\php.exe" artisan migrate:fresh --seed
echo Database migrated and seeded successfully!
pause
