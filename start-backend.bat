@echo off
REM Auto-start Backend (Windows)
REM Run from project root: start-backend.bat

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo Backend Server Auto-Start (Windows)
echo ==========================================
echo.

REM Check if in correct directory
if not exist "backend\package.json" (
    echo Error: Must run from project root
    echo Current directory: %cd%
    exit /b 1
)

cd backend

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo Error: npm install failed
        exit /b 1
    )
)

echo.
echo ==========================================
echo Starting Backend Server...
echo ==========================================
echo.
echo Server will run on: http://localhost:3000
echo Press Ctrl+C to stop
echo.

REM Start backend with auto-reload
call npm start

endlocal
