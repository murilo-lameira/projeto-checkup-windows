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

## 🔄 Resiliência de Telemetria & Fallback Nativo (v1.2.0)

Na versão **1.2.0**, o CheckUP adotou o princípio de tolerância total a dados transitórios ausentes, garantindo que o dashboard nunca seja apresentado com valores em branco ou alertas falsos de erro:

1. **Resolução Multi-Caminho (`resolveDadosAtuaisJsonPath`):**
   - O aplicativo portátil e o ambiente de desenvolvimento podem residir em caminhos variados. A resolução varre uma cadeia de diretórios ordenada:
     - `relatorios/` e `core/relatorios/` no diretório raiz do projeto;
     - `process.cwd()/relatorios` e diretório do executável (`path.dirname(process.execPath)/relatorios`);
     - `~/.checkup_relatorios` e `%TEMP%/checkup_relatorios`;
     - `core/` e raiz da aplicação.
2. **Fallback Nativo Instantâneo (`populateBasicHardwareFallback`):**
   - Quando nenhum snapshot prévio de diagnóstico estiver disponível em disco, o dashboard entra em modo de **Telemetria Básica Ativa** sem travar a interface:
     - **Processador:** Mapeado instantaneamente via `os.cpus()` (modelo comercial e contagem de threads).
     - **Memória RAM:** Capacidade total calculada em GB via `os.totalmem()`.
     - **Sistema Operacional & Licença:** Identificação de Windows 10 vs 11 por build (`os.release()`) e exibição de licença digital ativa.
     - **Varredura Rápida de Discos (A-Z):** Consulta direta por letra de drive usando a API nativa síncrona `fs.statfsSync(letter + '\\')`, calculando espaço total, livre e percentual de ocupação, com renderização imediata dos mini-gráficos radiais [[Design System|ApexCharts]].
     - **Status Heurístico Base:** Inicializa saúde, monitoramento e segurança com cards informativos, sinalizando que a varredura completa do Registro e SMART está a um clique no botão "Diagnóstico".

---

## 🚀 Blindagem de Inicialização & Ciclo de Vida (`main.js`)

Para suportar empacotamento portátil (`dist/CheckUP Windows 1.2.0.exe`) e execução em ambientes corporativos ou terminais de IDEs:
1. **Isolamento de `ELECTRON_RUN_AS_NODE`:** Caso o ambiente (como VS Code ou subshell) injete essa variável de ambiente, o processo reinicia transparentemente uma nova instância desacoplada sem a flag, evitando encerramentos silenciosos.
2. **Single Instance Lock:** O método `app.requestSingleInstanceLock()` impede a concorrência de múltiplas instâncias do aplicativo. Ao tentar abrir uma segunda cópia, a janela existente é automaticamente restaurada e colocada em foco.
3. **Log Diagnóstico em `%USERPROFILE%`:** Erros não tratados (`uncaughtException`, `unhandledRejection`) e passos de inicialização são gravados de forma contínua em `~/checkup_app.log`.
4. **Exibição Garantida da Janela:** A janela é renderizada com `show: false` e ativada no evento `ready-to-show`. Um temporizador de segurança de 1.5s força a exibição caso o evento atrase, eliminando casos onde a janela permaneceria oculta na barra de tarefas.

---

## 🛡️ Elevação Administrativa (UAC) & Segurança

1. **UAC Assíncrono com Polling em `%TEMP%`:**
   - O aplicativo abre inicialmente com privilégios normais de usuário.
   - Quando uma rotina pesada é solicitada (como reparo de arquivos ou manutenção profunda), o Node dispara um processo PowerShell elevado em segundo plano (`Start-Process -Verb RunAs -WindowStyle Hidden`).
   - O progresso de cada etapa é gravado em um arquivo de estado transitório em `$env:TEMP\checkup_maint_status.json`, monitorado via `setInterval` no frontend a cada 400ms.
2. **Blindagem contra Injeção de Código:**
   - Comandos com parâmetros dinâmicos utilizam a flag `-EncodedCommand` com strings codificadas em Base64 UTF-16LE, eliminando riscos de interpretação indevida pelo `cmd.exe`.
3. **Modernização CIM Total no PowerShell:**
   - Substituição completa de comandos legados `Get-WmiObject` por `Get-CimInstance` no `core/checkup.ps1` para dados de sistema operacional, discos e controladoras gráficas, proporcionando alta velocidade de consulta e eliminando falhas em builds modernas do Windows 11.

---

## 📦 Arquitetura Offline-First

- **Zero Dependências de CDNs:** A biblioteca de visualização de dados ApexCharts foi desvinculada de provedores externos e empacotada localmente em `src/assets/vendor/apexcharts.min.js`.
- **Relatórios Técnicos Autocontidos:** O exportador de relatórios diagnósticos compila todos os estilos CSS e dados em um arquivo HTML único, permitindo visualização ou impressão em PDF em máquinas sem conexão com a internet.

---

## 👥 Governança por Multi-Agentes
A manutenção e integridade deste ecossistema são geridas pelo [[Squad Multi-Agentes]], onde cada módulo possui validação prévia de segurança (`checkup_reviewer`) e testes sintáticos automatizados (`checkup_qa`).

---
**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Design System]] | Ver [[Manutenção e Scripts]]
