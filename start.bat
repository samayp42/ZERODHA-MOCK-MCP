@echo off
title Zerodha Mock MCP Server
color 0A
cls

echo.
echo    ============================================================
echo    |                                                          |
echo    |             STARTING ZERODHA MOCK MCP SERVER             |
echo    |                                                          |
echo    ============================================================
echo.
echo    Initializing... (Press Ctrl+C to stop)
echo.

call npm start

if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo    [ERROR] Server stopped unexpectedly!
    pause
)
