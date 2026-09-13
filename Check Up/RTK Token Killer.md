# 🚀 RTK - Rust Token Killer (Otimizador de Tokens do Antigravity)

O **RTK (Rust Token Killer)** é um proxy CLI de alta performance desenvolvido em Rust, projetado para interceptar, filtrar e comprimir saídas de terminal antes que elas alcancem a janela de contexto do LLM. No ecossistema do **[[Home|Projeto CheckUP]]** e do **[[Squad Multi-Agentes]]**, ele reduz em até **80% a 90%** o consumo de tokens nas chamadas de terminal.

---

## ⚙️ Arquitetura de Configuração (Global vs Local)

O RTK atua guiado pelas regras de sistema lidas pelo Antigravity IDE:

| Escopo | Caminho do Arquivo de Regras | Propósito |
| :--- | :--- | :--- |
| **🌐 Global** | `~/.gemini/config/rules/antigravity-rtk-rules.md` | Carregado automaticamente pelo Antigravity em **todos os projetos** da máquina. |
| **📁 Local** | `.agents/rules/antigravity-rtk-rules.md` | Regra local na raiz do repositório para persistência no controle de versão (Git). |

---

## 📋 Regra Operacional Ativa

O agente e o squad multi-agentes aplicam automaticamente o prefixo `rtk` em comandos de shell:

```bash
# Exemplos práticos de uso
rtk git status          # Resumo ultra-compacto da árvore git
rtk git diff            # Apenas as linhas alteradas
rtk npm test            # Exibe apenas falhas e sumário de testes
rtk ls <diretório>      # Listagem otimizada em árvore
rtk grep "padrao" .     # Agrupamento e poda de linhas redundantes
rtk docker ps           # Tabela comprimida sem bordas excessivas
```

---

## 📊 Métricas e Auditoria de Economia

Para inspecionar a economia de tokens gerada pelo RTK em tempo real no terminal:

```bash
# Exibe o balanço geral de tokens economizados e taxa de eficiência
rtk gain

# Histórico detalhado por comando executado
rtk gain --history

# Descobre comandos que poderiam ter usado RTK mas rodaram puros
rtk discover

# Executa comando puro sem compressão (modo depuração)
rtk proxy <comando>
```

---

## 🛡️ Vantagens para o Squad Multi-Agentes

1. **Janela de Contexto Limpa:** Impede que saídas verbosas de compiladores, linters ou git encham a memória de curto prazo do agente.
2. **Respostas Mais Rápidas:** Menor payload de tokens resulta em menor latência no processamento do modelo.
3. **Economia de Cota:** Preserva os limites de rate limit e tokens/minuto da API Gemini.

---
**Navegação:** Voltar para a [[Home]] | Ver [[Squad Multi-Agentes]] | Ver [[Manutenção e Scripts]]

