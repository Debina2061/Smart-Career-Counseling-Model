@echo off
REM Start All Services (Windows)
REM Run from project root: start-all.bat
REM This starts ML API, Backend, and Frontend in separate windows

setlocal enabledelayedexpansion

echo.
echo =====================================================
echo Smart Career Counselling - Auto-Start All Services
echo =====================================================
echo.

REM Check if in correct directory
if not exist "backend\package.json" (
    echo Error: Must run from project root
    echo Current directory: %cd%
    exit /b 1
)

echo Starting all services in separate windows...
echo.

REM Terminal 1: ML API (Python)
echo [1/3] Starting ML API (Python) on port 8000...
start "ML API Server" cmd /k "cd backend\ml\api && python diagnose.py && uvicorn main:app --host 127.0.0.1 --port 8000"

REM Wait a moment for ML API to start
timeout /t 3 /nobreak

REM Terminal 2: Backend (Node.js)
echo [2/3] Starting Backend Server (Node) on port 3000...
start "Backend Server" cmd /k "cd backend && npm install 2>nul && npm start"

REM Terminal 3: Frontend (React)
echo [3/3] Starting Frontend (React) on port 5173...
start "Frontend App" cmd /k "cd frontend && npm install 2>nul && npm run dev"

echo.
echo =====================================================
echo ✅ All services starting...
echo =====================================================
echo.
echo Open browser: http://localhost:5173
echo.
echo Services:
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:3000
echo   - ML API:    http://127.0.0.1:8000
echo.
echo All services will auto-start. Do not close any windows!
echo To stop: Close each window individually.
echo.
pause

endlocal
