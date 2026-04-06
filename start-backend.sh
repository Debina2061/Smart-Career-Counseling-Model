#!/bin/bash
# Auto-start Backend (macOS/Linux)
# Run from project root: bash start-backend.sh

START_DIR=$(pwd)

echo ""
echo "=========================================="
echo "Backend Server Auto-Start"
echo "=========================================="
echo ""

# Check if in correct directory
if [ ! -f "backend/package.json" ]; then
    echo "❌ Error: Must run from project root"
    echo "Current directory: $(pwd)"
    exit 1
fi

cd backend

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: npm install failed"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "✅ Starting Backend Server..."
echo "=========================================="
echo ""
echo "Server will run on: http://localhost:3000"
echo "Auto-reload enabled"
echo "Press Ctrl+C to stop"
echo ""

# Start backend with auto-reload
npm start
