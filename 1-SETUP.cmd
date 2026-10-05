@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 22 or newer from https://nodejs.org first.
  pause
  exit /b 1
)
node scripts/setup.js
if errorlevel 1 goto failed
call npm ci
if errorlevel 1 goto failed
call npm run doctor
if errorlevel 1 goto failed
echo.
echo Setup complete. Open 2-START-LAB.cmd to start the project.
pause
exit /b 0
:failed
echo Setup did not finish. Read the error above, then retry.
pause
exit /b 1
