# ==============================================================================
# SCRIPT DE CHECKUP GERAL DO SISTEMA E GERADOR DE RELATÓRIO HTML
# ==============================================================================

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Garantir que as pastas de destino existam
$reportsDir = "$PSScriptRoot\..\relatorios"

if (-not (Test-Path $reportsDir)) { New-Item -ItemType Directory -Path $reportsDir | Out-Null }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   CHECKUP GERAL DO SISTEMA EM ANDAMENTO  " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
 
# 1. COLETA DE DADOS (E TEMPO DE BOOT)
Write-Host "[1/10] Coletando informações do Sistema e Hardware..." -ForegroundColor Yellow
$os = Get-CimInstance Win32_OperatingSystem
$cs = Get-CimInstance Win32_ComputerSystem
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
$board = Get-CimInstance Win32_BaseBoard | Select-Object -First 1

$computerName = $env:COMPUTERNAME
$lastBoot = $os.LastBootUpTime
$uptimeSpan = (Get-Date) - $lastBoot
$uptimeStr = "{0} dias, {1} horas, {2} minutos" -f $uptimeSpan.Days, $uptimeSpan.Hours, $uptimeSpan.Minutes

$bootTimeStr = "N/A"
try {
    $bootEvent = Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Diagnostics-Performance'; Id=100} -MaxEvents 1 -ErrorAction SilentlyContinue
    if ($bootEvent) {
        $xml = [xml]$bootEvent.ToXml()
        $bootDurationMs = $xml.Event.EventData.Data | Where-Object { $_.Name -eq 'BootTime' } | Select-Object -ExpandProperty '#text'
        if ($bootDurationMs) { $bootTimeStr = "$([math]::Round([int]$bootDurationMs / 1000, 1)) segundos" }
    }
} catch {}

$cpuName = $cpu.Name
$cpuCores = $cpu.NumberOfCores
$cpuLogical = $cpu.NumberOfLogicalProcessors
$motherboardInfo = "$($board.Manufacturer) $($board.Product)"

Write-Host "      -> Verificando Licença do Windows e Bateria..." -ForegroundColor Cyan

# --- AUDITORIA DE BATERIA ---
$batteryInfo = "Não aplicável (Desktop)"
try {
    $battStatic = Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1
    $battFull = Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if ($battStatic -and $battFull -and $battStatic.DesignedCapacity -gt 0) {
        $design = $battStatic.DesignedCapacity
        $full = $battFull.FullChargedCapacity
        $healthPct = [math]::Round(($full / $design) * 100, 1)
        $batteryInfo = "$healthPct% de Vida Útil ($full mWh / $design mWh)"
    } elseif (Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue) {
        $batteryInfo = "Bateria detectada (leitura de desgaste não suportada pelo modelo)"
    }
} catch {}

# --- AUDITORIA DE LICENÇA DO WINDOWS ---
$licenseInfo = "Desconhecida"
try {
    $winLicense = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($winLicense) {
        $channel = "Desconhecido"
        if ($winLicense.Description -match "OEM") { $channel = "OEM (Fábrica)" }
        elseif ($winLicense.Description -match "RETAIL") { $channel = "Digital (Comprada/Vinculada)" }
        elseif ($winLicense.Description -match "VOLUME") { $channel = "Volume / KMS (Empresarial ou Ativador)" }
        
        $status = if ($winLicense.LicenseStatus -eq 1) { "Ativado ✅" } else { "Não Ativado/Expirado ❌" }
        $licenseInfo = "$status - Tipo: $channel"
    }
} catch {}

Write-Host "      -> Auditando Firewall e Acessos Remotos..." -ForegroundColor Cyan

# --- AUDITORIA DE ACESSO REMOTO (BACKGROUND) ---
# Mapeia softwares comuns de acesso autônomo que ficam residentes na memória
$remoteApps = @("AnyDesk", "TeamViewer", "RustDesk", "tv_w32", "tvnserver")
$activeRemote = @()

foreach ($app in $remoteApps) {
    if (Get-Process -Name $app -ErrorAction SilentlyContinue) {
        $activeRemote += $app
    }
}

# 2. RAM E TEMPERATURA
Write-Host "[2/10] Analisando Memória RAM e Sensores..." -ForegroundColor Yellow
$totalRamGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 0)
$freeRamGB = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$usedRamGB = [math]::Round($totalRamGB - $freeRamGB, 2)
$ramUsagePercent = [math]::Round(($usedRamGB / $totalRamGB) * 100, 1)

$ramModules = Get-CimInstance Win32_PhysicalMemory
$rawManufacturer = ($ramModules | Select-Object -ExpandProperty Manufacturer -ErrorAction SilentlyContinue | Select-Object -Unique)
$rawPartNumber = ($ramModules | Select-Object -ExpandProperty PartNumber -ErrorAction SilentlyContinue | Select-Object -Unique)

$ramManufacturer = "Desconhecido"
if ($rawManufacturer -and $rawManufacturer -ne "Undefined" -and $rawManufacturer -ne "Unknown" -and $rawManufacturer -ne "0000" -and $rawManufacturer.Trim() -ne "") {
    $ramManufacturer = $rawManufacturer -join " / "
} elseif ($rawParts = ($rawPartNumber | Where-Object { $_ -and $_.Trim() -ne "" })) {
    $ramManufacturer = ($rawParts -join " / ").Trim()
}

$speeds = $ramModules | Select-Object -ExpandProperty ConfiguredClockSpeed -ErrorAction SilentlyContinue
if (-not $speeds) { $speeds = $ramModules | Select-Object -ExpandProperty Speed -ErrorAction SilentlyContinue }
$ramSpeed = ($speeds | Sort-Object -Unique) -join " / "
if (-not $ramSpeed) { $ramSpeed = "Desconhecida" }

$cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
if ($null -eq $cpuLoad) { $cpuLoad = 0 }

$cpuTemp = "N/A"
try {
    $thermal = Get-CimInstance -Namespace root\wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($thermal -and $thermal.CurrentTemperature) {
        $tempCelsius = [math]::Round(($thermal.CurrentTemperature / 10) - 273.15, 1)
        if ($tempCelsius -gt 0 -and $tempCelsius -lt 120) { $cpuTemp = "$tempCelsius °C" }
    }
} catch {}

# 3. DISCOS E DESGASTE FÍSICO
Write-Host "[3/10] Verificando Discos e Saúde S.M.A.R.T..." -ForegroundColor Yellow
$logicalDisks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $totalGB = [math]::Round($_.Size / 1GB, 2)
    $freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
    $usedGB = [math]::Round($totalGB - $freeGB, 2)
    $usedPercent = if ($totalGB -gt 0) { [math]::Round(($usedGB / $totalGB) * 100, 1) } else { 0 }
    [PSCustomObject]@{ DeviceID = $_.DeviceID; TotalGB = $totalGB; FreeGB = $freeGB; UsedPercent = $usedPercent }
}

$physicalDiskRows = ""
$physicalDisks = try { Get-PhysicalDisk -ErrorAction SilentlyContinue } catch { @() }
foreach ($pdisk in $physicalDisks) {
    $wear = "N/A"
    try {
        $rel = Get-StorageReliabilityCounter -PhysicalDisk $pdisk -ErrorAction SilentlyContinue
        if ($null -ne $rel.Wear) { $wear = "$($rel.Wear)%" }
    } catch {}
    
    # 1. Tratamento do Tipo de Disco
    $tipoTraduzido = switch ($pdisk.MediaType) {
        "Unspecified" { "Desconhecido" }
        "HDD"         { "HDD" }
        "SSD"         { "SSD" }
        "SCM"         { "Memória Persistente" }
        default       { if ($pdisk.MediaType) { $pdisk.MediaType } else { "Desconhecido" } }
    }

    # 2. Tratamento do Status de Saúde e Cores
    $saudeTexto = "Saudável"
    $healthColor = "var(--green)"

    if ($pdisk.HealthStatus -eq "Warning") {
        $saudeTexto = "Atenção"
        $healthColor = "var(--yellow)"
    } elseif ($pdisk.HealthStatus -eq "Unhealthy") {
        $saudeTexto = "Crítico"
        $healthColor = "var(--red)"
    } elseif ($pdisk.HealthStatus -ne "Healthy" -and $pdisk.HealthStatus) {
        $saudeTexto = $pdisk.HealthStatus
        $healthColor = "var(--yellow)"
    }

    $physicalDiskRows += '<tr><td><strong>' + $pdisk.FriendlyName + '</strong></td><td>' + $tipoTraduzido + '</td><td style="color: ' + $healthColor + '; font-weight: bold;">' + $saudeTexto + '</td><td>' + $wear + '</td></tr>'
}

# 4. GPU
Write-Host "[4/10] Coletando informações da Placa de Vídeo (GPU)..." -ForegroundColor Yellow
$gpus = Get-CimInstance Win32_VideoController | ForEach-Object {
    $vramGB = "N/A"
    if ($_.AdapterRAM -and $_.AdapterRAM -gt 0) { $vramGB = [math]::Round($_.AdapterRAM / 1GB, 0) }
    if ($_.Name -like "*6650*" -or $_.Name -like "*6700*" -or $_.Name -like "*6800*") { $vramGB = 8 }
    [PSCustomObject]@{ Name = $_.Name; VRAM = "$vramGB"; Resolution = "$($_.CurrentHorizontalResolution) x $($_.CurrentVerticalResolution)" }
}

# 5 & 6. REDE E ESTABILIDADE
Write-Host "[6/10] Analisando Conectividade..." -ForegroundColor Yellow
$internetStatus = Test-Connection -ComputerName "8.8.8.8" -Count 2 -Quiet -ErrorAction SilentlyContinue
$netStatusText = if ($internetStatus) { "Online 🟢" } else { "Offline 🔴" }
$speedText = "N/A"

if ($internetStatus) {
    Write-Host "      -> Medindo estabilidade (Perda de Pacotes e Latência)..." -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $client = New-Object System.Net.WebClient
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $client.DownloadData("https://speed.cloudflare.com/__down?bytes=5000000") | Out-Null
        $sw.Stop()
        $speedText = "$([math]::Round((40 / $sw.Elapsed.TotalSeconds), 1)) Mbps"
        $client.Dispose()
    } catch { $speedText = "Falha no teste" }

    $pingTest = Test-Connection -ComputerName "8.8.8.8" -Count 10 -ErrorAction SilentlyContinue
    if ($pingTest) {
        $received = ($pingTest | Where-Object { $_.Status -eq 'Success' -or $_.ReplySize -gt 0 -or $_.ResponseTime -ge 0 }).Count
        $loss = ((10 - $received) / 10) * 100
        $avgLatency = [math]::Round(($pingTest | Measure-Object -Property ResponseTime -Average -ErrorAction SilentlyContinue).Average, 0)
    }
}

# 7. SEGURANÇA E ERROS
Write-Host "[7/10] Verificando Segurança e Erros..." -ForegroundColor Yellow
$antivirus = try { (Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue).displayName } catch { "Windows Defender" }
if (-not $antivirus) { $antivirus = "Windows Defender" }
$firewall = if ((Get-NetFirewallProfile -ErrorAction SilentlyContinue | Where-Object Enabled -eq $true)) { "Ativo" } else { "Inativo" }

$recentErrors = try {
    Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-1)} -MaxEvents 10 -ErrorAction SilentlyContinue | 
    Where-Object { $_.ProviderName -ne "Microsoft-Windows-DistributedCOM" -and $_.Id -ne 10016 } | Select-Object -First 6
} catch { @() }

$errorRecords = @()
foreach ($errorEvent in @($recentErrors)) {
    $errorMessage = ($errorEvent.Message -replace '\s+', ' ').Trim()
    if ($errorMessage.Length -gt 220) { $errorMessage = $errorMessage.Substring(0, 220) + '...' }
    $errorRecords += [PSCustomObject]@{
        Id = $errorEvent.Id
        Fonte = $errorEvent.ProviderName
        DataHora = $errorEvent.TimeCreated.ToString('dd/MM HH:mm')
        Mensagem = $errorMessage
    }
}

# 8. CÁLCULO DE SCORE DE SAÚDE E ALERTAS
Write-Host "[8/10] Analisando Saúde do Sistema..." -ForegroundColor Yellow
$healthIssues = @()
$healthWarnings = @()

try {
    $latestHotFix = Get-HotFix -ErrorAction SilentlyContinue | Where-Object InstalledOn | Sort-Object InstalledOn -Descending | Select-Object -First 1
    if (-not $latestHotFix -or ((Get-Date) - [datetime]$latestHotFix.InstalledOn).Days -gt 45) {
        $healthWarnings += "Atualizações do Windows podem estar pendentes. Verifique o Windows Update."
    }
} catch {}

if ($ramUsagePercent -gt 85) { $healthWarnings += "Uso de Memória RAM elevado ($ramUsagePercent%). Dica: Feche abas do navegador ou considere um upgrade de memória." }
if ($cpuLoad -gt 80) { $healthWarnings += "Uso de Processador (CPU) elevado ($cpuLoad%). Dica: Verifique se há atualizações rodando em segundo plano no Gerenciador de Tarefas." }

foreach ($disk in $logicalDisks) {
    if ($disk.UsedPercent -gt 90) {
        $healthIssues += "Disco $($disk.DeviceID) com espaço livre crítico ($($disk.FreeGB) GB restantes). Risco de travamentos no Windows."
    } elseif ($disk.UsedPercent -gt 80) {
        $healthWarnings += "Disco $($disk.DeviceID) atingindo a capacidade máxima ($($disk.FreeGB) GB livres). Recomenda-se realizar uma limpeza de arquivos temporários."
    }
}

foreach ($pdisk in $physicalDisks) {
    if ($pdisk.HealthStatus -and $pdisk.HealthStatus -ne "Healthy") {
        $healthIssues += "Atenção no Disco Físico $($pdisk.FriendlyName): Saúde reporta status '$($pdisk.HealthStatus)'. Faça backup dos seus arquivos urgentemente!"
    }
}

if (-not $internetStatus) {
    $healthWarnings += "Sem conexão ativa com a Internet (Ping falhou). Algumas verificações podem estar incompletas."
}

$statusBadgeText = "SISTEMA SAUDÁVEL"

if ($healthIssues.Count -gt 0) {
    $statusBadgeText = "PROBLEMAS DETECTADOS"
} elseif ($healthWarnings.Count -gt 0) {
    $statusBadgeText = "ALERTAS DE ATENÇÃO"
}

$alertsContent = ""
if ($healthIssues.Count -eq 0 -and $healthWarnings.Count -eq 0) {
    $alertsContent += '<div class="alert-box success"><span>✅</span><div><strong>Tudo certo!</strong> Nenhum problema crítico, falha de disco ou alerta de desempenho foi encontrado durante a análise. Seu PC está otimizado.</div></div>'
} else {
    foreach ($issue in $healthIssues) { $alertsContent += '<div class="alert-box danger"><span>🚨</span><div><strong>Atenção Crítica:</strong> ' + $issue + '</div></div>' }
    foreach ($warn in $healthWarnings) { $alertsContent += '<div class="alert-box warning"><span>⚠️</span><div><strong>Alerta:</strong> ' + $warn + '</div></div>' }
}

# 8.1 - SALVAR HISTÓRICO PERSISTENTE (JSON PARA POWER BI / DATASET)
$historyDir = "$PSScriptRoot\..\historico"
if (-not (Test-Path $historyDir)) { New-Item -ItemType Directory -Path $historyDir | Out-Null }

$historyRecord = [PSCustomObject]@{
    DataHora       = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Computador     = $computerName
    CPU_Load       = $cpuLoad
    CPU_Temp       = $cpuTemp
    RAM_Usage_Pct  = $ramUsagePercent
    RAM_Used_GB    = $usedRamGB
    RAM_Total_GB   = $totalRamGB
    Boot_Time      = $bootTimeStr
    Internet_Status= $internetStatus
    Ping_Avg_ms    = $avgLatency
    Packet_Loss    = $loss
    Status_Saude   = $statusBadgeText
}

$jsonHistoryPath = "$historyDir\historico_checkup.json"
$historyList = [System.Collections.Generic.List[PSCustomObject]]::New()

if (Test-Path $jsonHistoryPath) {
    try {
        $loadedData = Get-Content $jsonHistoryPath -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($loadedData) {
            foreach ($item in $loadedData) {
                [void]$historyList.Add($item)
            }
        }
    } catch {}
}

[void]$historyList.Add($historyRecord)
$historyList | ConvertTo-Json -Depth 5 | Out-File $jsonHistoryPath -Encoding utf8

# 8.2 - DISPARAR WEBHOOK (DISCORD) SE HOUVER PROBLEMA CRÍTICO
$discordWebhookUrl = "https://discord.com/api/webhooks/1539265722264453171/sxaVx1PBCs-QXceSuyYjtG-U2L5tzdZaIACHBiFAZ5O2hGuJyfCEg2x0PXdEPJowiUKN" 

if ($discordWebhookUrl -ne "" -and $healthIssues.Count -gt 0) {
    $alertBody = @{
        content = "🚨 **ALERTA CRÍTICO DE SISTEMA - $computerName** 🚨`n" + ($healthIssues -join "`n")
    } | ConvertTo-Json
    
    try {
        Invoke-RestMethod -Uri $discordWebhookUrl -Method Post -Body $alertBody -ContentType 'application/json' -ErrorAction SilentlyContinue
    } catch {}
}

# 9. GERAÇÃO DA FERRAMENTA DE REPARO AVANÇADA
Write-Host "[9/10] Criando script auxiliar de Limpeza e Reparo..." -ForegroundColor Yellow
$repairBatPath = "$PSScriptRoot\Ferramenta_Reparo.bat"
$repairBatContent = @"
@echo off
color 0B
title Ferramenta Avancada de Limpeza e Reparo do Sistema
chcp 65001 > nul

:: Solicitacao de Privilegios de Administrador
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Solicitando privilegios de Administrador...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B
)

echo =======================================================
echo      FERRAMENTA AVANCADA DE REPARO E OTIMIZACAO
echo =======================================================
echo.

echo [1/7] Restaurando e Otimizando a Rede (DNS, Winsock, IP)...
ipconfig /flushdns >nul
netsh winsock reset >nul
netsh int ip reset >nul
echo       - Rede redefinida com sucesso.
echo.

echo [2/7] Limpando Arquivos Lixo e Caches de Sistema...
del /q /f /s "%TEMP%\*" >nul 2>&1
del /q /f /s "C:\Windows\Temp\*" >nul 2>&1
del /q /f /s "C:\Windows\Prefetch\*" >nul 2>&1
rd /s /q %systemdrive%\`$Recycle.bin >nul 2>&1
echo       - Arquivos temporarios, prefetch e lixeira limpos.
echo.

echo [3/7] Limpando Cache de Atualizacoes (Windows Update)...
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
net stop cryptSvc >nul 2>&1
net stop msiserver >nul 2>&1
del /q /f /s "%systemroot%\SoftwareDistribution\Download\*" >nul 2>&1
net start wuauserv >nul 2>&1
net start bits >nul 2>&1
net start cryptSvc >nul 2>&1
net start msiserver >nul 2>&1
echo       - Servicos de atualizacao destravados.
echo.

echo [4/7] Sincronizando o Relogio do Windows (Certificados SSL)...
w32tm /resync >nul 2>&1
echo       - Relogio sincronizado.
echo.

echo [5/7] Executando SFC (Verificacao de Integridade dos Arquivos)...
echo       - Isso pode demorar alguns minutos. Aguarde...
sfc /scannow
echo.

echo [6/7] Executando DISM (Reparo da Imagem do Windows)...
echo       - Restaurando a saude do sistema. Aguarde...
DISM /Online /Cleanup-Image /RestoreHealth
echo.

echo [7/7] Atualizando Aplicativos via Winget...
echo       - Buscando novas versoes para seus programas em segundo plano...
winget upgrade --all --include-unknown --silent --accept-package-agreements --accept-source-agreements
echo.

echo =======================================================
echo    OTIMIZACAO E REPARO CONCLUIDOS COM SUCESSO!
echo =======================================================
echo Recomendamos que reinicie o computador para aplicar todas as mudancas de rede.
pause
"@

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($repairBatPath, $repairBatContent, $utf8NoBom)

# 10. GERAR PACOTE DE TELEMETRIA (JSON) PARA O DASHBOARD
Write-Host "[10/10] Compilando payload de telemetria detalhado..." -ForegroundColor Yellow

# Capturando Top 5 Processos
$topProcs = Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5
$procArray = @()
foreach ($p in $topProcs) {
    $procArray += [PSCustomObject]@{ Nome = $p.Name; PID = $p.Id; RAM = [math]::Round($p.WorkingSet / 1MB, 1) }
}

# Capturando Discos
$discos = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
$diskArray = @()
foreach ($d in $discos) {
    $livre = [math]::Round($d.FreeSpace / 1GB, 1)
    $total = [math]::Round($d.Size / 1GB, 1)
    $usoPercent = [math]::Round((($total - $livre) / $total) * 100, 1)
    $diskArray += [PSCustomObject]@{ Drive = $d.DeviceID; Uso = "$usoPercent%"; Livre = "$livre GB"; Total = "$total GB" }
}

# Capturando GPU (Garante leitura limpa)
$gpuInfo = Get-WmiObject Win32_VideoController | Select-Object -First 1
$gpuDetails = $gpus | Select-Object -First 1

# Montando o Pacote JSON Completo
$dashboardPayload = [PSCustomObject]@{
    Sistema = [PSCustomObject]@{ 
        OS = (Get-WmiObject Win32_OperatingSystem).Caption.Replace("Microsoft ", "") # Limpa o nome
        Uptime = $uptimeStr
        Licenca = $licenseInfo
        Bateria = $batteryInfo 
    }
    PlacaMae = $motherboardInfo
    Processador = [PSCustomObject]@{ 
        Nome = $cpuName
        Nucleos = $cpuCores
        Threads = $cpuLogical
        Load = $cpuLoad
        Temp = $cpuTemp 
    }
    Memoria = [PSCustomObject]@{ 
        Total = $totalRamGB
        Uso = $usedRamGB
        Percent = $ramUsagePercent
        Velocidade = $ramSpeed
        Fabricante = $ramManufacturer
    }
    GPU = [PSCustomObject]@{
        Nome = if ($gpuInfo.Name) { $gpuInfo.Name } else { "N/A" }
        Driver = if ($gpuInfo.DriverVersion) { $gpuInfo.DriverVersion } else { "N/A" }
        VRAM = if ($gpuDetails.VRAM) { $gpuDetails.VRAM } else { "N/A" }
        Resolucao = if ($gpuDetails.Resolution) { $gpuDetails.Resolution } else { "N/A" }
    }
    Rede = [PSCustomObject]@{ 
        Status = $netStatusText
        Velocidade = $speedText 
    }
    Saude = [PSCustomObject]@{
        Status = $statusBadgeText
        Problemas = @($healthIssues)
        Avisos = @($healthWarnings)
    }
    Seguranca = [PSCustomObject]@{
        Antivirus = "Ativo - $antivirus"
        Firewall = $firewall
        AcessoRemoto = if ($activeRemote.Count -gt 0) { "Atenção: $($activeRemote -join ', ')" } else { "Nenhum serviço detectado" }
    }
    Erros = $errorRecords
    Discos = $diskArray
    Processos = $procArray
}

# Exportação
$jsonPath = "$reportsDir\dados_atuais.json"
$dashboardPayload | ConvertTo-Json -Depth 5 | Out-File $jsonPath -Encoding utf8

Write-Host "Pacote JSON detalhado exportado com sucesso!" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  CHECKUP CONCLUÍDO COM SUCESSO!         " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green