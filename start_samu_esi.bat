@echo off
echo ===================================================
echo     Demarrage du Systeme ESI SAMU - Mode Demo
echo ===================================================

echo [1/2] Lancement du Backend (FastAPI)...
cd backend
start cmd /k "python -m uvicorn main:app --reload --port 8000"
cd ..

echo [2/2] Lancement du Frontend (React Vite)...
cd frontend
start cmd /k "npm run dev"
cd ..

echo Serveurs lances dans de nouvelles fenetres.
echo URL Frontend: http://localhost:5173
echo URL Backend API: http://localhost:8000/docs
echo Identifiants de Demo: Login: demo_op ^| Mot de passe: samu123
pause
