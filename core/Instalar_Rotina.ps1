# ==============================================================================
# INSTALADOR DE TAREFA AGENDADA MENSAL (CHECK-UP AUTOMÁTICO)
# ==============================================================================

# Exige privilégios de Administrador
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Start-Process powershell.exe "-File `"$PSCommandPath`"" -Verb RunAs
    exit
}

$batPath = "$PSScriptRoot\CriarTarefa.bat"

# Executa o script de criação via CMD
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$batPath`"" -Wait -NoNewWindow

Write-Host "=======================================================" -ForegroundColor Green
Write-Host " Tarefa Mensal instalada com sucesso!                  " -ForegroundColor Green
Write-Host " O check-up rodará no dia 1º de cada mês às 09:00.     " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green
pause