#!/usr/bin/env bash

echo "==================================================="
echo "  Architectural Studio & Terrain Analysis Tool"
echo "  Starting local server and launching browser..."
echo "==================================================="
echo ""

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "[1/3] Installing dependencies for first-time launch..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies. Ensure Node.js is installed from https://nodejs.org/"
        exit 1
    fi
else
    echo "[1/3] Dependencies verified."
fi

echo "[2/3] Opening browser at http://localhost:3000..."
if which xdg-open > /dev/null; then
    xdg-open http://localhost:3000 &
elif which open > /dev/null; then
    open http://localhost:3000 &
fi

echo "[3/3] Starting server on Port 3000..."
npm run dev
