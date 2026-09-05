# ⚡ CheckUP Windows - Dashboard de Diagnóstico & Otimização

[![Squad Multi-Agentes](https://img.shields.io/badge/Squad-Multi--Agentes-cf663f?style=for-the-badge&logo=anthropic&logoColor=white)](Check%20Up/Squad%20Multi-Agentes.md)
[![Pixel Agents](https://img.shields.io/badge/Pixel%20Agents-Integrado-F59E0B?style=for-the-badge)](scripts/pixel_agents_bridge.js)
[![Electron](https://img.shields.io/badge/Electron-44.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![PowerShell Nativo](https://img.shields.io/badge/PowerShell-Zero%20Third--Party%20.exe-5391FE?style=for-the-badge&logo=powershell&logoColor=white)](core/checkup.ps1)
[![Obsidian](https://img.shields.io/badge/Obsidian-Documentado-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white)](Check%20Up/Home.md)
[![Download CheckUP](https://img.shields.io/badge/Download-Executável%20Portable-22c55e?style=for-the-badge&logo=windows)](https://github.com/murilo-lameira/projeto-checkup-windows/releases/latest)

Aplicativo desktop profissional de diagnóstico, monitoramento contínuo e manutenção profunda para sistemas operacionais **Windows 10 e 11**. O CheckUP integra quatro ambientes em uma interface responsiva: **Dashboard**, **Histórico de Performance**, **Gestor de Programas** e **Central de Otimização**.

Construído sob a estética **Dark Glassmorphism** com acentos em Cobre metálico (`#cf663f`), o aplicativo é **100% Offline-First**, consome **~0% de CPU em segundo plano** e segue a rigorosa premissa de **Zero Executáveis de Terceiros**, utilizando exclusivamente as ferramentas e APIs que acompanham nativamente o Windows.

---

## 📸 Telas do Aplicativo

<img width="2557" height="1389" alt="Dashboard CheckUP" src="https://github.com/user-attachments/assets/0da5dfa9-039d-4a19-bb35-48b759e1536c" />

<img width="2551" height="1387" alt="Histórico de Performance" src="https://github.com/user-attachments/assets/013670fc-d3d2-44ea-81e0-1cbc22d98aa3" />

---

## 👥 Desenvolvimento por Squad Multi-Agentes

O projeto é mantido e evoluído de forma colaborativa por um **Squad de Agentes Autônomos de IA**, com governança descrita em [`AGENTS.md`](AGENTS.md) e documentada no Obsidian em [`Check Up/Squad Multi-Agentes.md`](Check%20Up/Squad%20Multi-Agentes.md):

| Agente | ID de Sessão | Especialidade Principal | Foco Primário |
| :--- | :--- | :--- | :--- |
| **Dev** | `checkup_dev` | Backend & Sistemas | Node.js, Electron, PowerShell nativo (`.ps1`), WMI/CIM e Registro do Windows |
| **UI/UX** | `checkup_ui_ux` | Design System & Frontend | Dark Glassmorphism, ApexCharts, paleta Cobre (`#cf663f`), Grid adaptativo |
| **QA** | `checkup_qa` | Testes & Resiliência | Validação funcional, casos de borda do Windows, UAC e `npm run validate` |
| **Revisor** | `checkup_reviewer` | Arquitetura & Segurança | Auditoria contra `memory.md`, segurança contra injeção e integridade |
| **Documentador** | `checkup_doc` | Obsidian & Conhecimento | Gestão contínua do cofre (`Check Up/`), wikilinks e `backlog.md` |

### 🏢 Escritório Virtual em Tempo Real (Pixel Agents)
O time conta com integração ao **Pixel Agents**, permitindo visualizar e monitorar o squad operando no escritório virtual com avatares animados durante as sessões de desenvolvimento:

```bash
# Iniciar a simulação dinâmica contínua do squad
npm run agents:pixel

# Instanciar todos os agentes no escritório
node scripts/pixel_agents_bridge.js --spawn-only

# Encerrar expediente e limpar o escritório
npm run agents:pixel:clear
```

---

## ✨ Funcionalidades Principais

### 1. 🖥️ Dashboard em Tempo Real
* **Telemetria Ultraleve (0% CPU):** Métricas de CPU calculadas via delta de ticks de `os.cpus()`, memória física via `os.totalmem()`/`os.freemem()` e tráfego de rede via utilitário nativo `netstat -e` (~30ms), eliminando processos pesados contínuos de PowerShell.
* **ApexCharts Offline Local:** Gráficos interativos empacotados localmente (`src/assets/vendor/apexcharts.min.js`), garantindo funcionamento sem internet e sem CDN externo.
* **Sensores Térmicos:** Velocímetros dinâmicos para processadores (Intel / AMD Ryzen) e unidades de armazenamento (NVMe, SATA e HDD) via `LibreHardwareMonitorLib.dll`.
* **Saúde Física & S.M.A.R.T.:** Monitoramento preventivo de desgaste de discos com sparklines dedicados.
* **Limpeza Rápida com Gráfico Donut:** Monitoramento de caches temporários (`%TEMP%`, navegador, DNS) e liberação com um clique.

### 2. 📊 Histórico de Performance
* **Janela Rotativa dos 50 Últimos Diagnósticos:** Persistência incremental em JSON local.
* **Correlação CPU vs RAM:** Gráficos de alta resolução para identificação de gargalos ao longo do tempo.
* **Linha do Tempo de Incidentes:** Cards interativos que explicam causas de anomalias (picos térmicos, esgotamento de memória e erros do Event Viewer).

### 3. 🗑️ Gestor & Desinstalador de Softwares
* **Auditoria Completa de Instalados:** Extração direta do Registro do Windows (HKLM/HKCU, 32 e 64 bits) e catálogo Winget.
* **Busca Indexada Instantânea:** Filtragem dinâmica por nome, versão e editor.
* **Desinstalação Silenciosa com Elevação (`RunAs`):** Execução assíncrona de rotinas desinstaladoras sem congelar a interface.

### 4. 🚀 Central de Otimização
* **Gestor de Inicialização:** Ativação/desativação ágil de aplicativos iniciados com o Windows.
* **Benchmark Nativo de SSD/HDD:** Medição de velocidade sequencial de leitura e gravação em MB/s via streams assíncronas do .NET (`System.IO.FileStream` e `Stopwatch`), **sem binários ou instaladores de terceiros**.
* **Otimização ReTrim & Defrag:** Detecção automática do tipo de mídia (SSD -> `Optimize-Volume -ReTrim`; HDD -> `Defrag`).
* **Escudo de Segurança Responsivo:** Detecção de antivírus de terceiros via WMI SecurityCenter2, status do Defender em tempo real, proteção em nuvem e isolamento de núcleo.
* **Reparador de Sistema Integrado:** Execução imediata de reparo profundo com `SFC /scannow` e `DISM /RestoreHealth`.

### 5. 📑 Exportação de Relatório Técnico (HTML + PDF)
* Botão com ícone vetorial dedicado de PDF na sidebar.
* Compilação automática de auditoria completa em documento HTML autocontido com CSS responsivo embutido, tabelas de hardware, volumes e portas de rede.
* Botão nativo para salvar/imprimir em PDF (`window.print()`).

### 6. 🛠️ Central de Manutenção com Stepper Animado
* Processo automatizado em 6 fases com acompanhamento em tempo real, cronômetro e checklist interativo:
  1. *Otimização de Rede e DNS* (`ipconfig /flushdns`)
  2. *Limpeza de Arquivos Temporários*
  3. *Integridade de Arquivos Protegidos* (`SFC`)
  4. *Restauração da Imagem do Windows* (`DISM`)
  5. *Otimização de Armazenamento* (`TRIM / Defrag`)
  6. *Atualização de Aplicativos* (`Winget`)

### 7. 🔔 Sistema de Modais Glassmorphism
* Substituição de alertas e confirmações bloqueantes do navegador (`alert()`, `confirm()`) por caixas de diálogo modais assíncronas (`showConfirm`, `showAlert`) com visual Dark Glassmorphism.

---

## 📂 Estrutura do Repositório

```text
checkup-windows/
├── Check Up/                  # Cofre oficial do Obsidian (Documentação interligada)
│   ├── Home.md                # Ponto de entrada do cofre
│   ├── Arquitetura.md         # Modelo de telemetria, IPC e segurança
│   ├── Design System.md       # Dark Glassmorphism, paleta Cobre e Grid 6 colunas
│   ├── Estrutura de Pastas.md # Mapeamento completo de diretórios
│   ├── Funcionalidades.md     # Documentação detalhada de cada módulo
│   ├── Manutenção e Scripts.md# Lógica PowerShell, elevação UAC e Benchmark
│   └── Squad Multi-Agentes.md # Governança dos agentes e integração Pixel Agents
├── core/                      # Módulos nativos e scripts do Windows
│   ├── lib/                   # DLLs .NET de leitura de baixo nível (LHM, CPU, Discos)
│   ├── checkup.ps1            # Script mestre de diagnóstico WMI/CIM
│   ├── Ferramenta_Reparo.bat  # Rotinas batch auxiliares
│   ├── CriarTarefa.bat        # Automatizador do Agendador de Tarefas do Windows
│   ├── ExecutarCheckup.bat    # Execução autônoma do diagnóstico
│   └── Instalar_Rotina.ps1    # Configuração de rotina agendada mensal
├── scripts/                   # Automações de desenvolvimento e build
│   ├── convert-icon.js        # Utilitário de conversão de ícone (.ico)
│   └── pixel_agents_bridge.js # Bridge WebSocket para o escritório Pixel Agents
├── src/                       # Frontend da aplicação (Electron Renderer)
│   ├── assets/                # Ícones vetoriais SVG (PDF, hardware, badges)
│   ├── assets/vendor/         # Bibliotecas locais (apexcharts.min.js offline)
│   ├── index.html             # Estrutura DOM das 4 abas e modais
│   ├── renderer.js            # Telemetria, gráficos, benchmark e eventos
│   └── style.css              # Design System em Dark Glassmorphism responsivo
├── main.js                    # Processo principal (Main Process) do Electron
├── package.json               # Configurações do projeto e scripts npm
├── backlog.md                 # Rastreamento de demandas e fases
├── memory.md                  # Memória técnica e regras do projeto
└── README.md                  # Esta documentação
```

---

## 📥 Como Usar (Usuário Final)

Não é necessário configurar ambientes de programação para executar o CheckUP:

1. Baixe o executável mais recente na aba [Releases](https://github.com/murilo-lameira/projeto-checkup-windows/releases/latest).
2. Clique com o botão direito no arquivo baixado e selecione **"Executar como Administrador"**. *(Necessário para permitir a leitura de sensores de hardware e acionamento das rotinas de reparo do sistema).*
3. Ao abrir, o CheckUP apresentará a tela de carregamento suave enquanto inicializa a telemetria e o dashboard.

---

## 💻 Desenvolvimento Local

### Pré-requisitos
* **Sistema:** Windows 10 ou 11 (64-bit).
* **Node.js:** Versão 20 ou superior recomendada.
* **PowerShell:** Versão 5.1 ou PowerShell 7.

### Instalação & Execução
```bash
# 1. Instalar dependências
npm install

# 2. Executar validação sintática estática
npm run validate

# 3. Iniciar o aplicativo em ambiente de desenvolvimento
npm start
```

### Compilação do Executável (.exe Portátil)
```bash
npm run build
```
O artefato final será gerado no diretório `dist/` como um executável portátil otimizado (`CheckUP Windows.exe`).

---

## 🛡️ Regras Invioláveis do Projeto

1. **Zero Executáveis de Terceiros:** É proibido incluir binários compilados externos (.exe). Toda a automação se apoia em utilitários legítimos do ecossistema Microsoft Windows (`DISM`, `sfc`, `winget`, `Get-CimInstance`, `defrag`, `netstat`, etc.).
2. **Escapes e Codificação Segura:** Comandos PowerShell acionados a partir do Node.js utilizam codificação Base64 UTF-16LE (`-EncodedCommand`) para prevenir interpretação indevida pelo `cmd.exe` e ataques de injeção de parâmetros.
3. **Identidade Visual Dark Glassmorphism:** Todos os componentes respeitam estritamente a paleta carvão/cobre (`#cf663f`), fundos translúcidos com `backdrop-filter: blur(16px)` e grid CSS responsivo.
4. **Sincronia com o Obsidian:** Qualquer alteração no código acompanha atualização imediata nas notas do cofre Obsidian (`Check Up/*.md`) com wikilinks `[[...]]`.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**.
