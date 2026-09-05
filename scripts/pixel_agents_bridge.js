/**
 * Pixel Agents Squad Bridge - Projeto CheckUP Windows
 * 
 * Conecta o squad multi-agentes (Dev, UI/UX, QA, Revisor, Documentador)
 * ao escritório virtual Pixel Agents (VS Code Extension ou Webview).
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const PIXEL_DIR = path.join(HOME, '.pixel-agents');
const SERVERS_DIR = path.join(PIXEL_DIR, 'servers');
const SERVER_LEGACY = path.join(PIXEL_DIR, 'server.json');
const PROJECT_CWD = path.resolve(__dirname, '..');
const PROJECT_NAME = 'Projeto CheckUP';
const CLAUDE_PROJECT_DIR = path.join(HOME, '.claude', 'projects', 'F--Faculdade-Projetos-Projeto-CheckUP');

// Definição do Squad CheckUP com comandos e arquivos limpos
const SQUAD = [
  {
    id: 'checkup-dev',
    name: 'checkup_dev (Backend)',
    role: 'Sistemas & Backend (Node/Electron/PS1)',
    actions: [
      { tool: 'Edit', input: { file_path: 'renderer.js' }, desc: 'Otimizando engine PowerShell Base64' },
      { tool: 'Write', input: { file_path: 'checkup.ps1' }, desc: 'Ajustando rotinas nativas de diagnóstico' },
      { tool: 'Bash', input: { command: 'powershell -EncodedCommand' }, desc: 'Leitura SMART de discos físicos' },
      { tool: 'Read', input: { file_path: 'main.js' }, desc: 'Refatorando chamadas IPC assíncronas' }
    ]
  },
  {
    id: 'checkup-ui-ux',
    name: 'checkup_ui_ux (Design)',
    role: 'Design System & Frontend (Dark Glassmorphism/Copper)',
    actions: [
      { tool: 'Edit', input: { file_path: 'style.css' }, desc: 'Polindo Dark Glassmorphism e acentos Copper' },
      { tool: 'Edit', input: { file_path: 'index.html' }, desc: 'Ajustando Grid de 6 colunas e cards ApexCharts' },
      { tool: 'Grep', input: { query: 'copper-switch' }, desc: 'Localizando componentes de toggle switch' },
      { tool: 'Read', input: { file_path: 'style.css' }, desc: 'Revisando backdrop-filters e animações suaves' }
    ]
  },
  {
    id: 'checkup-qa',
    name: 'checkup_qa (QA & Testes)',
    role: 'Testes, Resiliência & Casos de Borda Windows',
    actions: [
      { tool: 'Bash', input: { command: 'npm run validate' }, desc: 'Validando sintaxe de código main.js e renderer.js' },
      { tool: 'Bash', input: { command: 'Get-CimInstance AntiVirus' }, desc: 'Testando detecção de antivírus de terceiros' },
      { tool: 'Read', input: { file_path: 'renderer.js' }, desc: 'Auditando tratamento de exceções de privilégio admin' },
      { tool: 'Bash', input: { command: 'defrag C: /A' }, desc: 'Verificando resposta do comando nativo de TRIM' }
    ]
  },
  {
    id: 'checkup-reviewer',
    name: 'checkup_reviewer (Revisor)',
    role: 'Arquitetura, Segurança & memory.md',
    actions: [
      { tool: 'Read', input: { file_path: 'memory.md' }, desc: 'Auditando conformidade: Zero executáveis de terceiros' },
      { tool: 'Grep', input: { query: 'child_process.exec' }, desc: 'Inspecionando segurança de chamadas PowerShell' },
      { tool: 'Read', input: { file_path: 'AGENTS.md' }, desc: 'Revisando fluxo e sincronia do squad' },
      { tool: 'Read', input: { file_path: 'package.json' }, desc: 'Auditando dependências e scripts do projeto' }
    ]
  },
  {
    id: 'checkup-doc',
    name: 'checkup_doc (Obsidian & Docs)',
    role: 'Obsidian, Wikilinks & Backlog',
    actions: [
      { tool: 'Write', input: { file_path: 'Funcionalidades.md' }, desc: 'Sincronizando notas do Obsidian com [[wikilinks]]' },
      { tool: 'Edit', input: { file_path: 'backlog.md' }, desc: 'Atualizando tarefas marcadas como concluídas' },
      { tool: 'Read', input: { file_path: 'Arquitetura.md' }, desc: 'Mapeando nós e links conceituais do cofre' },
      { tool: 'Write', input: { file_path: 'README.md' }, desc: 'Atualizando documentação geral do repositório' }
    ]
  }
];

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function getActiveServers() {
  const servers = [];
  
  // 1. Verifica diretório servers/
  if (fs.existsSync(SERVERS_DIR)) {
    const files = fs.readdirSync(SERVERS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const entry = JSON.parse(fs.readFileSync(path.join(SERVERS_DIR, file), 'utf8'));
        if (entry.port && entry.token && isProcessAlive(entry.pid)) {
          servers.push(entry);
        }
      } catch {}
    }
  }

  // 2. Se não encontrou, tenta server.json legado
  if (servers.length === 0 && fs.existsSync(SERVER_LEGACY)) {
    try {
      const entry = JSON.parse(fs.readFileSync(SERVER_LEGACY, 'utf8'));
      if (entry.port && entry.token) {
        servers.push(entry);
      }
    } catch {}
  }

  return servers;
}

function sendToAllServers(payload) {
  const servers = getActiveServers();
  if (servers.length === 0) {
    return Promise.resolve([]);
  }

  const body = JSON.stringify(payload);
  const promises = servers.map(server => {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: server.port,
        path: '/api/hooks/claude',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + server.token,
          'Content-Length': Buffer.byteLength(body)
        },
        timeout: 2500
      }, (res) => {
        res.resume();
        resolve({ port: server.port, status: res.statusCode });
      });

      req.on('error', () => resolve({ port: server.port, status: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ port: server.port, status: 408 }); });
      req.end(body);
    });
  });

  return Promise.all(promises);
}

// Sanitiza arquivos de estado para garantir nome curto e limpo no balão
function sanitizeStateFiles() {
  const stateFiles = [
    path.join(PIXEL_DIR, 'vscode-state.json'),
    path.join(PIXEL_DIR, 'standalone-state.json')
  ];

  const squadIds = new Set(SQUAD.map(s => s.id));

  for (const filePath of stateFiles) {
    if (!fs.existsSync(filePath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data.agents)) {
        // Mantém apenas os agentes do squad CheckUP
        data.agents = data.agents.filter(a => squadIds.has(a.sessionId));
        for (const a of data.agents) {
          a.folderName = PROJECT_NAME;
          a.projectDir = PROJECT_CWD;
        }

        // Remove assentos órfãos
        if (data.seats && typeof data.seats === 'object') {
          const validIds = new Set(data.agents.map(a => String(a.id)));
          for (const key of Object.keys(data.seats)) {
            if (!validIds.has(key)) {
              delete data.seats[key];
            }
          }
        }

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch {}
  }
}

// Helpers de evento Pixel Agents
async function startSession(sessionId) {
  await sendToAllServers({
    hook_event_name: 'SessionStart',
    session_id: sessionId,
    cwd: CLAUDE_PROJECT_DIR
  });
}

async function startTool(sessionId, toolName, toolInput) {
  await sendToAllServers({
    hook_event_name: 'PreToolUse',
    session_id: sessionId,
    tool_name: toolName,
    tool_input: toolInput
  });
}

async function endTool(sessionId) {
  await sendToAllServers({
    hook_event_name: 'PostToolUse',
    session_id: sessionId
  });
}

async function turnEnd(sessionId) {
  await sendToAllServers({
    hook_event_name: 'Stop',
    session_id: sessionId
  });
}

async function endSession(sessionId) {
  await sendToAllServers({
    hook_event_name: 'SessionEnd',
    session_id: sessionId,
    reason: 'exit'
  });
}

// Limpeza e saída graciosa
async function cleanAllAgents() {
  console.log('\n[Pixel Agents Bridge] Limpando agentes do escritório virtual...');
  for (const agent of SQUAD) {
    await endSession(agent.id);
  }
  console.log('[Pixel Agents Bridge] Escritório limpo com sucesso.');
}

// Inicializa todos os 5 agentes no escritório
async function spawnSquad() {
  console.log('[Pixel Agents Bridge] Registrando Squad CheckUP no Pixel Agents...');
  const servers = getActiveServers();
  console.log(`[Pixel Agents Bridge] Servidores ativos encontrados: ${servers.length} (portas: ${servers.map(s => s.port).join(', ')})`);

  for (const agent of SQUAD) {
    await startSession(agent.id);
    const initialAction = agent.actions[0];
    await startTool(agent.id, initialAction.tool, initialAction.input);
    console.log(`  ✓ ${agent.name} -> ${initialAction.tool}: ${initialAction.desc}`);
  }
}

// Loop contínuo simulando a dinâmica colaborativa do Squad
async function runLoop() {
  await spawnSquad();
  console.log('\n[Pixel Agents Bridge] 🚀 Squad CheckUP trabalhando em paralelo no Pixel Agents!');
  console.log(`[Pixel Agents Bridge] Identificador do projeto: "${PROJECT_NAME}"`);
  console.log('[Pixel Agents Bridge] Pressione Ctrl+C para parar e liberar o escritório.\n');

  let tick = 0;
  const interval = setInterval(async () => {
    tick++;
    // A cada tick, um ou dois agentes alternam tarefas
    const agentIndex = tick % SQUAD.length;
    const agent = SQUAD[agentIndex];
    const actionIndex = (Math.floor(tick / SQUAD.length) + agentIndex) % agent.actions.length;
    const action = agent.actions[actionIndex];

    try {
      // 1. Finaliza a ação anterior
      await endTool(agent.id);
      
      // 2. Pequeno delay e inicia a próxima ação
      setTimeout(async () => {
        await startTool(agent.id, action.tool, action.input);
        const time = new Date().toLocaleTimeString('pt-BR');
        console.log(`[${time}] ${agent.name} -> ${action.tool}: ${action.desc}`);
      }, 600);

      // A cada 6 ciclos, um agente entra em turnEnd (descanso breve / brainstorming)
      if (tick % 6 === 0) {
        const restingAgent = SQUAD[(tick + 2) % SQUAD.length];
        await turnEnd(restingAgent.id);
      }
    } catch (err) {
      console.error('[Pixel Agents Bridge] Erro no ciclo:', err.message);
    }
  }, 4500);

  // Tratamento de interrupção graciosa
  const handleExit = async () => {
    clearInterval(interval);
    await cleanAllAgents();
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

// Execução CLI
const arg = process.argv[2];
if (arg === '--clean' || arg === '--clear' || arg === '--stop') {
  cleanAllAgents().then(() => process.exit(0));
} else if (arg === '--spawn-only') {
  spawnSquad().then(() => {
    console.log('[Pixel Agents Bridge] Agentes instanciados.');
    process.exit(0);
  });
} else {
  runLoop();
}

module.exports = {
  SQUAD,
  getActiveServers,
  sendToAllServers,
  startSession,
  startTool,
  endTool,
  turnEnd,
  endSession,
  spawnSquad,
  cleanAllAgents,
  sanitizeStateFiles
};
