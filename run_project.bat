@echo off
title Mainframe Art Gallery - Launcher
echo ====================================================
echo  Starting Mainframe Art Gallery Upgrade Project...
echo ====================================================

:: 1. Start Python Backend in a new window
echo [1/3] Starting Python FastAPI Backend API...
start "Mainframe API Backend" cmd /k "cd /d D:\art_gallery\backend && venv\Scripts\activate && python main.py"

:: 2. Start React Public Website in a new window
echo [2/3] Starting React Public Website (Vite)...
start "Mainframe Public Website" cmd /k "cd /d D:\art_gallery\website && npx vite --port 5173"

:: 3. Start React Admin Dashboard in a new window
echo [3/3] Starting React Admin Dashboard (Vite)...
start "Mainframe Admin Dashboard" cmd /k "cd /d D:\art_gallery\dashboard && npx vite --port 5174"

echo ====================================================
echo  All servers are starting in separate windows!
echo ====================================================
echo  API Documentation:  http://localhost:8000/docs
echo  Public Website:     http://localhost:5173
echo  Admin Dashboard:    http://localhost:5174
echo ====================================================
pause
