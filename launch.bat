@echo off
echo ===================================================
echo   Architectural Studio & Terrain Analysis Tool
echo   Starting local server and launching browser...
echo ===================================================
echo.

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo [1/3] Installing dependencies for first-time launch...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies. Make sure Node.js is installed from https://nodejs.org/
        pause
        exit /b %errorlevel%
    )
) else (
    echo [1/3] Dependencies verified.
)

echo [2/3] Opening application in your web browser...
start http://localhost:3000

echo [3/3] Launching local development server on Port 3000...
echo.
echo Press Ctrl+C in this window to stop the server anytime.
echo.
call npm run dev
pause
