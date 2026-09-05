# 🏗️ Arquitetura do Sistema & Engenharia

O **Projeto CheckUP** é uma aplicação desktop desenvolvida sobre o framework [Electron](https://www.electronjs.org/), integrando uma interface ágil em JavaScript/CSS com comandos nativos do ecossistema Microsoft Windows.

---

## 🏛️ Camadas da Aplicação

```
┌────────────────────────────────────────────────────────┐
│              INTERFACE VISUAL (RENDERER)               │
│  HTML5 + Dark Glassmorphism + ApexCharts (Offline)     │
│  src/index.html | src/renderer.js | src/style.css     │
└──────────────────────────┬─────────────────────────────┘
                           │ IPC & APIs do Node.js
┌──────────────────────────▼─────────────────────────────┐
│                 MAIN PROCESS (ELECTRON)                │
│  Ciclo de vida, janelas nativas, shell.openPath        │
│  main.js | package.json (Configuração extraResources) │
└──────────────────────────┬─────────────────────────────┘
                           │ child_process (Base64 UTF-16LE)
┌──────────────────────────▼─────────────────────────────┐
│               CAMADA DE SISTEMA & POWERSHELL           │
│  WMI / CIM, Event Viewer, Get-MpComputerStatus         │
│  Benchmark (.NET FileStream), ReTrim, DISM, SFC, Winget│
│  core/checkup.ps1 | core/lib/ (LibreHardwareMonitor)   │
└────────────────────────────────────────────────────────┘
```

---

## ⚡ Modelo de Telemetria Híbrida (0% CPU)

Para garantir que o aplicativo permaneça responsivo sem onerar o computador do usuário:
1. **Telemetria Contínua em Tempo Real (0ms de latência):**
   - **Cálculo de CPU:** Realizado através do delta de ticks entre amostras de `os.cpus()`, medindo os tempos de *user*, *system* e *idle*.
   - **Memória RAM:** Lida diretamente via `os.totalmem()` e `os.freemem()`.
   - **Tráfego de Rede:** Coletado em ~30ms usando o comando nativo `netstat -e`, eliminando completamente a inicialização contínua de processos PowerShell em segundo plano.
2. **Diagnóstico Profundo Sob Demanda:**
   - Varreduras térmicas (`LibreHardwareMonitorLib.dll`), integridade física S.M.A.R.T. e auditorias de software são disparadas sob demanda pelo usuário, mantendo a CPU em repouso durante a navegação normal.

---

## 🛡️ Elevação Administrativa (UAC) & Segurança

1. **UAC Assíncrono com Polling em `%TEMP%`:**
   - O aplicativo abre inicialmente com privilégios normais de usuário.
   - Quando uma rotina pesada é solicitada (como reparo de arquivos ou manutenção profunda), o Node dispara um processo PowerShell elevado em segundo plano (`Start-Process -Verb RunAs -WindowStyle Hidden`).
   - O progresso de cada etapa é gravado em um arquivo de estado transitório em `$env:TEMP\checkup_maint_status.json`, monitorado via `setInterval` no frontend a cada 400ms.
2. **Blindagem contra Injeção de Código:**
   - Comandos com parâmetros dinâmicos utilizam a flag `-EncodedCommand` com strings codificadas em Base64 UTF-16LE, eliminando riscos de interpretação indevida pelo `cmd.exe`.

---

## 📦 Arquitetura Offline-First

- **Zero Dependências de CDNs:** A biblioteca de visualização de dados ApexCharts foi desvinculada de provedores externos e empacotada localmente em `src/assets/vendor/apexcharts.min.js`.
- **Relatórios Técnicos Autocontidos:** O exportador de relatórios diagnósticos compila todos os estilos CSS e dados em um arquivo HTML único, permitindo visualização ou impressão em PDF em máquinas sem conexão com a internet.

---

## 👥 Governança por Multi-Agentes
A manutenção e integridade deste ecossistema são geridas pelo [[Squad Multi-Agentes]], onde cada módulo possui validação prévia de segurança (`checkup_reviewer`) e testes sintáticos automatizados (`checkup_qa`).

---
**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Design System]] | Ver [[Manutenção e Scripts]]
