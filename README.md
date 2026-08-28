# ⚡ CheckUP Windows - Dashboard

![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-5391FE?style=for-the-badge&logo=powershell&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://gemini.google.com/)
[![Download CheckUP](https://img.shields.io/badge/Download_Executável-2dd4bf?style=for-the-badge&logo=windows)](https://github.com/murilo-lameira/projeto-checkup-windows/releases/latest)

Aplicativo desktop para diagnóstico, monitoramento e manutenção de computadores Windows. O CheckUP conta com uma interface de duas abas integradas (**Dashboard** e **Histórico**) com navegação fluida e design *Glassmorphism* escuro aprimorado com acentos e iluminação em cobre metálico. Desenvolvido com Electron e rotinas nativas do sistema operacional via PowerShell, ele permite acompanhar a saúde do computador em tempo real e analisar séries temporais de diagnósticos passados em painéis responsivos e intuitivos. O desenvolvimento contou com o uso ativo de IA (Google Gemini / Claude), focado na prototipagem visual, resolução de sensores WMI/CIM e DLLs de baixo nível, estruturação do CSS (Grid/Flexbox) e refinamento do design no padrão Glassmorphism.

## 📸 Telas do Aplicativo

<img width="2557" height="1389" alt="image" src="https://github.com/user-attachments/assets/0da5dfa9-039d-4a19-bb35-48b759e1536c" />

<img width="2551" height="1387" alt="image" src="https://github.com/user-attachments/assets/013670fc-d3d2-44ea-81e0-1cbc22d98aa3" />

## ✨ Funcionalidades

* **Monitoramento em Tempo Real:** Acompanhamento do uso de CPU, memória RAM, armazenamento e tráfego de rede (Mbps) renderizados via ApexCharts e suavizados matematicamente na interface em ciclos de 2 segundos.
* **Sensores Térmicos Dinâmicos:** Novos medidores semicirculares dinâmicos (estilo velocímetro) para CPU (compatível com arquiteturas AMD Ryzen e Intel) e Armazenamento (SSDs NVMe/SATA e HDDs), integrados à telemetria de baixo nível via `LibreHardwareMonitorLib`.
* **Aba de Histórico e Telemetria Temporal:**
  * **Janela Rotativa:** Histórico dedicado com persistência automática travada nos 50 diagnósticos mais recentes.
  * **Gráfico de Desempenho Bruto:** Cruzamento visual e correlação de carga de CPU vs uso de Memória RAM ao longo do tempo.
  * **Linha do Tempo de Alertas e Incidentes:** Cards flutuantes interativos que explicam detalhadamente a causa raiz das anomalias no *hover* (picos de CPU, saturação de RAM, perda de pacotes e erros de sistema do Windows).
* **Diagnóstico Profundo:** Varredura detalhada de hardware (GPU, placas-mãe, discos, bateria), sistema operacional, licença, processos ativos de maior consumo e tempo exato de boot utilizando WMI/CIM.
* **Saúde do Sistema e S.M.A.R.T:** Classificação do computador em Saudável, Alerta ou Problema Crítico, com recomendações contextualizadas. Inclui leitura do desgaste físico de HDDs/SSDs com gráficos *sparkline* dedicados.
* **Auditoria de Segurança:** Rastreamento do Antivírus, Firewall, alertas críticos do Event Viewer (últimas 24h) e softwares de acesso remoto residentes em memória.
* **Manutenção e Otimização:** Interface para limpeza de arquivos temporários, otimização do sistema (Winget) e reparo autônomo da imagem do Windows com `SFC /scannow` e `DISM /RestoreHealth`.
* **Agendamento:** Instalação e controle de tarefas mensais do Windows para executar o checkup automaticamente em segundo plano.
* **Alertas Remotos:** Sistema de webhook para envio de notificações automáticas via Discord caso componentes críticos apresentem falhas graves.

## 📂 Estrutura do Projeto

```text
checkup-windows/
├── main.js                      # Processo principal do Electron
├── src/
│   ├── index.html               # Estrutura da interface (Dashboard e Histórico)
│   ├── style.css                # Estilos da interface (Glassmorphism e acentos cobre)
│   ├── renderer.js              # Telemetria, gráficos e interações do painel
│   └── assets/icons/            # Ícones dos controles
├── core/
│   ├── lib/                     # Dependências de baixo nível (LibreHardwareMonitorLib.dll, etc.)
│   ├── checkup.ps1              # Diagnóstico e geração dos dados (WMI/CIM e LHM)
│   ├── Ferramenta_Reparo.bat    # Limpeza e reparo avançado
│   ├── Instalar_Rotina.ps1      # Agendamento mensal do sistema
│   ├── CriarTarefa.bat          # Criação da tarefa agendada
│   └── ExecutarCheckup.bat      # Execução independente do diagnóstico
├── historico/                   # Histórico gerado localmente (JSON)
└── relatorios/                  # Snapshot atual dos dados gerados
```

## 📥 Como Baixar e Usar (Usuário Final)

Não é necessário instalar nada ou ter conhecimento em programação para usar o CheckUP.

1. Acesse a página de [Releases](../../releases/latest).
2. Baixe o arquivo `.exe` mais recente disponível na seção *Assets*.
3. ⚠️ **IMPORTANTE:** Clique com o botão direito no arquivo baixado e selecione **"Executar como Administrador"**. Isso é obrigatório para que o painel consiga ler os sensores térmicos, discos físicos e rodar os reparos do Windows nativamente.
   
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
* `historico/historico_checkup.json`: Registros incrementais dos últimos 50 diagnósticos executados, armazenando métricas detalhadas de integridade, contagem de erros de sistema (`Erros_Qtd`) do Event Viewer, carga térmica e estabilidade de rede.
(Nota: Esses arquivos contêm informações sensíveis de hardware e rede da máquina host e não devem ser versionados).

## 🏗️ Observações de Arquitetura e Empacotamento

Para garantir que o Node.js e os scripts do PowerShell comuniquem-se corretamente no ambiente de produção, o empacotador mantém os scripts de recursos isolados da blindagem padrão. Configurado via `extraResources` no `package.json`, o artefato final extrai a pasta `core/` para que o PowerShell consiga ler, executar rotinas de administrador e gravar arquivos em diretórios externos sem bloqueios de permissão do arquivo `app.asar`.

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se livre para usar, modificar e distribuir conforme necessário.
