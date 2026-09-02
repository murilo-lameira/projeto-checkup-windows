# Design System

A identidade visual do Projeto CheckUP é fortemente baseada no estilo **Dark Glassmorphism**, unindo uma estética moderna, limpa e imersiva.

## Paleta de Cores
- **Fundo Principal (Dark):** `#09090b` (Deep Black / Cinza escuro quase preto).
- **Painéis e Cards (Glassmorphism):** Fundos semi-transparentes escuros (ex: `rgba(24, 24, 27, 0.82)`) combinados de maneira imprescindível com `backdrop-filter: blur(16px)` para simular o efeito de vidro opaco.
- **Destaques e Acentos (Cobre / Copper):** Tons variando do `#cf663f` ao `#ff9364`. Essa cor cobre metálica é a identidade do projeto e é usada em botões ativos, ícones primários e barras de progresso.
- **Sucesso e Finalização (Esmeralda / Emerald):** Tons em `#2dd4bf` a `#34d399` para feedbacks positivos.

## Tipografia
- Fonte principal de sistema, moderna e sem serifa (`Inter`, `Segoe UI`, `Roboto`), utilizando tamanhos adequados e contrastes com cinzas mais claros para textos descritivos e branco para títulos.

## Componentes UI Notáveis
- **Modais Full-screen:** O modal de manutenção (`#maintenanceModal`) cobre toda a tela com um fundo escurecido e blur intenso (`backdrop-filter: blur(8px)`), centralizando o cartão de conteúdo e atraindo a atenção total do usuário para o processo crítico.
- **Steppers de Progresso:** Indicadores verticais listando os passos de operações longas (como na Manutenção Completa). Utilizam animações CSS de pulso circular (`box-shadow: 0 0 0 0 rgba(207, 102, 63, 0.4)`) no passo atual (`.pulse-border`) para indicar que o sistema está trabalhando, resolvendo o problema de "sensação de travamento".
- **Cartões de Info:** Possuem bordas extremamente sutis (`border: 1px solid rgba(255, 255, 255, 0.05)`) e um leve brilho (`box-shadow`) para realçar elevação no layout plano do Windows.

Acompanhe como esse Design se aplica diretamente às rotinas nas [[Funcionalidades]].

---
**Navegação:** Voltar para a [[Home]]

