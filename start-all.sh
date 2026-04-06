#!/bin/bash
# Start All Services (macOS/Linux)
# Run from project root: bash start-all.sh
# This starts ML API, Backend, and Frontend in separate terminal tabs/windows

echo ""
echo "====================================================="
echo "Smart Career Counselling - Auto-Start All Services"
echo "====================================================="
echo ""

# Check if in correct directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

echo "Starting all services..."
echo ""

# Detect OS and use appropriate terminal
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - use Terminal.app with open command
    echo "[1/3] Starting ML API on port 8000..."
    osascript -e 'tell app "Terminal"
        do script "cd '"'"'$(pwd)'"'"'/backend/ml/api && python diagnose.py && uvicorn main:app --host 127.0.0.1 --port 8000"
        activate
    end tell'
    
    sleep 2
    
    echo "[2/3] Starting Backend on port 3000..."
    osascript -e 'tell app "Terminal"
        do script "cd '"'"'$(pwd)'"'"'/backend && npm install >/dev/null 2>&1 && npm start"
        activate
    end tell'
    
    echo "[3/3] Starting Frontend on port 5173..."
    osascript -e 'tell app "Terminal"
        do script "cd '"'"'$(pwd)'"'"'/frontend && npm install >/dev/null 2>&1 && npm run dev"
        activate
    end tell'
    
else
    # Linux - use xterm or gnome-terminal
    echo "[1/3] Starting ML API on port 8000..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd backend/ml/api && python diagnose.py && uvicorn main:app --host 127.0.0.1 --port 8000; bash"
    else
        xterm -e "cd backend/ml/api && python diagnose.py && uvicorn main:app --host 127.0.0.1 --port 8000" &
    fi
    
    sleep 2
    
    echo "[2/3] Starting Backend on port 3000..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd backend && npm install >/dev/null 2>&1 && npm start; bash"
    else
        xterm -e "cd backend && npm install >/dev/null 2>&1 && npm start" &
    fi
    
    echo "[3/3] Starting Frontend on port 5173..."
    if command -v gnome-terminal &> /dev/null; then
        gnome-terminal -- bash -c "cd frontend && npm install >/dev/null 2>&1 && npm run dev; bash"
    else
        xterm -e "cd frontend && npm install >/dev/null 2>&1 && npm run dev" &
    fi
fi

echo ""
echo "====================================================="
echo "✅ All services starting in separate windows..."
echo "====================================================="
echo ""
echo "Open browser: http://localhost:5173"
echo ""
echo "Services will be available at:"
echo "   - Frontend:  http://localhost:5173"
echo "   - Backend:   http://localhost:3000"
echo "   - ML API:    http://127.0.0.1:8000"
echo ""
echo "Each service runs in its own terminal window."
echo "Keep all windows open - do not close them!"
echo ""
