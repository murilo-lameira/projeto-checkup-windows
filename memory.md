# Memory & Architecture - Projeto CheckUP

Este arquivo serve como "cérebro" das regras, arquitetura, design system e limites da stack tecnológica do projeto, garantindo que o desenvolvimento siga a visão original.

## 1. Visão Geral do Produto
O **CheckUP Windows** é um utilitário de otimização, manutenção e diagnóstico focado em dar ao usuário a sensação de "PC recém-formatado e seguro".
Deve ser extremamene rápido, responsivo e passar confiança e modernidade.

## 2. Stack Tecnológica
- **Frontend:** HTML, CSS, JavaScript (puro, sem frameworks JS complexos).
- **Backend / Wrapper:** Node.js (Electron).
- **Core Lógico:** 100% dependente de comandos nativos do **Windows PowerShell**, WMI, e Registro do Windows, executados via `child_process.exec`.
- **Limitação Crítica:** **Nenhum** instalador de terceiros, executáveis pesados (.exe) ou dependências externas não nativas. Tudo deve usar ferramentas que já vêm com o Windows (`DISM`, `sfc`, `ipconfig`, `winget`, WMI, etc).

## 3. Peculiaridades de Execução (Powershell no Node)
- Ao usar `exec('powershell.exe -Command "..."')`, o Windows roteia o comando pelo `cmd.exe`.
- Isso causa problemas de escape. Variáveis no PowerShell (como `$var = 1`) dentro de aspas duplas podem ser engolidas pelo `cmd.exe`.
- **Regra de Ouro:** Sempre encapsular scripts inline do PowerShell com aspas simples (`'...'`), usar arquivos `.ps1` (e `.bat` para chamá-los via Bypass) ou escapar severamente as variáveis (ex: `` `$var ``).

## 4. Design System & UX
- **Tema Visual:** Dark Mode (Glassmorphism). Fundo com gradiente radial e painéis translúcidos (`background: rgba(30, 30, 30, 0.5); backdrop-filter: blur(20px);`).
- **Acentos de Cor:** Tons metálicos "Copper" (Cobre) e acentos de ciano/teal (`#2dd4bf`). Classe primária de botão: `.btn-copper`.
- **Gráficos:** Usamos exclusivamente **ApexCharts** para gráficos circulares, de barra e linhas (Performance, Deep Clean, Bateria).
- **Notificações:** Sistema de Toast flotante (no canto inferior direito) usando `setStatus(type, title, message)` em JS, com suporte a overlay de carregamento (`loadingOverlay`) travando a UI em operações críticas e demoradas.

## 5. Estrutura do Layout (Grid)
O Dashboard (`.dashboard-grid`) baseia-se num CSS Grid de 6 colunas (`grid-template-columns: repeat(6, 1fr)`). Os painéis (Cards) ocupam espaços específicos, frequentemente usando a classe auxiliar `span-2` (`grid-column: span 2;`). 
Ao reorganizar, considere sempre o fluxo de leitura e não quebre a hierarquia visual (Hardware > Otimização > Rede/Segurança).

## 6. Resiliência de Telemetria & Ciclo de Vida (v1.2.0)
- **Zero Broken State:** O dashboard NUNCA deve ser exibido com campos em branco ou com banner vermelho de "Dados Ausentes" caso o arquivo de diagnóstico ainda não exista. Deve ser acionada a função `populateBasicHardwareFallback()`, lendo CPU (`os.cpus()`), RAM total (`os.totalmem()`), identificador de Windows e volumes de disco A: a Z: via chamada síncrona `fs.statfsSync()`, atualizando `cachedDiskUsage`, calculando uptime e mantendo o status em "Telemetria Rápida Ativa".
- **Resolução Multi-Caminho & Persistência Dupla:** Utilize sempre a função centralizada `resolveDadosAtuaisJsonPath()` e `possiblePaths` com suporte a `%USERPROFILE%\checkup_relatorios`, garantindo persistência de relatórios e histórico mesmo em limpezas de temporários.
- **Blindagem Contra Auto-Deleção Portátil:** O aplicativo portátil Electron roda extraído em `%TEMP%\checkup-windows`. Toda e qualquer rotina de limpeza de temporários (PowerShell ou Batch) DEVE excluir `*checkup*` (`-Exclude "*checkup*"`) para não deletar os scripts `core/` e binários em execução.
- **Watchdogs em Ferramentas Nativas:** Rotinas pesadas como `DISM /RestoreHealth` devem rodar com timeout de proteção (ex: Job PowerShell com timeout de 180s) para evitar travamentos indefinidos quando os serviços do Windows Update estiverem inacessíveis.
- **Blindagem do Main Process:** Tratar injeções de `ELECTRON_RUN_AS_NODE=1`, garantir trava de instância única (`app.requestSingleInstanceLock()`), gravar logs em `%USERPROFILE%\checkup_app.log` e usar timeout preventivo de 1.5s no `ready-to-show` para que a janela nunca fique invisível.
- **Modernização CIM Total:** Abolir completamente o uso de `Get-WmiObject` no `core/checkup.ps1` e demais scripts; utilizar exclusivamente `Get-CimInstance` para evitar travamentos e incompatibilidades em versões modernas do Windows 11.

## 7. Lembretes para Próximas Atualizações
- Sempre verifique o `backlog.md` antes de codar novas features.
- Atualize sempre a documentação no Obsidian (`Check Up/Funcionalidades.md`) assim que um novo módulo PowerShell/CIM for implementado e testado.
- Execute sempre `npm run validate` antes de submeter alterações de código.

