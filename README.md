# CheckUP Windows

![Plataforma](https://img.shields.io/badge/Plataforma-Windows-0078D6?style=flat&logo=windows&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-44.0.0-47848F?style=flat&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?style=flat&logo=node.js&logoColor=white)
![PowerShell](https://img.shields.io/badge/PowerShell-Windows-5391FE?style=flat&logo=powershell&logoColor=white)

Aplicativo desktop para diagnóstico, monitoramento e manutenção de computadores Windows. A interface é construída com Electron e coleta informações detalhadas por meio de PowerShell.

## Visão geral

O CheckUP combina uma interface visual com rotinas nativas do Windows para acompanhar a saúde do computador em um único painel. O diagnóstico completo também registra dados históricos para análises posteriores.

## Funcionalidades

- **Monitoramento em tempo real:** uso de CPU, memória RAM, armazenamento e tráfego de rede.
- **Diagnóstico completo:** hardware, sistema operacional, bateria, licença, GPU, discos, segurança, processos e eventos recentes.
- **Saúde do sistema:** classificação em saudável, alerta ou problema crítico, com recomendações contextualizadas.
- **Manutenção:** limpeza de arquivos temporários, reparo com SFC/DISM e otimização do sistema.
- **Histórico:** métricas do diagnóstico são armazenadas em JSON para acompanhamento e uso em ferramentas de análise.
- **Agendamento:** instalação de uma tarefa mensal do Windows para executar o checkup automaticamente.

## Estrutura do projeto

```text
main.js                      Processo principal do Electron
src/index.html               Estrutura da interface
src/style.css                Estilos da interface
src/renderer.js              Telemetria e interações do painel
src/assets/icons/            Ícones dos controles
core/checkup.ps1             Diagnóstico e geração dos dados
core/Ferramenta_Reparo.bat   Limpeza e reparo avançado
core/Instalar_Rotina.ps1     Agendamento mensal
core/CriarTarefa.bat         Criação da tarefa agendada
core/ExecutarCheckup.bat     Execução independente do diagnóstico
historico/                   Histórico gerado localmente
relatorios/                  Dados atuais gerados localmente
```

## Requisitos

- Windows 10 ou superior.
- Node.js 22 ou superior.
- npm.
- PowerShell com acesso aos comandos nativos usados pelo diagnóstico.

Algumas rotinas de manutenção e coleta podem exigir privilégios de administrador.

## Executar localmente

```bash
npm install
npm start
```

O aplicativo inicia o diagnóstico automaticamente ao abrir. O botão **Diagnóstico** executa o checkup completo; os demais controles iniciam as rotinas de manutenção correspondentes.

## Validar e gerar o instalador

Validação de sintaxe dos processos Electron:

```bash
npm run validate
```

Gerar o instalador Windows:

```bash
npm run build
```

O build cria a saída em `dist/`. Esse diretório é um artefato local e está no `.gitignore`.

## Dados gerados

- `relatorios/dados_atuais.json`: snapshot usado pelo painel para atualizar informações detalhadas.
- `historico/historico_checkup.json`: registros dos diagnósticos executados.

Esses arquivos podem conter informações específicas do computador e não devem ser versionados.

## Observações

O empacotamento atual mantém `asar` desativado porque os scripts PowerShell precisam acessar e gravar arquivos em diretórios externos ao pacote. O instalador ainda pode receber um ícone próprio em uma evolução futura.
