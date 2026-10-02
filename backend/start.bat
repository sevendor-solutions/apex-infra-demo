@echo off
title JK Future Infra - Laravel API Server
cd /d "%~dp0"
echo ===================================================
echo   JK Future Infra - PHP Laravel API Server
echo   Port: 5000 (Matches Frontend Configuration)
echo ===================================================
"C:\Users\Dhora\php\php.exe" artisan serve --host=0.0.0.0 --port=5000
pause
