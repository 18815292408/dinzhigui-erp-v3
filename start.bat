@echo off
chcp 65001 >nul
title ERP

echo ========================================
echo   ERP Starting
echo ========================================
echo.

echo [1/3] Kill port 3000...
netstat -aon | findstr :3000 | findstr LISTENING > temp.txt
for /f "tokens=5" %%a in (temp.txt) do (
    taskkill /F /PID %%a >nul 2>&1
)
del temp.txt >nul 2>&1
echo   Done

echo.
echo [2/3] Start dev server...
cd /d "%~dp0"
start cmd /k "npm run dev"

echo [3/3] Open browser...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   Done! Visit http://localhost:3000
echo ========================================
pause
