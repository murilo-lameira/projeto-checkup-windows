$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$reportsDir = "$PSScriptRoot\..\relatorios"
if (-not (Test-Path $reportsDir)) { New-Item -ItemType Directory -Path $reportsDir | Out-Null }

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

$remoteApps = @("AnyDesk", "TeamViewer", "RustDesk", "tv_w32", "tvnserver")
$activeRemote = @()
foreach ($app in $remoteApps) {
    if (Get-Process -Name $app -ErrorAction SilentlyContinue) {
        $activeRemote += $app
    }
}

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

$logicalDisks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    $totalGB = [math]::Round($_.Size / 1GB, 2)
    $freeGB = [math]::Round($_.FreeSpace / 1GB, 2)
    $usedGB = [math]::Round($totalGB - $freeGB, 2)
    $usedPercent = if ($totalGB -gt 0) { [math]::Round(($usedGB / $totalGB) * 100, 1) } else { 0 }
    [PSCustomObject]@{ DeviceID = $_.DeviceID; TotalGB = $totalGB; FreeGB = $freeGB; UsedPercent = $usedPercent }
}

$physicalDisks = try { Get-PhysicalDisk -ErrorAction SilentlyContinue } catch { @() }

$gpus = Get-CimInstance Win32_VideoController | ForEach-Object {
    $vramGB = "N/A"
    if ($_.AdapterRAM -and $_.AdapterRAM -gt 0) { $vramGB = [math]::Round($_.AdapterRAM / 1GB, 0) }
    if ($_.Name -like "*6650*" -or $_.Name -like "*6700*" -or $_.Name -like "*6800*") { $vramGB = 8 }
    [PSCustomObject]@{ Name = $_.Name; VRAM = "$vramGB"; Resolution = "$($_.CurrentHorizontalResolution) x $($_.CurrentVerticalResolution)" }
}

$internetStatus = Test-Connection -ComputerName "8.8.8.8" -Count 2 -Quiet -ErrorAction SilentlyContinue
$netStatusText = if ($internetStatus) { "Online 🟢" } else { "Offline 🔴" }
$speedText = "N/A"
$avgLatency = 0
$loss = 0

if ($internetStatus) {
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
        if ($loadedData) { foreach ($item in $loadedData) { [void]$historyList.Add($item) } }
    } catch {}
}

[void]$historyList.Add($historyRecord)
$historyList | ConvertTo-Json -Depth 5 | Out-File $jsonHistoryPath -Encoding utf8

$discordWebhookUrl = "https://discord.com/api/webhooks/1539265722264453171/sxaVx1PBCs-QXceSuyYjtG-U2L5tzdZaIACHBiFAZ5O2hGuJyfCEg2x0PXdEPJowiUKN" 
if ($discordWebhookUrl -ne "" -and $healthIssues.Count -gt 0) {
    $alertBody = @{ content = "🚨 **ALERTA CRÍTICO DE SISTEMA - $computerName** 🚨`n" + ($healthIssues -join "`n") } | ConvertTo-Json
    try { Invoke-RestMethod -Uri $discordWebhookUrl -Method Post -Body $alertBody -ContentType 'application/json' -ErrorAction SilentlyContinue } catch {}
}

$topProcs = Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 5
$procArray = @()
foreach ($p in $topProcs) {
    $procArray += [PSCustomObject]@{ Nome = $p.Name; PID = $p.Id; RAM = [math]::Round($p.WorkingSet / 1MB, 1) }
}

$discos = Get-WmiObject Win32_LogicalDisk -Filter "DriveType=3"
$diskArray = @()
foreach ($d in $discos) {
    $livre = [math]::Round($d.FreeSpace / 1GB, 1)
    $total = [math]::Round($d.Size / 1GB, 1)
    $usoPercent = [math]::Round((($total - $livre) / $total) * 100, 1)
    $diskArray += [PSCustomObject]@{ Drive = $d.DeviceID; Uso = "$usoPercent%"; Livre = "$livre GB"; Total = "$total GB" }
}

$diskTempStr = "N/A"
try {
    $tempVal = (Get-StorageReliabilityCounter -ErrorAction SilentlyContinue | Where-Object Temperature -gt 0 | Select-Object -ExpandProperty Temperature -First 1)
    if ($tempVal) { $diskTempStr = "$tempVal °C" }
} catch {}

$gpuInfo = Get-WmiObject Win32_VideoController | Select-Object -First 1
$gpuDetails = $gpus | Select-Object -First 1

$dashboardPayload = [PSCustomObject]@{
    Sistema = [PSCustomObject]@{ 
        OS = (Get-WmiObject Win32_OperatingSystem).Caption.Replace("Microsoft ", "") 
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
        TempDisco = $diskTempStr
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

$jsonPath = "$reportsDir\dados_atuais.json"
$dashboardPayload | ConvertTo-Json -Depth 5 | Out-File $jsonPath -Encoding utf8