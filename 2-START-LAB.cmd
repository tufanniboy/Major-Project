@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto missing
if not exist "node_modules\qrcode\package.json" goto missing
if not exist "node_modules\pg\package.json" goto missing
node scripts/setup.js
if errorlevel 1 goto failed
echo Keep this window open while using the lab. Press Ctrl+C to stop.
call npm run start:lan
if errorlevel 1 goto failed
exit /b 0
:missing
echo Run 1-SETUP.cmd first. Node.js and dependencies are required.
:failed
pause
exit /b 1
