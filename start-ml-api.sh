#!/bin/bash
# ML API Server Startup Script
# Run from project root: bash start-ml-api.sh

START_DIR=$(pwd)

echo "=========================================="
echo "ML API Server Startup"
echo "=========================================="
echo ""

# Check if in correct directory
if [ ! -d "backend/ml/api" ]; then
    echo "❌ Error: Must run from project root"
    echo "Current directory: $(pwd)"
    exit 1
fi

cd backend/ml/api

echo "📦 Checking dependencies..."
if ! python3 -c "import fastapi" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "🔍 Running diagnostics..."
python3 diagnose.py

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Diagnostics failed. Fix issues above."
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ Starting ML API Server..."
echo "=========================================="
echo ""
echo "Server will run at: http://127.0.0.1:8000"
echo "API Docs at: http://127.0.0.1:8000/docs"
echo "Health check: curl http://127.0.0.1:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

uvicorn main:app --reload --host 127.0.0.1 --port 8000
