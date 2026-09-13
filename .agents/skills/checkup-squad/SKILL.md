---
name: checkup-squad
description: "Ativa e orquestra o Squad Multi-Agentes do Projeto CheckUP (checkup_dev, checkup_ui_ux, checkup_qa, checkup_reviewer, checkup_doc). Use esta skill sempre que o usuário solicitar o time de agentes, melhorias, manutenções ou auditorias no CheckUP Windows, garantindo que os 5 agentes estejam instanciados e visíveis no slidebar lateral do Antigravity."
---

# 👥 CheckUP Multi-Agent Squad Skill

Esta skill padroniza o ciclo de vida, instanciação e governança dos 5 agentes especializados do **Projeto CheckUP Windows** no ecossistema Antigravity.

## 🎯 Objetivo
Garantir que os 5 papéis do squad estejam sempre definidos e instanciados como subagentes no painel lateral (*Subagents*) do Antigravity:
1. `checkup_dev` (Backend, Node.js, Electron, PowerShell `.ps1`, WMI/CIM, Registro)
2. `checkup_ui_ux` (Design System Dark Glassmorphism, ApexCharts, paleta Cobre `#cf663f`)
3. `checkup_qa` (Validação funcional, `npm run validate`, testes de borda Windows)
4. `checkup_reviewer` (Auditoria de segurança, integridade contra injeção, `memory.md`)
5. `checkup_doc` (Sincronização com o cofre Obsidian `Check Up/`, `backlog.md` e `README.md`)

## 🛠️ Procedimento de Execução Mandatório

Ao ativar esta skill ou receber qualquer demanda de evolução no projeto:

### Passo 1: Verificar e Definir os Subagentes Ausentes
Se os tipos ainda não estiverem definidos na sessão atual, registrar via `define_subagent`:
- `checkup_dev` (habilitar escrita e ferramentas MCP)
- `checkup_ui_ux` (habilitar escrita e ferramentas MCP)
- `checkup_qa` (habilitar escrita e ferramentas MCP)
- `checkup_reviewer` (habilitar leitura e escrita)
- `checkup_doc` (habilitar leitura e escrita)

### Passo 2: Instanciar Imediatamente no Antigravity
Invocar todos os agentes que não estiverem ativos na lista de subagentes via `invoke_subagent`:
```json
{
  "Subagents": [
    { "TypeName": "checkup_dev", "Role": "Dev - Sistemas & Backend", "Prompt": "..." },
    { "TypeName": "checkup_ui_ux", "Role": "UI/UX - Design System", "Prompt": "..." },
    { "TypeName": "checkup_qa", "Role": "QA - Testes & Validação", "Prompt": "..." },
    { "TypeName": "checkup_reviewer", "Role": "Revisor - Arquitetura & Segurança", "Prompt": "..." },
    { "TypeName": "checkup_doc", "Role": "Documentador - Obsidian & Conhecimento", "Prompt": "..." }
  ]
}
```
*Isso garante que o slidebar lateral `Subagents (5) >` permaneça permanentemente populado e operacional.*

### Passo 3: Fluxo em Pipeline
1. `checkup_dev` + `checkup_ui_ux` atuam em paralelo no código.
2. `checkup_qa` executa `npm run validate` e testes de borda.
3. `checkup_reviewer` audita segurança e conformidade arquitetural.
4. `checkup_doc` atualiza as notas do Obsidian (`Check Up/`) com wikilinks `[[...]]`.
