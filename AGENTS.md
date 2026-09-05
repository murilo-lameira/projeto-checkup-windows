# Squad Multi-Agentes - Projeto CheckUP Windows

Este documento formaliza os papéis, responsabilidades e o fluxo de trabalho colaborativo dos agentes atuando no projeto **CheckUP Windows**.

---

## 👥 Composição do Squad

| Agente | Tipo / ID | Especialidade Principal | Foco Primário |
| :--- | :--- | :--- | :--- |
| **Dev** | `checkup_dev` | Sistemas & Backend | Node.js, Electron, PowerShell nativo (`.ps1`), WMI/CIM, Registro do Windows |
| **UI/UX** | `checkup_ui_ux` | Design System & Frontend | Dark Glassmorphism, ApexCharts, paleta Copper (`#cf663f`), Grid 6 colunas |
| **QA** | `checkup_qa` | Testes & Resiliência | Validação funcional, casos de borda no Windows (admin, antivírus, escapes) |
| **Revisor** | `checkup_reviewer` | Arquitetura & Segurança | Auditoria de segurança, conformidade com `memory.md` e integridade geral |
| **Documentador** | `checkup_doc` | Obsidian & Documentação | Gestão contínua do cofre Obsidian (`Check Up/`), wikilinks e `backlog.md` |

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

## 🛡️ Regras Invioláveis do Projeto

1. **Zero Executáveis de Terceiros:** Não são permitidos instaladores ou executáveis `.exe` externos. Toda a automação utiliza ferramentas que já acompanham o Windows (`DISM`, `sfc`, `winget`, `Get-CimInstance`, `defrag`, etc.).
2. **Escapes de PowerShell e CMD:** Em chamadas via `child_process.exec`, atentar para variáveis PowerShell consumidas indevidamente pelo `cmd.exe`. Use scripts `.ps1` dedicados ou aspas simples.
3. **Identidade Visual Consistente:** Seguir estritamente o Dark Glassmorphism (`rgba(24, 24, 27, 0.82)` com `backdrop-filter: blur(16px)`), acentos em Cobre (`.btn-copper`) e feedback com toasts e steppers animados.
4. **Sincronia com o Obsidian:** Código sem documentação atualizada é considerado incompleto. O agente `checkup_doc` deve manter `Check Up/Funcionalidades.md` e demais notas com wikilinks `[[...]]` perfeitamente alinhadas com cada release.
