# 🚀 CheckUP Windows v2.2.0 - Obsidian Telemetry & Granular Maintenance

> **Release Date:** 21 de Setembro de 2026  
> **Target OS:** Windows 10 e Windows 11 (64-bit)  
> **Build Target:** Portable (.exe autocontido) & Instalador  
> **Branch:** `feature/stitch-obsidian-telemetry`  

---

## 🌟 Destaques da Versão 2.2.0

A versão **1.3.0** do **CheckUP Windows** introduz uma reformulação visual completa baseada na estética **Obsidian Telemetry** adaptada do **Google Stitch**, além da aguardada **Modularização das Opções de Manutenção**, permitindo que o usuário execute rotinas individuais sob demanda sem a obrigatoriedade de rodar o checklist em lote. Esta versão também blinda a execução em modo portátil contra auto-deleção acidental de arquivos temporários e resolve o falso positivo de telemetria na interface.

---

## ✨ Novas Funcionalidades & Melhorias

### 1. 🧩 Opções Individuais de Melhoria & Master Card 6 em 1
* **Master Card Hero Panorâmico:** Mantém o acionamento em 1 clique da rotina mestre ("Checkup & Manutenção Geral 6 em 1") no topo da aba Otimização, acompanhada de modal animado, cronômetro de precisão e checklist com gradiente Cobre/Teal.
* **Grid de 7 Funções Granulares Independentes:**
  1. 🌐 **Otimização de Rede & DNS (`dns`):** Flush do cache DNS (`ipconfig /flushdns`) e redefinição de sockets TCP/IP e Winsock via `netsh` (~5s).
  2. 🧹 **Limpeza de Temporários (`temp`):** Purga de arquivos residuais em `%TEMP%` e `C:\Windows\Temp` com exclusão segura do aplicativo portátil (~10s).
  3. ⚡ **Otimização TRIM para SSD (`trim`):** Instrução nativa `Optimize-Volume -ReTrim` para unidades SSD/NVMe ou desfragmentação de trilhas em HDDs (~15s).
  4. 🛡️ **Integridade de Arquivos SFC (`sfc`):** Varredura e restauração de arquivos protegidos corrompidos via `sfc /scannow` (~2-4 min).
  5. 🔧 **Reparo de Imagem DISM (`dism`):** Restauração do repositório de componentes do Windows Update via `DISM /RestoreHealth` (~3-6 min).
  6. 📦 **Atualização de Softwares via Winget (`winget`):** Varredura e upgrade automatizado de softwares instalados via catálogo oficial Microsoft (~1-3 min).
  7. 🔄 **Reparador do Windows Update (`wupdate`):** Limpeza do cache em `SoftwareDistribution` e reinicialização de serviços de atualização (~10s).
* **Despachante Nativo Granular (`core/ExecutarRotina.ps1`):** Script PowerShell paramétrico (`-Rotina <nome> -StatusFile <caminho>`) 100% nativo com telemetria em JSON em tempo real.
* **Feedback Visual Não-Bloqueante:** Botões com spinner de carregamento durante a execução, ícone esmeralda de confirmação ao término e notificações flutuantes **Toast Dark Glassmorphism**.

---

### 2. 🎨 Design System Obsidian Telemetry (Google Stitch)
* **Atmosfera Visual:** Gradiente angular industrial escuro com iluminação radial atmosférica âmbar/cobre (*Stitch Ambient Glow*).
* **Tipografia Tríade de Alta Precisão:**
  * **Space Grotesk:** Números heróicos e score de integridade circular.
  * **Geist:** Tipografia para interface, cards e botões.
  * **JetBrains Mono:** Clocks, caminhos de arquivo e telemetria de sensores.
* **Gauge Circular de Saúde SVG:** Anel circular animado com score dinâmico de 0 a 100 e beacon pulsante esmeralda/âmbar/vermelho.
* **Widget Sensores Live Load:** Gráfico multi-anel radial ApexCharts com sensor dots de CPU, RAM e SSD em tempo real (1s).
* **Botão One-Click "Copiar Specs":** Exportação instantânea das especificações técnicas de hardware para a Área de Transferência com confirmação visual.

---

### 3. 🛡️ Correções Críticas & Resiliência Operacional

| Problema Identificado | Causa Raiz | Solução Aplicada |
| :--- | :--- | :--- |
| **"Erro de Telemetria" na UI** | O selo `#healthPillText` exibia `"Índice de Telemetria Crítico"` quando o EventLog do Windows continha falhas de drivers ou BSODs do SO. | Reclassificado o selo para `"Integridade do Sistema: Estável / Atenção / Crítico"`. |
| **Crash ICU na Versão Portátil** | `Remove-Item "$env:TEMP\*"` apagava a pasta de descompactação `%TEMP%\checkup-windows`, destruindo DLLs e scripts em uso. | Aplicado filtro obrigatório `-Exclude "*checkup*"` em todos os scripts PowerShell e Batch. |
| **Travamento no DISM** | O processo `DISM` aguardava conexões lentas do Windows Update indefinidamente. | Implementado watchdog em Job PowerShell com timeout estrito de 180 segundos. |
| **Perda de Histórico em Limpezas** | Relatórios salvos apenas em `%TEMP%` eram apagados em limpezas profundas. | Implementada persistência dupla em `%USERPROFILE%\checkup_relatorios` e pasta do projeto. |

---

## 📦 Como Executar / Instalar

### Opção 1: Executável Portátil (Recomendado)
1. Baixe o executável `CheckUP Windows 1.3.0.exe` na seção de [Assets](#assets) abaixo.
2. Execute o arquivo diretamente (não requer instalação prévia).
3. O aplicativo descompacta e roda isoladamente no seu Windows 10 ou 11.

### Opção 2: A partir do Código-Fonte
```bash
# Clonar o repositório
git clone https://github.com/murilo-lameira/projeto-checkup-windows.git
cd projeto-checkup-windows

# Instalar dependências
npm install

# Validar código
npm run validate

# Iniciar o aplicativo
npm start

# Gerar build portátil
npm run build
```

---

## 👥 Squad Multi-Agentes Envolvido

* **checkup_dev (Sistemas & Backend):** Despachante `core/ExecutarRotina.ps1`, persistência dupla e blindagem de `%TEMP%`.
* **checkup_ui_ux (Design System & Frontend):** Layout Stitch, Dark Glassmorphism, master card e cards individuais.
* **checkup_qa (Testes & Resiliência):** Investigação de causa-raiz, watchdog de 180s no DISM e testes automatizados.
* **checkup_reviewer (Arquitetura & Segurança):** Auditoria de segurança, conformidade com `memory.md` e regras invioláveis.
* **checkup_doc (Obsidian & Documentação):** Sincronização do cofre `Check Up/`, `backlog.md` e elaboração das release notes.

---

**Full Changelog:** [`v1.2.0...v1.3.0`](https://github.com/murilo-lameira/projeto-checkup-windows/compare/v1.2.0...v1.3.0)

