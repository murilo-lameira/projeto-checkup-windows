# Arquitetura do Projeto

O **Projeto CheckUP** é construído utilizando [Electron](https://www.electronjs.org/) para empacotar a interface desktop.

## Estrutura Básica
- **Frontend:** HTML5, CSS3, e JavaScript puro (Vanilla JS).
- **Backend (Main Process):** Node.js gerenciando a janela principal através do `main.js`.
- **Comunicação IPC:** O projeto opera com `nodeIntegration: true` e `contextIsolation: false`, permitindo que o `renderer.js` acesse APIs do Node (como `fs`, `child_process` e `path`) diretamente, sem necessidade de preload scripts complexos, visando simplicidade de desenvolvimento.

## Execução de Processos Pesados
As ações de diagnóstico e manutenção profunda requerem privilégios administrativos no Windows (UAC).
Para resolver isso de forma elegante sem travar a interface:
- O frontend dispara comandos PowerShell que rodam em segundo plano e com elevação de privilégios (`Start-Process -Verb RunAs -WindowStyle Hidden`).
- A [[Manutenção e Scripts|comunicação de progresso]] entre os scripts elevados e o aplicativo Node/Electron não usa pipes padrão, mas é feita através de arquivos JSON temporários (ex: `$env:TEMP\checkup_maint_status.json`), que o `renderer.js` lê periodicamente em um loop (polling).

## Bibliotecas Externas
- **ApexCharts:** Usado para renderizar gráficos interativos e bonitos de uso de disco, memória e CPU na dashboard principal.

---
**Navegação:**
- Voltar para a [[Home]]
- Ver [[Estrutura de Pastas]]

