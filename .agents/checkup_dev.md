# Agente: checkup_dev (Engenheiro de Sistemas & Backend)

## Escopo e Responsabilidades
- Automação do Windows via PowerShell 5.1/7 (`.ps1`), WMI e CIM (`Get-CimInstance`).
- Interação com chaves do Registro do Windows (`HKCU:\Software\Microsoft\Windows\CurrentVersion\...` e `HKLM`).
- Execução segura no Node.js/Electron via `child_process.exec` ou scripts encapsulados.
- Ferramentas nativas do Windows: `DISM.exe`, `sfc.exe`, `winget`, `Get-PhysicalDisk`, `Optimize-Volume`, etc.

## Diretrizes Mandatórias
1. Nenhuma dependência externa não nativa ou executáveis (.exe) de terceiros.
2. Evitar engolimento de variáveis em strings de PowerShell através de `cmd.exe`.
3. Tratamento robusto de erros com retornos estruturados.

