# Funcionalidades

O aplicativo **Projeto CheckUP** divide-se em um **Hub Superior com 4 abas integradas** e painéis modulares para monitorar, diagnosticar e manter o sistema operacional Windows em sua melhor performance.

---

## 1. Hub de Navegação Superior
A interface principal adota o padrão [[Design System|Glassmorphism]] e é segmentada em quatro visões (`page-view`):

### 🖥️ Dashboard Integrada
Visão executiva em tempo real com telemetria contínua da máquina:
- **Insights do Sistema:** Gráfico radial em loop contínuo medindo CPU, Memória RAM e Disco (C:).
- **Hardware Instalado:** Mapeamento de Processador, Memória, Placa de Vídeo, Placa-Mãe, Sistema Operacional e status da Licença Windows via WMI/CIM.
- **Sensores Térmicos Dinâmicos:** Medidores semicirculares estilo velocímetro com monitoramento em tempo real da temperatura da CPU (Intel/AMD) e Armazenamento (NVMe/SATA/HDD), alimentados pela `LibreHardwareMonitorLib.dll`.
- **Discos e Armazenamento:** Lista particionada de unidades com taxa de ocupação, tipo de mídia e leitura de integridade física S.M.A.R.T com sparklines.
- **Maior Consumo de RAM:** Tabela com os processos mais pesados residentes na memória, com botão de encerramento forçado individual (`taskkill`).
- **Saúde do Computador:** Status heurístico (Saudável, Atenção, Crítico) e recomendações dinâmicas de ação.
- **Rede, Latência & Reparo:** Gráfico de área em tempo real do tráfego e latência de rede com **seletor de alvo de ping** (Google DNS `8.8.8.8`, Cloudflare DNS `1.1.1.1` e Localhost `127.0.0.1`) e botão de ação rápida para **Reparar Conexão** (`ipconfig /flushdns`, `/release`, `/renew`).
- **Vida Útil da Bateria (Wear Level):** Card dinâmico exclusivo para notebooks com medidor radial ApexCharts indicando o desgaste físico (`Wear Level`), Capacidade Original de Fábrica (*Design Capacity*), Capacidade de Carga Total Atual (*Full Charge Capacity*) e estado da bateria (com ocultação automática em desktops).
- **Ciclo de Atividade (Uptime):** Medidor do tempo ininterrupto de atividade da máquina com alertas para tempo excessivo sem reiniciar.
- **Auditoria de Segurança:** Status em tempo real do Windows Defender/Antivírus, Firewall e detecção de ferramentas de acesso remoto.
- **Erros do Sistema (24h):** Monitoramento de incidentes críticos registrados no *Event Viewer* do Windows.

---

### 📊 Histórico de Performance (ApexCharts)
Aba dedicada à análise de séries temporais das coletas do sistema:
- **Janela Rotativa (50 registros):** Armazenamento em cache JSON local persistindo as últimas 50 amostras de diagnóstico.
- **Desempenho Bruto (CPU vs RAM):** Gráfico de linha/área cruzando a evolução da carga de CPU contra o consumo de memória RAM ao longo do tempo.
- **Linha do Tempo de Alertas e Incidentes:** Gráfico de eventos que plota anomalias (picos de uso, saturação de memória, erros de sistema) com tooltips interativos detalhando a causa raiz de cada alerta.

---

### 📦 Gestor & Desinstalador de Aplicativos (Programas)
Módulo nativo para inventário e limpeza de softwares instalados:
- **Varredura no Registro do Windows:** Consulta via PowerShell às chaves de desinstalação (`HKLM` 64-bit, `HKLM` 32-bit `Wow6432Node` e `HKCU`), extraindo Nome, Ícone do aplicativo, Fornecedor/Editor, Versão e strings de desinstalação.
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
  - **Benchmark Nativo de Velocidade:** Medição em tempo real de taxas sequenciais de leitura e gravação em MB/s via PowerShell `.NET` (`System.IO.FileStream` e `System.Diagnostics.Stopwatch`) operando com bloco temporário de 100 MB em `%TEMP%`, 100% livre de binários externos ou dependências de terceiros.
  - **Otimização Inteligente de Volume:** Botão One-Click com detecção automática do tipo de mídia (envia `ReTrim` para SSDs/NVMes ou `Defrag` para discos mecânicos tradicionais).
- **Escudo de Segurança com Detecção Híbrida & Grid Responsivo:** Painel avançado de ciberdefesa com suporte a ambientes híbridos e layout 100% responsivo (adaptando-se perfeitamente aos breakpoints de 1440px, 1200px e 950px sem espremer cards ou quebrar linhas). Realiza uma consulta dupla:
  1. No namespace WMI `root/SecurityCenter2` (`AntiVirusProduct`) para identificar softwares de proteção de terceiros instalados (ex: Kaspersky, Avast, Bitdefender, Norton).
  2. No módulo `Get-MpComputerStatus` para telemetria do Microsoft Defender.
  Caso um antivírus de terceiros esteja gerenciando o sistema, o card exibe o nome do fornecedor com badge esmeralda ("Protegido por Terceiros"), eliminando falsos alarmes de risco que ocorriam quando o Defender entrava em modo passivo. Em resoluções menores ou ao redimensionar a janela, o card expande-se automaticamente ocupando a largura completa da linha (`span 2` / `span 1`) com tipografia protegida por `.shield-status-row`, garantindo leitura limpa em qualquer tamanho de monitor. Possui também botão para restaurar defesas nativas via `Set-MpPreference`.
- **Reparador de Sistema (SFC/DISM):** Botão de ação rápida que engatilha as ferramentas de reparo profundo da Microsoft (`sfc /scannow` e `DISM /RestoreHealth`) para corrigir corrupções de DLLs e telas azuis.

*(Adicionalmente, na página Dashboard, o card* **Limpeza Profunda** *monitora dinamicamente as pastas `%TEMP%`, `C:\Windows\Temp` e os caches seguros de navegadores Chromium/Gecko, permitindo eliminar lixo digital e descarregar sockets DNS (`ipconfig /flushdns`) com um único clique acompanhado de gráfico Donut [[Design System|ApexCharts]]).*

---

## 2. Rotinas Centrais de Ação

### 🔍 Diagnóstico e Exportação de Relatórios
- **Inicialização Suave com Loading Overlay:** Ao abrir o aplicativo, uma tela de transição Dark Glassmorphism com spinner em Cobre/Teal (`#loadingOverlay`) é exibida cobrindo o painel durante a carga dos dados em cache e renderização dos gráficos, ocultando-se suavemente por fade-out para evitar que o usuário visualize o dashboard vazio ou com métricas incompletas. A varredura profunda com privilégios de Administrador ocorre sob demanda. O envio de alertas para o Discord (caso configurado) lê de forma segura a variável `$env:CHECKUP_DISCORD_WEBHOOK` sem expor credenciais no código.
- **Exportação de Relatório Diagnóstico (HTML / PDF):** Botão estilizado com o ícone vetorial de PDF na barra lateral que compila a auditoria técnica completa em um arquivo HTML autocontido com CSS responsivo embutido, tabelas de hardware, armazenamento e conectividade, salvando em `relatorios/relatorio_checkup_<timestamp>.html` e abrindo-o automaticamente no navegador padrão via Electron `shell.openPath`. Inclui botão direto para salvar/imprimir em PDF nativo (`window.print()`).
- **Sistema de Diálogos Modais (Glassmorphism):** Substituição completa dos diálogos bloqueantes `alert()` e `confirm()` do navegador por modais assíncronos baseados em Promises (`showConfirm`, `showAlert`), com cartões translúcidos, ícones contextuais e botões estilizados no padrão Cobre (`#cf663f`).

### 🛠️ Manutenção Completa
Rotina profunda em 6 etapas automatizadas com acompanhamento em tempo real via modal com cronômetro e checklist interativo:
1. **Otimização de Rede e DNS:** Liberação de cache DNS (`ipconfig /flushdns`) e redefinição de sockets TCP/IP.
2. **Limpeza de Arquivos Temporários:** Eliminação de arquivos residuais em `%TEMP%`, pastas temporárias do Windows e esvaziamento de lixeira.
3. **Integridade de Arquivos (SFC):** Varredura e reparo automático de arquivos essenciais protegidos do sistema (`sfc /scannow`).
4. **Restauração de Imagem (DISM):** Reparo de componentes corrompidos da imagem do Windows (`DISM /Online /Cleanup-Image /RestoreHealth`).
5. **Otimização de Armazenamento (TRIM / Defrag):** Verificação de mídia e comando ReTrim/Defrag para otimização de velocidade e longevidade do disco.
6. **Atualização de Programas (Winget):** Checagem preventiva e atualização de softwares instalados via repositório oficial do Windows Package Manager (com detecção de disponibilidade).

*Para entender como os scripts operam com elevação de privilégios, consulte [[Manutenção e Scripts]] e a [[Arquitetura]].*

---

### ⏰ Automação e Agendamento Mensal
Permite programar uma rotina agendada no Agendador de Tarefas do Windows para executar o diagnóstico e manutenção em dias específicos do mês e horários pré-determinados, gravando o estado em `checkup_agendamento.json`.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Arquitetura]] | Ver [[Design System]] | Ver [[Squad Multi-Agentes]]


