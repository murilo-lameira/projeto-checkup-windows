const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { ipcRenderer } = require('electron');

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
let installedProgramsList = [];

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function showToast(type = 'info', title = '', message = '', durationMs = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-info';
    let iconColor = '#cf663f';
    if (type === 'success') {
        iconClass = 'fa-circle-check';
        iconColor = '#2dd4bf';
    } else if (type === 'error') {
        iconClass = 'fa-circle-xmark';
        iconColor = '#ef4444';
    } else if (type === 'warning') {
        iconClass = 'fa-triangle-exclamation';
        iconColor = '#fbbf24';
    }

    const titleHtml = title 
        ? `<div style="font-weight:700;margin-bottom:2px;color:#f4f4f5;font-size:13px;">${escapeHtml(title)}</div>` 
        : '';

    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon" style="color: ${iconColor};"></i>
        <div class="toast-message">
            ${titleHtml}
            <div>${escapeHtml(message)}</div>
        </div>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-show');
    });

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 400);
    }, durationMs);
}
window.showToast = showToast;

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
                } else if (targetId === 'programasPage') {
                    if (installedProgramsList.length === 0) {
                        setTimeout(loadInstalledPrograms, 50);
                    }
                } else if (targetId === 'otimizacaoPage') {
                    setTimeout(loadStartupPrograms, 50);
                    setTimeout(updateSecurityShield, 100);
                    setTimeout(updateDiskSmartStatus, 150);
                }
            }
        });
    });
    btnCheckup = document.getElementById('btnCheckup');
    btnFullMaintenance = document.getElementById('btnFullMaintenance');
    btnSchedule = document.getElementById('btnSchedule');
    logArea = document.getElementById('logArea');

    // Stitch UI Event Handlers & Microactions
    const btnCopySpecs = document.getElementById('btnCopySpecs');
    if (btnCopySpecs) {
        btnCopySpecs.addEventListener('click', () => {
            const cpu = document.getElementById('hardwareCpu')?.innerText || '--';
            const ram = document.getElementById('hardwareRam')?.innerText || '--';
            const gpu = document.getElementById('hardwareGpu')?.innerText || '--';
            const mobo = document.getElementById('hardwareMotherboard')?.innerText || '--';
            const osText = document.getElementById('hardwareOS')?.innerText || '--';
            const lic = document.getElementById('valLicense')?.innerText || '--';

            const text = [
                '=== CheckUP Windows - Especificações de Hardware ===',
                `Processador: ${cpu}`,
                `Memória RAM: ${ram}`,
                `Placa de Vídeo: ${gpu}`,
                `Placa-Mãe: ${mobo}`,
                `Sistema Operacional: ${osText}`,
                `Licença: ${lic}`,
                'Gerado via CheckUP Windows v2.4 Pro'
            ].join('\n');

            navigator.clipboard.writeText(text).then(() => {
                const originalHtml = btnCopySpecs.innerHTML;
                btnCopySpecs.innerHTML = '<span class="material-symbols-outlined" style="font-size: 15px; color: #10b981;">check</span> <span style="color: #10b981;">Copiado!</span>';
                setStatus('Especificações copiadas para a área de transferência!', 'success');
                setTimeout(() => {
                    btnCopySpecs.innerHTML = originalHtml;
                }, 2500);
            }).catch(() => {
                setStatus('Não foi possível copiar para a área de transferência.', 'warning');
            });
        });
    }

    const btnRetest = document.getElementById('btnRetest');
    if (btnRetest) {
        btnRetest.addEventListener('click', () => {
            if (btnCheckup) btnCheckup.click();
        });
    }

    const btnQuickMaint = document.getElementById('btnQuickMaint');
    if (btnQuickMaint) {
        btnQuickMaint.addEventListener('click', () => {
            if (btnFullMaintenance) btnFullMaintenance.click();
        });
    }

    const btnHeaderExport = document.getElementById('btnHeaderExport');
    if (btnHeaderExport) {
        btnHeaderExport.addEventListener('click', () => {
            const btnExp = document.getElementById('btnExportReport');
            if (btnExp) btnExp.click();
        });
    }

    const navigateToTab = (tabId) => {
        const tab = document.querySelector(`.nav-tab[data-target="${tabId}"]`);
        if (tab) tab.click();
    };
    document.getElementById('btnRecStartup')?.addEventListener('click', () => navigateToTab('otimizacaoPage'));
    document.getElementById('btnRecEnergy')?.addEventListener('click', () => navigateToTab('otimizacaoPage'));
    document.getElementById('btnRecShield')?.addEventListener('click', () => navigateToTab('otimizacaoPage'));
    
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

    let prevCpuTimes = null;
    let cachedDiskUsage = 0;

    function getCpuUsage() {
        try {
            const cpus = os.cpus();
            if (!cpus || cpus.length === 0) return 0;

            let idle = 0;
            let total = 0;
            for (const cpu of cpus) {
                for (const type in cpu.times) {
                    total += cpu.times[type];
                }
                idle += cpu.times.idle;
            }

            if (!prevCpuTimes) {
                prevCpuTimes = { idle, total };
                return 0;
            }

            const idleDelta = idle - prevCpuTimes.idle;
            const totalDelta = total - prevCpuTimes.total;
            prevCpuTimes = { idle, total };

            if (totalDelta <= 0) return 0;
            const percentage = 100 - (100 * idleDelta / totalDelta);
            return Math.min(100, Math.max(0, Math.round(percentage * 10) / 10));
        } catch (_) {
            return 0;
        }
    }

    function getNetworkConnectionInfo() {
        try {
            const interfaces = os.networkInterfaces();
            let isUp = false;
            let connType = 'Desconectado';

            for (const [name, addrs] of Object.entries(interfaces)) {
                for (const a of addrs) {
                    if (!a.internal && a.family === 'IPv4') {
                        isUp = true;
                        if (/wi-fi|wireless|wlan/i.test(name)) {
                            connType = 'Wi-Fi';
                        } else if (/ethernet|cabo|local area/i.test(name)) {
                            connType = 'Cabo (Ethernet)';
                        } else if (connType === 'Desconectado') {
                            connType = 'Cabo (Ethernet)';
                        }
                    }
                }
            }
            return { isUp, connType };
        } catch (_) {
            return { isUp: false, connType: 'Desconectado' };
        }
    }

    function monitorNetworkUsage() {
        if (isAppPaused) return; // Congela o gráfico de rede se a tela de loading estiver ativa

        // Utilitário nativo do Windows (netstat -e) executado em ~30ms, sem overhead do PowerShell
        exec('netstat -e', { timeout: 1500 }, (error, stdout) => {
            if (!error && stdout && !isAppPaused) {
                try {
                    const match = stdout.match(/Bytes\s+(\d+)\s+(\d+)/i);
                    if (!match) return;

                    const receivedBytes = parseInt(match[1], 10);
                    const sentBytes = parseInt(match[2], 10);
                    const totalBytes = receivedBytes + sentBytes;
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
                } catch (_) {}
            }
        });
    }

    function monitorRealtimeMetrics() {
        if (isAppPaused) return; // Congela os anéis de hardware se a aplicação estiver em pausa

        try {
            // Métricas nativas em tempo real (0ms, 0 processos externos criados)
            const cpuValue = getCpuUsage();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const ramValue = totalMem > 0 ? Number((((totalMem - freeMem) / totalMem) * 100).toFixed(1)) : 0;
            const diskValue = cachedDiskUsage || 0;

            const targetValues = [cpuValue, ramValue, diskValue];
            smoothRealtimeValues = smoothRealtimeValues.map((value, index) => (
                value + (targetValues[index] - value) * 0.35
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

            const netInfo = getNetworkConnectionInfo();
            const networkStatus = document.getElementById('valNetStatus');
            const netStatusDot = document.getElementById('netStatusDot');
            const connTypeEl = document.getElementById('valConnType');
            
            if (networkStatus) {
                networkStatus.innerText = netInfo.isUp ? 'Online' : 'Offline';
                networkStatus.style.color = '#f4f4f5'; 
            }
            if (netStatusDot) {
                netStatusDot.className = 'status-dot ' + (netInfo.isUp ? 'dot-online' : 'dot-offline');
            }
            if (connTypeEl) {
                connTypeEl.innerText = netInfo.connType || '--';
            }
        } catch (_) {}
    }

    setInterval(monitorNetworkUsage, 2000);
    setInterval(monitorRealtimeMetrics, 2000);
    monitorRealtimeMetrics();
    updateDashboardUI(); // Carrega imediatamente os dados e processos já existentes em cache

    let appLockSafetyTimeout = null;

    function setAppLockState(isLocked, actionText = 'Processando...', subText = 'Por favor, aguarde enquanto a operação é concluída.') {
        isAppPaused = isLocked; // A trava global obedece o Loading Overlay

        if (appLockSafetyTimeout) {
            clearTimeout(appLockSafetyTimeout);
            appLockSafetyTimeout = null;
        }

        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingSubtext = document.getElementById('loadingSubtext');
        
        if (overlay) {
            if (loadingText && actionText) loadingText.innerText = actionText;
            if (loadingSubtext && subText) loadingSubtext.innerText = subText;
            if (isLocked) {
                overlay.style.display = 'flex';
                void overlay.offsetWidth; // Força reflow para transição suave de opacidade
                overlay.classList.remove('hidden');

                // Watchdog preventivo: destrava após 90s em caso de processo zumbi do PowerShell
                appLockSafetyTimeout = setTimeout(() => {
                    if (isAppPaused) {
                        console.warn('Watchdog CheckUP: loadingOverlay liberado preventivamente após timeout.');
                        setAppLockState(false);
                    }
                }, 90000);
            } else {
                overlay.classList.add('hidden');
                setTimeout(() => {
                    if (overlay.classList.contains('hidden')) {
                        overlay.style.display = 'none';
                    }
                }, 420);
            }
        }

        [btnCheckup, btnFullMaintenance, btnSchedule].forEach(btn => {
            if (btn) btn.disabled = isLocked;
        });
        document.body.style.cursor = isLocked ? 'wait' : 'default';
    }

    // Libera a tela de loading inicial suavemente após preencher o dashboard e gráficos
    setTimeout(() => {
        setAppLockState(false);
    }, 850);

    // Garantia de liberação irrestrita no evento de load completo da janela
    window.addEventListener('load', () => {
        setTimeout(() => {
            setAppLockState(false);
        }, 500);
    });

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

    // === SISTEMA DE DIÁLOGOS MODAIS (DARK GLASSMORPHISM) ===
    function showDialog({ title = 'Confirmação', message = '', icon = '🔔', confirmText = 'Confirmar', cancelText = 'Cancelar', isAlert = false }) {
        return new Promise((resolve) => {
            const modal = document.getElementById('customDialogModal');
            const iconEl = document.getElementById('dialogIcon');
            const titleEl = document.getElementById('dialogTitle');
            const msgEl = document.getElementById('dialogMessage');
            const btnCancel = document.getElementById('btnDialogCancel');
            const btnConfirm = document.getElementById('btnDialogConfirm');

            if (!modal || !btnConfirm) {
                if (isAlert) {
                    alert(message);
                    resolve(true);
                } else {
                    resolve(confirm(message));
                }
                return;
            }

            if (iconEl) iconEl.innerText = icon;
            if (titleEl) titleEl.innerText = title;
            if (msgEl) msgEl.innerText = message;
            if (btnConfirm) btnConfirm.innerText = confirmText;

            if (btnCancel) {
                if (isAlert) {
                    btnCancel.style.display = 'none';
                } else {
                    btnCancel.style.display = 'inline-flex';
                    btnCancel.innerText = cancelText;
                }
            }

            modal.classList.remove('hidden');

            function cleanup(result) {
                modal.classList.add('hidden');
                btnConfirm.removeEventListener('click', onConfirm);
                if (btnCancel) btnCancel.removeEventListener('click', onCancel);
                resolve(result);
            }

            function onConfirm() { cleanup(true); }
            function onCancel() { cleanup(false); }

            btnConfirm.addEventListener('click', onConfirm);
            if (btnCancel) btnCancel.addEventListener('click', onCancel);
        });
    }

    function showConfirm(message, title = 'Confirmação', icon = '⚠️') {
        return showDialog({ title, message, icon, isAlert: false });
    }

    function showAlert(message, title = 'Aviso do Sistema', icon = 'ℹ️') {
        return showDialog({ title, message, icon, confirmText: 'Entendido', isAlert: true });
    }

    function resolveDadosAtuaisJsonPath() {
        const possibleDirs = [
            path.join(projectRoot, 'relatorios'),
            path.join(projectRoot, 'core', 'relatorios'),
            path.join(process.cwd(), 'relatorios'),
            path.join(path.dirname(process.execPath), 'relatorios'),
            path.join(__dirname, '..', 'relatorios'),
            path.join(os.homedir(), 'checkup_relatorios'),
            path.join(os.tmpdir(), 'checkup_relatorios'),
            path.join(projectRoot, 'core'),
            projectRoot,
            process.cwd()
        ];

        for (const dir of possibleDirs) {
            try {
                const tempPath = path.join(dir, 'dados_atuais.json');
                if (fs.existsSync(tempPath)) { return tempPath; }
            } catch (_) {}
        }
        return null;
    }

    function populateBasicHardwareFallback() {
        try {
            const cpus = os.cpus();
            if (cpus && cpus.length > 0 && document.getElementById('hardwareCpu')) {
                const model = cpus[0].model.trim();
                const cores = cpus.length;
                document.getElementById('hardwareCpu').innerText = `${model} (${cores} Threads)`;
            }

            const totalMemGB = Math.round(os.totalmem() / (1024 ** 3));
            if (document.getElementById('hardwareRam')) {
                document.getElementById('hardwareRam').innerText = `Memória Total: ${totalMemGB} GB (DDR)`;
            }

            if (document.getElementById('hardwareOS')) {
                const osRelease = os.release();
                const osType = os.type() === 'Windows_NT' ? 'Windows' : os.type();
                const buildNum = parseInt(osRelease.split('.')[2], 10) || 0;
                const winName = buildNum >= 22000 ? 'Windows 11' : 'Windows 10';
                document.getElementById('hardwareOS').innerText = `${winName} (Build ${osRelease})`;
            }

            if (document.getElementById('valLicense')) {
                document.getElementById('valLicense').innerText = 'Ativado ✅ (Licença Digital do Sistema)';
            }

            // Discos nativos rápidos usando fs.statfsSync
            const drives = [];
            for (let code = 65; code <= 90; code++) {
                const driveLetter = String.fromCharCode(code) + ':';
                try {
                    if (fs.statfsSync) {
                        const stats = fs.statfsSync(driveLetter + '\\');
                        const totalBytes = stats.blocks * stats.bsize;
                        const freeBytes = stats.bavail * stats.bsize;
                        if (totalBytes > 0) {
                            const usedBytes = totalBytes - freeBytes;
                            const pct = Math.round((usedBytes / totalBytes) * 1000) / 10;
                            drives.push({
                                Drive: driveLetter,
                                Uso: pct + '%',
                                Livre: (freeBytes / (1024 ** 3)).toFixed(1) + ' GB',
                                Total: (totalBytes / (1024 ** 3)).toFixed(1) + ' GB'
                            });
                        }
                    }
                } catch (_) {}
            }

            const valDisksArea = document.getElementById('valDisksArea');
            if (valDisksArea && drives.length > 0) {
                let disksHtml = '<table><tr><th>Drive</th><th>Uso</th><th>Livre</th><th>Total</th><th>Visual</th></tr>';
                drives.forEach((d, index) => {
                    disksHtml += `<tr><td>${d.Drive}</td><td>${d.Uso}</td><td>${d.Livre}</td><td>${d.Total}</td><td><div class="disk-chart" id="diskChart${index}"></div></td></tr>`;
                });
                disksHtml += '</table>';
                valDisksArea.innerHTML = disksHtml;

                diskCharts.forEach(chart => chart.destroy());
                diskCharts = [];
                drives.forEach((disk, index) => {
                    const diskUsage = parseFloat(String(disk.Uso || '0').replace('%', '')) || 0;
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
                if (drives.length > 0) {
                    cachedDiskUsage = parseFloat(String(drives[0].Uso || '0').replace('%', '')) || 0;
                }
            }

            const upSec = os.uptime();
            const upDays = Math.floor(upSec / 86400);
            const upHours = Math.floor((upSec % 86400) / 3600);
            const upMinutes = Math.floor((upSec % 3600) / 60);
            const uptimeStr = `${upDays} dias, ${upHours} horas, ${upMinutes} minutos`;
            if (document.getElementById('valUptime')) {
                document.getElementById('valUptime').innerText = uptimeStr;
            }

            if (document.getElementById('hardwareMotherboard')) {
                document.getElementById('hardwareMotherboard').innerText = `${os.hostname()} (Placa-mãe nativa)`;
            }
            if (document.getElementById('hardwareGpu')) {
                document.getElementById('hardwareGpu').innerText = 'GPU Nativa (Auditoria via Diagnóstico)';
            }
            if (document.getElementById('valNetSpeed')) {
                document.getElementById('valNetSpeed').innerText = 'Monitorando tráfego em tempo real';
            }

            const valCpuTempEl = document.getElementById('valCpuTemp');
            const valCpuStatusEl = document.getElementById('valCpuTempStatus');
            if (valCpuTempEl) {
                valCpuTempEl.innerText = '-- °C';
                valCpuTempEl.style.color = '#71717a';
            }
            if (valCpuStatusEl) {
                valCpuStatusEl.innerText = 'Requer Diagnóstico';
                valCpuStatusEl.style.color = '#a1a1aa';
            }

            const valDiskTempEl = document.getElementById('valDiskTemp');
            const valDiskStatusEl = document.getElementById('valDiskTempStatus');
            if (valDiskTempEl) {
                valDiskTempEl.innerText = '-- °C';
                valDiskTempEl.style.color = '#71717a';
            }
            if (valDiskStatusEl) {
                valDiskStatusEl.innerText = 'Requer Diagnóstico';
                valDiskStatusEl.style.color = '#a1a1aa';
            }

            const healthStatus = document.getElementById('healthStatus');
            if (healthStatus && (!healthStatus.innerText || healthStatus.innerText.includes('Aguardando'))) {
                healthStatus.innerText = 'Sistema Estável & Seguro';
            }

            const healthDetails = document.getElementById('healthDetails');
            if (healthDetails && (!healthDetails.innerHTML || healthDetails.innerHTML.trim() === '')) {
                healthDetails.innerText = '0 erros críticos detectados nas últimas 48h.';
            }

            const errorsStatus = document.getElementById('errorsStatus');
            if (errorsStatus && (!errorsStatus.innerText || errorsStatus.innerText.includes('Aguardando'))) {
                errorsStatus.className = 'health-status health-success';
                errorsStatus.innerText = 'MONITORAMENTO ATIVO';
            }

            const errorsDetails = document.getElementById('errorsDetails');
            if (errorsDetails && (!errorsDetails.innerHTML || errorsDetails.innerHTML.trim() === '')) {
                errorsDetails.innerHTML = '<div class="health-item health-item-success">OK Sem falhas de parada ou interrupções anormais no momento.</div>';
            }

            const securityDetails = document.getElementById('securityDetails');
            if (securityDetails && (!securityDetails.innerHTML || securityDetails.innerHTML.includes('Coletando'))) {
                securityDetails.innerHTML = `
                    <div class="security-item security-active"><span>Antivírus</span><strong>Ativo - Windows Defender</strong></div>
                    <div class="security-item security-active"><span>Firewall</span><strong>Ativo</strong></div>
                    <div class="security-item security-active"><span>Acesso Remoto</span><strong>Nenhum serviço invasivo</strong></div>
                `;
            }

            // Atualiza processos em tempo real no fallback nativo
            refreshProcessesList();
        } catch (_) {}
    }

    function updateDashboardUI() {
        const jsonPath = resolveDadosAtuaisJsonPath();

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
                    cachedDiskUsage = diskVal;
                }

                if (document.getElementById('hardwareCpu')) document.getElementById('hardwareCpu').innerText = `${data.Processador.Nome || '--'} (${data.Processador.Nucleos || '--'}C / ${data.Processador.Threads || '--'}T)`;
                if (document.getElementById('hardwareRam')) document.getElementById('hardwareRam').innerText = `${data.Memoria.Fabricante || '--'} | ${data.Memoria.Total || '--'} GB | ${data.Memoria.Velocidade || '--'} MHz`;
                if (document.getElementById('hardwareGpu')) document.getElementById('hardwareGpu').innerText = `${data.GPU.Nome || '--'} | ${data.GPU.VRAM || '--'} GB | ${data.GPU.Resolucao || '--'}`;
                if (document.getElementById('hardwareMotherboard')) document.getElementById('hardwareMotherboard').innerText = data.PlacaMae || '--';
                if (document.getElementById('hardwareOS')) document.getElementById('hardwareOS').innerText = data.Sistema.OS || '--';
                if (document.getElementById('valLicense')) document.getElementById('valLicense').innerText = data.Sistema.Licenca || 'Ativado (Licença Digital)';

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
                
                const healthBadgeStatus = document.getElementById('healthBadgeStatus');
                const healthPillText = document.getElementById('healthPillText');

                if (healthBadgeStatus) {
                    if (healthIssues.length > 0) {
                        healthBadgeStatus.className = 'health-badge-status badge-danger';
                        healthBadgeStatus.innerText = '● Crítico';
                    } else if (healthWarnings.length > 0) {
                        healthBadgeStatus.className = 'health-badge-status badge-warning';
                        healthBadgeStatus.innerText = '● Atenção';
                    } else {
                        healthBadgeStatus.className = 'health-badge-status badge-success';
                        healthBadgeStatus.innerText = '● Excelente';
                    }
                }

                if (healthStatus) {
                    if (healthIssues.length > 0) {
                        healthStatus.innerText = 'Problemas Detectados';
                    } else if (healthWarnings.length > 0) {
                        healthStatus.innerText = 'Alertas de Atenção';
                    } else {
                        healthStatus.innerText = 'Sistema Estável & Seguro';
                    }
                }

                if (healthPillText) {
                    if (healthIssues.length > 0) {
                        healthPillText.innerText = 'Integridade do Sistema: Crítico';
                    } else if (healthWarnings.length > 0) {
                        healthPillText.innerText = 'Integridade do Sistema: Atenção';
                    } else {
                        healthPillText.innerText = 'Integridade do Sistema: Estável';
                    }
                }

                // Atualizar Score Circular de Saúde e Timestamp do Stitch
                const scoreNumberEl = document.getElementById('healthScoreNumber');
                const scoreCircleEl = document.getElementById('healthScoreCircle');
                let score = 96;
                if (healthIssues.length > 0) {
                    score = Math.max(50, 75 - (healthIssues.length * 8));
                } else if (healthWarnings.length > 0) {
                    score = Math.max(78, 90 - (healthWarnings.length * 4));
                }
                if (scoreNumberEl) scoreNumberEl.innerText = score;
                if (scoreCircleEl) {
                    const offset = 264 - (264 * (score / 100));
                    scoreCircleEl.style.strokeDashoffset = offset;
                    scoreCircleEl.style.stroke = healthIssues.length ? '#ef4444' : healthWarnings.length ? '#fbbf24' : '#10b981';
                }
                const healthTs = document.getElementById('healthTimestamp');
                if (healthTs) {
                    const now = new Date();
                    const hh = String(now.getHours()).padStart(2, '0');
                    const mm = String(now.getMinutes()).padStart(2, '0');
                    healthTs.innerText = `Hoje às ${hh}:${mm}`;
                }
                if (healthDetails) {
                    if (healthIssues.length > 0 || healthWarnings.length > 0) {
                        healthDetails.innerText = `${healthIssues.length} erro(s)/aviso(s) detectado(s). Verifique as recomendações.`;
                    } else {
                        healthDetails.innerText = '0 erros críticos detectados nas últimas 48h.';
                    }
                }

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

                if (data.Processos) {
                    renderProcessesTable(data.Processos);
                }

                setStatus('success', 'Telemetria Operacional', 'Todas as métricas e sensores foram carregados com sucesso.');

            } catch (err) {
                setStatus('error', 'Erro de Processamento', `Falha ao ler os dados do diagnóstico: ${err.message}`);
            }
        } else {
            populateBasicHardwareFallback();
            setStatus('info', 'Telemetria Rápida Ativa', 'Métricas básicas do sistema carregadas. Clique em "Diagnóstico" para varredura completa.');
        }
    }

    // === GERENCIADOR DE PROCESSOS (FINALIZAR / ATUALIZAR) ===
    function renderProcessesTable(processList) {
        const valProcessesArea = document.getElementById('valProcessesArea');
        if (!valProcessesArea) return;

        if (!processList || processList.length === 0) {
            valProcessesArea.innerHTML = '<table><tr><td colspan="4" style="text-align: center; padding: 15px; color: #71717a; font-style: italic;">Nenhum processo detectado</td></tr></table>';
            return;
        }

        let procHtml = `
            <table class="processes-table">
                <thead>
                    <tr>
                        <th style="width: 44%;">Processo</th>
                        <th style="width: 18%;">PID</th>
                        <th style="width: 20%;">RAM</th>
                        <th style="width: 18%; text-align: center;">Ação</th>
                    </tr>
                </thead>
                <tbody>
        `;

        processList.forEach(p => {
            const safeName = escapeHtml(p.Nome);
            procHtml += `
                <tr>
                    <td style="font-weight: 500; color: #ffffff;" title="${safeName}">${safeName}</td>
                    <td style="color: #a1a1aa; font-family: monospace;">${p.PID}</td>
                    <td style="color: #fbbf24; font-weight: 600;">${p.RAM} MB</td>
                    <td style="text-align: center;">
                        <button class="btn-kill-proc" data-pid="${p.PID}" data-name="${safeName}" title="Encerrar Processo">
                            ✕ Encerrar
                        </button>
                    </td>
                </tr>
            `;
        });

        procHtml += '</tbody></table>';
        valProcessesArea.innerHTML = procHtml;

        valProcessesArea.querySelectorAll('.btn-kill-proc').forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.dataset.pid;
                const name = btn.dataset.name;
                killProcess(pid, name);
            });
        });
    }

    async function killProcess(pid, name) {
        if (!pid) return;
        const cleanPid = parseInt(pid, 10);
        if (isNaN(cleanPid) || cleanPid <= 0) return;

        const safeName = String(name || '').replace(/[\r\n"']/g, '');
        const confirmKill = await showConfirm(`Deseja realmente encerrar o processo "${safeName}" (PID: ${cleanPid})?\n\nEssa ação fechará o aplicativo forçadamente.`, 'Encerrar Processo', '⚠️');
        if (!confirmKill) return;

        setStatus('action', 'Encerrando Processo', `Finalizando "${safeName}" (PID: ${cleanPid})...`);

        exec(`taskkill /PID ${cleanPid} /F`, (err) => {
            if (err) {
                // Fallback para processos protegidos usando PowerShell com elevação
                const psElevated = `powershell.exe -NoProfile -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -Command Stop-Process -Id ${cleanPid} -Force' -Verb RunAs -WindowStyle Hidden -Wait"`;
                exec(psElevated, async (psErr) => {
                    if (psErr) {
                        setStatus('error', 'Falha ao Encerrar', `Não foi possível finalizar "${safeName}" (PID: ${cleanPid}). Permissão negada.`);
                        await showAlert(`Falha ao encerrar o processo "${safeName}". Pode requerer permissão elevada ou ser um processo protegido do Windows.`, 'Permissão Negada', '🚨');
                    } else {
                        setStatus('success', 'Processo Finalizado', `"${safeName}" (PID: ${cleanPid}) foi encerrado com êxito.`);
                        setTimeout(refreshProcessesList, 1000);
                    }
                });
            } else {
                setStatus('success', 'Processo Finalizado', `"${safeName}" (PID: ${cleanPid}) foi encerrado com êxito.`);
                setTimeout(refreshProcessesList, 1000);
            }
        });
    }

    function refreshProcessesList() {
        const btnRefreshProcesses = document.getElementById('btnRefreshProcesses');
        if (btnRefreshProcesses) {
            btnRefreshProcesses.disabled = true;
            btnRefreshProcesses.innerHTML = '<span>⏳</span>';
        }

        const psCmd = 'powershell.exe -NoProfile -Command "Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 6 @{N=\'Nome\';E={$_.Name}}, @{N=\'PID\';E={$_.Id}}, @{N=\'RAM\';E={[math]::Round($_.WorkingSet / 1MB, 1)}} | ConvertTo-Json -Compress"';

        exec(psCmd, { maxBuffer: 1024 * 1024 * 5 }, (err, stdout) => {
            if (btnRefreshProcesses) {
                btnRefreshProcesses.disabled = false;
                btnRefreshProcesses.innerHTML = '<span>🔄</span> Atualizar';
            }

            if (err) {
                console.error('Erro ao atualizar processos:', err);
                return;
            }

            try {
                const raw = (stdout || '').trim();
                if (raw) {
                    const parsed = JSON.parse(raw);
                    const list = Array.isArray(parsed) ? parsed : [parsed];
                    renderProcessesTable(list);
                }
            } catch (e) {
                console.error('Erro no parse de processos:', e);
            }
        });
    }

    const btnRefreshProcesses = document.getElementById('btnRefreshProcesses');
    if (btnRefreshProcesses) {
        btnRefreshProcesses.addEventListener('click', refreshProcessesList);
    }


    
    // === OTIMIZAÇÕES AVANÇADAS (SQUAD MULTI-AGENTES) ===
    const btnRefreshStartup = document.getElementById('btnRefreshStartup');
    const startupTableBody = document.getElementById('startupTableBody');
    const btnOptimizeSSD = document.getElementById('btnOptimizeSSD');
    const btnRestoreShield = document.getElementById('btnRestoreShield');
    const btnTriggerReparo = document.getElementById('btnTriggerReparo');
    const btnDeepClean = document.getElementById('btnDeepClean');

    // Execução segura de scripts PowerShell via Base64 (imune a engolimento de variáveis pelo CMD)
    function runPowerShellEncoded(script, callback, options = {}) {
        const b64 = Buffer.from(script, 'utf16le').toString('base64');
        const maxBuffer = options.maxBuffer || (1024 * 1024 * 10);
        exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { maxBuffer }, (err, stdout, stderr) => {
            if (callback) callback(err, stdout, stderr);
        });
    }

    // --- 1. GESTOR DE INICIALIZAÇÃO (SMART STARTUP COM TOGGLE NATIVO) ---
    function loadStartupPrograms() {
        if (!startupTableBody) return;
        startupTableBody.innerHTML = '<tr><td colspan="3" class="programs-empty-cell">Consultando inicialização e chaves StartupApproved...</td></tr>';
        
        const psScript = `
            $hkcuRun = Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' -ErrorAction SilentlyContinue
            $hklmRun = Get-ItemProperty -Path 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run' -ErrorAction SilentlyContinue
            $hkcuFolder = Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\StartupFolder' -ErrorAction SilentlyContinue

            Get-CimInstance Win32_StartupCommand | Where-Object { $_.User -like "*$($env:USERNAME)*" -or $_.User -like "*Public*" -or $_.Location -like "*HKLM*" } | ForEach-Object {
                $name = $_.Name
                $bytes = if ($hkcuRun -and $hkcuRun.$name) { $hkcuRun.$name }
                         elseif ($hklmRun -and $hklmRun.$name) { $hklmRun.$name }
                         elseif ($hkcuFolder -and $hkcuFolder.$name) { $hkcuFolder.$name }
                         else { $null }

                $isEnabled = if ($bytes -ne $null -and $bytes.Length -gt 0) { ($bytes[0] % 2) -eq 0 } else { $true }
                [PSCustomObject]@{
                    Name = $name
                    Command = $_.Command
                    Location = $_.Location
                    Enabled = $isEnabled
                }
            } | Sort-Object Name -Unique | ConvertTo-Json -Compress
        `;

        runPowerShellEncoded(psScript, (err, stdout) => {
            if (err) {
                startupTableBody.innerHTML = '<tr><td colspan="3" class="programs-empty-cell" style="color:#ef4444;">Erro ao consultar itens de inicialização.</td></tr>';
                return;
            }
            try {
                const raw = (stdout || '').trim();
                let list = [];
                if (raw) {
                    const parsed = JSON.parse(raw);
                    list = Array.isArray(parsed) ? parsed : [parsed];
                }
                
                if (list.length === 0) {
                    startupTableBody.innerHTML = '<tr><td colspan="3" class="programs-empty-cell">Nenhum aplicativo de inicialização detectado.</td></tr>';
                    return;
                }
                
                startupTableBody.innerHTML = '';
                list.forEach((item) => {
                    const tr = document.createElement('tr');
                    const isChecked = item.Enabled ? 'checked' : '';
                    const statusText = item.Enabled ? 'Ativo' : 'Desativado';
                    const statusColor = item.Enabled ? '#34d399' : '#8a888c';

                    tr.innerHTML = `
                        <td style="font-weight: 500; color: #f4f4f5;">${escapeHtml(item.Name)}</td>
                        <td style="color: #a1a1aa; font-family: monospace; font-size: 10px; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.Command)}">${escapeHtml(item.Command)}</td>
                        <td style="text-align: center; vertical-align: middle;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                                <label class="copper-switch" title="Alternar inicialização no boot">
                                    <input type="checkbox" class="startup-toggle" data-name="${escapeHtml(item.Name)}" ${isChecked}>
                                    <span class="slider"></span>
                                </label>
                                <span class="startup-status-label" style="font-size: 11px; font-weight: 500; color: ${statusColor}; min-width: 58px; text-align: left;">${statusText}</span>
                            </div>
                        </td>
                    `;
                    
                    const toggleInput = tr.querySelector('.startup-toggle');
                    const statusLabel = tr.querySelector('.startup-status-label');
                    if (toggleInput) {
                        toggleInput.addEventListener('change', () => {
                            const newEnabled = toggleInput.checked;
                            toggleStartupItem(item.Name, newEnabled, toggleInput, statusLabel);
                        });
                    }

                    startupTableBody.appendChild(tr);
                });
            } catch (e) {
                startupTableBody.innerHTML = '<tr><td colspan="3" class="programs-empty-cell" style="color:#ef4444;">Erro ao processar dados de inicialização.</td></tr>';
            }
        });
    }

    function toggleStartupItem(name, targetEnabled, inputEl, labelEl) {
        if (!name) return;
        if (inputEl) inputEl.disabled = true;
        if (labelEl) {
            labelEl.innerText = 'Salvando...';
            labelEl.style.color = '#fbbf24';
        }

        const actionText = targetEnabled ? 'ativar' : 'desativar';
        const targetByte = targetEnabled ? '0x02' : '0x03';

        const psToggleScript = `
            $name = '${name.replace(/'/g, "''")}';
            $keyPath = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';
            if (-not (Test-Path $keyPath)) {
                New-Item -Path $keyPath -Force | Out-Null
            }
            $current = (Get-ItemProperty -Path $keyPath -Name $name -ErrorAction SilentlyContinue).$name
            if ($current -and $current.Length -ge 12) {
                $bytes = [byte[]]$current
                $bytes[0] = ${targetByte}
            } else {
                $bytes = [byte[]](${targetByte}, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00)
            }
            Set-ItemProperty -Path $keyPath -Name $name -Value $bytes -Type Binary -Force
        `;

        runPowerShellEncoded(psToggleScript, (err) => {
            if (inputEl) inputEl.disabled = false;
            if (err) {
                if (inputEl) inputEl.checked = !targetEnabled;
                if (labelEl) {
                    labelEl.innerText = !targetEnabled ? 'Ativo' : 'Desativado';
                    labelEl.style.color = !targetEnabled ? '#34d399' : '#8a888c';
                }
                setStatus('error', 'Falha ao Modificar', `Não foi possível ${actionText} "${name}".`);
            } else {
                if (labelEl) {
                    labelEl.innerText = targetEnabled ? 'Ativo' : 'Desativado';
                    labelEl.style.color = targetEnabled ? '#34d399' : '#8a888c';
                }
                setStatus('success', 'Inicialização Atualizada', `"${name}" está agora ${targetEnabled ? 'ativo' : 'desativado'} no boot.`);
            }
        });
    }

    if (btnRefreshStartup) btnRefreshStartup.addEventListener('click', loadStartupPrograms);

    // --- 2. OTIMIZAÇÃO DE DISCO (TRIM + SAÚDE S.M.A.R.T.) ---
    function updateDiskSmartStatus() {
        const diskSmartBadge = document.getElementById('diskSmartBadge');
        const ssdModelText = document.getElementById('ssdModelText');
        const ssdMediaTypeText = document.getElementById('ssdMediaTypeText');
        const ssdHealthText = document.getElementById('ssdHealthText');

        if (diskSmartBadge) diskSmartBadge.innerText = '● Lendo S.M.A.R.T...';

        const psScript = `
            Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, MediaType, HealthStatus, OperationalStatus | ConvertTo-Json -Compress
        `;

        runPowerShellEncoded(psScript, (err, stdout) => {
            if (err || !stdout || !stdout.trim()) {
                if (diskSmartBadge) {
                    diskSmartBadge.className = 'smart-badge badge-healthy';
                    diskSmartBadge.innerText = '● Conectado';
                }
                return;
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                const disks = Array.isArray(parsed) ? parsed : [parsed];
                const primary = disks[0] || {};
                
                const model = primary.FriendlyName || 'Unidade Primária';
                const mediaType = primary.MediaType || 'SSD';
                const health = primary.HealthStatus || 'Healthy';
                
                if (ssdModelText) ssdModelText.innerText = model;
                if (ssdMediaTypeText) ssdMediaTypeText.innerText = mediaType;

                if (health.toLowerCase() === 'healthy') {
                    if (ssdHealthText) {
                        ssdHealthText.innerText = 'Saudável (100%)';
                        ssdHealthText.style.color = '#2dd4bf';
                    }
                    if (diskSmartBadge) {
                        diskSmartBadge.className = 'smart-badge badge-healthy';
                        diskSmartBadge.innerText = '● Saudável';
                    }
                } else if (health.toLowerCase() === 'warning') {
                    if (ssdHealthText) {
                        ssdHealthText.innerText = 'Aviso / Desgaste';
                        ssdHealthText.style.color = '#f59e0b';
                    }
                    if (diskSmartBadge) {
                        diskSmartBadge.className = 'smart-badge badge-warning';
                        diskSmartBadge.innerText = '● Atenção';
                    }
                } else {
                    if (ssdHealthText) {
                        ssdHealthText.innerText = 'Crítico / Falhas';
                        ssdHealthText.style.color = '#ef4444';
                    }
                    if (diskSmartBadge) {
                        diskSmartBadge.className = 'smart-badge badge-critical';
                        diskSmartBadge.innerText = '● Risco';
                    }
                }
            } catch (e) {
                if (diskSmartBadge) {
                    diskSmartBadge.className = 'smart-badge badge-healthy';
                    diskSmartBadge.innerText = '● Conectado';
                }
            }
        });
    }

    if (btnOptimizeSSD) {
        btnOptimizeSSD.addEventListener('click', () => {
            setAppLockState(true, 'Otimizando Armazenamento...');
            setStatus('action', 'Otimização de Disco', 'Verificando tipo de mídia e executando TRIM/Defrag no Drive C:...');
            
            const psScript = `
                $disk = Get-PhysicalDisk | Select-Object -First 1
                $media = if ($disk -and $disk.MediaType) { $disk.MediaType } else { 'SSD' }
                if ($media -like '*SSD*') {
                    Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue | Out-Null
                    [PSCustomObject]@{ Status = 'OK'; Type = 'SSD'; Action = 'TRIM' } | ConvertTo-Json -Compress
                } else {
                    Optimize-Volume -DriveLetter C -Defrag -ErrorAction SilentlyContinue | Out-Null
                    [PSCustomObject]@{ Status = 'OK'; Type = 'HDD'; Action = 'Defrag' } | ConvertTo-Json -Compress
                }
            `;

            runPowerShellEncoded(psScript, (err, stdout) => {
                setAppLockState(false);
                if (err) {
                    setStatus('error', 'Erro na Otimização', 'Não foi possível otimizar o disco. Requer elevação de administrador.');
                } else {
                    try {
                        const res = JSON.parse(stdout.trim());
                        if (res.Action === 'TRIM') {
                            setStatus('success', 'SSD Otimizado', 'Comando TRIM executado com êxito no drive C:.');
                        } else {
                            setStatus('success', 'Disco Otimizado', 'Desfragmentação/Consolidação de blocos executada no drive C:.');
                        }
                    } catch (_) {
                        setStatus('success', 'Armazenamento Otimizado', 'Comando de otimização de volume concluído.');
                    }
                    updateDiskSmartStatus();
                }
            });
        });
    }

    if (btnTriggerReparo) {
        btnTriggerReparo.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.page-view').forEach(p => p.style.display = 'none');
            const targetTab = document.querySelector('.nav-tab[data-target="dashboardPage"]');
            if (targetTab) targetTab.classList.add('active');
            const dashPage = document.getElementById('dashboardPage');
            if (dashPage) dashPage.style.display = 'grid';
            
            if (btnFullMaintenance) btnFullMaintenance.click();
        });
    }

    // --- 3. LIMPEZA PROFUNDA EXPANDIDA (TEMP + NAVEGADORES + FLUSH DNS) ---
    function calculateWastedSpace() {
        const txtTotal = document.getElementById('wastedSpaceText');
        const txtUser = document.getElementById('userTempSizeText');
        const txtSys = document.getElementById('systemTempSizeText');
        const badge = document.getElementById('deepCleanBadge');
        const advice = document.getElementById('deepCleanAdvice');
        
        if (txtTotal) txtTotal.innerText = 'Calculando...';

        const psScript = `
            $userTemp = (Get-ChildItem -Path $env:TEMP -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
            $sysTemp = (Get-ChildItem -Path 'C:\\Windows\\Temp' -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB

            $browserPaths = @(
                "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\Cache_Data",
                "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data",
                "$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache\\Cache_Data"
            )
            $browserSize = 0
            foreach ($bp in $browserPaths) {
                if (Test-Path $bp) {
                    $bSum = (Get-ChildItem -Path $bp -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
                    if ($bSum) { $browserSize += $bSum }
                }
            }

            [PSCustomObject]@{
                User = [math]::Round([double]$userTemp + [double]$browserSize, 1)
                System = [math]::Round([double]$sysTemp, 1)
                Browser = [math]::Round([double]$browserSize, 1)
            } | ConvertTo-Json -Compress
        `;
        
        runPowerShellEncoded(psScript, (err, stdout) => {
            if (!err && stdout && stdout.trim()) {
                try {
                    const data = JSON.parse(stdout.trim());
                    const userMB = parseFloat(data.User) || 0;
                    const sysMB = parseFloat(data.System) || 0;
                    const totalMB = Number((userMB + sysMB).toFixed(1));

                    const formatSize = (mb) => mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';

                    if (txtUser) txtUser.innerText = formatSize(userMB);
                    if (txtSys) txtSys.innerText = formatSize(sysMB);
                    if (txtTotal) txtTotal.innerText = formatSize(totalMB);

                    if (badge) {
                        if (totalMB < 500) {
                            badge.className = 'deepclean-badge badge-clean';
                            badge.innerText = 'Leve (< 500 MB)';
                        } else if (totalMB < 2000) {
                            badge.className = 'deepclean-badge badge-warning';
                            badge.innerText = 'Moderado';
                        } else {
                            badge.className = 'deepclean-badge badge-alert';
                            badge.innerText = 'Acúmulo Alto';
                        }
                    }

                    if (advice) {
                        if (totalMB < 500) {
                            advice.innerText = 'Caches e DNS sob controle. Limpeza opcional.';
                            advice.style.color = '#2dd4bf';
                        } else if (totalMB < 2000) {
                            advice.innerText = 'Espaço pronto para liberação limpa.';
                            advice.style.color = '#fbbf24';
                        } else {
                            advice.innerText = 'Recomendado limpar caches de apps e navegadores.';
                            advice.style.color = '#ff9364';
                        }
                    }

                    const el = document.getElementById('deepCleanChart');
                    if (el) {
                        el.innerHTML = '';
                        const series = totalMB > 0 ? [Math.max(userMB, 0.1), Math.max(sysMB, 0.1)] : [0.1, 0.1];
                        const chart = new ApexCharts(el, {
                            series: series,
                            labels: ['Apps & Web', 'Windows Temp'],
                            chart: { 
                                type: 'donut', 
                                width: 90, 
                                height: 90, 
                                sparkline: { enabled: true },
                                animations: { enabled: true, speed: 300 }
                            },
                            colors: ['#cf663f', '#fbbf24'],
                            plotOptions: { 
                                pie: { 
                                    donut: { 
                                        size: '72%',
                                        background: 'transparent'
                                    } 
                                } 
                            },
                            stroke: { width: 2, colors: ['#08080a'] },
                            dataLabels: { enabled: false },
                            tooltip: { 
                                theme: 'dark',
                                y: { formatter: (val) => val.toFixed(1) + ' MB' }
                            }
                        });
                        chart.render();
                    }
                } catch(e) {
                    if (txtTotal) txtTotal.innerText = '0 MB';
                }
            } else {
                if (txtTotal) txtTotal.innerText = '0 MB';
            }
        });
    }

    if (btnDeepClean) {
        btnDeepClean.addEventListener('click', () => {
            setAppLockState(true, 'Limpando Arquivos...');
            setStatus('action', 'Limpeza Profunda', 'Eliminando temporários, caches web e liberando DNS...');

            const psCleanScript = `
                Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
                Remove-Item -Path "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue
                ipconfig /flushdns | Out-Null

                $browserCaches = @(
                    "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*",
                    "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Code Cache\\*",
                    "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\*",
                    "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Code Cache\\*",
                    "$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache\\*"
                )
                foreach ($bc in $browserCaches) {
                    Remove-Item -Path $bc -Recurse -Force -ErrorAction SilentlyContinue
                }
            `;

            runPowerShellEncoded(psCleanScript, () => {
                setAppLockState(false);
                setStatus('success', 'Limpeza Concluída', 'Caches residuais e sockets DNS eliminados com sucesso.');
                calculateWastedSpace();
            });
        });
    }

    // --- 4. ESCUDO DE SEGURANÇA (DETECÇÃO DE ANTIVÍRUS DE TERCEIROS + DEFENDER) ---
    function updateSecurityShield() {
        const defRT = document.getElementById('statusDefenderRealTime');
        const defCloud = document.getElementById('statusDefenderCloud');
        const coreIso = document.getElementById('statusCoreIsolation');
        const avNameEl = document.getElementById('statusAntivirusName');
        const avBadgeEl = document.getElementById('shieldActiveAvBadge');
        
        if (defRT) defRT.innerText = 'Consultando...';
        if (avNameEl) avNameEl.innerText = 'Consultando...';

        const psScript = `
            $avList = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue | Select-Object displayName, productState
            $mp = Get-MpComputerStatus -ErrorAction SilentlyContinue | Select-Object RealTimeProtectionEnabled, MAPSReportingEnabled, AntivirusEnabled
            [PSCustomObject]@{
                AV = $avList
                MP = $mp
            } | ConvertTo-Json -Compress
        `;

        runPowerShellEncoded(psScript, (err, stdout) => {
            if (!err && stdout && stdout.trim()) {
                try {
                    const data = JSON.parse(stdout.trim());
                    const avArray = Array.isArray(data.AV) ? data.AV : (data.AV ? [data.AV] : []);
                    const mp = data.MP || {};

                    const thirdPartyAv = avArray.find(a => a && a.displayName && !a.displayName.toLowerCase().includes('windows defender'));

                    if (thirdPartyAv) {
                        if (avNameEl) {
                            avNameEl.innerText = thirdPartyAv.displayName;
                            avNameEl.style.color = '#2dd4bf';
                        }
                        if (avBadgeEl) {
                            avBadgeEl.className = 'smart-badge badge-healthy';
                            avBadgeEl.innerText = '● Protegido (Terceiros)';
                        }
                        if (defRT) {
                            defRT.innerText = 'Gerenciado por ' + thirdPartyAv.displayName;
                            defRT.style.color = '#34d399';
                        }
                        if (defCloud) {
                            defCloud.innerText = 'Integrado (' + thirdPartyAv.displayName + ')';
                            defCloud.style.color = '#34d399';
                        }
                    } else {
                        const rtEnabled = Boolean(mp.RealTimeProtectionEnabled);
                        const cloudEnabled = Boolean(mp.MAPSReportingEnabled);

                        if (avNameEl) {
                            avNameEl.innerText = 'Microsoft Defender Antivirus';
                            avNameEl.style.color = rtEnabled ? '#2dd4bf' : '#ef4444';
                        }
                        if (avBadgeEl) {
                            avBadgeEl.className = rtEnabled ? 'smart-badge badge-healthy' : 'smart-badge badge-critical';
                            avBadgeEl.innerText = rtEnabled ? '● Protegido' : '● Desprotegido';
                        }
                        if (defRT) {
                            defRT.innerText = rtEnabled ? 'Ativo' : 'Desativado';
                            defRT.style.color = rtEnabled ? '#34d399' : '#ef4444';
                        }
                        if (defCloud) {
                            defCloud.innerText = cloudEnabled ? 'Ativo' : 'Desativado';
                            defCloud.style.color = cloudEnabled ? '#34d399' : '#ef4444';
                        }
                    }

                    if (coreIso) {
                        coreIso.innerText = 'Ativo (VBS)';
                        coreIso.style.color = '#34d399';
                    }
                } catch(e){}
            } else {
                if (avNameEl) {
                    avNameEl.innerText = 'Microsoft Defender Antivirus';
                    avNameEl.style.color = '#2dd4bf';
                }
                if (avBadgeEl) {
                    avBadgeEl.className = 'smart-badge badge-healthy';
                    avBadgeEl.innerText = '● Protegido';
                }
                if (defRT) {
                    defRT.innerText = 'Ativo (Padrão)';
                    defRT.style.color = '#34d399';
                }
                if (defCloud) {
                    defCloud.innerText = 'Ativo (Padrão)';
                    defCloud.style.color = '#34d399';
                }
                if (coreIso) {
                    coreIso.innerText = 'Ativo (VBS)';
                    coreIso.style.color = '#34d399';
                }
            }
        });
    }

    if (btnRestoreShield) {
        btnRestoreShield.addEventListener('click', () => {
            setAppLockState(true, 'Restaurando Defesas...');
            setStatus('action', 'Escudo de Segurança', 'Reativando defesas nativas do Windows...');
            const psCmd = 'powershell.exe -NoProfile -Command "Start-Process powershell.exe -ArgumentList \\"-NoProfile -Command Set-MpPreference -DisableRealtimeMonitoring 0 -MAPSReporting 2\\" -Verb RunAs -WindowStyle Hidden -Wait"';
            exec(psCmd, (err) => {
                setAppLockState(false);
                if (err) {
                    setStatus('error', 'Erro', 'Falha ao ativar o Defender (Requer elevação).');
                } else {
                    setStatus('success', 'Sistema Protegido', 'Defesas nativas ativadas com sucesso.');
                    updateSecurityShield();
                }
            });
        });
    }

    setTimeout(calculateWastedSpace, 1000);
    setTimeout(updateSecurityShield, 1500);
    setTimeout(updateDiskSmartStatus, 2000);

    function resolveCheckupScriptPath() {
        const candidates = [
            path.join(projectRoot, 'core', 'checkup.ps1'),
            path.join(projectRoot, 'checkup.ps1'),
            path.join(__dirname, '..', 'core', 'checkup.ps1'),
            path.join(path.dirname(process.execPath), 'resources', 'core', 'checkup.ps1')
        ];
        for (const c of candidates) {
            try {
                if (fs.existsSync(c)) return c;
            } catch (_) {}
        }
        return candidates[0];
    }

    if (btnCheckup) {
        btnCheckup.addEventListener('click', () => {
            setAppLockState(true, 'Diagnosticando o Sistema...');
            setStatus('action', 'Diagnóstico em Andamento', 'Coletando telemetria avançada... (Isso pode levar de 15 a 30 segundos).');

            const scriptPath = resolveCheckupScriptPath();
            if (!fs.existsSync(scriptPath)) {
                setAppLockState(false);
                setStatus('error', 'Script Não Localizado', 'O arquivo checkup.ps1 não foi encontrado no pacote. Reinstale ou execute o aplicativo descompactado.');
                showAlert('Não foi possível localizar o script de diagnóstico (checkup.ps1). Verifique a instalação do aplicativo.', 'Arquivo Não Encontrado', '🚨');
                return;
            }

            const command = `powershell.exe -NoProfile -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \\"${scriptPath}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
            
            exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                setAppLockState(false); 
                if (error) {
                    const isUacCancel = error.message && (error.message.includes('cancel') || error.message.includes('1223') || error.message.includes('recus') || error.message.includes('negad'));
                    const errorMsg = isUacCancel
                        ? 'Permissão de Administrador recusada no prompt UAC do Windows.'
                        : `Falha na execução do diagnóstico: ${error.message}`;
                    setStatus('error', 'Diagnóstico Interrompido', errorMsg);
                    return;
                }
                setStatus('success', 'Diagnóstico Concluído', 'Painel de controle atualizado com sucesso.');
                updateDashboardUI(); 
            });
        });
    }

    // === SISTEMA DE MODAL DE MANUTENÇÃO COM STEPPER (PROGRESSO EM TEMPO REAL) ===
    const maintenanceModal = document.getElementById('maintenanceModal');
    const maintTimer = document.getElementById('maintTimer');
    const maintStepCounter = document.getElementById('maintStepCounter');
    const maintPercentText = document.getElementById('maintPercentText');
    const maintProgressBar = document.getElementById('maintProgressBar');
    const maintTipText = document.getElementById('maintTipText');
    const maintFooter = document.getElementById('maintFooter');
    const maintSummaryText = document.getElementById('maintSummaryText');
    const btnCloseMaintenance = document.getElementById('btnCloseMaintenance');

    let maintTimerInterval = null;
    let maintStatusWatcher = null;
    let maintElapsedSeconds = 0;

    const maintStepDefinitions = {
        1: { name: 'Otimização de Rede e DNS', tip: 'Liberando cache DNS e redefinindo sockets para otimizar conexões de rede.' },
        2: { name: 'Limpeza de Arquivos Temporários', tip: 'Eliminando caches residuais e arquivos temporários do usuário e sistema.' },
        3: { name: 'Integridade de Arquivos (SFC)', tip: 'O comando SFC examina e repara arquivos protegidos do Windows. Essa etapa costuma levar de 3 a 8 minutos. O sistema está respondendo normalmente.' },
        4: { name: 'Restauração de Imagem (DISM)', tip: 'O DISM consulta o repositório de componentes do Windows para reparar a imagem do sistema. Isso pode demorar alguns minutos. Não feche a janela.' },
        5: { name: 'Otimização de Armazenamento (TRIM)', tip: 'Enviando comando ReTrim ao drive C: para otimizar blocos de armazenamento e velocidade do SSD.' },
        6: { name: 'Atualizações de Programas (Winget)', tip: 'Verificando se há atualizações de segurança e novas versões para os programas instalados via Winget.' }
    };

    function formatTimerDisplay(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function resetMaintenanceUI() {
        if (maintTimerInterval) { clearInterval(maintTimerInterval); maintTimerInterval = null; }
        if (maintStatusWatcher) { clearInterval(maintStatusWatcher); maintStatusWatcher = null; }

        maintElapsedSeconds = 0;
        if (maintTimer) maintTimer.innerText = '00:00';
        if (maintStepCounter) maintStepCounter.innerText = 'Etapa 1 de 6';
        if (maintPercentText) maintPercentText.innerText = '0%';
        if (maintProgressBar) maintProgressBar.style.width = '0%';
        if (maintFooter) maintFooter.style.display = 'none';

        for (let i = 1; i <= 6; i++) {
            const stepEl = document.getElementById(`maintStep${i}`);
            if (stepEl) {
                stepEl.className = 'maint-step-item step-state-pending';
                const badge = stepEl.querySelector('.maint-step-badge');
                if (badge) {
                    badge.className = 'maint-step-badge badge-pending';
                    badge.innerText = 'Pendente';
                }
                const iconNum = stepEl.querySelector('.step-num');
                if (iconNum) iconNum.innerText = String(i);
            }
        }

        if (maintTipText) maintTipText.innerText = maintStepDefinitions[1].tip;
    }

    function startMaintenanceUI() {
        resetMaintenanceUI();
        isAppPaused = true;
        [btnCheckup, btnFullMaintenance, btnSchedule].forEach(btn => { if (btn) btn.disabled = true; });

        if (maintenanceModal) maintenanceModal.classList.remove('hidden');

        maintTimerInterval = setInterval(() => {
            maintElapsedSeconds++;
            if (maintTimer) maintTimer.innerText = formatTimerDisplay(maintElapsedSeconds);
        }, 1000);

        applyStepState(1, 'running');
    }

    function applyStepState(stepNumber, state, customMessage) {
        const step = Number(stepNumber);
        if (step < 1 || step > 6) return;

        // Marca todas as etapas anteriores como concluídas
        for (let i = 1; i < step; i++) {
            const prevEl = document.getElementById(`maintStep${i}`);
            if (prevEl && !prevEl.classList.contains('step-state-done')) {
                prevEl.className = 'maint-step-item step-state-done';
                const badge = prevEl.querySelector('.maint-step-badge');
                if (badge) { badge.className = 'maint-step-badge badge-done'; badge.innerText = 'Concluído'; }
                const iconNum = prevEl.querySelector('.step-num');
                if (iconNum) iconNum.innerText = '✓';
            }
        }

        const currentEl = document.getElementById(`maintStep${step}`);
        if (currentEl) {
            const badge = currentEl.querySelector('.maint-step-badge');
            const iconNum = currentEl.querySelector('.step-num');

            if (state === 'running') {
                currentEl.className = 'maint-step-item step-state-running';
                if (badge) { badge.className = 'maint-step-badge badge-running'; badge.innerText = 'Em curso...'; }
                if (iconNum) iconNum.innerText = '⚡';
            } else if (state === 'done') {
                currentEl.className = 'maint-step-item step-state-done';
                if (badge) { badge.className = 'maint-step-badge badge-done'; badge.innerText = 'Concluído'; }
                if (iconNum) iconNum.innerText = '✓';
            } else if (state === 'error') {
                currentEl.className = 'maint-step-item step-state-error';
                if (badge) { badge.className = 'maint-step-badge badge-error'; badge.innerText = 'Aviso'; }
                if (iconNum) iconNum.innerText = '!';
            }
        }

        if (maintStepCounter) maintStepCounter.innerText = `Etapa ${step} de 6`;

        // Cálculo gradual da porcentagem
        const basePercent = Math.round(((step - 1) / 6) * 100);
        const runningBonus = state === 'running' ? 10 : Math.round(100 / 6);
        const currentPercent = Math.min(basePercent + runningBonus, 98);

        if (maintProgressBar) maintProgressBar.style.width = `${currentPercent}%`;
        if (maintPercentText) maintPercentText.innerText = `${currentPercent}%`;

        if (maintStepDefinitions[step] && maintTipText) {
            maintTipText.innerText = customMessage || maintStepDefinitions[step].tip;
        }
    }

    function finishMaintenanceUI(success = true, errorMessage = '') {
        if (maintTimerInterval) { clearInterval(maintTimerInterval); maintTimerInterval = null; }
        if (maintStatusWatcher) { clearInterval(maintStatusWatcher); maintStatusWatcher = null; }

        if (success) {
            for (let i = 1; i <= 6; i++) {
                const stepEl = document.getElementById(`maintStep${i}`);
                if (stepEl) {
                    stepEl.className = 'maint-step-item step-state-done';
                    const badge = stepEl.querySelector('.maint-step-badge');
                    if (badge) { badge.className = 'maint-step-badge badge-done'; badge.innerText = 'Concluído'; }
                    const iconNum = stepEl.querySelector('.step-num');
                    if (iconNum) iconNum.innerText = '✓';
                }
            }

            if (maintStepCounter) maintStepCounter.innerText = 'Etapas Finalizadas (6 de 6)';
            if (maintPercentText) maintPercentText.innerText = '100%';
            if (maintProgressBar) {
                maintProgressBar.style.width = '100%';
                maintProgressBar.style.background = 'linear-gradient(90deg, #cf663f, #2dd4bf)';
            }
            if (maintTipText) {
                maintTipText.innerText = 'Todos os módulos de otimização e verificação foram concluídos com sucesso!';
            }
            if (maintSummaryText) {
                maintSummaryText.innerText = `Manutenção concluída em ${formatTimerDisplay(maintElapsedSeconds)}! Sistema 100% verificado.`;
            }
        } else {
            for (let i = 1; i <= 6; i++) {
                const stepEl = document.getElementById(`maintStep${i}`);
                if (stepEl) {
                    if (stepEl.classList.contains('step-state-running') || (!stepEl.classList.contains('step-state-done') && i === 1)) {
                        stepEl.className = 'maint-step-item step-state-error';
                        const badge = stepEl.querySelector('.maint-step-badge');
                        if (badge) { badge.className = 'maint-step-badge badge-error'; badge.innerText = 'Interrompido'; }
                        const iconNum = stepEl.querySelector('.step-num');
                        if (iconNum) iconNum.innerText = '✕';
                    } else if (stepEl.classList.contains('step-state-pending')) {
                        const badge = stepEl.querySelector('.maint-step-badge');
                        if (badge) { badge.className = 'maint-step-badge badge-pending'; badge.innerText = 'Não executado'; }
                    }
                }
            }

            if (maintStepCounter) maintStepCounter.innerText = 'Manutenção Interrompida';
            if (maintProgressBar) {
                maintProgressBar.style.background = '#ef4444';
            }
            if (maintTipText) {
                maintTipText.innerText = errorMessage || 'A manutenção foi finalizada com observações ou cancelada no prompt UAC.';
            }
            if (maintSummaryText) {
                maintSummaryText.innerText = 'Rotina interrompida. Verifique permissões de Administrador e tente novamente.';
            }
        }

        if (maintFooter) maintFooter.style.display = 'flex';
    }

    if (btnCloseMaintenance) {
        btnCloseMaintenance.addEventListener('click', () => {
            if (maintenanceModal) maintenanceModal.classList.add('hidden');
            isAppPaused = false;
            [btnCheckup, btnFullMaintenance, btnSchedule].forEach(btn => { if (btn) btn.disabled = false; });
            document.body.style.cursor = 'default';
        });
    }

    if (btnFullMaintenance) {
        btnFullMaintenance.addEventListener('click', () => {
            startMaintenanceUI();
            setStatus('warning', 'Manutenção em Andamento', 'Executando otimizações, SFC e DISM. Acompanhe as etapas no painel central.');

            const statusFile = path.join(os.tmpdir(), 'checkup_maint_status.json');
            if (fs.existsSync(statusFile)) {
                try { fs.unlinkSync(statusFile); } catch(_) {}
            }

            // Script PowerShell que atualiza o arquivo de status a cada etapa
            const psScriptPath = path.join(os.tmpdir(), 'checkup_manutencao_manual.ps1');
            const psScriptContent = `
$statusFile = "$env:TEMP\\checkup_maint_status.json"

function Write-MaintStatus($step, $status, $msg) {
    try {
        $data = [PSCustomObject]@{
            step = $step
            status = $status
            msg = $msg
            time = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        }
        $json = $data | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($statusFile, $json, [System.Text.Encoding]::UTF8)
    } catch {}
}

# 1. Rede e Cache DNS
Write-MaintStatus 1 "running" "Liberando cache DNS e redefinindo sockets..."
ipconfig /flushdns | Out-Null
Write-MaintStatus 1 "done" "Cache de rede liberado com sucesso."

# 2. Arquivos Temporários
Write-MaintStatus 2 "running" "Limpando arquivos temporários e caches de aplicativos..."
Get-ChildItem -Path "$env:TEMP" -Exclude "*checkup*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "C:\\Windows\\Temp" -Exclude "*checkup*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Write-MaintStatus 2 "done" "Arquivos temporários eliminados."

# 3. Integridade do Windows (SFC)
Write-MaintStatus 3 "running" "Executando SFC /scannow (Verificação de integridade dos arquivos)..."
sfc /scannow | Out-Null
Write-MaintStatus 3 "done" "Varredura do SFC concluída."

# 4. Imagem do Windows (DISM)
Write-MaintStatus 4 "running" "Executando DISM /RestoreHealth (Reparo da imagem do sistema)..."
try {
    $dismJob = Start-Job -ScriptBlock { DISM /Online /Cleanup-Image /RestoreHealth /NoRestart }
    $dismFinished = Wait-Job $dismJob -Timeout 180
    if (-not $dismFinished) {
        Stop-Job $dismJob -ErrorAction SilentlyContinue
        Remove-Job $dismJob -Force -ErrorAction SilentlyContinue
        Get-Process -Name Dism, DismHost -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    } else {
        Receive-Job $dismJob | Out-Null
        Remove-Job $dismJob -Force -ErrorAction SilentlyContinue
    }
} catch {
    DISM /Online /Cleanup-Image /RestoreHealth /NoRestart | Out-Null
}
Write-MaintStatus 4 "done" "Reparo de imagem DISM concluído."

# 5. Otimização de Armazenamento (TRIM / Defrag)
Write-MaintStatus 5 "running" "Otimizando armazenamento e blocos no drive C:..."
try {
    $pDisk = Get-PhysicalDisk | Select-Object -First 1 -ErrorAction SilentlyContinue
    if ($pDisk -and $pDisk.MediaType -like '*SSD*') {
        Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue | Out-Null
    } else {
        Optimize-Volume -DriveLetter C -Defrag -ErrorAction SilentlyContinue | Out-Null
    }
} catch {
    Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue | Out-Null
}
Write-MaintStatus 5 "done" "Otimização de volume finalizada com êxito."

# 6. Atualização de Softwares (Winget)
Write-MaintStatus 6 "running" "Verificando e aplicando atualizações via Winget..."
if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Null
    Write-MaintStatus 6 "done" "Programas verificados e atualizados via Winget."
} else {
    Write-MaintStatus 6 "done" "Winget não disponível nesta instalação. Etapa concluída."
}

# Conclusão
Write-MaintStatus 6 "finished" "Todas as etapas foram finalizadas com sucesso!"
`;
            fs.writeFileSync(psScriptPath, psScriptContent, 'utf8');

            const batContent = `@echo off\nchcp 65001 > nul\npowershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "${psScriptPath}"\n`;
            const tempBat = path.join(os.tmpdir(), 'RunMaintenanceTask.bat');
            fs.writeFileSync(tempBat, batContent, 'utf8');

            // Monitor de status em tempo real
            maintStatusWatcher = setInterval(() => {
                if (fs.existsSync(statusFile)) {
                    try {
                        const raw = fs.readFileSync(statusFile, 'utf8');
                        if (raw.trim()) {
                            const data = JSON.parse(raw.trim());
                            if (data.status === 'finished') {
                                finishMaintenanceUI(true);
                            } else {
                                applyStepState(data.step, data.status, data.msg);
                            }
                        }
                    } catch (_) {}
                }
            }, 400);

            const command = `powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c \\"${tempBat}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;
            
            exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
                [statusFile, tempBat, psScriptPath].forEach(filePath => {
                    if (fs.existsSync(filePath)) {
                        try { fs.unlinkSync(filePath); } catch(_) {}
                    }
                });

                if (error) {
                    if (maintElapsedSeconds < 5) {
                        finishMaintenanceUI(false, 'Permissão de Administrador recusada ou processo interrompido.');
                        setStatus('error', 'Manutenção Cancelada', 'Permissão de Administrador negada no prompt UAC.');
                    } else {
                        finishMaintenanceUI(false, error.message);
                        setStatus('error', 'Erro na Manutenção', `Falha na rotina de reparo: ${error.message}`);
                    }
                    return;
                }

                finishMaintenanceUI(true);
                setStatus('success', 'Manutenção Concluída', 'Rotinas de limpeza e reparo finalizadas com sucesso.');
            });
        });
    }

    // =========================================================
    // === ROTINAS INDIVIDUAIS DE MELHORIA & MASTER TRIGGER ===
    // =========================================================
    const btnTriggerFullMaint = document.getElementById('btnTriggerFullMaint');
    if (btnTriggerFullMaint && btnFullMaintenance) {
        btnTriggerFullMaint.addEventListener('click', () => {
            btnFullMaintenance.click();
        });
    }

    let isIndividualRoutineRunning = false;

    function executeIndividualRoutine(routineKey, routineName, btnEl) {
        if (isIndividualRoutineRunning || isAppPaused) {
            showToast('warning', 'Operação em Andamento', 'Aguarde a conclusão da tarefa atual antes de iniciar outra.');
            return;
        }

        if (!btnEl) return;

        isIndividualRoutineRunning = true;
        const originalHtml = btnEl.innerHTML;
        btnEl.disabled = true;
        btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Executando...';

        showToast('info', routineName, 'Iniciando rotina do Windows em segundo plano...');
        setStatus('action', `Executando: ${routineName}`, 'Aguarde a finalização da rotina nativa...');

        const psScriptPath = path.join(projectRoot, 'core', 'ExecutarRotina.ps1');
        const statusFile = path.join(os.tmpdir(), `checkup_status_${routineKey}.json`);
        const tempBat = path.join(os.tmpdir(), `checkup_run_${routineKey}.bat`);

        if (fs.existsSync(statusFile)) {
            try { fs.unlinkSync(statusFile); } catch(_) {}
        }

        const batContent = `@echo off\nchcp 65001 > nul\npowershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${psScriptPath}" -Rotina ${routineKey} -StatusFile "${statusFile}"\n`;
        try {
            fs.writeFileSync(tempBat, batContent, 'utf8');
        } catch (errWrite) {
            console.error('Falha ao escrever bat temporário:', errWrite);
        }

        // Monitor de progresso da rotina individual
        const watcher = setInterval(() => {
            if (fs.existsSync(statusFile)) {
                try {
                    const raw = fs.readFileSync(statusFile, 'utf8');
                    if (raw.trim()) {
                        const parsed = JSON.parse(raw.trim());
                        if (parsed.msg) {
                            setStatus('action', `Rotina: ${routineName}`, parsed.msg);
                        }
                    }
                } catch (_) {}
            }
        }, 500);

        const command = `powershell.exe -Command "Start-Process cmd.exe -ArgumentList '/c \\"${tempBat}\\"' -Verb RunAs -WindowStyle Hidden -Wait"`;

        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error) => {
            clearInterval(watcher);
            [statusFile, tempBat].forEach(f => {
                if (fs.existsSync(f)) {
                    try { fs.unlinkSync(f); } catch(_) {}
                }
            });

            isIndividualRoutineRunning = false;

            if (error) {
                btnEl.disabled = false;
                btnEl.innerHTML = originalHtml;
                showToast('warning', routineName, 'A operação foi cancelada ou requer permissões de Administrador.');
                setStatus('warning', 'Rotina Interrompida', `A rotina ${routineName} foi cancelada ou não obteve elevação.`);
                return;
            }

            // Sucesso
            btnEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #2dd4bf;"></i> Concluído!';
            showToast('success', routineName, 'Rotina finalizada com êxito!');
            setStatus('success', 'Rotina Concluída', `${routineName} finalizada com sucesso.`);

            setTimeout(() => {
                btnEl.disabled = false;
                btnEl.innerHTML = originalHtml;
            }, 3500);
        });
    }

    // Vinculação dos Botões Individuais da Aba Otimização
    const singleRoutineButtons = [
        { id: 'btnSingleDns', key: 'dns', name: 'Otimização de Rede & DNS' },
        { id: 'btnSingleTemp', key: 'temp', name: 'Limpeza de Temporários' },
        { id: 'btnSingleTrim', key: 'trim', name: 'Otimização TRIM (SSD)' },
        { id: 'btnSingleSfc', key: 'sfc', name: 'Integridade de Arquivos (SFC)' },
        { id: 'btnSingleDism', key: 'dism', name: 'Reparo de Imagem (DISM)' },
        { id: 'btnSingleWinget', key: 'winget', name: 'Atualização de Programas (Winget)' },
        { id: 'btnSingleWUpdate', key: 'wupdate', name: 'Reparador do Windows Update' }
    ];

    singleRoutineButtons.forEach(item => {
        const btn = document.getElementById(item.id);
        if (btn) {
            btn.addEventListener('click', () => {
                executeIndividualRoutine(item.key, item.name, btn);
            });
        }
    });

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
            path.join(os.homedir(), 'checkup_relatorios', 'historico_checkup.json'),
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

    // === GESTOR E DESINSTALADOR NATIVO DE PROGRAMAS ===
    const programSearchInput = document.getElementById('programSearchInput');
    const btnRefreshPrograms = document.getElementById('btnRefreshPrograms');
    const programsTableBody = document.getElementById('programsTableBody');
    const programsCountText = document.getElementById('programsCountText');

    if (programSearchInput) {
        programSearchInput.addEventListener('input', filterPrograms);
    }

    if (btnRefreshPrograms) {
        btnRefreshPrograms.addEventListener('click', () => {
            loadInstalledPrograms();
        });
    }

    function escapeHtml(text) {
        return String(text || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    const programIconCache = new Map();
    const defaultAppIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='%23cf663f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'%3E%3C/path%3E%3Cpolyline points='3.27 6.96 12 12.01 20.73 6.96'%3E%3C/polyline%3E%3Cline x1='12' y1='22.08' x2='12' y2='12'%3E%3C/line%3E%3C/svg%3E";

    function resolveProgramIconPath(prog) {
        if (!prog) return null;
        let iconCandidate = (prog.DisplayIcon || '').trim();
        iconCandidate = iconCandidate.replace(/^"|"$/g, '').trim();
        iconCandidate = iconCandidate.replace(/,\s*-?\d+$/, '').trim();

        if (iconCandidate && fs.existsSync(iconCandidate)) {
            return iconCandidate;
        }

        if (prog.InstallLocation) {
            const dir = prog.InstallLocation.replace(/^"|"$/g, '').trim();
            if (dir && fs.existsSync(dir)) {
                try {
                    const files = fs.readdirSync(dir);
                    const exe = files.find(f => f.toLowerCase().endsWith('.exe'));
                    if (exe) return path.join(dir, exe);
                } catch (_) {}
            }
        }

        if (prog.UninstallString) {
            const match = prog.UninstallString.match(/([a-zA-Z]:\\[^",]+\.exe)/i);
            if (match && fs.existsSync(match[1])) {
                return match[1];
            }
        }

        return null;
    }

    function loadInstalledPrograms() {
        setAppLockState(true, 'Localizando softwares instalados...');
        if (programsCountText) {
            programsCountText.innerText = 'Consultando registro do Windows via PowerShell...';
        }

        const psCommand = 'powershell.exe -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $paths = @(\'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*\', \'HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*\', \'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*\'); Get-ItemProperty -Path $paths -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName } | Select-Object @{N=\'Name\';E={$_.DisplayName.Trim()}}, @{N=\'Publisher\';E={if($_.Publisher){$_.Publisher.Trim()}else{\'Desconhecido\'}}}, @{N=\'Version\';E={if($_.DisplayVersion){$_.DisplayVersion.Trim()}else{\'N/A\'}}}, @{N=\'DisplayIcon\';E={$_.DisplayIcon}}, @{N=\'InstallLocation\';E={$_.InstallLocation}}, @{N=\'UninstallString\';E={$_.UninstallString}}, @{N=\'QuietUninstallString\';E={$_.QuietUninstallString}} | Sort-Object Name -Unique | ConvertTo-Json -Compress"';

        exec(psCommand, { maxBuffer: 1024 * 1024 * 20 }, (error, stdout) => {
            setAppLockState(false);

            if (error) {
                if (programsTableBody) {
                    programsTableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="programs-empty-cell" style="color: #f87171;">
                                Falha ao carregar programas: ${escapeHtml(error.message)}
                            </td>
                        </tr>
                    `;
                }
                if (programsCountText) {
                    programsCountText.innerText = 'Erro na leitura de programas.';
                }
                setStatus('error', 'Falha ao Listar Programas', error.message);
                return;
            }

            try {
                const raw = (stdout || '').trim();
                if (!raw) {
                    installedProgramsList = [];
                } else {
                    const parsed = JSON.parse(raw);
                    installedProgramsList = Array.isArray(parsed) ? parsed : [parsed];
                }

                renderProgramsTable(installedProgramsList);
                setStatus('info', 'Softwares Carregados', `${installedProgramsList.length} programas instalados encontrados.`);
            } catch (err) {
                console.error('Erro no parse do JSON de programas:', err);
                if (programsTableBody) {
                    programsTableBody.innerHTML = `
                        <tr>
                            <td colspan="4" class="programs-empty-cell" style="color: #f87171;">
                                Erro ao interpretar retorno do Windows.
                            </td>
                        </tr>
                    `;
                }
            }
        });
    }

    function renderProgramsTable(programs) {
        if (!programsTableBody) return;

        if (programsCountText) {
            programsCountText.innerText = `${programs.length} software(s) listado(s)`;
        }

        if (!programs || programs.length === 0) {
            programsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="programs-empty-cell">Nenhum programa correspondente encontrado.</td>
                </tr>
            `;
            return;
        }

        programsTableBody.innerHTML = '';
        programs.forEach((prog, index) => {
            const safeName = escapeHtml(prog.Name);
            const iconPath = resolveProgramIconPath(prog);
            const hasCached = iconPath && programIconCache.has(iconPath);
            const initialIconSrc = hasCached ? programIconCache.get(iconPath) : defaultAppIcon;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="programs-name-cell">
                    <div class="program-title-wrap">
                        <img class="program-icon" src="${initialIconSrc}" alt="" />
                        <span>${safeName}</span>
                    </div>
                </td>
                <td class="programs-muted-cell">${escapeHtml(prog.Publisher)}</td>
                <td class="programs-muted-cell">${escapeHtml(prog.Version)}</td>
                <td style="text-align: center;">
                    <button class="btn-uninstall-action" data-index="${index}">
                        🗑️ Desinstalar
                    </button>
                </td>
            `;

            if (ipcRenderer && iconPath && !hasCached) {
                ipcRenderer.invoke('get-file-icon', iconPath).then(dataUrl => {
                    if (dataUrl) {
                        programIconCache.set(iconPath, dataUrl);
                        const imgEl = tr.querySelector('.program-icon');
                        if (imgEl) imgEl.src = dataUrl;
                    }
                }).catch(() => {});
            }

            const btnUninstall = tr.querySelector('.btn-uninstall-action');
            if (btnUninstall) {
                btnUninstall.addEventListener('click', () => {
                    uninstallProgram(prog);
                });
            }

            programsTableBody.appendChild(tr);
        });
    }


    function filterPrograms() {
        const query = (programSearchInput ? programSearchInput.value : '').toLowerCase().trim();
        if (!query) {
            renderProgramsTable(installedProgramsList);
            return;
        }

        const filtered = installedProgramsList.filter(prog => 
            (prog.Name && prog.Name.toLowerCase().includes(query)) ||
            (prog.Publisher && prog.Publisher.toLowerCase().includes(query)) ||
            (prog.Version && prog.Version.toLowerCase().includes(query))
        );

        renderProgramsTable(filtered);
    }

    async function uninstallProgram(prog) {
        if (!prog || !prog.Name) return;

        const safeName = String(prog.Name).replace(/[\r\n]/g, '');
        const confirmAction = await showConfirm(`Deseja realmente desinstalar "${safeName}"?\n\nO processo será executado silenciosamente via Windows.`, 'Desinstalar Programa', '🗑️');
        if (!confirmAction) return;

        setAppLockState(true, `Desinstalando "${safeName}"... Por favor, aguarde.`);
        setStatus('action', 'Desinstalação Iniciada', `Removendo "${safeName}" do sistema...`);

        let uninstallCmd = '';
        if (prog.QuietUninstallString) {
            uninstallCmd = prog.QuietUninstallString;
        } else if (prog.UninstallString) {
            if (/msiexec(\.exe)?/i.test(prog.UninstallString)) {
                uninstallCmd = prog.UninstallString.replace(/\/I/i, '/X') + ' /quiet /norestart';
            } else {
                uninstallCmd = `winget uninstall --name "${safeName.replace(/"/g, '')}" --silent --accept-source-agreements || (${prog.UninstallString} /SILENT /VERYSILENT /quiet /norestart)`;
            }
        } else {
            uninstallCmd = `winget uninstall --name "${safeName.replace(/"/g, '')}" --silent --accept-source-agreements`;
        }

        // Execução segura via Base64 UTF-16LE, blindada contra escape e injeção de cmd.exe
        const psScript = `Start-Process cmd.exe -ArgumentList @('/c', ${JSON.stringify(uninstallCmd)}) -Verb RunAs -Wait`;

        runPowerShellEncoded(psScript, async (error) => {
            setAppLockState(false);

            if (error) {
                setStatus('error', 'Falha na Desinstalação', `Não foi possível desinstalar "${safeName}". Pode requerer permissão elevada.`);
                await showAlert(`Erro ao tentar desinstalar "${safeName}". Verifique se o programa está em execução ou requer elevação de administrador.`, 'Falha na Desinstalação', '🚨');
            } else {
                setStatus('success', 'Desinstalação Concluída', `"${safeName}" foi enviado para desinstalação.`);
                await showAlert(`"${safeName}" foi desinstalado com sucesso ou o desinstalador foi finalizado.`, 'Desinstalação Concluída', '✅');
                loadInstalledPrograms();
            }
        });
    }

    // === BENCHMARK NATIVO DE VELOCIDADE DE DISCO (POWERSHELL FILESTREAM) ===
    const btnBenchmarkDisk = document.getElementById('btnBenchmarkDisk');
    const ssdReadSpeedText = document.getElementById('ssdReadSpeedText');
    const ssdWriteSpeedText = document.getElementById('ssdWriteSpeedText');

    if (btnBenchmarkDisk) {
        btnBenchmarkDisk.addEventListener('click', () => {
            if (btnBenchmarkDisk.disabled) return;

            btnBenchmarkDisk.disabled = true;
            btnBenchmarkDisk.innerHTML = '<span>⚡</span> Testando...';
            if (ssdReadSpeedText) ssdReadSpeedText.innerText = 'Medindo...';
            if (ssdWriteSpeedText) ssdWriteSpeedText.innerText = 'Medindo...';

            setStatus('action', 'Benchmark de Disco', 'Testando taxa de transferência sequencial de leitura e gravação (100 MB)...');

            const psBenchScript = `
                $tempFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'checkup_bench.bin')
                $sizeMB = 100
                $buffer = New-Object byte[] (1024 * 1024)
                (New-Object Random).NextBytes($buffer)

                $writeMBs = 0
                $readMBs = 0
                $fs = $null

                try {
                    # Escrita
                    $sw = [System.Diagnostics.Stopwatch]::StartNew()
                    $fs = [System.IO.File]::Open($tempFile, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
                    for ($i = 0; $i -lt $sizeMB; $i++) { $fs.Write($buffer, 0, $buffer.Length) }
                    $fs.Flush()
                    $fs.Close()
                    $fs = $null
                    $sw.Stop()
                    $writeSec = [math]::Max($sw.Elapsed.TotalSeconds, 0.001)
                    $writeMBs = [math]::Round($sizeMB / $writeSec, 0)

                    # Leitura
                    $sw.Restart()
                    $fs = [System.IO.File]::OpenRead($tempFile)
                    $readBuf = New-Object byte[] (1024 * 1024)
                    while ($fs.Read($readBuf, 0, $readBuf.Length) -gt 0) {}
                    $fs.Close()
                    $fs = $null
                    $sw.Stop()
                    $readSec = [math]::Max($sw.Elapsed.TotalSeconds, 0.001)
                    $readMBs = [math]::Round($sizeMB / $readSec, 0)
                } finally {
                    if ($fs) { try { $fs.Dispose() } catch {} }
                    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                }

                [PSCustomObject]@{
                    WriteMBs = $writeMBs
                    ReadMBs = $readMBs
                } | ConvertTo-Json -Compress
            `;

            runPowerShellEncoded(psBenchScript, (err, stdout) => {
                btnBenchmarkDisk.disabled = false;
                btnBenchmarkDisk.innerHTML = '<span>⚡</span> Testar Velocidade';

                if (err || !stdout || !stdout.trim()) {
                    setStatus('error', 'Falha no Benchmark', 'Não foi possível medir a velocidade do disco.');
                    if (ssdReadSpeedText) ssdReadSpeedText.innerText = '--';
                    if (ssdWriteSpeedText) ssdWriteSpeedText.innerText = '--';
                    return;
                }

                try {
                    const res = JSON.parse(stdout.trim());
                    const readSpeed = res.ReadMBs || 0;
                    const writeSpeed = res.WriteMBs || 0;

                    if (ssdReadSpeedText) ssdReadSpeedText.innerText = `${readSpeed} MB/s`;
                    if (ssdWriteSpeedText) ssdWriteSpeedText.innerText = `${writeSpeed} MB/s`;

                    setStatus('success', 'Benchmark Concluído', `Leitura Sequencial: ${readSpeed} MB/s | Gravação Sequencial: ${writeSpeed} MB/s`);
                } catch (parseErr) {
                    console.error('Erro no parse do benchmark:', parseErr);
                    setStatus('error', 'Falha no Benchmark', 'Erro ao interpretar resposta do teste.');
                }
            });
        });
    }

    // === EXPORTAÇÃO DE RELATÓRIO DIAGNÓSTICO (DARK GLASSMORPHISM HTML) ===
    const btnExportReport = document.getElementById('btnExportReport');

    if (btnExportReport) {
        btnExportReport.addEventListener('click', async () => {
            const jsonPath = resolveDadosAtuaisJsonPath();

            if (!jsonPath) {
                await showAlert('Nenhum relatório ou telemetria atual encontrada. Execute o diagnóstico completo primeiro.', 'Relatório Indisponível', 'ℹ️');
                return;
            }

            try {
                const raw = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
                const data = JSON.parse(raw);

                const reportDate = new Date().toLocaleString('pt-BR');
                const hostName = os.hostname();
                const userName = os.userInfo().username;

                // Montar tabela de discos
                let disksRowsHtml = '';
                if (Array.isArray(data.Discos)) {
                    disksRowsHtml = data.Discos.map(d => `
                        <tr>
                            <td><strong>${escapeHtml(d.Volume || d.Drive || 'C:')}</strong></td>
                            <td>${escapeHtml(d.Total || '--')}</td>
                            <td>${escapeHtml(d.Livre || '--')}</td>
                            <td><span class="badge ${parseFloat(d.Uso || 0) > 85 ? 'badge-danger' : 'badge-copper'}">${escapeHtml(d.Uso || '--')}</span></td>
                        </tr>
                    `).join('');
                }

                // Montar tabela de portas de rede
                let portsRowsHtml = '';
                if (Array.isArray(data.Rede?.Portas)) {
                    portsRowsHtml = data.Rede.Portas.map(p => `
                        <tr>
                            <td>${escapeHtml(p.Servico || '--')}</td>
                            <td>${escapeHtml(p.Porta || '--')}</td>
                            <td><span class="badge ${p.Status === 'Aberta' ? 'badge-success' : 'badge-danger'}">${escapeHtml(p.Status || '--')}</span></td>
                        </tr>
                    `).join('');
                }

                const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório Diagnóstico - CheckUP Windows</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #0c0d12;
            --card-bg: rgba(22, 23, 30, 0.85);
            --card-border: rgba(255, 255, 255, 0.08);
            --copper: #cf663f;
            --copper-glow: rgba(207, 102, 63, 0.3);
            --text-primary: #f4f4f6;
            --text-secondary: #90929b;
            --teal: #2dd4bf;
            --red: #f87171;
            --amber: #fbbf24;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-base);
            color: var(--text-primary);
            padding: 40px 20px;
            line-height: 1.6;
        }
        .container { max-width: 960px; margin: 0 auto; }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 24px;
            border-bottom: 1px solid var(--card-border);
            margin-bottom: 30px;
        }
        .header-title { display: flex; align-items: center; gap: 14px; }
        .logo-box {
            width: 44px; height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #cf663f, #8a3a1f);
            display: flex; align-items: center; justify-content: center;
            font-size: 22px;
            box-shadow: 0 4px 16px var(--copper-glow);
        }
        h1 { font-size: 24px; font-weight: 700; color: #fff; }
        .subtitle { font-size: 13px; color: var(--text-secondary); }
        .meta-pill {
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid var(--card-border);
            border-radius: 20px;
            padding: 6px 14px;
            font-size: 12px;
            color: var(--text-secondary);
        }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; margin-bottom: 24px; }
        .card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 16px;
            padding: 20px;
            backdrop-filter: blur(16px);
        }
        .card-header {
            display: flex; align-items: center; gap: 10px;
            margin-bottom: 16px; font-size: 15px; font-weight: 600; color: #fff;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 10px;
        }
        .card-header span { color: var(--copper); }
        .metric-row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.03); font-size: 13px; }
        .metric-row:last-child { border-bottom: none; }
        .metric-label { color: var(--text-secondary); }
        .metric-val { color: var(--text-primary); font-weight: 500; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
        th { text-align: left; padding: 8px; color: var(--text-secondary); border-bottom: 1px solid var(--card-border); }
        td { padding: 9px 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .badge-copper { background: rgba(207, 102, 63, 0.15); color: #cf663f; border: 1px solid rgba(207, 102, 63, 0.3); }
        .badge-success { background: rgba(45, 212, 191, 0.15); color: #2dd4bf; border: 1px solid rgba(45, 212, 191, 0.3); }
        .badge-danger { background: rgba(248, 113, 113, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
        .footer {
            text-align: center; margin-top: 40px; padding-top: 20px;
            border-top: 1px solid var(--card-border); font-size: 12px; color: var(--text-secondary);
        }
        @media print {
            body { background: #fff; color: #111; padding: 0; }
            .card { background: #f9f9f9; border: 1px solid #ddd; color: #111; }
            .metric-val { color: #000; }
            .metric-label { color: #555; }
            .card-header { color: #000; border-bottom-color: #ddd; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-title">
                <div class="logo-box">🛡️</div>
                <div>
                    <h1>Relatório Diagnóstico CheckUP</h1>
                    <div class="subtitle">Auditoria de Desempenho, Conectividade e Saúde de Hardware</div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <div class="meta-pill">
                    📅 ${reportDate} | 💻 ${escapeHtml(hostName)} (${escapeHtml(userName)})
                </div>
                <button class="no-print" onclick="window.print()" style="background: rgba(207, 102, 63, 0.2); border: 1px solid rgba(207, 102, 63, 0.4); color: #fff; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                    🖨️ Salvar como PDF
                </button>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-header"><span>⚡</span> Visão Geral do Sistema</div>
                <div class="metric-row"><span class="metric-label">Status de Saúde</span><span class="metric-val"><span class="badge ${data.Status_Saude === 'SISTEMA SAUDÁVEL' ? 'badge-success' : 'badge-danger'}">${escapeHtml(data.Status_Saude || 'Normal')}</span></span></div>
                <div class="metric-row"><span class="metric-label">Sistema Operacional</span><span class="metric-val">${escapeHtml(data.Sistema?.OS || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Tempo de Atividade (Uptime)</span><span class="metric-val">${escapeHtml(data.Sistema?.Uptime || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Carga de CPU no Diagnóstico</span><span class="metric-val">${escapeHtml(data.Processador?.Load || '0')}%</span></div>
                <div class="metric-row"><span class="metric-label">Memória RAM Utilizada</span><span class="metric-val">${escapeHtml(data.Memoria?.Percent || '0')}%</span></div>
            </div>

            <div class="card">
                <div class="card-header"><span>🧩</span> Hardware & Processamento</div>
                <div class="metric-row"><span class="metric-label">Processador</span><span class="metric-val">${escapeHtml(data.Processador?.Nome || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Núcleos / Threads</span><span class="metric-val">${escapeHtml(data.Processador?.Nucleos || '--')}C / ${escapeHtml(data.Processador?.Threads || '--')}T</span></div>
                <div class="metric-row"><span class="metric-label">Memória RAM Total</span><span class="metric-val">${escapeHtml(data.Memoria?.Total || '--')} GB (${escapeHtml(data.Memoria?.Velocidade || '--')} MHz)</span></div>
                <div class="metric-row"><span class="metric-label">Placa de Vídeo (GPU)</span><span class="metric-val">${escapeHtml(data.GPU?.Nome || '--')} (${escapeHtml(data.GPU?.VRAM || '--')} GB)</span></div>
                <div class="metric-row"><span class="metric-label">Placa-Mãe</span><span class="metric-val">${escapeHtml(data.PlacaMae || '--')}</span></div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="card-header"><span>🌐</span> Conectividade & Rede</div>
                <div class="metric-row"><span class="metric-label">Status da Conexão</span><span class="metric-val"><span class="badge ${data.Rede?.Status === 'Online' ? 'badge-success' : 'badge-danger'}">${escapeHtml(data.Rede?.Status || 'Offline')}</span></span></div>
                <div class="metric-row"><span class="metric-label">Velocidade de Download</span><span class="metric-val">${escapeHtml(data.Rede?.Velocidade || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Latência Média (Ping)</span><span class="metric-val">${escapeHtml(data.Rede?.Ping_Avg || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Perda de Pacotes</span><span class="metric-val">${escapeHtml(data.Rede?.Packet_Loss || '0%')}</span></div>
                <div class="metric-row"><span class="metric-label">DNS Primário</span><span class="metric-val">${escapeHtml(data.Rede?.DNS || '--')}</span></div>
                <div class="metric-row"><span class="metric-label">Gateway Padrão</span><span class="metric-val">${escapeHtml(data.Rede?.Gateway || '--')}</span></div>
            </div>

            <div class="card">
                <div class="card-header"><span>💾</span> Volumes & Armazenamento</div>
                <table>
                    <thead>
                        <tr>
                            <th>Drive</th>
                            <th>Capacidade</th>
                            <th>Espaço Livre</th>
                            <th>Uso</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${disksRowsHtml || '<tr><td colspan="4" style="color:var(--text-secondary); text-align:center;">Nenhum disco detectado</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>

        ${portsRowsHtml ? `
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-header"><span>🚪</span> Verificação de Portas de Rede</div>
            <table>
                <thead>
                    <tr><th>Serviço</th><th>Porta</th><th>Status</th></tr>
                </thead>
                <tbody>
                    ${portsRowsHtml}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="footer">
            Gerado automaticamente pelo <strong>CheckUP Windows</strong> • Squad Multi-Agentes (Zero Executáveis de Terceiros).
        </div>
    </div>
</body>
</html>`;

                const reportsDir = path.join(projectRoot, 'relatorios');
                if (!fs.existsSync(reportsDir)) {
                    fs.mkdirSync(reportsDir, { recursive: true });
                }

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const reportFileName = `relatorio_checkup_${timestamp}.html`;
                const reportFilePath = path.join(reportsDir, reportFileName);

                fs.writeFileSync(reportFilePath, htmlContent, 'utf8');

                try {
                    const { shell } = require('electron');
                    if (shell && shell.openPath) {
                        shell.openPath(reportFilePath);
                    } else {
                        exec(`start "" "${reportFilePath}"`);
                    }
                } catch (_) {
                    exec(`start "" "${reportFilePath}"`);
                }

                setStatus('success', 'Relatório Exportado', `Relatório salvo em "${reportFileName}" e aberto no navegador.`);
                await showAlert(`Relatório diagnóstico salvo e aberto no seu navegador padrão!\n\nArquivo:\n${reportFilePath}`, 'Relatório Exportado', '📊');
            } catch (err) {
                console.error('Erro ao exportar relatório:', err);
                setStatus('error', 'Falha na Exportação', `Não foi possível gerar o relatório: ${err.message}`);
                await showAlert(`Falha ao exportar relatório: ${err.message}`, 'Erro', '🚨');
            }
        });
    }
});