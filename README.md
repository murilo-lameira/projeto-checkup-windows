# ⚡ CheckUP Windows - Dashboard de Diagnóstico & Otimização

[![Squad Multi-Agentes](https://img.shields.io/badge/Squad-Multi--Agentes-cf663f?style=for-the-badge&logo=anthropic&logoColor=white)](Check%20Up/Squad%20Multi-Agentes.md)
[![Pixel Agents](https://img.shields.io/badge/Pixel%20Agents-Integrado-F59E0B?style=for-the-badge)](scripts/pixel_agents_bridge.js)
[![Versão](https://img.shields.io/badge/Versão-1.3.0-blue?style=for-the-badge)](package.json)
[![Electron](https://img.shields.io/badge/Electron-44.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.org/)
[![PowerShell Nativo](https://img.shields.io/badge/PowerShell-Zero%20Third--Party%20.exe-5391FE?style=for-the-badge&logo=powershell&logoColor=white)](core/checkup.ps1)
[![Obsidian](https://img.shields.io/badge/Obsidian-Documentado-7C3AED?style=for-the-badge&logo=obsidian&logoColor=white)](Check%20Up/Home.md)
[![Download CheckUP](https://img.shields.io/badge/Download-Executável%20Portable-22c55e?style=for-the-badge&logo=windows)](https://github.com/murilo-lameira/projeto-checkup-windows/releases/latest)

Aplicativo desktop profissional de diagnóstico, monitoramento contínuo e manutenção profunda para sistemas operacionais **Windows 10 e 11**. O CheckUP integra quatro ambientes em uma interface responsiva: **Dashboard**, **Histórico de Performance**, **Gestor de Programas** e **Central de Otimização**.

Construído sob a estética **Obsidian Telemetry** (Dark Glassmorphism adaptado do **Google Stitch**) com iluminação atmosférica âmbar e acentos em Cobre metálico (`#cf663f`), o aplicativo adota tipografia tríade de alta precisão (**Space Grotesk**, **Geist** e **JetBrains Mono**), é **100% Offline-First**, consome **~0% de CPU em segundo plano** e segue a rigorosa premissa de **Zero Executáveis de Terceiros**, utilizando exclusivamente as ferramentas e APIs que acompanham nativamente o Windows. Na versão **1.3.0**, introduz **opções de melhoria individuais modulares**, **despachante nativo PowerShell com telemetria JSON**, **widgets heróicos de telemetria**, **resiliência total de inicialização** e **blindagem portátil contra auto-deleção**.

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

### 🏢 Escritório Virtual em Tempo Real (Pixel Agents) & Antigravity Skill
O time conta com integração dupla:
- **Pixel Agents:** Permite visualizar e monitorar o squad operando no escritório virtual com avatares animados durante as sessões de desenvolvimento.
- **Antigravity Skill Global (`~/.agents/skills/agents-md/`):** Skill global do ecossistema de agentes que assegura que todos os 5 subagentes permaneçam obrigatoriamente instanciados e visíveis no painel lateral (*Subagents*) do IDE via `invoke_subagent`.

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

### 1. 🖥️ Dashboard Integrada (Layout Stitch de 6 Colunas)
* **Widget Saúde Hero com Gauge Circular:** Score de 0 a 100 em `Space Grotesk`, anel SVG vetorial com animação dinâmica, beacon esmeralda pulsante e botão de microação "Reavaliar".
* **Widget Sensores em Tempo Real (Live Load):** Amostragem de 1s sem overhead, gráfico multi-anel radial ApexCharts e mini-cards de CPU (com temperatura em tempo real), RAM e SSD.
* **Widget Recomendações e Otimizações Sugeridas:** Cards heurísticos com estimativa de ganho no boot (`+1.4s`) e atalhos de 1 clique para a aba de Otimização.
* **Widget Hardware com "Copiar Specs":** Especificações completas com ícones dedicados e botão One-Click para copiar todas as informações técnicas para a Área de Transferência.
* **Resiliência e Fallback Nativo:** *Zero Broken State* com preenchimento instantâneo via Node.js (`os.cpus()`, `os.totalmem()`, `fs.statfsSync`) na primeira execução.
* **Rede, Limpeza e Sensores Térmicos:** Monitoramento de tráfego, velocidade, medidores semicirculares de temperatura e donutchart de arquivos temporários.

### 2. 📊 Histórico de Performance
* **Janela Rotativa dos 50 Últimos Diagnósticos:** Persistência incremental em JSON local.
* **Correlação CPU vs RAM:** Gráficos de alta resolução para identificação de gargalos ao longo do tempo.
* **Linha do Tempo de Incidentes:** Cards interativos que explicam causas de anomalias (picos térmicos, esgotamento de memória e erros do Event Viewer).

### 3. 🗑️ Gestor & Desinstalador de Softwares
* **Auditoria Completa de Instalados:** Extração direta do Registro do Windows (HKLM/HKCU, 32 e 64 bits) e catálogo Winget.
* **Busca Indexada Instantânea:** Filtragem dinâmica por nome, versão e editor.
* **Desinstalação Silenciosa com Elevação (`RunAs`):** Execução assíncrona de rotinas desinstaladoras sem congelar a interface.

### 4. 🚀 Central de Otimização & Manutenção Granular
* **Master Card "Checkup & Manutenção Geral 6 em 1":** Painel hero no topo da aba com acionamento em 1 clique para a rotina completa com modal de progresso, cronômetro e checklist interativo.
* **Opções Individuais de Melhoria:** Grid dedicado com execução isolada e não-bloqueante para cada rotina:
  * *Otimização de Rede & DNS* (`ipconfig /flushdns` + `netsh winsock reset`)
  * *Limpeza de Arquivos Temporários* (com proteção estrita contra auto-deleção da build portátil)
  * *Otimização TRIM para SSDs* (`Optimize-Volume -ReTrim`)
  * *Integridade de Arquivos do Windows* (`SFC /scannow`)
  * *Reparo da Imagem do Sistema* (`DISM /RestoreHealth`)
  * *Atualização de Aplicativos* (`Winget upgrade --all`)
  * *Reparador do Windows Update* (limpeza de cache e reinicialização de serviços)
* **Gestor de Inicialização:** Ativação/desativação ágil de aplicativos iniciados com o Windows via chaves oficiais de registro.
* **Benchmark Nativo de SSD/HDD:** Medição de velocidade sequencial de leitura e gravação em MB/s via streams assíncronas do .NET (`System.IO.FileStream` e `Stopwatch`), **sem binários ou instaladores de terceiros**.
* **Otimização ReTrim & Defrag:** Detecção automática do tipo de mídia (SSD -> `Optimize-Volume -ReTrim`; HDD -> `Defrag`).
* **Escudo de Segurança Responsivo:** Detecção de antivírus de terceiros via WMI SecurityCenter2, status do Defender em tempo real, proteção em nuvem e isolamento de núcleo.

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
