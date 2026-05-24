@echo off
cd /d "%~dp0"
title Quizy Dev
echo [Quizy] Development mode (npm run dev)
echo.
call npm run dev
if errorlevel 1 (
  echo.
  echo Dev exited with an error.
  pause
)
