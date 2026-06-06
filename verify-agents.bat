@echo off
REM ════════════════════════════════════════════════════════════════
REM  verify-agents.bat — double-click to run the agent tests.
REM
REM  Uses full path to node.exe so it works even when Node isn't on
REM  the system PATH (a common Windows quirk after Node install).
REM ════════════════════════════════════════════════════════════════
chcp 65001 >nul
cd /d "%~dp0"

REM Try the standard install location first, then a few common alternatives
set NODE_EXE=
if exist "C:\Program Files\nodejs\node.exe" set NODE_EXE=C:\Program Files\nodejs\node.exe
if not defined NODE_EXE if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_EXE=C:\Program Files (x86)\nodejs\node.exe
if not defined NODE_EXE if exist "%LOCALAPPDATA%\nvs\default\node.exe" set NODE_EXE=%LOCALAPPDATA%\nvs\default\node.exe
if not defined NODE_EXE if exist "%APPDATA%\nvm\node.exe" set NODE_EXE=%APPDATA%\nvm\node.exe
if not defined NODE_EXE (
    echo Could not find node.exe on your system.
    echo Tried:
    echo   - C:\Program Files\nodejs\node.exe
    echo   - C:\Program Files (x86)\nodejs\node.exe
    echo   - %%LOCALAPPDATA%%\nvs\default\node.exe
    echo   - %%APPDATA%%\nvm\node.exe
    echo.
    echo Install Node.js from https://nodejs.org/ ^(LTS version^), then run again.
    pause
    exit /b 1
)

echo Running AWS expert agent test suite...
echo Using Node at: %NODE_EXE%
echo.

"%NODE_EXE%" scripts\runAgentTests.mjs

echo.
echo ────────────────────────────────────────────────────────────────
echo Done. Press any key to close this window.
pause >nul
