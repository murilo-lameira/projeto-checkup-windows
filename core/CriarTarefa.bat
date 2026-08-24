@echo off
chcp 65001 > nul
schtasks /delete /tn "ProjetoCheckUP_Automatico" /f >nul 2>&1
schtasks /create /tn "ProjetoCheckUP_Automatico" /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%~dp0checkup.ps1\"" /sc MONTHLY /d 1 /st 09:00 /ru "SYSTEM" /f
exit