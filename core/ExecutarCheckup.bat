@echo off
title Checkup Geral do Sistema
color 0B
chcp 65001 > nul

echo ==========================================
echo   INICIANDO O CHECKUP DO SISTEMA
echo ==========================================
echo.
echo Solicitando privilegios de Administrador...

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_NAME=checkup.ps1"

powershell -NoProfile -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -NoExit -File \"%SCRIPT_DIR%%SCRIPT_NAME%\"' -Verb RunAs"

exit