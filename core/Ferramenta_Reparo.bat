@echo off
color 0B
title Ferramenta Avancada de Limpeza e Reparo do Sistema
chcp 65001 > nul

:: Solicitacao de Privilegios de Administrador
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Solicitando privilegios de Administrador...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B
)

echo =======================================================
echo      FERRAMENTA AVANCADA DE REPARO E OTIMIZACAO
echo =======================================================
echo.

echo [1/7] Restaurando e Otimizando a Rede (DNS, Winsock, IP)...
ipconfig /flushdns >nul
netsh winsock reset >nul
netsh int ip reset >nul
echo       - Rede redefinida com sucesso.
echo.

echo [2/7] Limpando Arquivos Lixo e Caches de Sistema...
del /q /f /s "%TEMP%\*" >nul 2>&1
del /q /f /s "C:\Windows\Temp\*" >nul 2>&1
del /q /f /s "C:\Windows\Prefetch\*" >nul 2>&1
rd /s /q %systemdrive%\$Recycle.bin >nul 2>&1
echo       - Arquivos temporarios, prefetch e lixeira limpos.
echo.

echo [3/7] Limpando Cache de Atualizacoes (Windows Update)...
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
net stop cryptSvc >nul 2>&1
net stop msiserver >nul 2>&1
del /q /f /s "%systemroot%\SoftwareDistribution\Download\*" >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1
net start cryptSvc >nul 2>&1
net start msiserver >nul 2>&1
echo       - Servicos de atualizacao destravados.
echo.

echo [4/7] Sincronizando o Relogio do Windows (Certificados SSL)...
w32tm /resync >nul 2>&1
echo       - Relogio sincronizado.
echo.

echo [5/7] Executando SFC (Verificacao de Integridade dos Arquivos)...
echo       - Isso pode demorar alguns minutos. Aguarde...
sfc /scannow
echo.

echo [6/7] Executando DISM (Reparo da Imagem do Windows)...
echo       - Restaurando a saude do sistema. Aguarde...
DISM /Online /Cleanup-Image /RestoreHealth
echo.

echo [7/7] Atualizando Aplicativos via Winget...
echo       - Buscando novas versoes para seus programas em segundo plano...
winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements
echo.

echo =======================================================
echo    OTIMIZACAO E REPARO CONCLUIDOS COM SUCESSO!
echo =======================================================
echo Recomendamos que reinicie o computador para aplicar todas as mudancas de rede.
pause