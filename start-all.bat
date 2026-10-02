@echo off
title JK Future Infra - Launcher
cd /d "%~dp0"
echo ===================================================
echo   Starting JK Future Infra Full Stack Application
echo ===================================================
echo [1/2] Launching PHP Laravel Backend (Port 5000)...
start "JK Future - PHP Backend (Port 5000)" "backend\start.bat"
timeout /t 2 /nobreak >nul
echo [2/2] Launching React Frontend...
cd frontend
start "JK Future - React Frontend" cmd /k "npm run dev"
echo ===================================================
echo   Both services started in separate windows!
echo ===================================================
