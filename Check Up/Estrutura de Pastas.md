# 📂 Estrutura de Pastas & Arquivos

Visão detalhada e atualizada da organização de diretórios e arquivos do **Projeto CheckUP Windows**.

```text
Projeto CheckUP/
├── .agents/                   # Configuração e transcripts do time de agentes autônomos
├── Check Up/                  # Cofre oficial do Obsidian (Documentação interligada)
│   ├── Home.md                # Ponto de entrada do cofre
│   ├── Arquitetura.md         # Modelo de telemetria, IPC e segurança
│   ├── Design System.md       # Dark Glassmorphism, paleta Cobre e Grid 6 colunas
│   ├── Estrutura de Pastas.md # Este documento
│   ├── Funcionalidades.md     # Documentação detalhada de cada módulo
│   ├── Manutenção e Scripts.md# Lógica PowerShell, elevação UAC e Benchmark
│   └── Squad Multi-Agentes.md # Governança dos agentes e integração Pixel Agents
├── core/                      # Scripts do sistema operacional e rotinas nativas
│   ├── lib/                   # DLLs .NET de leitura de baixo nível (LHM, CPU, Discos)
│   ├── checkup.ps1            # Script mestre de diagnóstico WMI/CIM
│   ├── Ferramenta_Reparo.bat  # Rotinas batch de reparo de arquivos e disco
│   ├── CriarTarefa.bat        # Automatizador de agendamento de tarefas do Windows
│   ├── ExecutarCheckup.bat    # Launcher de execução autônoma do diagnóstico
│   └── Instalar_Rotina.ps1    # Script de setup e automação periódica
├── dist/                      # Arquivos executáveis e builds de distribuição (.exe portátil)
├── historico/                 # Histórico incremental dos últimos 50 diagnósticos (JSON)
├── relatorios/                # Relatórios técnicos gerados pelo exportador (HTML autocontido)
├── scripts/                   # Automações de desenvolvimento e build
│   ├── convert-icon.js        # Utilitário para conversão e geração de ícones (.ico)
│   └── pixel_agents_bridge.js # Bridge de integração com o escritório virtual Pixel Agents
├── src/                       # Frontend da aplicação desktop (Electron Renderer)
│   ├── assets/                # Recursos estáticos
│   │   ├── icons/             # Ícones vetoriais SVG (pdf.svg, hardware, status)
│   │   └── vendor/            # Dependências locais offline (apexcharts.min.js)
│   ├── index.html             # Estrutura DOM das 4 abas, modais e overlays
│   ├── renderer.js            # Telemetria 0% CPU, benchmark, gráficos e eventos
│   └── style.css              # Design System em Dark Glassmorphism responsivo
├── AGENTS.md                  # Definição e regras invioláveis do Squad Multi-Agentes
├── backlog.md                 # Rastreamento de demandas por fase
├── main.js                    # Processo principal (Main Process) do Electron
├── memory.md                  # Memória técnica persistente e lições aprendidas
├── package.json               # Configurações do projeto Node.js, dependências e scripts
├── package-lock.json          # Trava de versões das dependências npm
└── README.md                  # Apresentação do repositório no GitHub com badges
```

---

## 🔎 Papel dos Diretórios Principais

### 1. `Check Up/` (Cofre Obsidian)
Armazena a base de conhecimento do projeto com links bidirecionais no formato `[[...]]`:
- Entrada pela [[Home]].
- Conexões com a [[Arquitetura]], o [[Design System]], as [[Funcionalidades]] e o [[Squad Multi-Agentes]].

### 2. `core/` (Lógica Nativa do Windows)
Contém os módulos de diagnóstico profundo e scripts de elevação:
- **`checkup.ps1`:** Extrai dados de hardware, licença, discos e processos usando CIM e a `LibreHardwareMonitorLib.dll`.
- **`lib/`:** DLLs .NET de baixo nível (`LibreHardwareMonitorLib.dll`, `DiskInfoToolkit.dll`, `RAMSPDToolkit-NDD.dll`), permitindo leitura de sensores térmicos e saúde S.M.A.R.T. sem instalar programas pesados de terceiros.
- Veja os detalhes de execução em [[Manutenção e Scripts]].

### 3. `src/` (Interface do Usuário - Electron Renderer)
- **`index.html`:** Layout estruturado das 4 páginas (`#dashboardPage`, `#historicoPage`, `#programasPage`, `#otimizacaoPage`), central de manutenção com steppers e modais assíncronos.
- **`style.css`:** Folhas de estilo em Dark Glassmorphism, paleta Cobre (`#cf663f`) e Grid adaptativo de 6 colunas com proteção de cards (`min-width: 0`).
- **`renderer.js`:** Executa telemetria com processos nativos do Node.js, benchmark sequencial de disco, despacha rotinas assíncronas do PowerShell e gerencia os gráficos locais via ApexCharts.

### 4. `relatorios/` & `historico/`
- Armazenam localmente snapshots de auditoria (`dados_atuais.json`), relatórios autocontidos com atalho para PDF (`relatorio_checkup_<timestamp>.html`) e registros históricos (`historico_checkup.json`).

---
**Navegação:** Voltar para a [[Home]] | Conhecer a [[Arquitetura]] | Ver [[Funcionalidades]] | Ver [[Squad Multi-Agentes]]
