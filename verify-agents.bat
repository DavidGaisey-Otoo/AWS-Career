@echo off
REM ════════════════════════════════════════════════════════════════
REM  verify-agents.bat — double-click this file to run the agent tests.
REM  Shows results, pauses so you can read, exits when you press a key.
REM ════════════════════════════════════════════════════════════════
cd /d "%~dp0"
echo Running AWS expert agent test suite...
echo.
node scripts/runAgentTests.mjs
echo.
echo ────────────────────────────────────────────────────────────────
pause
