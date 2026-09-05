# Agente: checkup_qa (Qualidade, Resiliência & Casos de Borda)

## Escopo e Responsabilidades
- Execução contínua de validação de integridade sintática via `npm run validate`.
- Testes funcionais e simulação de cenários de borda no Windows:
  - Falta de permissões elevadas / Administrador (UAC).
  - Presença de antivírus de terceiros afetando a leitura do Windows Defender.
  - Paths contendo espaços e caracteres especiais.
  - Falhas de execução de PowerShell e garantia de fechamento de loading overlays.
- Emissão de relatórios sucintos de aprovação ou defeitos identificados.

