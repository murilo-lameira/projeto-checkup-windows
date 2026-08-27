const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const projectRoot = process.defaultApp ? path.join(__dirname, '..') : process.resourcesPath;

// Variáveis globais
let btnCheckup, btnRepair, btnAdvanced, btnOptimize, logArea, sysChart, networkChart;
let networkHistory = [0];
let previousNetworkBytes = null;
let previousNetworkSampleTime = null;
let diskCharts = [];
let realtimeMetricsRunning = false;
let smoothRealtimeValues = [0, 0, 0];

window.addEventListener('DOMContentLoaded', () => {
    // Selecionar elementos após DOM estar pronto
    btnCheckup = document.getElementById('btnCheckup');
    btnRepair = document.getElementById('btnRepair');
    btnAdvanced = document.getElementById('btnAdvanced');
    btnOptimize = document.getElementById('btnOptimize');
    logArea = document.getElementById('logArea');

    // Configuração do ApexCharts (Radial Bar)
    const radialOptions = {
        series: [0, 0, 0],
        labels: ['CPU', 'RAM', 'Disco (C:)'],
        chart: {
            height: 210,
            type: 'radialBar',
            fontFamily: 'Inter, sans-serif',
            parentHeightOffset: 0,
            redrawOnParentResize: false,
            redrawOnWindowResize: false,
            animations: { enabled: false }
        },
        colors: ['#ef4444', '#a855f7', '#eab308'],
        stroke: { lineCap: 'round' },
        legend: { show: false },
        plotOptions: {
            radialBar: {
                hollow: { size: '25%' },
                track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: false },
                    value: { show: false },
                    total: {
                        show: true,
                        label: 'AVG',
                        color: '#70747b',
                        fontSize: '16px',
                        fontWeight: 500,
                        formatter: (w) => {
                            const values = w.globals.seriesTotals;
                            const average = values.reduce((sum, value) => sum + value, 0) / values.length;
                            return Math.round(average) + '%';
                        }
                    }
                }
            }
        }
    };

    const networkOptions = {
        series: [{ name: 'Uso da rede', data: networkHistory }],
        chart: {
            height: 120,
            type: 'line',
            sparkline: { enabled: true },
            parentHeightOffset: 0,
            animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 500 } }
        },
        colors: ['#67e8f9'],
        stroke: { curve: 'smooth', width: 4, lineCap: 'round' },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.12 } },
        markers: { size: 2, colors: ['#67e8f9'], strokeColors: '#d9fbff', strokeWidth: 1 },
        tooltip: { theme: 'dark', y: { formatter: (value) => value.toFixed(2) + ' Mbps' } },
        yaxis: { min: 0, labels: { show: false } },
        grid: { show: false }
    };

    const radialChartElement = document.querySelector('#radialChart');
    if (radialChartElement) {
        sysChart = new ApexCharts(radialChartElement, radialOptions);
        sysChart.render();
        logArea.innerText = "[+] Gráfico de Insights carregado com sucesso!\n";
    }

    const networkChartElement = document.querySelector('#networkChart');
    if (networkChartElement) {
        networkChart = new ApexCharts(networkChartElement, networkOptions);
        networkChart.render();
        monitorNetworkUsage();
    }

    function monitorNetworkUsage() {
        const command = 'powershell.exe -NoProfile -Command "Get-NetAdapterStatistics | ForEach-Object { [PSCustomObject]@{ Received = $_.ReceivedBytes; Sent = $_.SentBytes } } | ConvertTo-Json -Compress"';
        exec(command, (error, stdout) => {
            if (!error && stdout.trim()) {
                try {
                    const samples = JSON.parse(stdout.trim());
                    const adapters = Array.isArray(samples) ? samples : [samples];
                    const totalBytes = adapters.reduce((sum, adapter) => sum + Number(adapter.Received || 0) + Number(adapter.Sent || 0), 0);
                    const now = Date.now();

                    if (previousNetworkBytes !== null && previousNetworkSampleTime !== null) {
                        const elapsedSeconds = Math.max((now - previousNetworkSampleTime) / 1000, 0.1);
                        const megabitsPerSecond = Math.max((totalBytes - previousNetworkBytes) * 8 / elapsedSeconds / 1000000, 0);
                        networkHistory.push(Number(megabitsPerSecond.toFixed(2)));
                        if (networkHistory.length > 20) networkHistory.shift();
                        if (networkChart) networkChart.updateSeries([{ name: 'Uso da rede', data: networkHistory }], false);
                    }

                    previousNetworkBytes = totalBytes;
                    previousNetworkSampleTime = now;
                } catch (error) {
                    logArea.innerText += `\n[AVISO] Não foi possível atualizar o gráfico de rede: ${error.message}`;
                }
            }
        });
    }

    setInterval(monitorNetworkUsage, 2000);

    function monitorRealtimeMetrics() {
        if (realtimeMetricsRunning) return;
        realtimeMetricsRunning = true;

        const command = 'powershell.exe -NoProfile -Command "$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average; $os = Get-CimInstance Win32_OperatingSystem; $computer = Get-CimInstance Win32_ComputerSystem; $disks = @(Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' | ForEach-Object { $used = if ($_.Size -gt 0) { (($_.Size - $_.FreeSpace) / $_.Size) * 100 } else { 0 }; [PSCustomObject]@{ Drive = $_.DeviceID; Usage = [math]::Round($used, 1) } }); $adapters = @(Get-NetAdapterStatistics -ErrorAction SilentlyContinue); $bytes = ($adapters | Measure-Object -Property ReceivedBytes -Sum).Sum + ($adapters | Measure-Object -Property SentBytes -Sum).Sum; $up = @(Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object Status -eq \'Up\').Count -gt 0; [PSCustomObject]@{ Cpu = [math]::Round([double]$cpu, 1); Ram = [math]::Round((1 - ($os.FreePhysicalMemory * 1KB / $computer.TotalPhysicalMemory)) * 100, 1); Disks = $disks; NetworkBytes = [double]$bytes; NetworkUp = $up } | ConvertTo-Json -Compress"';
        exec(command, (error, stdout) => {
            realtimeMetricsRunning = false;
            if (error || !stdout.trim()) return;

            try {
                const metrics = JSON.parse(stdout.trim());
                const cpuValue = Number(metrics.Cpu) || 0;
                const ramValue = Number(metrics.Ram) || 0;
                const disks = Array.isArray(metrics.Disks) ? metrics.Disks : (metrics.Disks ? [metrics.Disks] : []);
                const diskValue = disks.length ? Number(disks[0].Usage) || 0 : 0;
                const targetValues = [cpuValue, ramValue, diskValue];
                smoothRealtimeValues = smoothRealtimeValues.map((value, index) => (
                    value + (targetValues[index] - value) * 0.25
                ));
                const [smoothCpuValue, smoothRamValue, smoothDiskValue] = smoothRealtimeValues;

                if (sysChart) sysChart.updateSeries(smoothRealtimeValues, false);
                const values = {
                    radCpuVal: `${Math.round(smoothCpuValue)}%`,
                    radRamVal: `${Math.round(smoothRamValue)}%`,
                    radDiskVal: `${Math.round(smoothDiskValue)}%`,
                    insightCpuValue: `${Math.round(smoothCpuValue)}%`,
                    insightRamValue: `${Math.round(smoothRamValue)}%`,
                    insightDiskValue: `${Math.round(smoothDiskValue)}%`
                };
                Object.entries(values).forEach(([id, value]) => {
                    const element = document.getElementById(id);
                    if (element) element.innerText = value;
                });

                const networkStatus = document.getElementById('valNetStatus');
                if (networkStatus) {
                    networkStatus.innerText = metrics.NetworkUp ? 'Online' : 'Offline';
                    networkStatus.style.color = metrics.NetworkUp ? 'var(--green)' : 'var(--red)';
                }
            } catch (_) {}
        });
    }

    monitorRealtimeMetrics();
    setInterval(monitorRealtimeMetrics, 2000);

    // Função de Intertravamento (Trava/Destrava Interface)
    function setAppLockState(isLocked) {
        [btnCheckup, btnRepair, btnAdvanced, btnOptimize].forEach(btn => {
            if (btn) {
                btn.disabled = isLocked;
                btn.style.opacity = isLocked ? '0.4' : '1';
            }
        });
        document.body.style.cursor = isLocked ? 'wait' : 'default';
    }

    // FUNÇÃO: Ler o JSON e atualizar os números na tela
    function updateDashboardUI() {
        const possibleDirs = [
            path.join(projectRoot, 'core', 'relatorios'),
            path.join(projectRoot, 'relatorios'),
            path.join(projectRoot, 'core'),
            projectRoot
        ];
        
        let jsonPath = null;
        for (const dir of possibleDirs) {
            const tempPath = path.join(dir, 'dados_atuais.json');
            if (fs.existsSync(tempPath)) {
                jsonPath = tempPath;
                break;
            }
        }

        if (jsonPath) {
            try {
                const rawData = fs.readFileSync(jsonPath, 'utf8');
                const cleanData = rawData.replace(/^\uFEFF/, '');
                const data = JSON.parse(cleanData);
                const cpuVal = data.Processador.Load || 0;
                const ramVal = data.Memoria.Percent || 0;

                let diskVal = 0;
                if (data.Discos && data.Discos.length > 0) {
                    diskVal = parseFloat(data.Discos[0].Uso.replace('%', '')) || 0;
                }

                // 1. Injeção Direta de Textos
                document.getElementById('hardwareCpu').innerText = `${data.Processador.Nome || '--'} (${data.Processador.Nucleos || '--'}C / ${data.Processador.Threads || '--'}T)`;
                document.getElementById('hardwareRam').innerText = `${data.Memoria.Fabricante || '--'} | ${data.Memoria.Total || '--'} GB | ${data.Memoria.Velocidade || '--'} MHz`;
                document.getElementById('hardwareGpu').innerText = `${data.GPU.Nome || '--'} | ${data.GPU.VRAM || '--'} GB | ${data.GPU.Resolucao || '--'}`;
                document.getElementById('hardwareSystem').innerText = `${data.PlacaMae || '--'} | ${data.Sistema.OS || '--'}`;

                document.getElementById('valNetStatus').innerText = data.Rede.Status || '--';
                document.getElementById('valNetSpeed').innerText = 'Download: ' + (data.Rede.Velocidade || '--');

                if (document.getElementById('radCpuVal')) document.getElementById('radCpuVal').innerText = cpuVal + '%';
                if (document.getElementById('radRamVal')) document.getElementById('radRamVal').innerText = ramVal + '%';
                if (document.getElementById('radDiskVal')) document.getElementById('radDiskVal').innerText = diskVal + '%';

                if (sysChart) sysChart.updateSeries([cpuVal, ramVal, diskVal], false);

                document.getElementById('insightCpuValue').innerText = cpuVal + '%';
                document.getElementById('insightRamValue').innerText = ramVal + '%';
                document.getElementById('insightDiskValue').innerText = diskVal + '%';

                const health = data.Saude || {};
                const healthIssues = Array.isArray(health.Problemas) ? health.Problemas : (health.Problemas ? [health.Problemas] : []);
                const healthWarnings = Array.isArray(health.Avisos) ? health.Avisos : (health.Avisos ? [health.Avisos] : []);
                const healthStatus = document.getElementById('healthStatus');
                const healthDetails = document.getElementById('healthDetails');
                const recommendationText = document.getElementById('healthRecommendationText');
                const recommendationStatus = document.getElementById('healthRecommendationStatus');
                healthStatus.className = 'health-status ' + (healthIssues.length ? 'health-danger' : healthWarnings.length ? 'health-warning' : 'health-success');
                healthStatus.innerText = health.Status || 'SISTEMA SAUDÁVEL';
                healthDetails.innerHTML = '';

                let recommendation = 'O sistema está estável. Execute um novo diagnóstico periodicamente para acompanhar a saúde do computador.';
                if (healthIssues.length) {
                    recommendation = 'Há problemas críticos. Execute o Reparo Profundo para verificar e restaurar componentes do Windows.';
                } else if (healthWarnings.length) {
                    recommendation = 'Há alertas de desempenho ou manutenção. Use Otimizar SO para limpar e atualizar o sistema.';
                }
                if (recommendationText) recommendationText.innerText = recommendation;
                const recommendationLevel = healthIssues.length ? 'danger' : healthWarnings.length ? 'warning' : 'success';
                if (recommendationStatus) {
                    recommendationStatus.className = 'health-status health-' + recommendationLevel;
                    recommendationStatus.innerText = 'RECOMENDAÇÃO';
                }
                if (recommendationText) {
                    recommendationText.className = 'health-item health-item-' + recommendationLevel;
                }

                [...healthIssues.map(message => ({ className: 'health-item-danger', message })), ...healthWarnings.map(message => ({ className: 'health-item-warning', message }))].forEach(itemData => {
                    const item = document.createElement('div');
                    item.className = 'health-item ' + itemData.className;
                    item.innerText = itemData.message;
                    healthDetails.appendChild(item);
                });

                if (!healthIssues.length && !healthWarnings.length) {
                    const item = document.createElement('div');
                    item.className = 'health-item health-item-success';
                    item.innerText = 'OK  Nenhum problema crítico detectado';
                    healthDetails.appendChild(item);
                }

                const systemErrors = Array.isArray(data.Erros) ? data.Erros : (data.Erros ? [data.Erros] : []);
                const errorsStatus = document.getElementById('errorsStatus');
                const errorsDetails = document.getElementById('errorsDetails');
                errorsStatus.className = 'health-status ' + (systemErrors.length ? 'health-danger' : 'health-success');
                errorsStatus.innerText = systemErrors.length ? `${systemErrors.length} evento(s) crítico(s) ou de erro` : 'NENHUM ERRO DETECTADO';
                errorsDetails.innerHTML = '';

                systemErrors.forEach(systemError => {
                    const item = document.createElement('div');
                    item.className = 'health-item health-item-danger';
                    item.innerText = `${systemError.DataHora || '--'} | ${systemError.Fonte || '--'} | ID ${systemError.Id || '--'}\n${systemError.Mensagem || 'Sem descrição'}`;
                    errorsDetails.appendChild(item);
                });

                if (!systemErrors.length) {
                    const item = document.createElement('div');
                    item.className = 'health-item health-item-success';
                    item.innerText = 'OK  Nenhum evento de nível 2 ou superior nas últimas 24h';
                    errorsDetails.appendChild(item);
                }

                const securityDetails = document.getElementById('securityDetails');
                const security = data.Seguranca || {};
                securityDetails.innerHTML = '';
                const securityLabels = { Antivirus: 'Antivírus', Firewall: 'Firewall', AcessoRemoto: 'Acesso Remoto' };
                Object.entries(security).forEach(([label, value]) => {
                    const item = document.createElement('div');
                    const normalizedValue = String(value || '').toLowerCase();
                    const isActive = label === 'Antivirus' || normalizedValue.includes('ativo') || normalizedValue.includes('proteg') || normalizedValue.includes('nenhum');
                    item.className = 'security-item ' + (isActive ? 'security-active' : 'security-inactive');
                    const labelElement = document.createElement('span');
                    const valueElement = document.createElement('strong');
                    labelElement.innerText = securityLabels[label] || label;
                    valueElement.innerText = value || '--';
                    item.append(labelElement, valueElement);
                    securityDetails.appendChild(item);
                });

                // 2. Construção da Tabela de Discos
                let disksHtml = '<table><tr><th>Drive</th><th>Uso</th><th>Livre</th><th>Total</th><th>Visual</th></tr>';
                if (data.Discos && data.Discos.length > 0) {
                    data.Discos.forEach((d, index) => {
                        disksHtml += `<tr><td>${d.Drive}</td><td>${d.Uso}</td><td>${d.Livre}</td><td>${d.Total}</td><td><div class="disk-chart" id="diskChart${index}"></div></td></tr>`;
                    });
                } else {
                    disksHtml += '<tr><td colspan="5">Nenhum disco detectado</td></tr>';
                }
                disksHtml += '</table>';
                document.getElementById('valDisksArea').innerHTML = disksHtml;
                diskCharts.forEach(chart => chart.destroy());
                diskCharts = [];
                (data.Discos || []).forEach((disk, index) => {
                    const diskUsage = parseFloat(String(disk.Uso || '0').replace('%', '').replace(',', '.')) || 0;
                    const diskChartElement = document.getElementById(`diskChart${index}`);
                    if (diskChartElement) {
                        const chart = new ApexCharts(diskChartElement, {
                            series: [diskUsage],
                            chart: { type: 'radialBar', width: 34, height: 34, sparkline: { enabled: true } },
                            colors: ['#eab308'],
                            plotOptions: { radialBar: { hollow: { size: '25%' }, track: { background: 'rgba(255,255,255,0.08)', strokeWidth: '100%' }, dataLabels: { show: false } } },
                            stroke: { lineCap: 'round' }
                        });
                        chart.render();
                        diskCharts.push(chart);
                    }
                });

                // 3. Construção da Tabela de Processos
                let procHtml = '<table><tr><th>Processo</th><th>PID</th><th>RAM (MB)</th></tr>';
                if (data.Processos && data.Processos.length > 0) {
                    data.Processos.forEach(p => {
                        procHtml += `<tr><td>${p.Nome}</td><td>${p.PID}</td><td>${p.RAM}</td></tr>`;
                    });
                } else {
                    procHtml += '<tr><td colspan="3">Nenhum processo detectado</td></tr>';
                }
                procHtml += '</table>';
                document.getElementById('valProcessesArea').innerHTML = procHtml;

                logArea.innerText += `\n[+] Telemetria avançada atualizada na interface!`;
            } catch (err) {
                logArea.innerText += `\n[ERRO] Falha ao processar dados detalhados: ${err.message}`;
            }
        } else {
            logArea.innerText += `\n[ERRO] Pacote de dados da telemetria não encontrado.`;
        }
    }

    // Evento: Executar Diagnóstico (checkup.ps1)
    if (btnCheckup) {
        btnCheckup.addEventListener('click', () => {
            setAppLockState(true);
            logArea.innerText = "[*] Iniciando coleta de telemetria via PowerShell...\n";
            
            // Constrói o caminho seguro para o script e executa oculto
            const scriptPath = path.join(projectRoot, 'core', 'checkup.ps1');
            const command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "${scriptPath}"`;
            
            const process = exec(command);
            
            process.stdout.on('data', (data) => { 
                logArea.innerText += data; 
                logArea.scrollTop = logArea.scrollHeight; 
            });
            
            process.stderr.on('data', (data) => {
                logArea.innerText += `\n[ERRO/AVISO] ${data}`;
                logArea.scrollTop = logArea.scrollHeight;
            });

            process.on('close', (code) => { 
                logArea.innerText += `\n[*] Leitura concluída. Atualizando Dashboard...`; 
                setAppLockState(false); 
                updateDashboardUI(); // Injeta o JSON lido na tela
            });
        });
    }

    // Evento: Limpeza e Reparo
    if (btnRepair) {
        btnRepair.addEventListener('click', () => {
            setAppLockState(true);
            logArea.innerText = "[*] Iniciando rotina de limpeza nativa...\n";
            const command = `powershell.exe -Command "Write-Output 'Limpando DNS...'; ipconfig /flushdns | Out-Null; Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue; Write-Output 'Limpeza concluída!'"`;
            const process = exec(command);
            process.stdout.on('data', (data) => { logArea.innerText += data; logArea.scrollTop = logArea.scrollHeight; });
            process.on('close', (code) => { logArea.innerText += `\n[*] Manutenção finalizada.`; setAppLockState(false); });
        });
    }

    // Evento: Reparo Profundo
    if (btnAdvanced) {
        btnAdvanced.addEventListener('click', () => {
            setAppLockState(true);
            logArea.innerText = "[*] Iniciando Reparo Profundo (SFC e DISM)...\n";
            const command = `powershell.exe -Command "sfc /scannow; DISM /Online /Cleanup-Image /RestoreHealth; Write-Output 'Reparo Profundo Concluído!'"`;
            const process = exec(command);
            process.stdout.on('data', (data) => { logArea.innerText += data; logArea.scrollTop = logArea.scrollHeight; });
            process.on('close', (code) => { logArea.innerText += `\n[*] Manutenção finalizada.`; setAppLockState(false); });
        });
    }

    // Evento: Otimizar e Atualizar
    if (btnOptimize) {
        btnOptimize.addEventListener('click', () => {
            setAppLockState(true);
            logArea.innerText = "[*] Iniciando Otimização...\n";
            const command = `powershell.exe -Command "Optimize-Volume -DriveLetter C -ReTrim; winget upgrade --all --silent --accept-package-agreements --accept-source-agreements; Write-Output 'Otimização Concluída!'"`;
            const process = exec(command);
            process.stdout.on('data', (data) => { logArea.innerText += data; logArea.scrollTop = logArea.scrollHeight; });
            process.on('close', (code) => { logArea.innerText += `\n[*] Tarefa finalizado.`; setAppLockState(false); });
        });
    }

    // GATILHO AUTOMÁTICO: Assim que a janela abrir, clica no botão "Diagnóstico"
    if (btnCheckup) {
        btnCheckup.click();
    }
});