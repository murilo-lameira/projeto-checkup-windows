# 🎨 Design System & Experiência UI/UX

A identidade visual do **Projeto CheckUP** é fundamentada no padrão **Dark Glassmorphism**, combinando elegância metálica, profundidade e feedback imediato para criar a sensação de uma ferramenta nativa de alto desempenho no Windows.

---

## 🎨 Paleta de Cores & Tokens Visuais

| Token | Valor Hex / RGBA | Finalidade / Aplicação |
| :--- | :--- | :--- |
| **Deep Dark Background** | `#09090b` | Fundo principal da aplicação e barras de título. |
| **Glass Panel Base** | `rgba(8, 8, 10, 0.85)` | Painéis e cartões translúcidos com `backdrop-filter: blur(16px)`. |
| **Glass Card Elevated** | `rgba(22, 20, 25, 0.88)` | Modais, caixas de diálogo e cards em foco (`backdrop-filter: blur(18px)`). |
| **Copper Primary (Cobre)**| `#cf663f` | Cor primária de acento: botões `.btn-copper`, spinners, seletores e bordas ativas. |
| **Copper Glow / Bright** | `#ff9364` | Efeitos de hover, destaques de benchmark e pulsos animados. |
| **Teal Telemetry** | `#2dd4bf` | Métricas de integridade, telemetria saudável e gradientes do spinner. |
| **Warning / Caution** | `#eab308` | Alertas de atenção, temperaturas elevadas e heurísticas médias. |
| **Critical / Danger** | `#ef4444` | Falhas graves, travamentos ou botões de encerramento forçado. |
| **Text Primary** | `#f4f4f5` | Títulos, valores de destaque e cabeçalhos. |
| **Text Muted** | `#8a888c` / `#a1a1aa` | Rótulos secundários, unidades e textos de apoio. |

---

## 📐 Grid System & Responsividade Adaptativa

A aplicação adota um sistema de **CSS Grid com 6 colunas fracionárias** (`grid-template-columns: repeat(6, 1fr)`), projetado para acomodar tanto monitores ultrawide quanto notebooks compactos com perfeição:

```
[ > 1440px - Telas Grandes ]
┌─────────────── 6 Colunas (repeat(6, 1fr)) ───────────────┐
│ [ Startup: 4 cols ]          │ [ Disco/TRIM: 2 cols ]     │
├──────────────────────────────┼───────────────────────────┤
│ [ Escudo Seg.: 3 cols ]      │ [ Reparador: 3 cols ]     │
└──────────────────────────────┴───────────────────────────┘

[ <= 1200px - Notebooks Compactos ]
┌─────────────── 2 Colunas (repeat(2, 1fr)) ───────────────┐
│ [ Startup: span 2 (100%) ]                               │
├──────────────────────────────────────────────────────────┤
│ [ Disco/TRIM: span 2 (100%) ]                            │
├──────────────────────────────────────────────────────────┤
│ [ Escudo Seg.: span 2 (100%) - Linhas Amplas ]           │
├──────────────────────────────────────────────────────────┤
│ [ Reparador: span 2 (100%) ]                             │
└──────────────────────────────────────────────────────────┘
```

### 🛡️ Regra Crítica de Responsividade em Cards
- **Proteção contra Esmagamento (`min-width: 0`):** Todos os painéis translúcidos contêm `min-width: 0`, garantindo que o algoritmo de auto-placement do CSS Grid respeite a largura dos trilhos e nunca esprema colunas adjacentes ao redimensionar a janela.
- **Componente `.shield-status-row`:** Itens de auditoria utilizam alinhamento flex com `gap: 12px`, rótulos com `white-space: nowrap` e textos truncados com reticências (`text-overflow: ellipsis`), eliminando quebras desajeitadas de linha.

---

## 🧩 Componentes de Interface Notáveis

### 1. 🔄 Loading Overlay com Transição Suave
- Ao abrir o app, um overlay com `rgba(8, 7, 10, 0.85)` e `backdrop-filter: blur(18px)` cobre a interface com spinner bicolor em Cobre e Teal (`@keyframes checkupSpin`).
- Destravamento controlado por JS com fade-out de 0.4s seguido de `display: none !important`, impedindo qualquer bloqueio de cliques.

### 2. 💬 Modais Assíncronos Glassmorphism
- Substituem totalmente os diálogos bloqueantes `alert()` e `confirm()` do navegador.
- Elemento `#customDialogModal` com `.custom-dialog-card`, botões `.btn-dialog-cancel` e `.btn-dialog-confirm`, operando via Promises (`showConfirm`, `showAlert`).

### 3. 📈 Steppers de Manutenção com Pulso Dinâmico
- Checklist vertical na Central de Manutenção exibindo as 6 etapas com badges numéricos, cronômetro em tempo real e animação de pulso circular (`.pulse-border`) na etapa ativa.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Arquitetura]] | Ver [[Squad Multi-Agentes]]
