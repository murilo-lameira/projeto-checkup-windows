# Manutenção e Scripts

Grande parte do poder real do **Projeto CheckUP** encontra-se em sua capacidade de acionar as ferramentas nativas do Windows de forma automatizada e limpa.

## Scripts de Core
Localizados no diretório `/core/`, temos:
- `checkup.ps1`: Arquivos de rotinas de PowerShell focados em diagnóstico, extração de logs e comandos modernos.
- `Ferramenta_Reparo.bat`: Batch scripts legados ou mais diretos para limpeza e ajustes profundos (ex: CHKDSK, DISM, SFC).

## O Desafio da Elevação (UAC) e a Solução
A [[Arquitetura]] do app usa NodeJS para executar processos (`child_process.exec` ou `spawn`). Contudo, o app normalmente abre **sem permissão de Administrador**.
Se o script tentar rodar `sfc /scannow`, ele será bloqueado por falta de privilégios.

Para contornar e dar uma experiência imersiva na UI descrita no [[Design System]]:
1. **Geração Dinâmica:** O `renderer.js` escreve um script temporário do PowerShell dinâmico na pasta `$env:TEMP`.
2. **Controle de Estado:** Dentro desse script dinâmico, adicionamos linhas que escrevem o status atual (ex: `"step": 2, "status": "running"`) em um arquivo `checkup_maint_status.json`.
3. **Execução Elevada Independente:** Rodamos `Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File temp.ps1" -Verb RunAs`. Isso exibe a tela preta do UAC para o usuário pedir permissão de Admin.
4. **Leitura Polling:** Enquanto o PowerShell elevado trabalha em background, o JavaScript (que está normal e restrito) cria um `setInterval` lendo o JSON a cada 400ms. 
5. **Reatividade:** A barra de progresso avança e os ícones mudam dinamicamente baseados na mudança desse arquivo de texto local.

### Considerações
Essa técnica permite ter todo o feedback em tempo real das rotinas críticas do Windows na interface elegante sem precisar reiniciar todo o Electron em modo Administrativo (o que gera vulnerabilidades de segurança e quebra drag-and-drop de arquivos no Windows).

---
**Navegação:** Voltar para a [[Home]]

