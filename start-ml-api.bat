@echo off
REM ML API Server Startup Script for Windows
REM Run from project root: start-ml-api.bat

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo ML API Server Startup (Windows)
echo ==========================================
echo.

REM Check if in correct directory
if not exist "backend\ml\api" (
    echo Error: Must run from project root
    echo Current directory: %cd%
    exit /b 1
)

cd backend\ml\api

echo Checking dependencies...
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing dependencies...
    pip install -r requirements.txt
)

echo.
echo Running diagnostics...
python diagnose.py

if errorlevel 1 (
    echo.
    echo Error: Diagnostics failed. Fix issues above.
    exit /b 1
)

echo.
echo ==========================================
echo Starting ML API Server...
echo ==========================================
echo.
echo Server will run at: http://127.0.0.1:8000
echo API Docs at: http://127.0.0.1:8000/docs
echo Health check: curl http://127.0.0.1:8000/health
echo.
echo Press Ctrl+C to stop
echo.

uvicorn main:app --reload --host 127.0.0.1 --port 8000

endlocal
