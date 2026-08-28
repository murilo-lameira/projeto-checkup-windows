const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const isPackaged = __dirname.includes('app.asar');
const projectRoot = isPackaged 
    ? process.resourcesPath 
    : path.join(__dirname, '..');

const scheduleStatePath = path.join(os.homedir(), 'checkup_agendamento.json');

let btnCheckup, btnFullMaintenance, logArea, sysChart, networkChart, btnSchedule;
let networkHistory = [0];
let previousNetworkBytes = null;
let previousNetworkSampleTime = null;
let diskCharts = [];
let realtimeMetricsRunning = false;
let isAppPaused = false; // <-- NOVA TRAVA GLOBAL
let smoothRealtimeValues = [0, 0, 0];
let uptimeChart, tempChart, diskTempChart;

window.addEventListener('DOMContentLoaded', () => {
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
            
            tab.classList.add('active');
            const targetId = tab.dataset.target;
            const targetPage = document.getElementById(targetId);
            
            if (targetPage) {
                targetPage.style.display = 'grid';
                if (targetId === 'historicoPage') {
                    setTimeout(loadAndRenderHistory, 100); 
                }
            }
        });
    });
    btnCheckup = document.getElementById('btnCheckup');
    btnFullMaintenance = document.getElementById('btnFullMaintenance');
    btnSchedule = document.getElementById('btnSchedule');
    logArea = document.getElementById('logArea');
    
    const activeSchedulesDiv = document.getElementById('activeSchedules');

    const radialOptions = {
        series: [0, 0, 0],
        labels: ['CPU', 'RAM', 'Disco (C:)'],
        chart: {
            width: '100%',
            height: '100%', 
            type: 'radialBar',
            fontFamily: 'Inter, sans-serif',
            parentHeightOffset: 0,
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            animations: { enabled: false }
        },
        colors: ['#ef4444', '#a855f7', '#eab308'],
        stroke: { lineCap: 'round' },
        legend: { show: false },
        plotOptions: {
            radialBar: {
                offsetY: 0, 
                hollow: { size: '32%' },
                track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: false },
                    value: { show: false },
                    total: {
                        show: true,
                        label: 'AVG',
                        color: '#8a888c',
                        fontSize: '18px',
                        fontWeight: 600,
                        formatter: (w) => {
                            const values = w.globals.seriesTotals;
                            const average = values.reduce((sum, value) => sum + value, 0) / values.length;
                            return Math.round(average) + '%';
                        }
                    }
                }
            }
        },
        responsive: [
            {
                breakpoint: 1440,
                options: {
                    plotOptions: {
                        radialBar: {
                            hollow: { size: '28%' },
                            dataLabels: {
                                total: {
                                    fontSize: '16px'
                                }
                            }
                        }
                    }
                }
            },
            {
                breakpoint: 1200,
                options: {
                    plotOptions: {
                        radialBar: {
                            hollow: { size: '25%' },
                            dataLabels: {
                                total: {
                                    fontSize: '14px'
                                }
                            }
                        }
                    }
                }
            }
        ]
    };

    const networkOptions = {
        series: [{ name: 'Uso da rede', data: networkHistory }],
        chart: {
            width: '100%',
            height: '100%', 
            type: 'area', 
            sparkline: { enabled: true },
            parentHeightOffset: 0,
            redrawOnParentResize: true,
            redrawOnWindowResize: true,
            animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 500 } }
        },
        colors: ['#2dd4bf'], 
        stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
        fill: { 
            type: 'gradient', 
            gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.0, stops: [0, 100] } 
        },
        markers: { size: 0 }, 
        tooltip: { theme: 'dark', y: { formatter: (value) => value.toFixed(2) + ' Mbps' } },
        yaxis: { min: 0, labels: { show: false } },
        grid: { show: false }
    };

    const radialChartElement = document.querySelector('#radialChart');
    if (radialChartElement) {
        sysChart = new ApexCharts(radialChartElement, radialOptions);
        sysChart.render();
        setStatus('info', 'Sistema Pronto', 'Aguardando inicialização da telemetria...');
    }

    const networkChartElement = document.querySelector('#networkChart');
    if (networkChartElement) {
        networkChart = new ApexCharts(networkChartElement, networkOptions);
        networkChart.render();
        monitorNetworkUsage();
    }

    function monitorNetworkUsage() {
        if (isAppPaused) return; // Congela o gráfico de rede se a tela de loading estiver ativa

        const command = 'powershell.exe -NoProfile -Command "Get-NetAdapterStatistics | ForEach-Object { [PSCustomObject]@{ Received = $_.ReceivedBytes; Sent = $_.SentBytes } } | ConvertTo-Json -Compress"';
        exec(command, (error, stdout) => {
            if (!error && stdout.trim() && !isAppPaused) {
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
                } catch (error) {}
            }
        });
    }

    function monitorRealtimeMetrics() {
        if (isAppPaused || realtimeMetricsRunning) return; // Congela os anéis de hardware
        realtimeMetricsRunning = true;

        const command = 'powershell.exe -NoProfile -Command "$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average; $os = Get-CimInstance Win32_OperatingSystem; $computer = Get-CimInstance Win32_ComputerSystem; $disks = @(Get-CimInstance Win32_LogicalDisk -Filter \'DriveType=3\' | ForEach-Object { $used = if ($_.Size -gt 0) { (($_.Size - $_.FreeSpace) / $_.Size) * 100 } else { 0 }; [PSCustomObject]@{ Drive = $_.DeviceID; Usage = [math]::Round($used, 1) } }); $adapters = @(Get-NetAdapterStatistics -ErrorAction SilentlyContinue); $bytes = ($adapters | Measure-Object -Property ReceivedBytes -Sum).Sum + ($adapters | Measure-Object -Property SentBytes -Sum).Sum; $active = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq \'Up\' -and $_.MacAddress } | Select-Object -First 1; $up = [bool]$active; $cType = if ($active) { if ($active.Name -match \'Wi-Fi|Wireless\') { \'Wi-Fi\' } else { \'Cabo (Ethernet)\' } } else { \'Desconectado\' }; [PSCustomObject]@{ Cpu = [math]::Round([double]$cpu, 1); Ram = [math]::Round((1 - ($os.FreePhysicalMemory * 1KB / $computer.TotalPhysicalMemory)) * 100, 1); Disks = $disks; NetworkBytes = [double]$bytes; NetworkUp = $up; ConnType = $cType } | ConvertTo-Json -Compress"';
        exec(command, (error, stdout) => {
            realtimeMetricsRunning = false;
            if (error || !stdout.trim() || isAppPaused) return;

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
                const netStatusDot = document.getElementById('netStatusDot');
                const connTypeEl = document.getElementById('valConnType');
                
                if (networkStatus) {
                    networkStatus.innerText = metrics.NetworkUp ? 'Online' : 'Offline';
                    networkStatus.style.color = '#f4f4f5'; 
                }
                if (netStatusDot) {
                    netStatusDot.className = 'status-dot ' + (metrics.NetworkUp ? 'dot-online' : 'dot-offline');
                }
                if (connTypeEl) {
                    connTypeEl.innerText = metrics.ConnType || '--';
                }
            } catch (_) {}
        });
    }

    setInterval(monitorNetworkUsage, 2000);
    setInterval(monitorRealtimeMetrics, 2000);
    monitorRealtimeMetrics();

    function setAppLockState(isLocked, actionText = 'Processando...') {
        isAppPaused = isLocked; // A trava global agora obedece o Loading Overlay

        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay && loadingText) {
            loadingText.innerText = actionText;
            if (isLocked) {
                overlay.classList.remove('hidden');
            } else {
                overlay.classList.add('hidden');
            }
        }

        [btnCheckup, btnFullMaintenance, btnSchedule].forEach(btn => {
            if (btn) btn.disabled = isLocked;
        });
        document.body.style.cursor = isLocked ? 'wait' : 'default';
    }

    function setStatus(type, title, message) {
        if (!logArea) return;
        const icons = { 'success': '✅', 'error': '🚨', 'warning': '⚠️', 'info': 'ℹ️', 'action': '⚙️' };
        logArea.innerHTML = `
            <div class="status-message status-${type === 'action' ? 'info' : type}">
                <div class="status-icon">${icons[type]}</div>
                <div class="status-text">
                    <strong>${title}</strong>
                    <span>${message}</span>
                </div>
            </div>
        `;
    }

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
            if (fs.existsSync(tempPath)) { jsonPath = tempPath; break; }
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

                if (document.getElementById('hardwareCpu')) document.getElementById('hardwareCpu').innerText = `${data.Processador.Nome || '--'} (${data.Processador.Nucleos || '--'}C / ${data.Processador.Threads || '--'}T)`;
                if (document.getElementById('hardwareRam')) document.getElementById('hardwareRam').innerText = `${data.Memoria.Fabricante || '--'} | ${data.Memoria.Total || '--'} GB | ${data.Memoria.Velocidade || '--'} MHz`;
                if (document.getElementById('hardwareGpu')) document.getElementById('hardwareGpu').innerText = `${data.GPU.Nome || '--'} | ${data.GPU.VRAM || '--'} GB | ${data.GPU.Resolucao || '--'}`;
                if (document.getElementById('hardwareMotherboard')) document.getElementById('hardwareMotherboard').innerText = data.PlacaMae || '--';
                if (document.getElementById('hardwareOS')) document.getElementById('hardwareOS').innerText = data.Sistema.OS || '--';

                if (document.getElementById('valNetStatus')) document.getElementById('valNetStatus').innerText = data.Rede.Status || '--';
                if (document.getElementById('valNetSpeed')) document.getElementById('valNetSpeed').innerText = 'Download: ' + (data.Rede.Velocidade || '--');
                
                // --- UPTIME ---
                const uptimeStr = data.Sistema.Uptime || '';
                const dMatch = uptimeStr.match(/(\d+)\s*dias?/);
                const hMatch = uptimeStr.match(/(\d+)\s*horas?/);
                const d = dMatch ? parseInt(dMatch[1]) : 0;
                const h = hMatch ? parseInt(hMatch[1]) : 0;
                const totalHours = (d * 24) + h;
                const uptimePercent = Math.min((totalHours / 168) * 100, 100); 
                
                let uptimeColor = '#34d399'; 
                if (uptimePercent > 50) uptimeColor = '#fbbf24'; 
                if (uptimePercent > 80) uptimeColor = '#ef4444'; 

                if (document.getElementById('valUptime')) document.getElementById('valUptime').innerText = uptimeStr || '--';

                if (uptimeChart) { uptimeChart.destroy(); }
                if (document.querySelector("#uptimeChart")) {
                    uptimeChart = new ApexCharts(document.querySelector("#uptimeChart"), {
                        series: [uptimePercent],
                        chart: { 
                            type: 'radialBar', 
                            width: '100%', 
                            height: 140, 
                            sparkline: { enabled: true },
                            redrawOnParentResize: true,
                            redrawOnWindowResize: true
                        },
                        colors: [uptimeColor],
                        plotOptions: {
                            radialBar: {
                                offsetY: 0,
                                startAngle: -90, 
                                endAngle: 90, 
                                hollow: { size: '68%' },
                                track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                                dataLabels: { show: false }
                            }
                        }, 
                        stroke: { lineCap: 'round' },
                        responsive: [
                            {
                                breakpoint: 1440,
                                options: {
                                    plotOptions: {
                                        radialBar: {
                                            hollow: { size: '64%' }
                                        }
                                    }
                                }
                            },
                            {
                                breakpoint: 1200,
                                options: {
                                    plotOptions: {
                                        radialBar: {
                                            hollow: { size: '60%' }
                                        }
                                    }
                                }
                            }
                        ]
                    });
                    uptimeChart.render();
                }

                // === SENSORES TÉRMICOS ===
                // Helper: resolve cor, status e percentual de uma temperatura (escala 0 a 100°C)
                function resolveTempStyle(tempStr) {
                    if (!tempStr || tempStr === 'N/A') {
                        return { color: '#4b5563', status: 'Indisponível', pct: 0, isNA: true, display: 'N/A' };
                    }
                    const val = parseFloat(tempStr.replace('°C', '').trim()) || 0;
                    const pct = Math.min(Math.round((val / 100) * 100), 100); // escala 0–100 °C
                    let color, status;
                    if (val > 75) {
                        color = '#ef4444'; status = 'Elevado'; // Acima de 75°C
                    } else if (val >= 50) {
                        color = '#fbbf24'; status = 'Médio';   // Entre 50°C e 75°C
                    } else {
                        color = '#2dd4bf'; status = 'Normal';  // Abaixo de 50°C
                    }
                    return { color, status, pct, isNA: false, display: `${Math.round(val)} °C` };
                }

                // --- TEMP CPU ---
                const tempStr = data.Processador.Temp || 'N/A';
                const cpuStyle = resolveTempStyle(tempStr);

                const valCpuTempEl = document.getElementById('valCpuTemp');
                const valCpuStatusEl = document.getElementById('valCpuTempStatus');
                if (valCpuTempEl) { valCpuTempEl.innerText = cpuStyle.display; valCpuTempEl.style.color = cpuStyle.color; }
                if (valCpuStatusEl) { valCpuStatusEl.innerText = cpuStyle.status; valCpuStatusEl.style.color = cpuStyle.color; }

                if (tempChart) { tempChart.destroy(); }
                const tempChartEl = document.querySelector('#tempChart');
                if (tempChartEl) {
                    tempChart = new ApexCharts(tempChartEl, {
                        series: [cpuStyle.pct],
                        chart: {
                            type: 'radialBar',
                            width: '100%',
                            height: '100%',
                            sparkline: { enabled: true },
                            parentHeightOffset: 0,
                            redrawOnParentResize: true,
                            redrawOnWindowResize: true,
                            animations: { enabled: false }
                        },
                        colors: [cpuStyle.color],
                        plotOptions: {
                            radialBar: {
                                startAngle: -90,
                                endAngle: 90,
                                offsetY: 0,
                                hollow: { size: '62%' },
                                track: {
                                    background: cpuStyle.isNA ? 'rgba(75,85,99,0.2)' : 'rgba(255,255,255,0.06)',
                                    strokeWidth: '100%'
                                },
                                dataLabels: { show: false }
                            }
                        },
                        stroke: { lineCap: 'round' }
                    });
                    tempChart.render();
                }

                // --- TEMP DISCO ---
                const dTempStr = data.Processador.TempDisco || 'N/A';
                const diskStyle = resolveTempStyle(dTempStr);

                const valDiskTempEl = document.getElementById('valDiskTemp');
                const valDiskStatusEl = document.getElementById('valDiskTempStatus');
                if (valDiskTempEl) { valDiskTempEl.innerText = diskStyle.display; valDiskTempEl.style.color = diskStyle.color; }
                if (valDiskStatusEl) { valDiskStatusEl.innerText = diskStyle.status; valDiskStatusEl.style.color = diskStyle.color; }

                if (diskTempChart) { diskTempChart.destroy(); }
                const diskTempChartEl = document.querySelector('#diskTempChart');
                if (diskTempChartEl) {
                    diskTempChart = new ApexCharts(diskTempChartEl, {
                        series: [diskStyle.pct],
                        chart: {
                            type: 'radialBar',
                            width: '100%',
                            height: '100%',
                            sparkline: { enabled: true },
                            parentHeightOffset: 0,
                            redrawOnParentResize: true,
                            redrawOnWindowResize: true,
                            animations: { enabled: false }
                        },
                        colors: [diskStyle.color],
                        plotOptions: {
                            radialBar: {
                                startAngle: -90,
                                endAngle: 90,
                                offsetY: 0,
                                hollow: { size: '62%' },
                                track: {
                                    background: diskStyle.isNA ? 'rgba(75,85,99,0.2)' : 'rgba(255,255,255,0.06)',
                                    strokeWidth: '100%'
                                },
                                dataLabels: { show: false }
                            }
                        },
                        stroke: { lineCap: 'round' }
                    });
                    diskTempChart.render();
                }
                
                if (document.getElementById('radCpuVal')) document.getElementById('radCpuVal').innerText = cpuVal + '%';
                if (document.getElementById('radRamVal')) document.getElementById('radRamVal').innerText = ramVal + '%';
                if (document.getElementById('radDiskVal')) document.getElementById('radDiskVal').innerText = diskVal + '%';
                if (sysChart) sysChart.updateSeries([cpuVal, ramVal, diskVal], false);

                const health = data.Saude || {};
                const healthIssues = Array.isArray(health.Problemas) ? health.Problemas : (health.Problemas ? [health.Problemas] : []);
                const healthWarnings = Array.isArray(health.Avisos) ? health.Avisos : (health.Avisos ? [health.Avisos] : []);
                const healthStatus = document.getElementById('healthStatus');
                const healthDetails = document.getElementById('healthDetails');
                const recommendationText = document.getElementById('healthRecommendationText');
                const recommendationStatus = document.getElementById('healthRecommendationStatus');
                
                if (healthStatus) {
                    healthStatus.className = 'health-status ' + (healthIssues.length ? 'health-danger' : healthWarnings.length ? 'health-warning' : 'health-success');
                    healthStatus.innerText = health.Status || 'SISTEMA SAUDÁVEL';
                }
                if (healthDetails) healthDetails.innerHTML = '';

                let recommendation = 'O sistema está estável. Execute um novo diagnóstico periodicamente para acompanhar a saúde do computador.';
                if (healthIssues.length) recommendation = 'Há problemas críticos. Execute o Reparo Profundo para verificar e restaurar componentes do Windows.';
                else if (healthWarnings.length) recommendation = 'Há alertas de desempenho ou manutenção. Use Otimizar SO para limpar e atualizar o sistema.';
                
                if (recommendationText) recommendationText.innerText = recommendation;
                const recommendationLevel = healthIssues.length ? 'danger' : healthWarnings.length ? 'warning' : 'success';
                
                if (recommendationStatus) {
                    recommendationStatus.className = 'health-status health-' + recommendationLevel;
                    recommendationStatus.innerText = 'RECOMENDAÇÃO';
                }
                if (recommendationText) recommendationText.className = 'health-item health-item-' + recommendationLevel;

                if (healthDetails) {
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
                }

                const systemErrors = Array.isArray(data.Erros) ? data.Erros : (data.Erros ? [data.Erros] : []);
                const errorsStatus = document.getElementById('errorsStatus');
                const errorsDetails = document.getElementById('errorsDetails');
                if (errorsStatus) {
                    errorsStatus.className = 'health-status ' + (systemErrors.length ? 'health-danger' : 'health-success');
                    errorsStatus.innerText = systemErrors.length ? `${systemErrors.length} evento(s) crítico(s) ou de erro` : 'NENHUM ERRO DETECTADO';
                }
                if (errorsDetails) {
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
                }

                const securityDetails = document.getElementById('securityDetails');
                if (securityDetails) {
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
                }

                const valDisksArea = document.getElementById('valDisksArea');
                if (valDisksArea) {
                    let disksHtml = '<table><tr><th>Drive</th><th>Uso</th><th>Livre</th><th>Total</th><th>Visual</th></tr>';
                    if (data.Discos && data.Discos.length > 0) {
                        data.Discos.forEach((d, index) => {
                            disksHtml += `<tr><td>${d.Drive}</td><td>${d.Uso}</td><td>${d.Livre}</td><td>${d.Total}</td><td><div class="disk-chart" id="diskChart${index}"></div></td></tr>`;
                        });
                    } else {
                        disksHtml += '<tr><td colspan="5">Nenhum disco detectado</td></tr>';
                    }
                    disksHtml += '</table>';
                    valDisksArea.innerHTML = disksHtml;
                    
                    diskCharts.forEach(chart => chart.destroy());
                    diskCharts = [];
                    (data.Discos || []).forEach((disk, index) => {
                        const diskUsage = parseFloat(String(disk.Uso || '0').replace('%', '').replace(',', '.')) || 0;
                        const diskChartElement = document.getElementById(`diskChart${index}`);
                        if (diskChartElement) {
                            const chart = new ApexCharts(diskChartElement, {
                                series: [diskUsage], chart: { type: 'radialBar', width: 34, height: 34, sparkline: { enabled: true } },
                                colors: ['#eab308'], plotOptions: { radialBar: { hollow: { size: '25%' }, track: { background: 'rgba(255,255,255,0.08)', strokeWidth: '100%' }, dataLabels: { show: false } } }, stroke: { lineCap: 'round' }
                            });
                            chart.render();
                            diskCharts.push(chart);
                        }
                    });
                }

                const valProcessesArea = document.getElementById('valProcessesArea');
                if (valProcessesArea) {
                    let procHtml = '<table><tr><th>Processo</th><th>PID</th><th>RAM (MB)</th></tr>';
                    if (data.Processos && data.Processos.length > 0) {
                        data.Processos.forEach(p => { procHtml += `<tr><td>${p.Nome}</td><td>${p.PID}</td><td>${p.RAM}</td></tr>`; });
                    } else {
                        procHtml += '<tr><td colspan="3">Nenhum processo detectado</td></tr>';
                    }
                    procHtml += '</table>';
                    valProcessesArea.innerHTML = procHtml;
                }

            } catch (err) {
                setStatus('error', 'Erro de Processamento', `Falha ao ler os dados do diagnóstico: ${err.message}`);
            }
        } else {
            setStatus('error', 'Dados Ausentes', 'Pacote de telemetria não encontrado. Execute o diagnóstico novamente.');
        }
    }

    if (btnCheckup) {
        btnCheckup.addEventListener('click', () => {
            setAppLockState(true, 'Diagnosticando o Sistema...');
            setStatus('action', 'Diagnóstico em Andamento', 'Coletando telemetria avançada... (Isso pode levar de 15 a 30 segundos).');

            const scriptPath = path.join(projectRoot, 'core', 'checkup.ps1');
            const command = `powershell.exe -NoProfile -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"${scriptPath}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
            
            exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                setAppLockState(false); 
                if (error) {
                    setStatus('error', 'Erro no Diagnóstico', `Ocorreu uma falha na execução ou permissão negada: ${error.message}`);
                    return;
                }
                setStatus('success', 'Diagnóstico Concluído', 'Painel de controle atualizado com sucesso.');
                updateDashboardUI(); 
            });
        });
    }

    if (btnFullMaintenance) {
        btnFullMaintenance.addEventListener('click', () => {
            setAppLockState(true, 'Executando Manutenção Completa...');
            setStatus('warning', 'Manutenção em Andamento', 'Executando limpeza, SFC e DISM. O computador pode apresentar lentidão temporária.');

            const psScriptPath = path.join(os.homedir(), 'checkup_manutencao_manual.ps1');
            const psScriptContent = [
                "ipconfig /flushdns | Out-Null",
                "Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue",
                "sfc /scannow",
                "DISM /Online /Cleanup-Image /RestoreHealth",
                "Optimize-Volume -DriveLetter C -ReTrim",
                "winget upgrade --all --silent --accept-package-agreements --accept-source-agreements"
            ].join('\n');
            fs.writeFileSync(psScriptPath, psScriptContent, 'utf8');

            const batContent = `@echo off\nchcp 65001 > nul\npowershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "${psScriptPath}"\n`;
            const tempBat = path.join(os.tmpdir(), 'RunMaintenanceTask.bat');
            fs.writeFileSync(tempBat, batContent, 'utf8');

            const command = `powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c \\"${tempBat}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
            
            exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                setAppLockState(false); 
                if (error) {
                    setStatus('error', 'Erro na Manutenção', `Falha ao executar rotina de reparo: ${error.message}`);
                    return;
                }
                setStatus('success', 'Manutenção Concluída', 'Rotinas de limpeza e reparo finalizadas com sucesso.');
            });
        });
    }

    function loadScheduledTasks() {
        if (!activeSchedulesDiv) return;
        if (fs.existsSync(scheduleStatePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(scheduleStatePath, 'utf8'));
                activeSchedulesDiv.innerHTML = `
                    <div class="schedule-tag">
                        <span>🚀 Todo dia ${data.dia} às ${data.hora}</span>
                        <button class="delete-btn" onclick="window.deleteSchedule()" title="Cancelar automação">✕</button>
                    </div>
                `;
            } catch(e) { activeSchedulesDiv.innerHTML = `<span class="schedule-empty">Nenhum agendamento ativo.</span>`; }
        } else {
            activeSchedulesDiv.innerHTML = `<span class="schedule-empty">Nenhum agendamento ativo.</span>`;
        }
    }

    window.deleteSchedule = () => {
        setAppLockState(true, 'Cancelando automação...');
        setStatus('action', 'Processando Cancelamento', 'Removendo tarefa agendada do Windows...');

        const batContent = `@echo off\nchcp 65001 > nul\nschtasks /delete /tn "CheckUP_Windows_Mensal" /f\n`;
        const tempBat = path.join(os.tmpdir(), 'DeleteCheckupTask.bat');
        fs.writeFileSync(tempBat, batContent, 'utf8');

        const command = `powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c \\"${tempBat}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
        exec(command, (error) => {
            setStatus('info', 'Automação Cancelada', 'A rotina mensal foi desativada e removida.');
            setAppLockState(false);
            if (fs.existsSync(scheduleStatePath)) { fs.unlinkSync(scheduleStatePath); }
            loadScheduledTasks(); 
        });
    };

    if (btnSchedule) {
        btnSchedule.addEventListener('click', () => {
            const day = document.getElementById('scheduleDay').value;
            const time = document.getElementById('scheduleTime').value;
            if (!time) return;

            setAppLockState(true, 'Solicitando permissão UAC...');
            setStatus('action', 'Agendando Tarefa', `Configurando execução para o dia ${day} às ${time}...`);

            const psScriptPath = path.join(os.homedir(), 'checkup_manutencao.ps1');
            const psScriptContent = [
                "ipconfig /flushdns | Out-Null",
                "Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue",
                "sfc /scannow",
                "DISM /Online /Cleanup-Image /RestoreHealth",
                "Optimize-Volume -DriveLetter C -ReTrim",
                "winget upgrade --all --silent --accept-package-agreements --accept-source-agreements"
            ].join('\n');
            fs.writeFileSync(psScriptPath, psScriptContent, 'utf8');
            
            const batContent = `@echo off\nchcp 65001 > nul\nschtasks /create /tn "CheckUP_Windows_Mensal" /tr "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"${psScriptPath}\\"" /sc MONTHLY /d ${day} /st ${time} /rl HIGHEST /ru SYSTEM /f\n`;
            const tempBat = path.join(os.tmpdir(), 'CreateCheckupTask.bat');
            fs.writeFileSync(tempBat, batContent, 'utf8');

            const command = `powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c \\"${tempBat}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
            exec(command, (error) => {
                if (error) {
                    setStatus('error', 'Falha no Agendamento', 'Permissão negada ou erro ao criar a tarefa.');
                } else {
                    setStatus('success', 'Automação Configurada', `Manutenção Geral rodará dia ${day} às ${time} em background.`);
                    const scheduleData = { dia: day, hora: time };
                    fs.writeFileSync(scheduleStatePath, JSON.stringify(scheduleData), 'utf8');
                }
                setAppLockState(false);
                loadScheduledTasks();
            });
        });
    }

    loadScheduledTasks();

// === RENDERIZAÇÃO DO HISTÓRICO (CPU/RAM + LINHA DO TEMPO DE ALERTAS) ===
    let cpuRamChart = null;
    let alertsChart = null;

    function parseHistoryData(raw) {
        // 1. Remove BOM e espaços vazios
        let clean = raw.replace(/^\uFEFF/, '').trim();

        // 2. Corrige junções malfeitas de múltiplos arrays: ][ ou ], [ -> ,
        clean = clean.replace(/\]\s*,?\s*\[/g, ',');
        
        // 3. Remove vírgulas antes de fechar array
        clean = clean.replace(/,\s*\]/g, ']');

        // 4. Garante encapsulamento em array []
        if (!clean.startsWith('[')) {
            clean = '[' + clean.replace(/,\s*$/, '') + ']';
        }

        try {
            return JSON.parse(clean);
        } catch (e) {
            // Fallback: extração manual de cada objeto JSON {...}
            const matches = clean.match(/\{[^{}]*\}/g);
            if (matches && matches.length > 0) {
                return matches.map(m => {
                    try { return JSON.parse(m); } catch (_) { return null; }
                }).filter(Boolean);
            }
            throw e;
        }
    }

    function formatHistoryDate(dateStr) {
        if (!dateStr) return '--';
        try {
            if (dateStr.includes('T')) {
                const d = new Date(dateStr);
                return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
            const parts = dateStr.trim().split(/\s+/);
            const datePart = parts[0];
            const timePart = parts[1] || '00:00';
            const tParts = timePart.split(':');
            const timeFormatted = `${tParts[0] || '00'}:${tParts[1] || '00'}`;

            if (datePart.includes('-')) {
                const dParts = datePart.split('-');
                if (dParts[0].length === 4) {
                    return `${dParts[2]}/${dParts[1]} ${timeFormatted}`;
                }
                return `${dParts[0]}/${dParts[1]} ${timeFormatted}`;
            }
            if (datePart.includes('/')) {
                const dParts = datePart.split('/');
                if (dParts[2] && dParts[2].length === 4) {
                    return `${dParts[0]}/${dParts[1]} ${timeFormatted}`;
                }
                return `${dParts[0]}/${dParts[1]} ${timeFormatted}`;
            }
            return dateStr;
        } catch (_) {
            return dateStr;
        }
    }

    function getAlertDiagnostics(item) {
        const reasons = [];
        const cpu = Number(item.CPU_Load) || 0;
        const ram = Number(item.RAM_Usage_Pct) || 0;
        const packetLoss = Number(item.Packet_Loss) || 0;
        const ping = Number(item.Ping_Avg_ms) || 0;
        const errosQtd = Number(item.Erros_Qtd) || 0;

        const isAlert = item.Status_Saude === "ALERTAS DE ATENÇÃO" || item.Status_Saude === "PROBLEMAS DETECTADOS" || cpu >= 80 || ram >= 80 || packetLoss > 0 || errosQtd > 0;

        if (errosQtd > 0) reasons.push(`🚨 ${errosQtd} Erro(s) de Sistema nas últimas 24h`);
        if (cpu >= 80) reasons.push(`🔥 Pico de CPU Crítico (${cpu}%)`);
        if (ram >= 80) reasons.push(`⚠️ Uso de Memória Elevado (${ram}%)`);
        if (packetLoss > 0) reasons.push(`📡 Perda de Pacotes de Rede (${packetLoss}%)`);
        if (ping >= 50) reasons.push(`⏱️ Latência Excessiva (${ping} ms)`);
        
        if (reasons.length === 0 && (item.Status_Saude === "ALERTAS DE ATENÇÃO" || item.Status_Saude === "PROBLEMAS DETECTADOS")) {
            reasons.push(`⚠️ Alerta de integridade/manutenção do Windows`);
        }

        const severity = isAlert ? Math.max(cpu, ram, errosQtd > 0 ? 90 : 80) : 0;

        return {
            isAlert,
            reasons,
            severity
        };
    }

    function loadAndRenderHistory() {
        const possiblePaths = [
            path.join(projectRoot, 'historico', 'historico_checkup.json'),
            path.join(projectRoot, 'core', 'historico', 'historico_checkup.json'),
            path.join(projectRoot, 'core', 'relatorios', 'historico_checkup.json'),
            path.join(projectRoot, 'historico_checkup.json')
        ];
        
        const historyPath = possiblePaths.find(p => fs.existsSync(p));
        const cpuRamEl = document.querySelector("#cpuRamChart");
        const alertsEl = document.querySelector("#pingHealthChart");
        
        if (!historyPath) {
            if (cpuRamEl) cpuRamEl.innerHTML = '<p style="color:#8a888c; text-align:center; padding-top:60px;">Arquivo de histórico não encontrado.</p>';
            if (alertsEl) alertsEl.innerHTML = '<p style="color:#8a888c; text-align:center; padding-top:60px;">Aguardando diagnósticos...</p>';
            return;
        }

        try {
            const rawData = fs.readFileSync(historyPath, 'utf8');
            let data = parseHistoryData(rawData);

            if (!Array.isArray(data) || data.length === 0) {
                if (cpuRamEl) cpuRamEl.innerHTML = '<p style="color:#8a888c; text-align:center; padding-top:60px;">Nenhum registro encontrado no histórico.</p>';
                return;
            }

            // Trava nos últimos 50 registros
            if (data.length > 50) {
                data = data.slice(-50);
            }

            const dates = [];
            const cpuData = [];
            const ramData = [];
            const alertSeverities = [];
            const barColors = [];
            const diagnosticsList = [];

            data.forEach(item => {
                const formattedDate = formatHistoryDate(item.DataHora);
                const diag = getAlertDiagnostics(item);

                dates.push(formattedDate);
                cpuData.push(Number(item.CPU_Load) || 0);
                ramData.push(Number(item.RAM_Usage_Pct) || 0);
                
                alertSeverities.push(diag.severity);
                barColors.push(diag.isAlert ? '#ef4444' : 'rgba(52, 211, 153, 0.25)');
                diagnosticsList.push(diag);
            });

            // 1. Gráfico Superior: CPU vs RAM
            const cpuRamOptions = {
                series: [
                    { name: 'Uso de CPU', data: cpuData },
                    { name: 'Uso de RAM', data: ramData }
                ],
                chart: {
                    type: 'area',
                    width: '100%',
                    height: '100%',
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent',
                    toolbar: { show: false },
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                    animations: { enabled: true, easing: 'easeinout' }
                },
                colors: ['#cf663f', '#a855f7'],
                fill: {
                    type: 'gradient',
                    gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.02, stops: [0, 100] }
                },
                dataLabels: { show: false },
                stroke: { curve: 'smooth', width: 2 },
                xaxis: {
                    categories: dates,
                    labels: { style: { colors: '#8a888c', fontSize: '11px' } },
                    tickAmount: 8
                },
                yaxis: {
                    min: 0,
                    max: 100,
                    labels: {
                        style: { colors: '#8a888c', fontSize: '11px' },
                        formatter: (val) => Math.round(val) + "%"
                    }
                },
                tooltip: {
                    theme: 'dark',
                    y: { formatter: (val) => (val !== undefined ? val.toFixed(1) + '%' : '--') }
                },
                theme: { mode: 'dark' },
                grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
                legend: {
                    position: 'top',
                    horizontalAlign: 'right',
                    labels: { colors: '#d7d9dd' }
                }
            };

            // 2. Gráfico Inferior: Linha do Tempo de Alertas
            const alertsOptions = {
                series: [{ name: 'Status', data: alertSeverities }],
                chart: {
                    type: 'bar',
                    width: '100%',
                    height: '100%',
                    fontFamily: 'Inter, sans-serif',
                    background: 'transparent',
                    toolbar: { show: false },
                    redrawOnParentResize: true,
                    redrawOnWindowResize: true,
                    animations: { enabled: true, easing: 'easeinout' }
                },
                plotOptions: {
                    bar: {
                        distributed: true,
                        borderRadius: 3,
                        columnWidth: '50%',
                        dataLabels: {
                            position: 'top'
                        }
                    }
                },
                colors: barColors,
                dataLabels: {
                    enabled: true,
                    formatter: function(val, opts) {
                        const dataPointIndex = opts && opts.dataPointIndex !== undefined ? opts.dataPointIndex : -1;
                        const diag = diagnosticsList[dataPointIndex];
                        if (diag && diag.isAlert && val > 0) {
                            return Math.round(val) + '%';
                        }
                        return '';
                    },
                    offsetY: -6,
                    style: {
                        fontSize: '10px',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 600,
                        colors: ['#ef4444']
                    },
                    background: {
                        enabled: false
                    }
                },
                xaxis: {
                    categories: dates,
                    labels: { style: { colors: '#8a888c', fontSize: '11px' } },
                    tickAmount: 8
                },
                yaxis: {
                    min: 0,
                    max: 100,
                    labels: { show: false }
                },
                grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 },
                legend: { show: false },
                tooltip: {
                    theme: 'dark',
                    custom: function({ series, seriesIndex, dataPointIndex }) {
                        const item = data[dataPointIndex];
                        const diag = diagnosticsList[dataPointIndex];
                        const dateFormatted = dates[dataPointIndex];
                        if (!item) return '';

                        if (diag.isAlert) {
                            const reasonsHtml = diag.reasons.map(r => `<div style="color: #fca5a5; font-size: 11px; margin-top: 3px;">• ${r}</div>`).join('');
                            return `
                                <div style="background: rgba(18, 16, 20, 0.96); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; padding: 12px 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); font-family: 'Inter', sans-serif; min-width: 220px; backdrop-filter: blur(10px);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 5px;">
                                        <span style="font-size: 11px; color: #a1a1aa; font-weight: 500;">${dateFormatted}</span>
                                        <span style="font-size: 10px; font-weight: 700; color: #fff; background: #ef4444; padding: 2px 6px; border-radius: 4px;">ALERTA</span>
                                    </div>
                                    <div style="font-size: 11px; font-weight: 600; color: #f4f4f5; margin-bottom: 4px;">Ocorrências Detectadas:</div>
                                    ${reasonsHtml}
                                    <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; font-size: 10px; color: #71717a;">
                                        <span>CPU: <strong style="color:#d4d4d8">${item.CPU_Load}%</strong></span>
                                        <span>RAM: <strong style="color:#d4d4d8">${item.RAM_Usage_Pct}%</strong></span>
                                        <span>Ping: <strong style="color:#d4d4d8">${item.Ping_Avg_ms}ms</strong></span>
                                    </div>
                                </div>
                            `;
                        } else {
                            return `
                                <div style="background: rgba(18, 16, 20, 0.96); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 10px; padding: 10px 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); font-family: 'Inter', sans-serif; min-width: 200px; backdrop-filter: blur(10px);">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 5px;">
                                        <span style="font-size: 11px; color: #a1a1aa; font-weight: 500;">${dateFormatted}</span>
                                        <span style="font-size: 10px; font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.15); padding: 2px 6px; border-radius: 4px;">ESTÁVEL</span>
                                    </div>
                                    <div style="font-size: 11px; color: #a7f3d0;">✅ Sistema Saudável (Sem anomalias)</div>
                                    <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; font-size: 10px; color: #71717a;">
                                        <span>CPU: <strong style="color:#d4d4d8">${item.CPU_Load}%</strong></span>
                                        <span>RAM: <strong style="color:#d4d4d8">${item.RAM_Usage_Pct}%</strong></span>
                                        <span>Ping: <strong style="color:#d4d4d8">${item.Ping_Avg_ms}ms</strong></span>
                                    </div>
                                </div>
                            `;
                        }
                    }
                }
            };

            if (cpuRamChart) cpuRamChart.destroy();
            if (alertsChart) alertsChart.destroy();

            if (cpuRamEl) {
                cpuRamEl.innerHTML = '';
                cpuRamChart = new ApexCharts(cpuRamEl, cpuRamOptions);
                cpuRamChart.render();
            }

            if (alertsEl) {
                alertsEl.innerHTML = '';
                alertsChart = new ApexCharts(alertsEl, alertsOptions);
                alertsChart.render();
            }

        } catch (err) {
            if (cpuRamEl) {
                cpuRamEl.innerHTML = `<p style="color:#fb7185; text-align:center; padding-top:50px;">Erro ao processar dados do histórico: ${err.message}</p>`;
            }
        }
    }

    if (btnCheckup) {
        btnCheckup.click();
    }
});