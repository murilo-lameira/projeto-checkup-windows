# Funcionalidades

O aplicativo **Projeto CheckUP** divide-se em um **Hub Superior com 4 abas integradas** e painéis modulares projetados para monitorar, diagnosticar e manter o sistema operacional Windows em sua máxima performance, agora potencializado pelo design **Obsidian Telemetry** adaptado do **Google Stitch**.

---

## 1. Hub de Navegação Superior
A interface principal adota o padrão [[Design System|Obsidian Telemetry (Dark Glassmorphism)]] e é segmentada em quatro visões (`page-view`):

### 🖥️ Dashboard Integrada (Layout Stitch de 6 Colunas)
Visão executiva em tempo real com telemetria contínua da máquina, estruturada em um [[Design System#grid-system-de-6-colunas-aprimorado-layout-stitch|Grid de 6 colunas fracionárias]]:

#### 1. 🎯 Widget Saúde Hero com Gauge Circular (Saúde Geral do Sistema)
- **Score Dinâmico de 0 a 100:** Exibição central de índice de saúde na tipografia [[Design System#tipografia-tríade-de-alta-precisão|Space Grotesk]] (`#healthScoreNumber`), contextualizado pelo divisor `/100` em `JetBrains Mono`.
- **Anel SVG com Gradiente:** Anel circular vetorial (`#healthScoreCircle`) com stroke animado (`stroke-dasharray: 264` e offset dinâmico), refletindo o nível de integridade da máquina de acordo com a detecção de erros e vulnerabilidades.
- **Status Heurístico e Beacon:** Indicador visual com beacon verde pulsante (`.status-beacon-emerald`), mensagem de conformidade ("SISTEMA ESTÁVEL & SEGURO") e contagem de incidentes nas últimas 48 horas.
- **Ação Rápida "Reavaliar":** Botão microinterativo (`#btnRetest`) embutido no rodapé do card que reexecuta o ciclo diagnóstico sob demanda sem a necessidade de navegar por outras telas.

#### 2. ⚡ Widget Sensores em Tempo Real (Live Load)
- **Amostragem Rápida (1s):** Monitoramento assíncrono síncrono ultra-leve com atualização contínua sem consumir recursos de processamento.
- **Gráfico Multi-Anel Radial (ApexCharts):** Visualização integrada em 3 anéis concêntricos concêntricos cobrindo Carga da CPU, Consumo de RAM e Taxa de Ocupação do Disco Primário.
- **Mini-Cards com Sensor Dots:** Três blocos com indicadores temáticos:
  - **CPU:** Ponto de status em Cobre (`.dot-cpu`), porcentagem instantânea e badge de temperatura em tempo real (`#valCpuTempBadge`).
  - **RAM:** Ponto de status em Esmeralda (`.dot-ram`), porcentagem de uso e memória física ativa.
  - **SSD / Armazenamento:** Ponto de status em Ciano (`.dot-disk`), porcentagem ocupada e monitoramento de integridade S.M.A.R.T.
- **Indicador de Ausência de Gargalo:** Rodapé informativo confirmando carga nominal em todos os subsistemas.

#### 3. 🌐 Widget Rede & Conexão
- Medidor de conectividade em tempo real com identificação do tipo de interface (Ethernet cabeada / Wi-Fi), badge de largura de banda nominal (ex: `1 Gbps`), status de link Online/Offline, taxas de download/upload e sparkline dinâmico de tráfego com gráficos [[Design System|ApexCharts]].
- Inclui seletor de alvo de ping (Google DNS `8.8.8.8`, Cloudflare DNS `1.1.1.1` e Localhost `127.0.0.1`) e botão One-Click para reparar conexões instáveis (`ipconfig /flushdns`, `/release`, `/renew`).

#### 4. 🧹 Widget Limpeza Profunda & Cache
- Medição e segregação instantânea de arquivos temporários entre **Cache de Apps (`%TEMP%`)** e **Arquivos Temporários do Sistema (`C:\Windows\Temp`)**.
- Gráfico Donut de alocação de lixo digital com ícone central temático e rodapé com total cumulativo de espaço recuperável.
- Botão "Otimizar & Limpar Agora" (`#btnDeepClean`) para purga rápida com confirmação visual via toast.

#### 5. 💡 Widget Recomendações e Otimizações Sugeridas
- Painel de curadoria heurística contendo 3 cartões de sugestão preventiva com microações conectadas diretamente à aba [[#central-avançada-de-otimização-aba-otimização|Otimização]]:
  - **Programas Pesados no Boot (`#btnRecStartup`):** Alerta de impacto no tempo de inicialização (`+1.4s no Boot`) com atalho direto para o Gestor de Inicialização.
  - **Plano de Energia e Latência de CPU (`#btnRecEnergy`):** Sugestão de ativação do plano de alto desempenho para redução de latência de troca de estado de núcleos.
  - **Defesa do Windows & Integridade de Memória (`#btnRecShield`):** Checagem proativa da proteção em tempo real e Isolamento de Núcleo (HVCI / VBS).

#### 6. 📋 Widget Hardware Detectado com "Copiar Specs"
- Mapeamento detalhado dos 6 pilares do hardware: Processador, Memória RAM, Placa de Vídeo, Placa-Mãe, Sistema Operacional (Build e Edição) e status de ativação da Licença Digital do Windows.
- **Botão One-Click "Copiar Specs" (`#btnCopySpecs`):** Extrai instantaneamente todas as especificações do sistema, monta um sumário técnico legível e grava na Área de Transferência do Windows através da Clipboard API nativa. O botão fornece feedback visual em tempo real, alternando o ícone para um visto esmeralda ("Copiado!") acompanhado de notificação em toast.

#### 7. 🌡️ Widget Sensores Térmicos, Fans & Uptime
- Medidores semicirculares dedicados à temperatura da CPU (Intel/AMD) e SSDs/NVMe alimentados pela `LibreHardwareMonitorLib.dll`.
- Seção integrada de Ciclo de Atividade (Uptime) com contador de tempo contínuo desde a última reinicialização da máquina.

#### 8. 🔍 Drilldown de Recursos (Processos de RAM & Discos)
- **Maior Consumo de RAM:** Tabela com os processos mais pesados residentes na memória, consumo em MB e botão de encerramento forçado (`taskkill`).
- **Discos e Armazenamento:** Listagem particionada de unidades com taxas de ocupação, tipo de mídia (NVMe / SSD / HDD) e integridade S.M.A.R.T.

---

### 📊 Histórico de Performance (ApexCharts)
Aba dedicada à análise de séries temporais das coletas do sistema:
- **Janela Rotativa (50 registros):** Armazenamento em cache JSON local persistindo as últimas 50 amostras de diagnóstico.
- **Desempenho Bruto (CPU vs RAM):** Gráfico de linha/área cruzando a evolução da carga de CPU contra o consumo de memória RAM ao longo do tempo.
- **Linha do Tempo de Alertas e Incidentes:** Gráfico de eventos que plota anomalias (picos de uso, saturação de memória, erros de sistema) com tooltips interativos detalhando a causa raiz de cada alerta.

---

### 📦 Gestor & Desinstalador de Aplicativos (Programas)
Módulo nativo para inventário e limpeza de softwares instalados:
- **Varredura no Registro do Windows:** Consulta via [[Manutenção e Scripts|PowerShell]] às chaves de desinstalação (`HKLM` 64-bit, `HKLM` 32-bit `Wow6432Node` e `HKCU`), extraindo Nome, Ícone do aplicativo, Fornecedor/Editor, Versão e strings de desinstalação.
- **Busca Indexada em Tempo Real:** Filtragem instantânea por nome do programa, editor ou versão através do campo de pesquisa da interface.
- **Desinstalação Silenciosa e Elevada:** Botão dedicado por software que bloqueia a interface com o `loadingOverlay`, dispara a rotina de desinstalação silenciosa em segundo plano (`QuietUninstallString`, MSI `/quiet /norestart` ou `winget uninstall --silent`) com privilégios de Administrador (`RunAs`) e atualiza automaticamente a listagem ao concluir.

---

### 🛡️ Painel "Debloat" e Privacidade (Otimização)
Módulo *One-Click Optimize* com *Toggle Switches* em cobre metálico para desativar serviços e recursos invasivos do Windows com reversibilidade total:
- **Telemetria da Microsoft:** Inibe a coleta diagnóstica de telemetria em segundo plano (`AllowTelemetry = 0`).
- **Assistente Cortana:** Desativa a assistente e serviços pesados de busca residente (`AllowCortana = 0`).
- **Xbox Game Bar & DVR:** Desativa serviços de captura constante e overlays de jogos (`GameDVR_Enabled = 0` e `AllowGameDVR = 0`).
- **Aplicativos em Segundo Plano:** Impede que aplicativos UWP executem silenciosamente em segundo plano sem necessidade (`GlobalUserDisabled = 1`).
- **Feedback por Toast:** Notificações flutuantes animadas que confirmam visualmente o sucesso ou o retorno ao estado original de cada chave modificada no Registro.

### 🚀 Central Avançada de Otimização (Aba Otimização)
Um hub expandido focado em dar ao usuário a sensação de "PC recém-formatado", composto por 4 grandes painéis e ferramentas One-Click:
- **Gestor Inteligente de Inicialização (Smart Startup com Toggle Copper):** Tabela interativa que lista os aplicativos que inicializam com o Windows (via `Win32_StartupCommand`). Integra *Toggle Switches* deslizantes estilizados em Cobre (`.copper-switch`) que leem e gravam o estado real nos registros oficiais do Windows (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run` e `StartupApproved\StartupFolder`). A alternância manipula o byte binário inicial (0x02 para Ativo, 0x03 para Desativado), proporcionando o mesmo comportamento nativo do Gerenciador de Tarefas do Windows sem travar o boot.
- **Otimização de SSD, Monitoramento S.M.A.R.T. e Benchmark Nativo:** Monitora proativamente a saúde física das unidades de armazenamento através do comando WMI/CIM `Get-PhysicalDisk`. Exibe o modelo exato da unidade primária, tipo de mídia (NVMe / SSD / HDD) e um badge dinâmico de integridade física S.M.A.R.T. (`● Saudável`, `● Atenção` ou `● Risco`). Inclui:
  - **Benchmark Nativo de Velocidade:** Medição em tempo real de taxas sequenciais de leitura e gravação em MB/s via PowerShell `.NET` (`System.IO.FileStream` e `System.Diagnostics.Stopwatch`) operando com bloco temporário de 100 MB em `%TEMP%` blindado por blocos `try/finally` e descarte seguro de recursos (`Dispose`), 100% livre de binários externos ou dependências de terceiros.
  - **Otimização Inteligente de Volume:** Botão One-Click com detecção automática do tipo de mídia (envia `ReTrim` para SSDs/NVMes ou `Defrag` para discos mecânicos tradicionais).
- **Escudo de Segurança com Detecção Híbrida & Grid Responsivo:** Painel avançado de ciberdefesa com suporte a ambientes híbridos e layout 100% responsivo. Realiza uma consulta dupla:
  1. No namespace WMI `root/SecurityCenter2` (`AntiVirusProduct`) para identificar softwares de proteção de terceiros instalados (ex: Kaspersky, Avast, Bitdefender, Norton).
  2. No módulo `Get-MpComputerStatus` para telemetria do Microsoft Defender.
  Caso um antivírus de terceiros esteja gerenciando o sistema, o card exibe o nome do fornecedor com badge esmeralda ("Protegido por Terceiros"), eliminando falsos alarmes de risco que ocorriam quando o Defender entrava em modo passivo.
- **Reparador de Sistema (SFC/DISM):** Botão de ação rápida que engatilha as ferramentas de reparo profundo da Microsoft (`sfc /scannow` e `DISM /RestoreHealth`) para corrigir corrupções de DLLs e telas azuis.

---

## 2. Rotinas Centrais de Ação

### 🔍 Diagnóstico e Exportação de Relatórios
- **Inicialização Suave com Loading Overlay:** Ao abrir o aplicativo, uma tela de transição Dark Glassmorphism com spinner em Cobre/Teal (`#loadingOverlay`) é exibida cobrindo o painel durante a carga dos dados em cache e renderização dos gráficos, ocultando-se suavemente por fade-out.
- **Resiliência e Fallback Nativo (Zero Broken State):** Antes de qualquer varredura completa, a função `populateBasicHardwareFallback()` lê dados essenciais via Node.js (`os.cpus()`, `os.totalmem()`, `os.release()`) e `fs.statfsSync()`, garantindo que o dashboard nunca apresente falhas ou valores vazios.
- **Exportação de Relatório Diagnóstico (HTML / PDF):** Botão estilizado com ícone vetorial na barra lateral que compila a auditoria técnica completa em um arquivo HTML autocontido com CSS responsivo embutido, tabelas de hardware, armazenamento e conectividade, salvando em `relatorios/relatorio_checkup_<timestamp>.html` e abrindo-o automaticamente no navegador padrão via [[Arquitetura|Electron]] `shell.openPath` com suporte a impressão direta em PDF (`window.print()`).
- **Sistema de Diálogos Modais (Glassmorphism):** Substituição completa dos diálogos bloqueantes `alert()` e `confirm()` do navegador por modais assíncronos baseados em Promises (`showConfirm`, `showAlert`).

### 🛠️ Manutenção Completa (Rotina em 6 Etapas)
Rotina profunda em 6 etapas automatizadas com acompanhamento em tempo real via modal com cronômetro, barra de progresso em gradiente Cobre/Teal e checklist interativo:
1. **Otimização de Rede e DNS:** Liberação de cache DNS (`ipconfig /flushdns`) e redefinição de sockets TCP/IP.
2. **Limpeza de Arquivos Temporários:** Eliminação de arquivos residuais em `%TEMP%`, pastas temporárias do Windows e esvaziamento de lixeira.
3. **Integridade de Arquivos (SFC):** Varredura e reparo automático de arquivos essenciais protegidos do sistema (`sfc /scannow`).
4. **Restauração de Imagem (DISM):** Reparo de componentes corrompidos da imagem do Windows (`DISM /Online /Cleanup-Image /RestoreHealth`).
5. **Otimização de Armazenamento (TRIM / Defrag):** Verificação de mídia e comando ReTrim/Defrag para otimização de velocidade e longevidade do disco.
6. **Atualização de Programas (Winget):** Checagem preventiva e atualização de softwares instalados via repositório oficial do Windows Package Manager.

*Para entender como os scripts operam com elevação de privilégios, consulte [[Manutenção e Scripts]] e a [[Arquitetura]].*

---

### ⏰ Automação e Agendamento Mensal
Permite programar uma rotina agendada no Agendador de Tarefas do Windows para executar o diagnóstico e manutenção em dias específicos do mês e horários pré-determinados, gravando o estado em `checkup_agendamento.json`.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Arquitetura]] | Ver [[Design System]] | Ver [[Manutenção e Scripts]] | Ver [[Squad Multi-Agentes]]
