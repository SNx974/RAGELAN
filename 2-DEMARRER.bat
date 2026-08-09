@echo off
title R.A.G.E LAN 2 - Serveur
cd /d "%~dp0"

echo.
echo  ===============================================
echo    R.A.G.E LAN 2
echo  ===============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  [X] Node.js introuvable. Installe-le depuis https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo  [X] Les dependances ne sont pas installees.
  echo      Lance d'abord "1-INSTALLATION.bat".
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  echo  [X] Fichier .env manquant.
  echo      Lance d'abord "1-INSTALLATION.bat".
  echo.
  pause
  exit /b 1
)

REM Demarre PostgreSQL s'il est arrete (toutes versions confondues)
powershell -NoProfile -Command "$s = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Select-Object -First 1; if (-not $s) { Write-Host '  [!] Service PostgreSQL introuvable.' -ForegroundColor Yellow } elseif ($s.Status -ne 'Running') { try { Start-Service $s.Name; Write-Host ('  [OK] ' + $s.Name + ' demarre.') -ForegroundColor Green } catch { Write-Host '  [!] PostgreSQL n''a pas pu demarrer : relance ce fichier en administrateur.' -ForegroundColor Yellow } } else { Write-Host ('  [OK] ' + $s.Name + ' actif.') -ForegroundColor Green }"

echo.
echo  Demarrage du serveur...
echo.
echo  ----------------------------------------------
echo    Site       http://localhost:3000
echo    Admin      http://localhost:3000/admin
echo    Staff      http://localhost:3000/staff
echo.
echo    Connexion  admin@ragelan.gg
echo.
echo    Pour arreter : ferme cette fenetre
echo  ----------------------------------------------
echo.

REM Ouvre le navigateur au bout de 8 s, le temps que Next compile
start "" /b cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"

call npm run dev

echo.
echo  Le serveur s'est arrete.
pause
