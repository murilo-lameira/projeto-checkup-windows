# ⚡ Projeto CheckUP Windows - Hub Central de Documentação

Bem-vindo ao cofre oficial de documentação do **Projeto CheckUP Windows**!

O CheckUP é um ecossistema desktop profissional em [[Arquitetura|Electron]] e [[Manutenção e Scripts|PowerShell nativo]], projetado para auditoria completa de hardware, monitoramento em tempo real com **~0% de CPU**, desinstalação silenciosa de softwares e otimização profunda do Windows 10 e 11.

---

## 🧭 Mapa de Navegação do Cofre

| Tópico | Documento | Descrição do Conteúdo |
| :--- | :--- | :--- |
| **👥 Squad Autônomo** | [[Squad Multi-Agentes]] | Equipe multi-agentes de IA, papéis de engenharia, governança e fluxo de trabalho. |
| **🏢 Escritório Virtual**| [[Pixel Agents]] | Simulação visual em tempo real do squad no escritório em pixel art. |
| **✨ Funcionalidades** | [[Funcionalidades]] | Guia das 4 abas (Dashboard, Histórico, Programas e Otimização), benchmark e relatórios técnicos. |
| **🏗️ Engenharia & IPC** | [[Arquitetura]] | Modelo de telemetria híbrida, isolamento de processos, execução em Base64 UTF-16LE e offline-first. |
| **🎨 Estética & UX** | [[Design System]] | Dark Glassmorphism, paleta Cobre (`#cf663f`), Grid adaptativo de 6 colunas e modais assíncronos. |
| **🛠️ Scripts & Privilégios** | [[Manutenção e Scripts]] | Rotinas PowerShell, comunicação via `%TEMP%`, elevação UAC (`RunAs`) e benchmark nativo. |
| **📂 Diretórios & Código** | [[Estrutura de Pastas]] | Organização do repositório, mapeamento de DLLs .NET, ícones vetoriais e vendor assets. |

---

## 💻 As Quatro Dimensões do Aplicativo

1. **[[Funcionalidades#1-dashboard-em-tempo-real|Dashboard em Tempo Real]]:** Telemetria instantânea de CPU, RAM, rede e sensores térmicos sem processos pesados em background.
2. **[[Funcionalidades#2-histórico-de-performance|Histórico de Performance]]:** Janela rotativa dos 50 últimos diagnósticos e linha do tempo de incidentes para diagnóstico preditivo.
3. **[[Funcionalidades#3-gestor--desinstalador-de-aplicativos-nativo|Gestor de Programas]]:** Inventário completo de aplicativos do Windows e desinstalação silenciosa sem travar a interface.
4. **[[Funcionalidades#4-central-de-otimização|Central de Otimização]]:** Inicialização ágil, benchmark de disco sequencial (.NET nativo), ReTrim/Defrag, Escudo de Segurança responsivo e reparo do sistema (SFC/DISM).

---

## 🛡️ Pilares Invioláveis do Projeto
- **Zero Executáveis de Terceiros:** Automação estritamente apoiada em utilitários legítimos da Microsoft.
- **100% Offline-First:** ApexCharts empacotado localmente, sem requisições a CDNs públicos externos.
- **Segurança de Execução:** Sanitização absoluta de scripts via Base64 UTF-16LE e variáveis de ambiente isoladas.
