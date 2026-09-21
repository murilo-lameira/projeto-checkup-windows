# 🛠️ Manutenção do Sistema & Scripts Nativos

Grande parte do poder e confiabilidade do **Projeto CheckUP Windows** reside em sua capacidade de acionar as ferramentas oficiais que acompanham o Windows de forma automatizada, assíncrona e segura, cumprindo a regra inviolável de **Zero Executáveis de Terceiros**.

---

## 📜 Scripts do Diretório `core/`

1. **`checkup.ps1`:** Script mestre de auditoria. 100% modernizado com `Get-CimInstance` (eliminando dependências do legado `Get-WmiObject`), garantindo compatibilidade estrita com Windows 10/11 sem travamentos em chamadas WMI. Coleta hardware, discos lógicos, controladora de vídeo, sensores térmicos através da `LibreHardwareMonitorLib.dll`, licença digital do Windows e processos pesados em memória.
2. **`ExecutarRotina.ps1`:** Despachante nativo de rotinas granulares de melhoria e reparo. Aceita o parâmetro `-Rotina <dns|temp|trim|sfc|dism|winget|wupdate|shield>` e `-StatusFile <caminho>`, emitindo telemetria em JSON em tempo real.
3. **`Ferramenta_Reparo.bat` / `ExecutarCheckup.bat`:** Launchers rápidos e rotinas de suporte em batch com bypass de política de execução.
4. **`Instalar_Rotina.ps1` / `CriarTarefa.bat`:** Automatizadores do Agendador de Tarefas do Windows para auditorias mensais sem intervenção manual.

---

## ⚡ Despachante Granular de Rotinas (`core/ExecutarRotina.ps1`)

Para atender à demanda de **Opções Individuais de Melhoria** sem obrigar o usuário a executar a manutenção completa em 6 etapas, o script centraliza a automação dos comandos nativos da Microsoft:
- **`dns`:** `ipconfig /flushdns` + `netsh winsock reset` + `netsh int ip reset`.
- **`temp`:** Higienização de `$env:TEMP` e `C:\Windows\Temp` com proteção estrita contra auto-deleção.
- **`trim`:** `Optimize-Volume -DriveLetter C -ReTrim` (ou `-Defrag`).
- **`sfc`:** `sfc /scannow`.
- **`dism`:** `DISM /Online /Cleanup-Image /RestoreHealth`.
- **`winget`:** `winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --disable-interactivity`.
- **`wupdate`:** `net stop wuauserv` + `net stop cryptSvc` + limpeza do cache de download de updates em `SoftwareDistribution` + `net start`.

---

## 🛡️ Blindagem de Temporários (`%TEMP%`) e Prevenção de Auto-Deleção Portátil

Em builds portáteis (`target: portable`), o Electron descompacta o runtime e DLLs essenciais em `$env:LOCALAPPDATA\Temp\checkup-windows`.
- **Vulnerabilidade Identificada:** Rotinas genéricas que executavam `Remove-Item "$env:TEMP\*"` tentavam apagar os próprios arquivos binários em execução da aplicação, gerando erros críticos de ICU (`Invalid file descriptor to ICU data received`).
- **Regra Inviolável de Proteção:** Toda rotina de limpeza de temporários DEVE obrigatoriamente aplicar o filtro de exclusão:
  ```powershell
  Get-ChildItem -Path $env:TEMP -Exclude "*checkup*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  ```

---

## ⚡ Benchmark Nativo de Armazenamento (SSD & HDD)

Diferente de ferramentas tradicionais que exigem instalação de binários de terceiros (como CrystalDiskMark), o CheckUP implementa medição sequencial de I/O de alta precisão diretamente em PowerShell e .NET nativo do Windows:

- **Mecanismo de Teste:**
  Utiliza as classes `System.IO.FileStream` e `System.Diagnostics.Stopwatch` do .NET Framework.
- **Fluxo do Teste:**
  1. Cria um arquivo temporário de 100 MB em `$env:TEMP\checkup_bench.tmp`.
  2. Grava um buffer contínuo de 1 MB por 100 iterações com `FileOptions.WriteThrough` ativado (invalida caches em RAM do Windows e mede a velocidade real da mídia).
  3. Realiza a leitura sequencial completa do bloco.
  4. Calcula as taxas em MB/s: `(100 / tempoDecorridoEmSegundos)`.
  5. Remove o arquivo temporário imediatamente pós-medição.

---

## 🚀 Otimização Inteligente de Mídia (ReTrim / Defrag)

O comando de otimização de disco não aplica instruções cegas:
- **Detecção:** Executa `Get-PhysicalDisk` para identificar o barramento e tipo de mídia (`SSD`, `NVMe` ou `HDD`).
- **Ação Customizada:**
  - Se for **SSD / NVMe**: Envia a instrução `Optimize-Volume -DriveLetter C -ReTrim -Verbose`, liberando blocos de memória flash não utilizados pelo sistema de arquivos.
  - Se for **HDD Mecânico**: Executa `defrag C: /O`, organizando trilhas e setores para acelerar o tempo de busca das agulhas magnéticas.

---

## 🔐 O Desafio da Elevação Administrativa (UAC)

A [[Arquitetura]] da aplicação inicia o Electron com nível de privilégio normal. Contudo, ferramentas como `sfc /scannow` ou `DISM /RestoreHealth` exigem privilégios de Administrador.

### A Solução Assíncrona do CheckUP
1. **Geração Dinâmica:** O `renderer.js` cria um script transitório em `$env:TEMP\checkup_maint_temp.ps1`.
2. **Gravação de Estado:** Em cada uma das etapas, o script grava um JSON com `step`, `status` ("running" / "completed") e `log` em `$env:TEMP\checkup_maint_status.json`.
3. **Elevação Isolada:** Dispara `Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -WindowStyle Hidden -File $psTemp" -Verb RunAs`. O UAC do Windows solicita autorização ao usuário apenas para o processo de reparo.
4. **Polling Reativo (400-500ms):** O frontend lê periodicamente o arquivo transitório, atualizando a barra de progresso, cronômetro e checklist interativo com animações pulsantes no [[Design System]].
5. **Autolimpeza:** Os arquivos temporários são excluídos automaticamente ao término da rotina.

---

## 🛡️ Sanitização com Base64 UTF-16LE

Para proteger o sistema contra interpretação indevida de caracteres especiais ou variáveis pelo `cmd.exe`:
- Todas as chamadas diretas usam a função `runPowerShellEncoded(script, callback)`.
- O código PowerShell é convertido para um buffer `utf16le` e serializado em Base64, sendo executado via `powershell.exe -NoProfile -NonInteractive -EncodedCommand <Base64>`.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Arquitetura]] | Ver [[Funcionalidades]] | Ver [[Squad Multi-Agentes]]
