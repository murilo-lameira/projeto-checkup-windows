# Estrutura de Pastas

Visão geral da organização de diretórios e arquivos do **Projeto CheckUP**.

```text
Projeto CheckUP/
├── Check Up/                  # Vault do Obsidian contendo toda a documentação
│   ├── Home.md
│   ├── Arquitetura.md
│   ├── Design System.md
│   ├── Estrutura de Pastas.md
│   ├── Funcionalidades.md
│   └── Manutenção e Scripts.md
├── core/                      # Scripts do sistema operacional e rotinas nativas
│   ├── lib/                   # DLLs .NET de baixo nível para diagnóstico de hardware
│   ├── checkup.ps1            # Script mestre de diagnóstico em PowerShell
│   ├── Ferramenta_Reparo.bat  # Rotinas batch de reparo de arquivos e disco
│   ├── CriarTarefa.bat        # Automatizador de agendamento de tarefas do Windows
│   ├── ExecutarCheckup.bat    # Launcher rápido de execução de checagem
│   └── Instalar_Rotina.ps1    # Script de setup e automação periódica
├── dist/                      # Arquivos executáveis e builds de distribuição
├── historico/                 # Histórico de logs de manutenções e verificações anteriores
├── relatorios/                # Relatórios detalhados gerados após os diagnósticos
├── scripts/                   # Scripts auxiliares de desenvolvimento e build
│   └── convert-icon.js        # Utilitário para conversão/geração de ícones da aplicação
├── src/                       # Frontend da aplicação desktop (Electron Renderer)
│   ├── assets/                # Recursos estáticos (ícones, logos, ilustrações)
│   ├── index.html             # Estrutura DOM do dashboard, cards e modais
│   ├── renderer.js            # Lógica interativa, gráficos e polling de scripts
│   └── style.css              # Estilos visuais em Dark Glassmorphism
├── main.js                    # Processo principal (Main Process) do Electron
├── package.json               # Configurações do projeto Node.js e dependências
├── package-lock.json          # Trava de versões exatas das dependências
└── README.md                  # Apresentação geral do repositório
```

---

## Detalhamento dos Diretórios

### 1. `Check Up/` (Documentação)
O cofre (vault) do Obsidian contendo toda a documentação estruturada com nós interligados:
- Ponto de partida na [[Home]].
- Conexões entre os módulos do sistema, padrões de código e guia de design.

### 2. `core/` (Mecanismos de Baixo Nível)
Centraliza toda a lógica pesada de inspeção do Windows:
- **`checkup.ps1`**: Coleta dados de CPU, GPU, RAM, temperaturas, discos e integridade de arquivos.
- **`lib/`**: Conjunto de bibliotecas .NET compiladas (como `LibreHardwareMonitorLib.dll`, `DiskInfoToolkit.dll`, `RAMSPDToolkit-NDD.dll`), permitindo que os scripts leiam sensores de hardware com precisão cirúrgica sem ferramentas externas pesadas.
- Saiba mais sobre a execução e privilégios em [[Manutenção e Scripts]].

### 3. `src/` (Interface & Experiência do Usuário)
A camada visual que roda na janela do Electron:
- **`index.html`**: Contém a marcação da dashboard, métricas e o modal de manutenção em etapas.
- **`style.css`**: Toda a camada estética com efeitos de blur, bordas metálicas e temas escuros (detalhado em [[Design System]]).
- **`renderer.js`**: Monitora os estados do sistema, cria e gerencia o polling de scripts em segundo plano, e manipula gráficos via ApexCharts. Veja os detalhes na [[Arquitetura]].

### 4. `historico/` & `relatorios/`
- Guardam arquivos de auditoria, logs de texto e resultados de diagnósticos anteriores para consulta do usuário, integrando-se com as rotinas de [[Funcionalidades]].

### 5. `main.js` (Raiz)
- Ponto de entrada do Electron. Cria a janela do navegador (`BrowserWindow`), define o tamanho inicial, ícone e configurações de segurança/integração (`nodeIntegration: true`).

---
**Navegação:**
- Voltar para a [[Home]]
- Conhecer a [[Arquitetura]]

