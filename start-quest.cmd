@echo off
setlocal
cd /d "%~dp0"
if not exist "node_modules\vite\bin\vite.js" (
  echo Installing QUEST dependencies...
  call npm install
  if errorlevel 1 goto install_failed
)
call npm run dev -- --host 127.0.0.1 --open
goto end
:install_failed
echo Could not install dependencies. Check your internet connection and try again.
pause
exit /b 1
:end
