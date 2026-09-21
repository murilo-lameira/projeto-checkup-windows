# 📦 Histórico de Lançamentos & Releases

Este documento consolida a evolução das versões do **Projeto CheckUP Windows**, com detalhes de engenharia, melhorias de interface e notas de lançamento.

---

## 🏷️ Versão 1.3.0 (Versão Atual) - *Obsidian Telemetry & Granular Maintenance*

**Data de Lançamento:** 21 de Setembro de 2026  
**Status:** ✅ Produção / Estável  
**Target:** Windows 10 / Windows 11 (64-bit)  
**Branch:** `feature/stitch-obsidian-telemetry`

### Principais Inovações
1. **[[Funcionalidades#central-avançada-de-otimização-aba-otimização|Opções Individuais de Melhoria]]:**
   - Criação do grid de 7 funções granulares independentes (DNS, Limpeza de Temporários, TRIM para SSD, SFC, DISM, Atualização Winget e Reparador do Windows Update).
   - Acionamento via despachante nativo [[Manutenção e Scripts#despachante-granular-de-rotinas-coreexecutarrotinaps1|core/ExecutarRotina.ps1]] com telemetria JSON assíncrona.
   - Master Card panorâmico 6 em 1 no topo para execução sequencial completa.
   - Feedback em tempo real com spinner no botão e toasts flutuantes [[Design System#sistema-de-notificações-toast|Dark Glassmorphism]].

2. **[[Design System#identidade-visual-obsidian-telemetry-google-stitch|Obsidian Telemetry (Google Stitch)]]:**
   - Tipografia tríade de precisão: `Space Grotesk`, `Geist` e `JetBrains Mono`.
   - Widget Saúde Hero com Gauge Circular SVG (`#healthScoreCircle`) e anel animado de integridade.
   - Live Load Sensors com amostragem de 1s e gráfico radial multi-anel ApexCharts.
   - Botão One-Click "Copiar Specs" com gravação na Área de Transferência.

3. **[[Manutenção e Scripts#blindagem-de-temporários-temp-e-prevenção-de-auto-deleção-portátil|Blindagem & Resiliência Operacional]]:**
   - Correção do falso positivo de telemetria na interface (`#healthPillText` -> `Integridade do Sistema`).
   - Proteção de diretórios temporários (`-Exclude "*checkup*"`) evitando que o executável portátil apague a si mesmo durante limpezas.
   - Watchdog com timeout de 180s em rotinas DISM para evitar travamentos em conexões lentas do Windows Update.
   - Persistência dupla de dados em `%USERPROFILE%\checkup_relatorios` e na pasta raiz.

---

## 🏷️ Versão 1.2.0 - *Resiliência de Dashboard & Fallback Nativo*

**Data de Lançamento:** 16 de Setembro de 2026  
**Status:** ✅ Arquivado  

### Principais Inovações
- **Fallback Nativo de Hardware (Zero Broken State):** Leitura instantânea via Node.js (`os.cpus()`, `os.totalmem()`, `fs.statfsSync`) eliminando estados vazios na primeira abertura do app.
- **Resolução Multi-Caminho de Telemetria:** Suporte unificado a 6 caminhos de busca para `dados_atuais.json`.
- **Modernização Integral para CIM:** Substituição de `Get-WmiObject` por `Get-CimInstance` em todo o core PowerShell.
- **Trava de Instância Única:** Implementação de `app.requestSingleInstanceLock()` no [[Arquitetura|main.js]].

---

## 🏷️ Versão 1.1.0 - *Benchmark Nativo & Gestor de Softwares*

**Data de Lançamento:** 04 de Setembro de 2026  
**Status:** ✅ Arquivado  

### Principais Inovações
- **Benchmark Nativo de Armazenamento:** Medição sequencial de velocidade de disco (MB/s) via `.NET` sem binários externos.
- **Gestor & Desinstalador de Aplicativos:** Varredura no Registro do Windows e desinstalação silenciosa elevada (`RunAs`).
- **Exportação de Relatórios Diagnósticos:** Geração de relatórios completos em HTML responsivo com impressão PDF.

---

## 🏷️ Versão 1.0.0 - *Lançamento Inicial*

**Data de Lançamento:** 01 de Setembro de 2026  
**Status:** ✅ Arquivado  

### Principais Inovações
- Dashboard central com telemetria básica de CPU, RAM e Disco.
- Script mestre `core/checkup.ps1` com auditoria de hardware.
- Rotina automatizada de Manutenção em 6 etapas.

---

**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Arquitetura]] | Ver [[Design System]] | Ver [[Manutenção e Scripts]]

