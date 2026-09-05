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

# =========================================================
# === CAPTURA DE TEMPERATURA (LIBREHARDWAREMONITORLIB) ===
# =========================================================
$libDir = Join-Path $PSScriptRoot "lib"
$lhmDllPath = Join-Path $libDir "LibreHardwareMonitorLib.dll"

# Fallback se a DLL estiver diretamente na raiz de core
if (-not (Test-Path $lhmDllPath)) {
    $fallbackLhm = Join-Path $PSScriptRoot "LibreHardwareMonitorLib.dll"
    if (Test-Path $fallbackLhm) {
        $lhmDllPath = $fallbackLhm
        $libDir = $PSScriptRoot
    }
}

# Download automático da biblioteca caso não exista
if (-not (Test-Path $lhmDllPath)) {
    try {
        if (-not (Test-Path $libDir)) { New-Item -ItemType Directory -Path $libDir -Force | Out-Null }
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $lhmZipPath = Join-Path $libDir "lhm_temp.zip"
        $lhmTempFolder = Join-Path $libDir "lhm_temp"
        $lhmUrl = "https://github.com/LibreHardwareMonitor/LibreHardwareMonitor/releases/latest/download/LibreHardwareMonitor.zip"
        Invoke-WebRequest -Uri $lhmUrl -OutFile $lhmZipPath -UseBasicParsing -TimeoutSec 15
        if (Test-Path $lhmZipPath) {
            Expand-Archive -Path $lhmZipPath -DestinationPath $lhmTempFolder -Force
            Get-ChildItem -Path $lhmTempFolder -Include "*.dll", "*.sys" -Recurse | ForEach-Object {
                Copy-Item -Path $_.FullName -Destination $libDir -Force
            }
            Remove-Item -Path $lhmZipPath -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $lhmTempFolder -Recurse -Force -ErrorAction SilentlyContinue
        }
    } catch {}
}

$cpuTemp = "N/A"
$diskTempStr = "N/A"

# 1. Carregamento e leitura dos sensores via LibreHardwareMonitorLib
if (Test-Path $lhmDllPath) {
    try {
        # Carregamento absoluto de todas as dependências auxiliares (ex: HidSharp.dll)
        if (Test-Path $libDir) {
            Get-ChildItem -Path $libDir -Filter "*.dll" | ForEach-Object {
                try { [System.Reflection.Assembly]::LoadFrom($_.FullName) | Out-Null } catch {}
            }
        }
        [System.Reflection.Assembly]::LoadFrom((Resolve-Path $lhmDllPath).Path) | Out-Null

        $computer = New-Object LibreHardwareMonitor.Hardware.Computer
        $computer.IsCpuEnabled = $true
        $computer.IsStorageEnabled = $true
        $computer.IsGpuEnabled = $true
        $computer.IsMotherboardEnabled = $true
        $computer.Open()

        try {
            $cpuTempSensors = [System.Collections.Generic.List[object]]::new()

            # Função de varredura recursiva em Hardwares e SubHardwares
            function Update-And-Collect-Sensors($hw) {
                $hw.Update()
                if ($hw.SubHardware) {
                    foreach ($sub in $hw.SubHardware) {
                        Update-And-Collect-Sensors $sub
                    }
                }

                # Coleta sensores de temperatura da CPU com valores válidos (> 0)
                if ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::Cpu) {
                    if ($hw.Sensors) {
                        foreach ($s in $hw.Sensors) {
                            if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $null -ne $s.Value -and [double]$s.Value -gt 0) {
                                $cpuTempSensors.Add($s)
                            }
                        }
                    }
                }

                # Armazenamento (SSD NVMe, SATA, HD)
                if ($hw.HardwareType -eq [LibreHardwareMonitor.Hardware.HardwareType]::Storage) {
                    if ($hw.Sensors) {
                        foreach ($s in $hw.Sensors) {
                            if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $null -ne $s.Value -and [double]$s.Value -gt 0) {
                                $valC = [math]::Round([double]$s.Value, 1)
                                if ($script:diskTempStr -eq "N/A" -or $s.Name -like "*Temperature*" -or $s.Name -like "*Composite*") {
                                    $script:diskTempStr = "$valC °C"
                                }
                            }
                        }
                    }
                }

                # GPU (Nvidia, AMD, Intel)
                if ($hw.HardwareType -in @([LibreHardwareMonitor.Hardware.HardwareType]::GpuNvidia, [LibreHardwareMonitor.Hardware.HardwareType]::GpuAmd, [LibreHardwareMonitor.Hardware.HardwareType]::GpuIntel)) {
                    if ($hw.Sensors) {
                        foreach ($s in $hw.Sensors) {
                            if ($s.SensorType -eq [LibreHardwareMonitor.Hardware.SensorType]::Temperature -and $null -ne $s.Value -and [double]$s.Value -gt 0) {
                                $valC = [math]::Round([double]$s.Value, 1)
                                if ($script:gpuTempStr -eq "N/A" -or $s.Name -like "*Core*" -or $s.Name -like "*GPU*") {
                                    $script:gpuTempStr = "$valC °C"
                                }
                            }
                        }
                    }
                }
            }

            foreach ($h in $computer.Hardware) {
                Update-And-Collect-Sensors $h
            }

            # Resolução Inteligente da Temperatura da CPU (Universal AMD e Intel)
            if ($cpuTempSensors.Count -gt 0) {
                $selectedCpuTemp = $null

                # Prioridade 1: Sensores de Encapsulamento / Gerais
                $generalPatterns = @(
                    "*Package*",
                    "*Tctl*",
                    "*Tdie*",
                    "*Core (Tctl/Tdie)*",
                    "*CPU Total*",
                    "*Core Max*"
                )

                foreach ($pattern in $generalPatterns) {
                    $matched = $cpuTempSensors | Where-Object { $_.Name -like $pattern -and $null -ne $_.Value -and [double]$_.Value -gt 0 } | Select-Object -First 1
                    if ($matched) {
                        $selectedCpuTemp = [double]$matched.Value
                        break
                    }
                }

                # Prioridade 2: Sensores por Núcleo (Fallback Intel/AMD: Core #1, Core #2, Core #N)
                if ($null -eq $selectedCpuTemp) {
                    $coreSensors = $cpuTempSensors | Where-Object { 
                        ($_.Name -like "*Core #*" -or $_.Name -match "Core\s*#?\d+") -and $null -ne $_.Value -and [double]$_.Value -gt 0
                    }
                    if ($coreSensors -and $coreSensors.Count -gt 0) {
                        $maxCoreVal = ($coreSensors | Measure-Object -Property Value -Maximum).Maximum
                        if ($null -ne $maxCoreVal -and [double]$maxCoreVal -gt 0) {
                            $selectedCpuTemp = [double]$maxCoreVal
                        }
                    }
                }

                # Prioridade 3: Primeiro Sensor Válido (Leitura genérica de temperatura)
                if ($null -eq $selectedCpuTemp) {
                    $firstValid = $cpuTempSensors | Where-Object { $null -ne $_.Value -and [double]$_.Value -gt 0 } | Select-Object -First 1
                    if ($firstValid) {
                        $selectedCpuTemp = [double]$firstValid.Value
                    }
                }

                if ($null -ne $selectedCpuTemp) {
                    $cpuTemp = "$([math]::Round($selectedCpuTemp, 1)) °C"
                }
            }
        } finally {
            if ($computer) {
                $computer.Close()
            }
        }
    } catch {}
}

# 2. Fallbacks de CPU (MSAcpi e Zonas Térmicas)
if ($cpuTemp -eq "N/A") {
    try {
        $thermal = Get-CimInstance -Namespace root\wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($thermal -and $thermal.CurrentTemperature) {
            $tempCelsius = [math]::Round(($thermal.CurrentTemperature / 10) - 273.15, 1)
            if ($tempCelsius -gt 0 -and $tempCelsius -lt 120) { $cpuTemp = "$tempCelsius °C" }
        }
    } catch {}
}

if ($cpuTemp -eq "N/A") {
    try {
        $thermalZones = Get-CimInstance -ClassName Win32_PerfFormattedData_Counters_ThermalZoneInformation -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($thermalZones -and $thermalZones.HighPrecisionTemperature) {
            $tempCelsius = [math]::Round(($thermalZones.HighPrecisionTemperature / 10.0) - 273.15, 1)
            if ($tempCelsius -gt 0 -and $tempCelsius -lt 120) { $cpuTemp = "$tempCelsius °C" }
        }
    } catch {}
}

# 3. Fallbacks de Armazenamento (PhysicalDisk e StorageReliabilityCounter)
if ($diskTempStr -eq "N/A") {
    try {
        $physDisksForTemp = Get-PhysicalDisk -ErrorAction SilentlyContinue
        if ($physDisksForTemp) {
            foreach ($pd in $physDisksForTemp) {
                try {
                    $rel = $pd | Get-StorageReliabilityCounter -ErrorAction SilentlyContinue
                    if ($rel -and $rel.Temperature -gt 0) {
                        $diskTempStr = "$($rel.Temperature) °C"
                        break
                    }
                } catch {}
            }
        }
    } catch {}
}

if ($diskTempStr -eq "N/A") {
    try {
        $tempVal = (Get-StorageReliabilityCounter -ErrorAction SilentlyContinue | `
            Where-Object { $_.Temperature -gt 0 } | Select-Object -ExpandProperty Temperature -First 1)
        if ($tempVal) { $diskTempStr = "$tempVal °C" }
    } catch {}
}

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
$netStatusText = if ($internetStatus) { "Online" } else { "Offline" }
$speedText = "N/A"
$avgLatency = 0
$loss = 0

if ($internetStatus) {
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $client = New-Object System.Net.WebClient
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $client.DownloadData("https://speed.cloudflare.com/__down?bytes=5000000") | Out-Null
        $client.DownloadData("https://speed.cloudflare.com/__down?bytes=1000000") | Out-Null
        $sw.Stop()
        $speedText = "$([math]::Round((40 / $sw.Elapsed.TotalSeconds), 1)) Mbps"
        $speedText = "$([math]::Round((8 / $sw.Elapsed.TotalSeconds), 1)) Mbps"
        $client.Dispose()
    } catch { $speedText = "Falha no teste" }

    $pingTest = Test-Connection -ComputerName "8.8.8.8" -Count 10 -ErrorAction SilentlyContinue
    $pingTest = Test-Connection -ComputerName "8.8.8.8" -Count 2 -ErrorAction SilentlyContinue
    if ($pingTest) {
        $received = ($pingTest | Where-Object { $_.Status -eq 'Success' -or $_.ReplySize -gt 0 -or $_.ResponseTime -ge 0 }).Count
        $loss = ((10 - $received) / 10) * 100
        $loss = ((2 - $received) / 2) * 100
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
if ($recentErrors) {
    foreach ($err in $recentErrors) {
        $msg = if ($err.Message) { $err.Message } else { "Sem descrição adicional" }
        $errorRecords += [PSCustomObject]@{
            DataHora = $err.TimeCreated.ToString("dd/MM/yyyy HH:mm:ss")
            Fonte = $err.ProviderName
            Id = $err.Id
            Mensagem = $msg
        }
    }
}

$healthIssues = @()
$healthWarnings = @()

try {
    $latestHotFix = Get-HotFix -ErrorAction SilentlyContinue | Where-Object InstalledOn | Sort-Object InstalledOn -Descending | Select-Object -First 1
    $latestHotFix = Get-CimInstance -ClassName Win32_QuickFixEngineering -ErrorAction SilentlyContinue | Where-Object InstalledOn | Sort-Object InstalledOn -Descending | Select-Object -First 1
    if (-not $latestHotFix -or ((Get-Date) - [datetime]$latestHotFix.InstalledOn).Days -gt 45) {
        $healthWarnings += "Atualizações do Windows podem estar pendentes. Verifique o Windows Update."
    }
} catch {}

if ($ramUsagePercent -gt 85) { $healthWarnings += "Uso de Memória RAM elevado ($($ramUsagePercent)%). Dica: Feche abas do navegador ou considere um upgrade de memória." }
if ($cpuLoad -gt 80) { $healthWarnings += "Uso de Processador (CPU) elevado ($($cpuLoad)%). Dica: Verifique se há atualizações rodando em segundo plano no Gerenciador de Tarefas." }

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
    DataHora        = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    Computador      = $computerName
    CPU_Load        = $cpuLoad
    CPU_Temp        = $cpuTemp
    Disk_Temp       = $diskTempStr
    RAM_Usage_Pct   = $ramUsagePercent
    RAM_Used_GB     = $usedRamGB
    RAM_Total_GB    = $totalRamGB
    Boot_Time       = $bootTimeStr
    Internet_Status = $internetStatus
    Ping_Avg_ms     = $avgLatency
    Packet_Loss     = $loss
    Erros_Qtd       = @($errorRecords).Count
    Status_Saude    = $statusBadgeText
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

# === TRAVA NOS ÚLTIMOS 50 REGISTROS ===
while ($historyList.Count -gt 50) {
    $historyList.RemoveAt(0)
}

$historyList | ConvertTo-Json -Depth 5 | Out-File $jsonHistoryPath -Encoding utf8

$discordWebhookUrl = if ($env:CHECKUP_DISCORD_WEBHOOK) { $env:CHECKUP_DISCORD_WEBHOOK } else { "" }
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
$discos = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3"
$diskArray = @()
foreach ($d in $discos) {
    $livre = [math]::Round($d.FreeSpace / 1GB, 1)
    $total = [math]::Round($d.Size / 1GB, 1)
    $usoPercent = [math]::Round((($total - $livre) / $total) * 100, 1)
    $diskArray += [PSCustomObject]@{ Drive = $d.DeviceID; Uso = "$usoPercent%"; Livre = "$livre GB"; Total = "$total GB" }
}

$gpuInfo = Get-WmiObject Win32_VideoController | Select-Object -First 1
$gpuInfo = Get-CimInstance Win32_VideoController | Select-Object -First 1
$gpuDetails = $gpus | Select-Object -First 1

$dashboardPayload = [PSCustomObject]@{
    Sistema = [PSCustomObject]@{ 
        OS = (Get-WmiObject Win32_OperatingSystem).Caption.Replace("Microsoft ", "") 
        OS = if ($os.Caption) { $os.Caption.Replace("Microsoft ", "") } else { "Windows" } 
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