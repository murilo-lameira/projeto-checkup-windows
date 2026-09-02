# Funcionalidades

O aplicativo Projeto CheckUP divide-se em painéis lógicos para manter o sistema operacional em sua melhor forma.

## Dashboard Integrada
A tela inicial fornece de forma visual um panorama da máquina:
- **Monitoramento em Tempo Real:** Lê informações do Processador, Memória RAM e Discos via WMI / comandos nativos do sistema.
- Gráficos interativos (via biblioteca na [[Arquitetura]]) demonstram a carga e a ocupação dos componentes.

## Diagnóstico
Uma rotina focada apenas em **escanear** e identificar problemas, como disco corrompido, lentidões de rede, arquivos inúteis. Não toma decisões irreversíveis, apenas exibe a situação ao usuário.

## Manutenção Completa
A principal e mais visual funcionalidade (veja sobre a UI no [[Design System]]). Ela aplica de forma consecutiva scripts críticos de reparo do Windows:
1. **Verificação de Saúde (DISM RestoreHealth)**: Repara a imagem de serviço do Windows.
2. **Correção de Arquivos (SFC Scannow)**: Substitui arquivos essenciais do sistema corrompidos.
3. **Limpeza de Arquivos Temporários**: Esvazia pastas Temp e logs descartáveis.
4. **Atualização de Softwares**: Checa e aplica atualizações em lote via Winget.
5. **Otimização e Logs**: Gera o fechamento da operação e grava o registro.

*O uso dessa feature requer permissões UAC. Leia como gerimos isso na seção de [[Manutenção e Scripts]].*

## Relatórios e Histórico
Todos os resultados de diagnóstico e manutenção são salvos no sistema de arquivos local. 
- Permite abrir a pasta e visualizar arquivos `.txt` (ou outros formatos de log) documentando data, horário e correções aplicadas no passado.

---
**Navegação:** Voltar para a [[Home]]

