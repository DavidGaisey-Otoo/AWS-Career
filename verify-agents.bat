@echo off
REM ════════════════════════════════════════════════════════════════
REM  verify-agents.bat — double-click to run the agent tests.
REM
REM  Behavior:
REM    1. Finds node.exe by full path (no PATH dependency)
REM    2. Runs the test suite
REM    3. Saves the FULL report to agent-test-results.txt
REM    4. Automatically opens that file in Notepad so you can read
REM       it at leisure — no time pressure, no disappearing window
REM ════════════════════════════════════════════════════════════════
chcp 65001 >nul
cd /d "%~dp0"

REM Find node.exe in common install locations
set NODE_EXE=
if exist "C:\Program Files\nodejs\node.exe" set NODE_EXE=C:\Program Files\nodejs\node.exe
if not defined NODE_EXE if exist "C:\Program Files (x86)\nodejs\node.exe" set NODE_EXE=C:\Program Files (x86)\nodejs\node.exe
if not defined NODE_EXE if exist "%LOCALAPPDATA%\nvs\default\node.exe" set NODE_EXE=%LOCALAPPDATA%\nvs\default\node.exe
if not defined NODE_EXE if exist "%APPDATA%\nvm\node.exe" set NODE_EXE=%APPDATA%\nvm\node.exe
if not defined NODE_EXE (
    echo Could not find node.exe on your system.
    echo Install Node.js LTS from https://nodejs.org/ and run again.
    echo.
    pause
    exit /b 1
)

echo Running AWS expert agent test suite...
echo Results will be saved to: agent-test-results.txt
echo.

REM Run the tests and capture output to both screen and file
"%NODE_EXE%" scripts\runAgentTests.mjs > agent-test-results.txt 2>&1
type agent-test-results.txt

echo.
echo ════════════════════════════════════════════════════════════════
echo Results saved to: agent-test-results.txt
echo Opening that file in Notepad now so you can read it whenever...
echo ════════════════════════════════════════════════════════════════

REM Open the results file in Notepad (stays open until YOU close it)
start "" notepad.exe agent-test-results.txt

REM Give the cmd window a moment in case you want to read it here too
timeout /t 10 /nobreak >nul
