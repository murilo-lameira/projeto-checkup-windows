# 👥 Squad Multi-Agentes & Visualização Pixel Agents

Este documento formaliza a arquitetura, governança e fluxo de trabalho colaborativo do **Squad de Agentes Autônomos** atuando no [[Home|Projeto CheckUP Windows]], detalhando seus papéis e a sincronização visual em tempo real no escritório virtual **[[Pixel Agents]]**.

---

## 👥 Composição do Squad CheckUP

O desenvolvimento, testes e documentação contínua do projeto são operados por 5 agentes de IA altamente especializados atuando de forma orquestrada:

| Agente | ID da Sessão | Especialidade | Papel Primário no Pipeline |
| :--- | :--- | :--- | :--- |
| **Dev** | `checkup_dev` | Backend & Sistemas | [[Manutenção e Scripts\|PowerShell nativo]], WMI/CIM, Registro do Windows, Node.js e Electron |
| **UI/UX** | `checkup_ui_ux` | Frontend & Design System | [[Design System\|Dark Glassmorphism]], paleta Cobre (`#cf663f`), ApexCharts e microinterações |
| **QA** | `checkup_qa` | Qualidade & Resiliência | Validação funcional, sintática (`npm run validate`), casos de borda e privilégios UAC |
| **Revisor** | `checkup_reviewer` | Arquitetura & Segurança | Auditoria contra `memory.md`, segurança contra injeção e conformidade técnica |
| **Documentador** | `checkup_doc` | Obsidian & Conhecimento | Gestão contínua do cofre (`Check Up/`), notas interligadas, `backlog.md` e `README.md` |

---

## 🔄 Fluxo de Trabalho (Pipeline & Paralelismo)

```
       [ Demanda / Item do Backlog ]
                     │
       ┌─────────────┴─────────────┐
       ▼                           ▼
[ checkup_dev ]             [ checkup_ui_ux ]
  • Lógica Windows/PS1        • Componentes HTML/CSS
  • APIs do Node/Electron     • ApexCharts & Microinterações
       │                           │
       └─────────────┬─────────────┘
                     ▼
              [ checkup_qa ]
                • Testes funcionais & Casos de Borda
                • Execução de `npm run validate`
                     │
                     ▼
            [ checkup_reviewer ]
              • Auditoria de segurança & memory.md
                     │
                     ▼
              [ checkup_doc ]
                • Atualização do Obsidian (Check Up/*.md com [[wikilinks]])
                • Sincronização em backlog.md & README.md
                     │
                     ▼
          [ Conclusão da Feature ]
```

---

## 🏢 Integração com o Pixel Agents (Virtual Office)

O squad possui integração nativa com a extensão e o servidor local do **Pixel Agents**, permitindo ao desenvolvedor acompanhar visualmente cada membro trabalhando fisicamente no escritório virtual:

- **Animações de Programação:** Quando `checkup_dev` ou `checkup_ui_ux` executam edições de código (`replace_file_content` / `write_to_file`), o avatar correspondente senta em sua estação e digita ativamente.
- **Animações de Pesquisa:** Quando `checkup_reviewer` ou `checkup_qa` analisam o código (`grep_search` / `view_file`), o avatar consulta a estante técnica ou o monitor auxiliar.
- **Animações de Terminal:** Quando rotinas de teste e validação são disparadas (`run_command`), o avatar ativa a bancada de testes.
- **Rótulos Ativos:** O arquivo de configuração `~/.pixel-agents/config.json` mantém `"alwaysShowLabels": true`, exibindo balões de status contextual em cima de cada personagem.

### 🕹️ Comandos do Bridge (`scripts/pixel_agents_bridge.js`)

```bash
# Inicia a simulação dinâmica contínua do squad em paralelo
npm run agents:pixel

# Instancia todos os 5 membros imediatamente no escritório
node scripts/pixel_agents_bridge.js --spawn-only

# Limpa o escritório e encerra as sessões com segurança
npm run agents:pixel:clear
```

---

## 🛡️ Regras Invioláveis do Squad

1. **Zero Executáveis de Terceiros:** Não é permitido incluir instaladores ou binários `.exe` de terceiros no projeto. Todas as funcionalidades utilizam exclusivamente APIs nativas do Windows (`DISM`, `sfc`, `winget`, `Get-CimInstance`, `defrag`, `netstat`, etc.).
2. **Imunidade de Escapes:** Comandos PowerShell disparados via `child_process.exec` utilizam codificação Base64 UTF-16LE (`-EncodedCommand`) para blindagem total contra interpolação indevida do `cmd.exe`.
3. **Consistência Visual:** Todos os novos componentes devem seguir rigorosamente o [[Design System]] em tons de carvão escuro com acabamento metálico em cobre.
4. **Sincronia do Conhecimento:** Nenhuma funcionalidade é considerada concluída sem que a documentação correspondente no cofre Obsidian e no `backlog.md` esteja atualizada.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Arquitetura]] | Ver [[Design System]]
