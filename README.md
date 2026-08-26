# 🛠️ Projeto CheckUP Windows Automático

![Status](https://img.shields.io/badge/Status-Concluído-success?style=flat)
![Plataforma](https://img.shields.io/badge/Plataforma-Windows-0078D6?style=flat&logo=windows)
![Linguagem](https://img.shields.io/badge/Linguagem-PowerShell-5391FE?style=flat&logo=powershell)
![Interface](https://img.shields.io/badge/Interface-HTML%20%26%20CSS-E34F26?style=flat&logo=html5)

Um sistema completo de diagnóstico, manutenção e monitoramento de integridade para ambientes Windows. Construído com PowerShell e Batch, o projeto gera relatórios interativos em HTML e automatiza rotinas de limpeza, otimização e auditoria de hardware.

## 🚀 Sobre o Projeto
Este projeto foi desenvolvido para simplificar e centralizar a gestão de saúde de computadores com Windows. Ele elimina a necessidade de verificações manuais, executando uma varredura profunda que analisa desde a latência de rede e uso de RAM até a saúde da bateria e o tipo de licença do sistema operacional.

## ✨ Funcionalidades Principais
*   **Menu CLI Centralizado:** Interface limpa via linha de comando (`Menu.bat`) para gerenciar todas as funções do projeto sem precisar navegar por pastas.
*   **Relatórios Interativos (HTML/CSS):** Geração instantânea de um painel visual amigável com suporte dinâmico a *Dark Mode* e *Light Mode*.
*   **Automação Silenciosa:** Integração nativa com o Agendador de Tarefas do Windows para executar varreduras autônomas no dia 1º de cada mês.
*   **Ferramenta de Reparo Avançada:** Script dedicado para limpeza profunda de arquivos temporários, reparo de imagem do sistema (DISM/SFC) e atualização silenciosa de pacotes via Winget.
*   **Pipeline de Dados (Pronto para BI):** Todo check-up salva os indicadores de saúde em um arquivo `historico_checkup.json`, criando um log estruturado perfeito para análise de evolução de performance em ferramentas de Business Intelligence (como Power BI).

## ⚙️ Estrutura e Como Usar

O projeto utiliza uma arquitetura limpa, ocultando os motores lógicos na pasta `core` para manter a experiência do usuário focada apenas no Menu.

1. **Clone o repositório:**
   ```bash
   git clone (https://github.com/murilo-lameira/projeto-checkup-windows.git)
