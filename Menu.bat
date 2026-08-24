@echo off
color 0B
title Projeto CheckUP Windows - Central de Controle
chcp 65001 > nul

:: Solicitação de privilégios de Administrador
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Solicitando privilegios de Administrador...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B
)

:MENU
cls
echo =======================================================
echo           PROJETO CHECKUP WINDOWS - CENTRAL
echo =======================================================
echo   1. Verificar Integridade e Gerar Relatorio HTML
echo   2. Executar Limpeza e Reparo Avancado (Ferramenta)
echo   3. Ativar Agendamento Mensal Automatico (Dia 1^)
echo   4. Sair
echo =======================================================
set /p "opcao=Escolha uma opcao [1-4]: "

if "%opcao%"=="1" goto OP1
if "%opcao%"=="2" goto OP2
if "%opcao%"=="3" goto OP3
if "%opcao%"=="4" exit

echo Opcao invalida! Tente novamente.
timeout /t 2 >nul
goto MENU

:OP1
cls
echo [Executando] Iniciando Check-up do sistema e gerando relatorio...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\checkup.ps1"
echo.
pause
goto MENU

:OP2
cls
echo [Executando] Iniciando Ferramenta de Reparo e Limpeza...
call "%~dp0core\Ferramenta_Reparo.bat"
goto MENU

:OP3
cls
echo [Executando] Configurando a Tarefa Agendada Mensal...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0core\Instalar_Rotina.ps1"
echo.
pause
goto MENU