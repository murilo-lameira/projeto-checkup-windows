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
    btnCheckup = document.getElementById('btnCheckup');
    btnFullMaintenance = document.getElementById('btnFullMaintenance');
    btnSchedule = document.getElementById('btnSchedule');
    logArea = document.getElementById('logArea');
    
    const activeSchedulesDiv = document.getElementById('activeSchedules');

    const radialOptions = {
        series: [0, 0, 0],
        labels: ['CPU', 'RAM', 'Disco (C:)'],
        chart: {
            height: 260, 
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
                offsetY: -10, 
                hollow: { size: '30%' },
                track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                dataLabels: {
                    name: { show: false },
                    value: { show: false },
                    total: {
                        show: true,
                        label: 'AVG',
                        color: '#70747b',
                        fontSize: '22px',
                        fontWeight: 600,
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
            height: 70,
            type: 'area', 
            sparkline: { enabled: true },
            parentHeightOffset: 0,
            animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 500 } }
        },
        colors: ['#2dd4bf'], 
        stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
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
                        // Tamanho aumentado para preencher o card
                        chart: { type: 'radialBar', width: 280, height: 260, sparkline: { enabled: true } },
                        colors: [uptimeColor],
                        plotOptions: {
                            radialBar: {
                                offsetY: -10,
                                startAngle: -90, endAngle: 90, hollow: { size: '65%' },
                                track: { background: 'rgba(255,255,255,0.05)', strokeWidth: '100%' },
                                dataLabels: { show: false }
                            }
                        }, stroke: { lineCap: 'round' }
                    });
                    uptimeChart.render();
                }

                // --- TEMP CPU ---
                const tempStr = data.Processador.Temp || 'N/A';
                if (document.getElementById('valCpuTemp')) document.getElementById('valCpuTemp').innerText = tempStr;
                let tempVal = 0;
                if (tempStr !== 'N/A') { tempVal = parseFloat(tempStr.replace('°C', '').trim()) || 0; }

                if (tempChart) { tempChart.destroy(); }
                const tempChartEl = document.querySelector("#tempChart");
                if (tempChartEl) {
                    tempChart = new ApexCharts(tempChartEl, {
                        series: [tempVal], chart: { type: 'radialBar', width: 55, height: 55, sparkline: { enabled: true } },
                        colors: [tempVal > 75 ? '#ef4444' : '#fbbf24'],
                        plotOptions: { radialBar: { hollow: { size: '35%' }, track: { background: 'rgba(255,255,255,0.08)', strokeWidth: '100%' }, dataLabels: { show: false }, max: 100 } }, stroke: { lineCap: 'round' }
                    });
                    tempChart.render();
                }
                
                // --- TEMP DISCO ---
                const dTempStr = data.Processador.TempDisco || 'N/A';
                if (document.getElementById('valDiskTemp')) document.getElementById('valDiskTemp').innerText = dTempStr;
                let dTempVal = 0;
                if (dTempStr !== 'N/A') { dTempVal = parseFloat(dTempStr.replace('°C', '').trim()) || 0; }

                if (diskTempChart) { diskTempChart.destroy(); }
                const diskTempChartEl = document.querySelector("#diskTempChart");
                if (diskTempChartEl) {
                    diskTempChart = new ApexCharts(diskTempChartEl, {
                        // Dimensões corrigidas para igualar à CPU
                        series: [dTempVal], chart: { type: 'radialBar', width: 55, height: 55, sparkline: { enabled: true } },
                        colors: [dTempVal > 55 ? '#ef4444' : '#2dd4bf'], 
                        plotOptions: { radialBar: { hollow: { size: '35%' }, track: { background: 'rgba(255,255,255,0.08)', strokeWidth: '100%' }, dataLabels: { show: false }, max: 100 } }, stroke: { lineCap: 'round' }
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
            const command = `powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File "${scriptPath}"`;
            
            exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                setAppLockState(false); 
                if (error) {
                    setStatus('error', 'Erro no Diagnóstico', `Ocorreu uma falha na execução: ${error.message}`);
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

    if (btnCheckup) {
        btnCheckup.click();
    }
});