@echo off
cd /d "%~dp0"
title Quizy Reload Seed
echo [Quizy] Delete quizy.db and reload from data/seed-grade-*-*.json
echo.
echo Close Quizy first if it is running.
echo.
call npm run reload-seed
if errorlevel 1 (
  echo.
  echo Reload failed.
) else (
  echo.
  echo Done. Restart Quizy to use the new question bank.
)
echo.
pause
