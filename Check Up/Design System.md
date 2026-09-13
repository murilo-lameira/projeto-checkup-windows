# 🎨 Design System & Experiência UI/UX (Obsidian Telemetry)

A identidade visual do **Projeto CheckUP** evoluiu para o padrão **Obsidian Telemetry**, adaptando as diretrizes de alta fidelidade do **Google Stitch**. O sistema combina estética industrial aeroespacial, dark glassmorphism profundo, acentos metálicos em Cobre e iluminação atmosférica âmbar, proporcionando uma experiência de ferramenta nativa de diagnóstico e telemetria de alto desempenho no Windows.

---

## 🎨 Identidade Visual "Obsidian Telemetry" & Atmosfera

O design é construído sobre uma tela de fundo industrial imersiva:
- **Base Obsidian Industrial:** Gradiente angular escuro (`linear-gradient(135deg, rgb(18, 12, 10) 0%, rgb(24, 15, 12) 35%, rgb(32, 18, 14) 65%, rgb(12, 14, 20) 100%)`) combinado com a cor de base `--bg-obsidian: #0c0e14`.
- **Stitch Ambient Glow:** Iluminação radial atmosférica âmbar/cobre projetada no topo direito da viewport (`radial-gradient(circle at 85% 15%, rgba(184, 92, 42, 0.22) 0%, rgba(61, 32, 18, 0.38) 28%, rgba(26, 16, 12, 0.85) 60%, rgb(12, 14, 20) 100%)`).
- **Superfícies de Vidro Escuro:** Painéis e cards translúcidos (`--surface-card: rgba(19, 23, 34, 0.72)`) com desfoque de fundo (`backdrop-filter: blur(16px)`), microbordas suaves (`--border-glass: rgba(255, 255, 255, 0.07)`) e realces metálicos interativos em hover (`--border-glass-hover: rgba(207, 102, 63, 0.4)`).

---

## ✍️ Tipografia Tríade de Alta Precisão

A tipografia do CheckUP adota uma tríade complementar de fontes, equilibrando impacto visual, leitura densa e rigor técnico:

| Família Tipográfica | Variável CSS | Pesos Utilizados | Aplicação / Finalidade |
| :--- | :--- | :--- | :--- |
| **Space Grotesk** | `--font-display` | `500`, `600`, `700` | Números heróicos, scores de saúde, métricas primárias e títulos de grande impacto. |
| **Geist** | `--font-body` | `400`, `500`, `600`, `700` | Interface do usuário, textos corridos, labels de cards, botões de ação e modais. |
| **JetBrains Mono** | `--font-mono` | `400`, `500`, `600` | Dados de telemetria, clocks de processador, endereços de rede, timestamps e valores brutos. |

```css
:root {
    --font-display: 'Space Grotesk', -apple-system, sans-serif;
    --font-body: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 🎨 Paleta de Cores & Tokens Visuais

A paleta de cores reflete a telemetria do hardware com contraste cirúrgico e conformidade WCAG AA:

| Token CSS | Valor Hex / RGBA | Finalidade / Aplicação |
| :--- | :--- | :--- |
| `--bg-obsidian` | `#0c0e14` | Cor base profunda de fundo da aplicação. |
| `--surface-card` | `rgba(19, 23, 34, 0.72)` | Cards do dashboard com Dark Glassmorphism e `backdrop-filter: blur(16px)`. |
| `--surface-card-hover` | `rgba(26, 31, 46, 0.85)` | Estado de foco e hover com profundidade aumentada. |
| `--surface-container-low` | `#191b22` | Superfície secundária para trilhos e áreas recuadas. |
| `--surface-container-high`| `#282a30` | Superfície terciária para chips, pílulas e cabeçalhos internos. |
| `--copper-primary` | `#cf663f` | Cor primária metálica de acento: botões `.btn-copper`, spinners e bordas ativas. |
| `--copper-bright` | `#ff9364` | Realce brilhante de Cobre para hovers, acentos de botões e alertas térmicos. |
| `--copper-glow` | `rgba(207, 102, 63, 0.35)` | Efeitos de iluminação, pulsos radiais e sombras de botões de ação. |
| `--emerald-healthy` | `#10b981` | Status de integridade perfeita, beacons de segurança e badges S.M.A.R.T. |
| `--cyan-telemetry` | `#06b6d4` | Indicadores de tráfego de rede, conexões ativas e métricas de SSD. |
| `--amber-warning` | `#eab308` | Alertas de atenção, calor intermediário e heurísticas moderadas. |
| `--red-critical` | `#ef4444` | Falhas de sistema, setores críticos e ações destrutivas. |
| `--text-primary` | `#f4f4f5` | Textos principais, valores de destaque e cabeçalhos. |
| `--text-secondary` | `#cbd5e1` | Rótulos de hardware, legendas informativas e títulos secundários. |
| `--text-muted` | `#94a3b8` | Unidades técnicas, timestamps, rodapés e notas secundárias. |
| `--border-glass` | `rgba(255, 255, 255, 0.07)` | Delimitação sutil de cards e divisórias sem sobrecarga visual. |
| `--border-glass-hover` | `rgba(207, 102, 63, 0.4)` | Destaque de borda em Cobre durante a interação do usuário. |

---

## 📐 Grid System de 6 Colunas Aprimorado (Layout Stitch)

O layout do Dashboard adota uma arquitetura em **CSS Grid de 6 colunas fracionárias** (`grid-template-columns: repeat(6, 1fr)`), distribuindo a telemetria em camadas lógicas por densidade de informação:

```
[ Layout do Dashboard v1.2+ - Telas >= 1440px ]
┌──────────────────────────────── 6 Colunas (repeat(6, 1fr)) ────────────────────────────────┐
│ Linha 1: TELEMETRIA HERO                                                                   │
│ [ 1. Saúde Hero: span 2 ]   │ [ 2. Live Load: span 2 ]    │ [ 3. Rede & Conexão: span 2 ]  │
├─────────────────────────────┴─────────────────────────────┴────────────────────────────────┤
│ Linha 2: OPERACIONAL & RECOMENDAÇÕES                                                       │
│ [ 4. Limpeza Profunda: span 3 ]             │ [ 5. Recomendações Sugeridas: span 3 ]       │
├─────────────────────────────────────────────┴──────────────────────────────────────────────┤
│ Linha 3: HARDWARE & SENSORES                                                               │
│ [ 6. Hardware Detectado & Specs: span 4 ]                 │ [ 7. Sensores & Uptime: span 2]│
├───────────────────────────────────────────────────────────┴────────────────────────────────┤
│ Linha 4: DRILLDOWN DE RECURSOS                                                             │
│ [ 8. Consumo de RAM: span 3 ]               │ [ 9. Discos & Partições: span 3 ]            │
└─────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### 📱 Adaptação Responsiva por Breakpoints

1. **Monitores Amplos e Ultrawide (`> 1440px`):** Grid de 6 colunas completo, permitindo visualização de todos os subsistemas sem rolagem vertical excessiva.
2. **Notebooks Padrão (`<= 1200px`):**
   - Cards Hero (`health-hero-panel`, `live-load-panel`): ocupam `span 2`.
   - Cards Operacionais e Hardware (`network-hero-panel`, `deepclean-panel`, `recommendations-panel`, `hardware-panel`, `thermals-uptime-panel`): expandem para `span 4`.
   - Cards de detalhamento (`ram-panel`, `disks-panel`): dividem a linha em `span 2`.
3. **Displays Compactos (`<= 950px` e `<= 768px`):**
   - Transição automática para `span 1` ou `span 2` em coluna única com scroll vertical fluido.
   - Preservação da regra `min-width: 0` em todos os painéis, impedindo overflow horizontal e esmagamento de tipografia monospaçada.

---

## 🧩 Componentes de Interface Notáveis (Stitch Components)

### 1. 🎯 Widget Saúde Hero com Gauge Circular SVG
- Gráfico circular vetorial customizado (`#healthScoreCircle`) com cálculo de circunferência (`stroke-dasharray: 264`) e preenchimento animado em Cobre/Esmeralda.
- Score central em destaque na fonte `Space Grotesk` (`#healthScoreNumber`) com base `/100` em `JetBrains Mono`.
- Botão de microação "Reavaliar" (`#btnRetest`) acoplado ao rodapé do card para re-diagnóstico instantâneo.

### 2. ⚡ Live Load Sensors (Tempo Real)
- Gráfico multi-anel radial [[Design System|ApexCharts]] (`#radialChart`) integrado com amostragem dinâmica a cada 1 segundo.
- 3 mini-cartões embutidos com pontos de status (CPU em Cobre, RAM em Esmeralda e SSD em Ciano), exibindo a temperatura em tempo real do processador (`#valCpuTempBadge`).

### 3. 💡 Painel de Recomendações e Otimizações Sugeridas
- Lista contextual de cartões inteligentes com ícones vetoriais temáticos, títulos em negrito, chips de impacto (`+1.4s no Boot`, `Desempenho`, `100% Protegido`) e botões de navegação direta (`#btnRecStartup`, `#btnRecEnergy`, `#btnRecShield`) para a aba [[Funcionalidades#central-avançada-de-otimização-aba-otimização|Otimização]].

### 4. 📋 Hardware Detectado com "Copiar Specs" One-Click
- Grid detalhado de componentes com ícones temáticos (`memory`, `developer_board`, `videogame_asset`, `grid_view`, `laptop_windows`, `key`).
- Botão "Copiar Specs" (`#btnCopySpecs`) com transição de ícone para feedback esmeralda de confirmação e integração com a Clipboard API do Windows.

### 5. 🧹 Limpeza Profunda Donut & Purga Segura
- Visualização em Donut Chart dividindo o espaço em Cache de Aplicativos (`%TEMP%`) e Cache de Sistema (`Windows Temp`).
- Rodapé com cálculo cumulativo de espaço recuperável e botão de disparo rápido para descarte seguro.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Funcionalidades]] | Ver [[Arquitetura]] | Ver [[Manutenção e Scripts]] | Ver [[Squad Multi-Agentes]]
