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

## 6. Lembretes para Próximas Atualizações
- Sempre verifique o `backlog.md` antes de codar novas features.
- Atualize sempre a documentação no Obsidian (`Check Up/Funcionalidades.md`) assim que um novo módulo WMI/PowerShell for implementado e testado.

