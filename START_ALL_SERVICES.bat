@echo off
echo ========================================
echo ClearClaim - Starting All Services
echo ========================================
echo.

REM Start Frontend in new window
echo [1/2] Starting Frontend (Port 3000)...
start "ClearClaim Frontend" cmd /k "cd /d D:\ClearClaim\clearclaim-frontend && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Agents in new window
echo [2/2] Starting AI Agents (Port 8000)...
start "ClearClaim AI Agents" cmd /k "cd /d D:\ClearClaim\agents && python main.py"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo All Services Starting!
echo ========================================
echo.
echo Frontend:  http://localhost:3000
echo Agents:    http://localhost:8000
echo ReadAPI:   http://localhost:5234 (already running)
echo WriteAPI:  http://localhost:5130 (already running)
echo.
echo Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo Done! Check the new windows for service logs.
echo.
