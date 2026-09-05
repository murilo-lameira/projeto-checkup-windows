# 🏢 Pixel Agents - Escritório Virtual do Squad

O **Pixel Agents** é uma extensão e ambiente de visualização interativa em Pixel Art que materializa o [[Squad Multi-Agentes|Squad Multi-Agentes]] do [[Home|Projeto CheckUP Windows]] em um escritório virtual animado em tempo real.

---

## 🕹️ Como Funciona o Escritório

Cada um dos 5 agentes de IA (`checkup_dev`, `checkup_ui_ux`, `checkup_qa`, `checkup_reviewer` e `checkup_doc`) possui um avatar com mesa de trabalho, cadeira e terminal dedicados:

- **Programação & Edição:** Quando tarefas de código são processadas, o avatar senta na cadeira correspondente e digita no computador com animação de teclado.
- **Pesquisa & Auditoria:** Quando arquivos são inspecionados ou o cofre Obsidian é atualizado, o avatar consulta a estante técnica ou o monitor.
- **Testes & Terminal:** Quando rotinas do PowerShell ou `npm run validate` são disparadas, o avatar move-se para a estação de testes com feedback visual.
- **Balões de Conversa:** O bridge envia mensagens curtas de status contextual que aparecem em balões flutuantes sobre a cabeça dos personagens.

---

## 🚀 Comandos do Bridge (`scripts/pixel_agents_bridge.js`)

```bash
# 1. Iniciar a simulação dinâmica e contínua do squad
npm run agents:pixel

# 2. Instanciar todos os 5 membros imediatamente no escritório (para inspeção estática)
node scripts/pixel_agents_bridge.js --spawn-only

# 3. Limpar o escritório e encerrar expediente dos agentes com segurança
npm run agents:pixel:clear
```

---

## ⚙️ Arquitetura do Bridge

- **Comunicação:** Utiliza conexão WebSocket com o servidor local do Pixel Agents (`ws://127.0.0.1:4000/ws` ou IPC da extensão).
- **Persistência de Configuração:** O arquivo `~/.pixel-agents/config.json` armazena as preferências de exibição contínua (`"alwaysShowLabels": true`).
- **Autonomia:** O script funciona independentemente da IDE, podendo ser executado via terminal PowerShell ou integrado a rotinas de CI/CD locais.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Squad Multi-Agentes]] | Ver [[Arquitetura]]

