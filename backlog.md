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

---
### 10. Convergência Visual & UI/UX com Google Stitch (Obsidian Telemetry)
- [x] **Identidade Visual Obsidian Telemetry:**
  - Implantação do fundo industrial em gradiente angular escuro com iluminação radial atmosférica âmbar/cobre (Stitch Ambient Glow).
  - Tokens de cores modernos Stitch (`--bg-obsidian`, `--surface-card`, `--surface-card-hover`, `--surface-container-low`, `--surface-container-high`, `--copper-bright`, `--copper-glow`, `--emerald-healthy`, `--cyan-telemetry`, etc.).
- [x] **Tipografia Tríade de Alta Precisão:**
  - Integração das famílias tipográficas `Space Grotesk` (métricas de destaque/display), `Geist` (corpo e interface de usuário) e `JetBrains Mono` (telemetria e clocks).
- [x] **Grid System de 6 Colunas Aprimorado no Dashboard:**
  - Reestruturação hierárquica em 4 linhas lógicas: Telemetria Hero, Operacional/Recomendações, Hardware/Sensores e Drilldown de Recursos.
  - Breakpoints responsivos para 1200px (4 colunas) e 950px/768px (coluna única) com proteção contra esmagamento de tipografia (`min-width: 0`).
- [x] **Widget Saúde Hero com Gauge Circular SVG:**
  - Score numérico 0-100 centralizado na fonte `Space Grotesk`, anel SVG dinâmico (`#healthScoreCircle`) com animação vetorial, beacon verde pulsante e botão de microação "Reavaliar" (`#btnRetest`).
- [x] **Widget Sensores em Tempo Real (Live Load):**
  - Amostragem contínua de 1s, gráfico multi-anel radial ApexCharts, mini cards com sensor dots temáticos (CPU com badge de temperatura em tempo real, RAM e SSD).
- [x] **Widget Recomendações e Otimizações Sugeridas:**
  - Cartões inteligentes com estimativa de impacto no boot (`+1.4s`), latência de CPU e integridade de memória/HVCI, conectados com navegação contextual direta para a aba Otimização (`#btnRecStartup`, `#btnRecEnergy`, `#btnRecShield`).
- [x] **Widget Hardware Detectado com Ação One-Click "Copiar Specs":**
  - Grid com ícones temáticos para CPU, RAM, GPU, Motherboard, SO e Licença Digital com beacon esmeralda.
  - Botão "Copiar Specs" (`#btnCopySpecs`) com exportação instantânea para o clipboard do Windows e feedback visual dinâmico ("Copiado!").
- [x] **Blindagem e Resiliência Operacional:**
  - Tratamento `try/finally` com descarte forçado de handles de arquivo (`fs.Dispose()`) no teste sequencial de benchmark de disco no PowerShell.
  - Sincronização e cobertura de falhas no checklist da Manutenção em 6 etapas.
- [x] **Sincronização da Documentação e Obsidian Vault:**
  - Atualização completa de `Check Up/Design System.md`, `Check Up/Funcionalidades.md` e `backlog.md` com total fidelidade aos wikilinks (`[[...]]`).

---
### 11. Governança Multi-Agentes & Otimização de Tokens (RTK)
- [x] **Integração do Proxy RTK (Rust Token Killer):**
  - Adoção das regras operacionais globais e locais (`.agents/rules/antigravity-rtk-rules.md`) para compressão de saída de terminal (`git`, `npm`, `ls`, etc.) com redução de 80-90% de consumo de tokens no contexto do Antigravity.
- [x] **Documentação & Rastreabilidade no Obsidian:**
  - Criação da nota técnica dedicada `Check Up/RTK Token Killer.md` (< 200 linhas) com wikilinks para `Home.md` e `Squad Multi-Agentes.md`.
  - Atualização do mapa central em `Check Up/Home.md` e das diretrizes de governança em `Check Up/Squad Multi-Agentes.md`.

---
### 12. Modularização de Melhorias e Rotinas Granulares (Feedback do Usuário)
- [x] **Master Card "Checkup & Manutenção Geral 6 em 1":** Cartão hero no topo da aba Otimização (`#btnTriggerFullMaint`) para execução em lote com modal de progresso, cronômetro e checklist animado.
- [x] **Painel de Opções Individuais de Melhoria:** Grid responsivo com 7 rotinas independentes:
  - Otimização de Rede & DNS (`#btnSingleDns`)
  - Limpeza de Arquivos Temporários (`#btnSingleTemp`)
  - Otimização TRIM para SSDs (`#btnSingleTrim`)
  - Verificação de Integridade de Arquivos SFC (`#btnSingleSfc`)
  - Reparo Profundo de Imagem DISM (`#btnSingleDism`)
  - Atualização de Programas via Winget (`#btnSingleWinget`)
  - Reparador do Windows Update (`#btnSingleWUpdate`)
- [x] **Despachante Nativo Granular (`core/ExecutarRotina.ps1`):** Script PowerShell paramétrico (`-Rotina <nome> -StatusFile <caminho>`) 100% nativo sem binários externos.
- [x] **Feedback Visual Não-Bloqueante:** Botões com spinner animado durante execução e notificações flutuantes Toast (`.toast`, `.toast-success`, `.toast-warning`) via `#toastContainer`.

---
### 13. Diagnóstico & Correção do Erro de Telemetria e Proteção Portátil
- [x] **Resolução da Causa Raiz de Telemetria:**
  - *Falso Positivo Semântico:* O selo `#healthPillText` exibia `"Índice de Telemetria Crítico"` quando havia eventos de erro no log do SO, confundindo o usuário. Alterado para `"Integridade do Sistema: Estável / Atenção / Crítico"`.
  - *Auto-deleção na Versão Portátil:* A limpeza de temporários chamava `Remove-Item "$env:TEMP\*"`, deletando os arquivos em uso do CheckUP portátil (`%TEMP%\checkup-windows`). Corrigido com `-Exclude "*checkup*"`.
- [x] **Blindagem de Limpeza em `%TEMP%`:** Aplicado filtro protetor em `core/ExecutarRotina.ps1`, `src/renderer.js` e `core/Ferramenta_Reparo.bat`.
- [x] **Resiliência e Validação:** Passagem com código 0 em `npm run validate`.

