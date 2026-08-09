@echo off
title R.A.G.E LAN 2 - Installation
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1"

echo.
pause
