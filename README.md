# ⚡ CheckUP Windows - Dashboard de Telemetria

![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://gemini.google.com/)
[![Download CheckUP](https://img.shields.io/badge/Download_Executável-2dd4bf?style=for-the-badge&logo=windows)](https://github.com/murilo-lameira/projeto-checkup-windows/releases/latest)

Aplicativo desktop (*Single Page Application*) para diagnóstico, monitoramento e manutenção de computadores Windows. O CheckUP combina uma interface visual fluida construída com Electron a rotinas nativas do sistema operacional via PowerShell, permitindo acompanhar a saúde do computador em um único painel e registrando dados históricos para análises posteriores. O desenvolvimento contou com o uso ativo de agentes de IA (Claude), focado principalmente na prototipagem visual, estruturação do CSS (Grid/Flexbox) e refinamento do design no padrão Glassmorphism.

## 📸 Telas do Aplicativo

<img width="2559" height="1393" alt="image" src="https://github.com/user-attachments/assets/1631593f-6fd0-4d52-9b45-2fe451c2c2c6" />



## ✨ Funcionalidades

* **Monitoramento em Tempo Real:** Acompanhamento do uso de CPU, memória RAM, armazenamento e tráfego de rede (Mbps) renderizados via ApexCharts e suavizados matematicamente na interface em ciclos de 2 segundos.
* **Diagnóstico Profundo:** Varredura detalhada de hardware (GPU, discos, bateria), sistema operacional, licença, processos ativos e tempo exato de boot utilizando WMI/CIM.
* **Saúde do Sistema e S.M.A.R.T:** Classificação do computador em Saudável, Alerta ou Problema Crítico, com recomendações contextualizadas. Inclui leitura do desgaste físico de HDDs/SSDs com gráficos sparkline dedicados.
* **Auditoria de Segurança:** Rastreamento do Antivírus, Firewall, alertas críticos do Event Viewer (últimas 24h) e softwares de acesso remoto residentes em memória.
* **Manutenção e Otimização:** Interface para limpeza de arquivos temporários, otimização do sistema (Winget) e reparo autônomo da imagem do Windows com `SFC /scannow` e `DISM /RestoreHealth`.
* **Histórico e Exportação:** Métricas dos diagnósticos são armazenadas em JSON localmente para acompanhamento temporal e uso em ferramentas de análise ou BI.
* **Agendamento:** Instalação de uma tarefa mensal do Windows para executar o checkup automaticamente em segundo plano.
* **Alertas Remotos:** Sistema de webhook para envio de notificações automáticas via Discord caso componentes críticos apresentem falhas graves.

## 📂 Estrutura do Projeto

```text
checkup-windows/
├── main.js                      # Processo principal do Electron
├── src/
│   ├── index.html               # Estrutura da interface
│   ├── style.css                # Estilos da interface (Glassmorphism)
│   ├── renderer.js              # Telemetria e interações do painel
│   └── assets/icons/            # Ícones dos controles
├── core/
│   ├── checkup.ps1              # Diagnóstico e geração dos dados (WMI)
│   ├── Ferramenta_Reparo.bat    # Limpeza e reparo avançado
│   ├── Instalar_Rotina.ps1      # Agendamento mensal do sistema
│   ├── CriarTarefa.bat          # Criação da tarefa agendada
│   └── ExecutarCheckup.bat      # Execução independente do diagnóstico
├── historico/                   # Histórico gerado localmente (JSON)
└── relatorios/                  # Snapshot atual dos dados gerados
```

## ⚙️ Requisitos

* **Sistema:** Windows 10 ou superior.
* **Ambiente de Dev:** Node.js 22 ou superior e npm.
* **Permissões:** PowerShell com acesso aos comandos nativos. Algumas rotinas de manutenção e coleta exigem privilégios de Administrador.

## 🚀 Como Executar Localmente

1. Instale as dependências:
`npm install`

2. Inicie a aplicação:
`npm start`

O aplicativo inicia o diagnóstico automaticamente ao abrir. O botão "Diagnóstico" executa um novo checkup completo; os demais controles iniciam rotinas isoladas de manutenção.

## 📦 Validação e Compilação

Validação de sintaxe dos processos Electron:
`npm run validate`

Gerar o instalador/executável Windows:
`npm run build`

O build utiliza o electron-builder e cria a saída em .exe portátil nativo (exigindo highestAvailable para elevação de privilégio) na pasta dist/. Esse diretório é um artefato local e está no .gitignore.

## 📊 Dados Gerados (Ignorados no Git)

* `relatorios/dados_atuais.json`: Snapshot usado ativamente pelo painel para injetar as informações de hardware e saúde na interface.
* `historico/historico_checkup.json`: Registros incrementais de todos os diagnósticos executados, incluindo carga térmica e ping.
(Nota: Esses arquivos contêm informações sensíveis de hardware e rede da máquina host e não devem ser versionados).

## 🏗️ Observações de Arquitetura e Empacotamento

Para garantir que o Node.js e os scripts do PowerShell comuniquem-se corretamente no ambiente de produção, o empacotador mantém os scripts de recursos isolados da blindagem padrão. Configurado via `extraResources` no `package.json`, o artefato final extrai a pasta `core/` para que o PowerShell consiga ler, executar rotinas de administrador e gravar arquivos em diretórios externos sem bloqueios de permissão do arquivo `app.asar`.
