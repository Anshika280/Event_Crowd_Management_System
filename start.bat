@echo off
title Event Crowd Management System Runner
echo ===================================================
echo   Event Crowd Management System - Boot Sequence
echo ===================================================
echo.
echo Cleaning up any old processes on ports 5000 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [1/3] Seeding MongoDB database...
cd /d "%~dp0event crowd\backend"
call npm.cmd run seed
if %errorlevel% neq 0 (
    echo.
    echo WARNING: MongoDB seeding step failed. Ensure MongoDB service is running.
    echo Proceeding with startup...
)
echo.
echo [2/3] Booting Real-Time Backend & Client Landing Server...
start "Event Crowd Backend" /D "%~dp0event crowd\backend" cmd /k "npm run dev"

echo [3/3] Booting React Web Application Frontend...
start "Event Crowd Frontend" /D "%~dp0event crowd\frontend" cmd /k "npm run dev"

echo.
echo Launching Client Landing Page (http://localhost:5000)...
timeout /t 4 >nul
start http://localhost:5000

echo.
echo ===================================================
echo   System running successfully!
echo   - Client Landing Page: http://localhost:5000
echo   - React Web App:       http://localhost:5173
echo   - Socket.IO Server:    http://localhost:5000
echo ===================================================
echo.
pause
