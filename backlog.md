# Backlog - Otimizações e Melhorias do CheckUP

Este backlog rastreia as tarefas e o estado das funcionalidades no aplicativo e na documentação.

---

## 🟢 Concluído

### 1. Gestor de Inicialização (Smart Startup Manager com Toggle Switch)
- [x] **Lógica de Toggle:** Implementada leitura de estado ativo/desativado nas chaves de registro do Windows (`StartupApproved\Run` e `StartupApproved\StartupFolder`).
- [x] **Manipulação de Binário:** Alternância do byte primário (0x02 para Ativo, 0x03 para Desativado) seguindo o padrão oficial do Gerenciador de Tarefas do Windows.
- [x] **Integração UI:** Switch deslizante animado Copper (`.copper-switch`) integrado a cada linha da tabela com feedback instantâneo via Toast.

### 2. Otimização de SSD (S.M.A.R.T. + TRIM)
- [x] **Leitura S.M.A.R.T.:** Implementada consulta WMI/CIM nativa via `Get-PhysicalDisk` para coletar integridade física, tipo de mídia (SSD/NVMe/HDD) e modelo da unidade primária.
- [x] **Integração UI:** Badge dinâmico de status (`.smart-badge` em verde `#2dd4bf` para Saudável, âmbar para Aviso e vermelho para Risco) e painel detalhado de disco antes do botão de TRIM.

### 3. Limpeza Profunda Expandida (Deep Clean)
- [x] **Expansão da Limpeza:** Limpeza expandida além de `%TEMP%` e `C:\Windows\Temp`, incluindo liberação de cache DNS (`ipconfig /flushdns`) e limpeza segura de caches de navegadores baseados em Chromium e Gecko (Edge, Chrome, Brave).
- [x] **Integração UI:** Medição atualizada somando temporários de aplicativos, navegadores e sistema com ApexCharts Donut e badge de saturação.

### 4. Escudo de Segurança Integrado (Defender UI & Detecção de Terceiros)
- [x] **Verificação Profunda:** Detecção automática de antivírus de terceiros através do WMI namespace `root/SecurityCenter2` (`AntiVirusProduct`).
- [x] **Eliminação de Falsos Alarmes:** Quando um antivírus de terceiros está ativo (onde o Defender se desativa intencionalmente), a interface exibe o nome do software protetor com badge positivo ("Protegido por Terceiros") em vez de um falso alerta de risco.

### 5. Histórico e Outros Módulos
- [x] Reposicionamento do card de Hardware e layout Grid de 6 colunas.
- [x] Criação da nova Aba "Otimização".
- [x] Redesign sofisticado do Card de Limpeza Profunda (separação %TEMP% vs Windows Temp, Donut Chart duplo, Badge dinâmico de saturação).
- [x] Integração do One-Click System Repair (SFC/DISM).
- [x] Atualização completa da documentação no cofre Obsidian (`Check Up/Funcionalidades.md`).

### 6. Fase 1: Segurança, Estabilidade Offline e Inicialização Suave
- [x] **Remoção de Credenciais Expostas:** Webhook do Discord desacoplado do código-fonte em `checkup.ps1` e configurado via variável de ambiente `$env:CHECKUP_DISCORD_WEBHOOK`.
- [x] **Suporte Offline-First (ApexCharts):** Eliminação de dependência do CDN jsdelivr via empacotamento local de `apexcharts.min.js` em `src/assets/vendor/`.
- [x] **Inicialização Não-Bloqueante:** Remoção do auto-click de `btnCheckup` no carregamento da página, carregando o cache imediatamente e evitando janelas de UAC invasivas ao abrir o app.
- [x] **Limpeza de Diretórios do Usuário:** Scripts temporários de manutenção e status redirecionados para `os.tmpdir()` (`%TEMP%`) com exclusão automática pós-execução.

---
### 7. Fase 2: Performance & Estabilidade do Backend
- [x] **Otimização de Telemetria Contínua:** Polling de PowerShell a cada 2s substituído por telemetria nativa síncrona do Node.js (`os.cpus()`, `os.totalmem()`, `os.freemem()`, `os.networkInterfaces()`) e `netstat -e` (~30ms), zerando a criação de 60 processos/minuto de PowerShell em segundo plano e reduzindo o consumo de CPU em repouso para 0%.
- [x] **Aceleração do Diagnóstico (`checkup.ps1`):**
  - Redução de `Test-Connection` de 10 para 2 pings rápidos (~8 segundos economizados por diagnóstico).
  - Otimização do teste de download do Cloudflare de 5 MB para 1 MB (5x mais veloz e 80% menos consumo de dados).
  - Migração de `Get-HotFix` para `Get-CimInstance Win32_QuickFixEngineering`.
  - Modernização de consultas `Get-WmiObject` para `Get-CimInstance` em discos, placa de vídeo e sistema operacional.
- [x] **Blindagem de Injeção de Comandos:**
  - Sanitização de PID numérico e nomes em `killProcess`.
  - Migração de `uninstallProgram` para `runPowerShellEncoded` com Base64 UTF-16LE e escape via `JSON.stringify()`.
- [x] **Saneamento de Dependências:** Remoção de dependência morta (`systeminformation`) do `package.json`.

### 8. Fase 3: Novas Features & Refinamento UI/UX
- [x] **Benchmark de Velocidade de Disco:** Teste nativo de leitura e gravação sequencial de 100 MB via PowerShell `System.IO.FileStream` e `Stopwatch` (.NET nativo do Windows), medindo taxas em MB/s com precisão sem qualquer executável externo.
- [x] **Exportação de Relatórios Diagnósticos:** Botão na barra lateral com geração em 1 clique de relatório completo autocontido em HTML com Dark Glassmorphism, paleta Cobre (`#cf663f`), tabelas de hardware, métricas de conectividade e discos, abrindo instantaneamente no navegador padrão do usuário via Electron `shell.openPath`.
- [x] **Modais Nativos Dark Glassmorphism:** Substituição de todos os `alert()` e `confirm()` nativos da plataforma por modais estilizados baseados em Promises (`showConfirm`, `showAlert`) com ícones dinâmicos e botões personalizados.
- [x] **Resiliência a Casos de Borda do Windows:**
  - Checagem preventiva se o comando `winget` existe no sistema antes da rotina de atualização da manutenção em 6 etapas.
  - Verificação inteligente do tipo de mídia do Drive C: (executa `ReTrim` para SSDs ou `Defrag` para HDDs tradicionais).
  - Sanitização de argumentos e blindagem completa contra injeção de comandos em desinstalação e processos.

---
### 9. Fase 4 / Versão 1.2.0: Resiliência do Dashboard, Fallback Nativo e Ciclo de Vida Robusto
- [x] **Resolução Dinâmica Multi-Caminho de Telemetria:**
  - Criação da função centralizada `resolveDadosAtuaisJsonPath()` cobrindo pastas relativas e absolutas (`relatorios/`, `core/relatorios/`, `process.cwd()`, diretório do executável portátil, `%USERPROFILE%/checkup_relatorios` e `%TEMP%/checkup_relatorios`).
  - Unificação da leitura tanto na atualização do dashboard quanto na exportação de relatórios HTML/PDF.
- [x] **Fallback Nativo de Hardware (Zero Broken State):**
  - Implementação de `populateBasicHardwareFallback()` acionada instantaneamente quando nenhum relatório prévio existe em disco.
  - Coleta nativa sem subprocessos: CPU com modelo e contagem de threads (`os.cpus()`), memória RAM total em GB (`os.totalmem()`), identificação Windows 10 vs 11 por build (`os.release()`) e licença digital do sistema.
  - Varredura de volumes A: a Z: via `fs.statfsSync()` com cálculo de capacidade/uso e renderização de mini-gráficos radiais ApexCharts.
  - Transição de status da interface para informativo ("Telemetria Básica Ativa") orientando a varredura completa sob demanda sem mensagens de erro vermelhas.
- [x] **Modernização Integral para CIM no PowerShell:**
  - Substituição de todas as consultas residuais `Get-WmiObject` por `Get-CimInstance` em `core/checkup.ps1` para dados de sistema operacional, discos e controladora de vídeo, acelerando a extração e prevenindo timeouts no Windows 11.
- [x] **Blindagem do Main Process do Electron (`main.js`):**
  - Detecção e reinicialização limpa contra injeção de `ELECTRON_RUN_AS_NODE=1` em terminais e IDEs.
  - Implementação de trava de instância única (`app.requestSingleInstanceLock()`) com restauração e foco na janela ativa ao abrir cópias concorrentes.
  - Log persistente de ciclo de vida e exceções não tratadas em `%USERPROFILE%/checkup_app.log`.
  - Timeout de fallback (1500ms) para forçar `win.show()` caso o evento `ready-to-show` sofra lentidão na GPU.
- [x] **Empacotamento e Distribuição da Versão 1.2.0:**
  - Build portátil gerada com sucesso em `dist/CheckUP Windows 1.2.0.exe` com validação de scripts (`npm run validate`).
