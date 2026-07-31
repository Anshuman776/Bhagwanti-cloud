@echo off
title Bhagwanti Cloud Dev Launcher

echo ===================================================
echo   Starting Bhagwanti Cloud Development Servers...
echo ===================================================

:: 1. Launch Next.js Frontend (Port 3000)
echo [+] Launching Next.js Frontend on http://localhost:3000...
start "Bhagwanti Frontend" cmd /k "npm run dev --workspace=apps/web"

:: 2. Launch FastAPI Backend (Port 8000)
echo [+] Launching FastAPI Backend on http://localhost:8000...
start "Bhagwanti Backend" cmd /k "cd apps/api && .venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [+] All servers successfully triggered in separate windows!
echo     - Frontend console: http://localhost:3000
echo     - Backend OpenAPI Docs: http://localhost:8000/docs
echo ===================================================
pause
