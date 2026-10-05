@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 or newer and run 1-SETUP.cmd first.
  pause
  exit /b 1
)
node scripts/doctor.js
pause
