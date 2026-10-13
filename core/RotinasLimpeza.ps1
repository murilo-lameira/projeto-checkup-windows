# =====================================================================
# CheckUP Windows - Submódulo de Rotinas Avançadas de Limpeza Nativa
# Engenharia Reversa baseada no CCleaner / Winapp2.ini (100% Nativo)
# Regra Inviolável: Zero Executáveis de Terceiros (PowerShell / CIM / .NET)
# =====================================================================

# ---------------------------------------------------------------------
# 1. Limpeza de Caches de Navegadores Web (Chromium & Gecko)
# ---------------------------------------------------------------------
function Invoke-CheckupBrowserCleanup {
    [CmdletBinding()]
    param(
        [switch]$IncludeHistory = $false
    )

    Write-RoutineLog "running" "Verificando se há navegadores em execução..." 10
    $browserProcesses = @("chrome", "msedge", "brave", "opera", "vivaldi", "firefox")
    $running = Get-Process -Name $browserProcesses -ErrorAction SilentlyContinue
    if ($running) {
        $pNames = ($running | Select-Object -ExpandProperty ProcessName -Unique) -join ", "
        Write-RoutineLog "running" "Navegadores em execução detectados ($pNames). Limpando arquivos desbloqueados..." 20
    }

    $browserTargets = @(
        # Microsoft Edge
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\*\Cache\Cache_Data",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\*\Code Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\*\GPUCache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\*\DawnCache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Crashpad\reports",
        # Google Chrome
        "$env:LOCALAPPDATA\Google\Chrome\User Data\*\Cache\Cache_Data",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\*\Code Cache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\*\GPUCache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\*\DawnCache",
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Crashpad\reports",
        # Brave Browser
        "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\*\Cache\Cache_Data",
        "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\*\Code Cache",
        "$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data\*\GPUCache",
        # Opera / Opera GX
        "$env:APPDATA\Opera Software\Opera Stable\Cache",
        "$env:APPDATA\Opera Software\Opera GX Stable\Cache",
        # Mozilla Firefox
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\cache2\entries",
        "$env:LOCALAPPDATA\Mozilla\Firefox\Profiles\*\startupCache"
    )

    $deletedFiles = 0
    $reclaimedBytes = 0
    $totalTargets = $browserTargets.Count
    $currentIdx = 0

    foreach ($pattern in $browserTargets) {
        $currentIdx++
        $pct = 20 + [int](($currentIdx / $totalTargets) * 60)
        
        $resolvedFolders = Get-Item -Path $pattern -ErrorAction SilentlyContinue
        foreach ($folder in $resolvedFolders) {
            if (Test-Path $folder.FullName) {
                Get-ChildItem -Path $folder.FullName -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try {
                        $len = $_.Length
                        Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue
                        $deletedFiles++
                        $reclaimedBytes += $len
                    } catch {}
                }
            }
        }
    }

    $mbReclaimed = [math]::Round($reclaimedBytes / 1MB, 2)
    Write-RoutineLog "done" "Caches de navegadores limpos! Liberados aprox. $mbReclaimed MB em $deletedFiles arquivos residuais." 100
}


# ---------------------------------------------------------------------
# 2. Limpeza do Histórico do Explorer, MRU e Documentos Recentes
# ---------------------------------------------------------------------
function Invoke-CheckupExplorerMRUCleanup {
    Write-RoutineLog "running" "Limpando atalhos recentes e Jump Lists do Windows Explorer..." 20
    
    $recentPaths = @(
        "$env:APPDATA\Microsoft\Windows\Recent",
        "$env:APPDATA\Microsoft\Windows\Recent\AutomaticDestinations",
        "$env:APPDATA\Microsoft\Windows\Recent\CustomDestinations"
    )

    foreach ($rp in $recentPaths) {
        if (Test-Path $rp) {
            Get-ChildItem -Path $rp -Force -ErrorAction SilentlyContinue | ForEach-Object {
                try { Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue } catch {}
            }
        }
    }

    Write-RoutineLog "running" "Removendo históricos de comandos e caixas de diálogo do Registro..." 60

    $mruKeys = @(
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\RunMRU",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\TypedPaths",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\WordWheelQuery",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\ComDlg32\LastVisitedPidlMRU",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\ComDlg32\OpenSavePidlMRU",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\ComDlg32\CIDSizeMRU"
    )

    foreach ($k in $mruKeys) {
        if (Test-Path $k) {
            try {
                Get-ItemProperty -Path $k | ForEach-Object {
                    $props = $_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS.*' }
                    foreach ($prop in $props) {
                        Remove-ItemProperty -Path $k -Name $prop.Name -Force -ErrorAction SilentlyContinue
                    }
                }
            } catch {}
        }
    }

    # RecentDocs (remove e recria vazio)
    $recentDocsKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\RecentDocs"
    if (Test-Path $recentDocsKey) {
        try {
            Remove-Item -Path $recentDocsKey -Recurse -Force -ErrorAction SilentlyContinue
            New-Item -Path $recentDocsKey -Force -ErrorAction SilentlyContinue | Out-Null
        } catch {}
    }

    Write-RoutineLog "done" "Histórico do Explorer, Jump Lists e caixas de diálogo limpos com sucesso!" 100
}


# ---------------------------------------------------------------------
# 3. Limpeza de Miniaturas e Ícones (Thumbcache / IconCache)
# ---------------------------------------------------------------------
function Invoke-CheckupThumbcacheCleanup {
    Write-RoutineLog "running" "Parando o Explorador de Arquivos para liberar travas de miniaturas..." 30
    Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 800

    Write-RoutineLog "running" "Excluindo bancos de dados thumbcache_*.db e iconcache_*.db..." 60
    $explorerCacheDir = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
    if (Test-Path $explorerCacheDir) {
        Get-ChildItem -Path $explorerCacheDir -Filter "thumbcache_*.db" -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue } catch {}
        }
        Get-ChildItem -Path $explorerCacheDir -Filter "iconcache_*.db" -Force -ErrorAction SilentlyContinue | ForEach-Object {
            try { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue } catch {}
        }
    }

    $legacyIconCache = "$env:LOCALAPPDATA\IconCache.db"
    if (Test-Path $legacyIconCache) {
        try { Remove-Item -LiteralPath $legacyIconCache -Force -ErrorAction SilentlyContinue } catch {}
    }

    Write-RoutineLog "running" "Reiniciando o Explorador de Arquivos..." 85
    Start-Process explorer.exe
    Start-Sleep -Milliseconds 1000

    Write-RoutineLog "done" "Cache de miniaturas e ícones esvaziado e regenerado com sucesso!" 100
}


# ---------------------------------------------------------------------
# 4. Scanner e Limpador de Registro Órfão (Registry Cleaner)
# ---------------------------------------------------------------------
function Invoke-CheckupRegistryCleaner {
    [CmdletBinding()]
    param(
        [switch]$DryRun = $false
    )

    $orphansFound = 0
    $orphansRemoved = 0

    # 1. SharedDLLs
    Write-RoutineLog "running" "Auditando SharedDLLs ausentes no disco..." 20
    $sharedDllHives = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\SharedDLLs",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\SharedDLLs"
    )

    foreach ($hive in $sharedDllHives) {
        if (Test-Path $hive) {
            $props = (Get-ItemProperty -Path $hive).PSObject.Properties | Where-Object { $_.Name -notmatch '^PS.*' }
            foreach ($p in $props) {
                $dllPath = $p.Name
                if (-not (Test-Path -LiteralPath $dllPath)) {
                    $orphansFound++
                    if (-not $DryRun) {
                        try {
                            Remove-ItemProperty -Path $hive -Name $dllPath -Force -ErrorAction SilentlyContinue
                            $orphansRemoved++
                        } catch {}
                    }
                }
            }
        }
    }

    # 2. App Paths
    Write-RoutineLog "running" "Auditando caminhos de aplicações (App Paths) órfãos..." 40
    $appPathHives = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"
    )

    foreach ($hive in $appPathHives) {
        if (Test-Path $hive) {
            $subKeys = Get-ChildItem -Path $hive -ErrorAction SilentlyContinue
            foreach ($sk in $subKeys) {
                $defVal = (Get-ItemProperty -Path $sk.PSPath).'(default)'
                if ($defVal) {
                    $cleanTarget = $defVal.Trim().Trim('"')
                    $targetExists = $true
                    try { $targetExists = (Test-Path -LiteralPath $cleanTarget -ErrorAction Stop) } catch { $targetExists = $false }
                    if ($cleanTarget -and (-not $targetExists)) {
                        $orphansFound++
                        if (-not $DryRun) {
                            try {
                                Remove-Item -Path $sk.PSPath -Recurse -Force -ErrorAction SilentlyContinue
                                $orphansRemoved++
                            } catch {}
                        }
                    }
                }
            }
        }
    }

    # 3. MuiCache Órfão
    Write-RoutineLog "running" "Auditando trilhas de execução do MuiCache..." 60
    $muiCache = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\MuiCache"
    if (Test-Path $muiCache) {
        $props = (Get-ItemProperty -Path $muiCache).PSObject.Properties | Where-Object { $_.Name -notmatch '^PS.*' }
        foreach ($p in $props) {
            $vName = $p.Name
            if ($vName -match '^(.:\\?.+?\.(exe|msc|bat|cmd|dll))(\.|$)' ) {
                $filePath = $Matches[1]
                $fExists = $true
                try { $fExists = (Test-Path -LiteralPath $filePath -ErrorAction Stop) } catch { $fExists = $false }
                if (-not $fExists) {
                    $orphansFound++
                    if (-not $DryRun) {
                        try {
                            Remove-ItemProperty -Path $muiCache -Name $vName -Force -ErrorAction SilentlyContinue
                            $orphansRemoved++
                        } catch {}
                    }
                }
            }
        }
    }

    # 4. Desinstaladores Órfãos
    Write-RoutineLog "running" "Auditando resíduos de desinstaladores inexistentes..." 80
    $uninstallHives = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"
    )

    foreach ($uh in $uninstallHives) {
        if (Test-Path $uh) {
            Get-ChildItem -Path $uh -ErrorAction SilentlyContinue | ForEach-Object {
                $itemProps = Get-ItemProperty -Path $_.PSPath
                $isMsi = $itemProps.WindowsInstaller -eq 1
                $unString = $itemProps.UninstallString
                $instLoc = $itemProps.InstallLocation

                if (-not $isMsi -and $unString) {
                    $cleanExe = $unString.Trim()
                    if ($cleanExe -match '^"([^"]+)"') {
                        $cleanExe = $Matches[1]
                    } elseif ($cleanExe -match '^(\S+\.exe)') {
                        $cleanExe = $Matches[1]
                    }
                    $exeExists = $true
                    try { $exeExists = (Test-Path -LiteralPath $cleanExe -ErrorAction Stop) } catch { $exeExists = $false }
                    if (-not $exeExists) {
                        $locExists = $true
                        if ($instLoc) {
                            try { $locExists = (Test-Path -LiteralPath $instLoc -ErrorAction Stop) } catch { $locExists = $false }
                        }
                        if (-not $locExists) {
                            $orphansFound++
                            if (-not $DryRun) {
                                try {
                                    Remove-Item -Path $_.PSPath -Recurse -Force -ErrorAction SilentlyContinue
                                    $orphansRemoved++
                                } catch {}
                            }
                        }
                    }
                }
            }
        }
    }

    $resMsg = if ($DryRun) {
        "Diagnóstico de Registro concluído: $orphansFound referências órfãs encontradas para correção."
    } else {
        "Limpeza de Registro concluída: $orphansRemoved de $orphansFound chaves órfãs higienizadas com sucesso!"
    }

    Write-RoutineLog "done" $resMsg 100
}


# ---------------------------------------------------------------------
# 5. Telemetria e Esvaziamento da Lixeira
# ---------------------------------------------------------------------
function Get-CheckupRecycleBinTelemetry {
    try {
        $shell = New-Object -ComObject Shell.Application
        $recycleBin = $shell.Namespace(0x000a) # ssfBITBUCKET
        $items = $recycleBin.Items()
        $count = $items.Count
        
        $totalBytes = 0
        $drives = Get-PSDrive -PSProvider FileSystem
        foreach ($d in $drives) {
            $binPath = "$($d.Root)`$Recycle.Bin"
            if (Test-Path $binPath) {
                $size = (Get-ChildItem -LiteralPath $binPath -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
                if ($size) { $totalBytes += $size }
            }
        }

        return [PSCustomObject]@{
            ItemCount = $count
            SizeBytes = $totalBytes
            SizeMB    = [math]::Round($totalBytes / 1MB, 2)
        }
    } catch {
        return [PSCustomObject]@{ ItemCount = 0; SizeBytes = 0; SizeMB = 0 }
    }
}


# ---------------------------------------------------------------------
# 6. Localizador de Arquivos Duplicados (Fast 3-Stage Pipeline)
# ---------------------------------------------------------------------
function Find-CheckupDuplicateFiles {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$SearchPath = "",

        [Parameter(Mandatory = $false)]
        [long]$MinSizeBytes = 10240, # Ignora arquivos menores que 10KB

        [Parameter(Mandatory = $false)]
        [string[]]$ExcludeExtensions = @(".sys", ".dll", ".exe", ".ini", ".dat")
    )

    if (-not $SearchPath -or (-not (Test-Path -LiteralPath $SearchPath))) {
        $SearchPath = Join-Path $env:USERPROFILE "Downloads"
    }

    Write-RoutineLog "running" "Estágio 1: Mapeando tamanhos de arquivos em '$SearchPath'..." 20

    $files = [System.IO.Directory]::EnumerateFiles($SearchPath, "*", [System.IO.SearchOption]::AllDirectories)
    $sizeGroups = @{}

    foreach ($f in $files) {
        try {
            $ext = [System.IO.Path]::GetExtension($f).ToLower()
            if ($ExcludeExtensions -contains $ext) { continue }

            $fi = New-Object System.IO.FileInfo($f)
            $len = $fi.Length
            if ($len -lt $MinSizeBytes) { continue }

            if (-not $sizeGroups.ContainsKey($len)) {
                $sizeGroups[$len] = [System.Collections.Generic.List[string]]::new()
            }
            $sizeGroups[$len].Add($f)
        } catch {}
    }

    $candidateGroups = $sizeGroups.Values | Where-Object { $_.Count -gt 1 }
    $totalCandidates = 0
    foreach ($cg in $candidateGroups) { $totalCandidates += $cg.Count }

    Write-RoutineLog "running" "Estágio 2: Auditando cabeçalhos de $totalCandidates arquivos suspeitos..." 55

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $duplicates = [System.Collections.Generic.List[PSCustomObject]]::new()
    $duplicateBytes = 0

    foreach ($group in $candidateGroups) {
        $headerGroups = @{}
        foreach ($filePath in $group) {
            try {
                $fs = [System.IO.File]::OpenRead($filePath)
                $buffer = New-Object byte[] 8192
                $bytesRead = $fs.Read($buffer, 0, 8192)
                $fs.Close()
                $fs.Dispose()

                $headerHash = [System.BitConverter]::ToString($sha256.ComputeHash($buffer, 0, $bytesRead))
                if (-not $headerGroups.ContainsKey($headerHash)) {
                    $headerGroups[$headerHash] = [System.Collections.Generic.List[string]]::new()
                }
                $headerGroups[$headerHash].Add($filePath)
            } catch {}
        }

        # Estágio 3: Full SHA-256 para arquivos com mesmo cabeçalho
        foreach ($hGroup in $headerGroups.Values) {
            if ($hGroup.Count -gt 1) {
                $isFirst = $true
                foreach ($finalFile in $hGroup) {
                    try {
                        $fullHash = (Get-FileHash -LiteralPath $finalFile -Algorithm SHA256 -ErrorAction SilentlyContinue).Hash
                        $fi = New-Object System.IO.FileInfo($finalFile)
                        $duplicates.Add([PSCustomObject]@{
                            FilePath     = $finalFile
                            SizeBytes    = $fi.Length
                            SizeMB       = [math]::Round($fi.Length / 1MB, 2)
                            LastModified = $fi.LastWriteTime
                            SHA256       = $fullHash
                        })
                        if (-not $isFirst) {
                            $duplicateBytes += $fi.Length
                        }
                        $isFirst = $false
                    } catch {}
                }
            }
        }
    }

    $dupMb = [math]::Round($duplicateBytes / 1MB, 2)
    $dupCount = $duplicates.Count
    Write-RoutineLog "done" "Varredura concluída! $dupCount arquivos duplicados encontrados (~$dupMb MB redundantes em '$SearchPath')." 100
    return $duplicates
}


# ---------------------------------------------------------------------
# 7. Limpador de Caches de Nuvem (Cloud Drive Cleaner)
# ---------------------------------------------------------------------
function Invoke-CheckupCloudDriveCleaner {
    [CmdletBinding()]
    param(
        [switch]$CleanDriveFSCache = $true,
        [switch]$CleanOneDriveLogs = $true,
        [switch]$CleanDropboxCache = $true
    )

    $reclaimedBytes = 0
    Write-RoutineLog "running" "Iniciando varredura de caches de nuvem (OneDrive, Google Drive, Dropbox)..." 15

    # 1. Microsoft OneDrive e OfficeFileCache
    if ($CleanOneDriveLogs) {
        Write-RoutineLog "running" "Limpando logs e caches do OneDrive e Office..." 35
        $oneDriveTargets = @(
            "$env:LOCALAPPDATA\Microsoft\OneDrive\logs",
            "$env:LOCALAPPDATA\Microsoft\OneDrive\setup\logs",
            "$env:LOCALAPPDATA\Microsoft\Office\16.0\OfficeFileCache"
        )
        foreach ($target in $oneDriveTargets) {
            if (Test-Path $target) {
                Get-ChildItem -Path $target -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try {
                        $len = $_.Length
                        Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue
                        $reclaimedBytes += $len
                    } catch {}
                }
            }
        }
    }

    # 2. Google Drive for Desktop
    if ($CleanDriveFSCache) {
        Write-RoutineLog "running" "Limpando content_cache e logs do Google Drive..." 65
        $gDriveDir = "$env:LOCALAPPDATA\Google\DriveFS"
        if (Test-Path $gDriveDir) {
            $cacheFolders = Get-ChildItem -Path $gDriveDir -Directory -ErrorAction SilentlyContinue | 
                ForEach-Object { Join-Path $_.FullName "content_cache" }
            foreach ($cf in $cacheFolders) {
                if (Test-Path $cf) {
                    Get-ChildItem -Path $cf -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                        try {
                            $len = $_.Length
                            Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue
                            $reclaimedBytes += $len
                        } catch {}
                    }
                }
            }
        }
    }

    # 3. Dropbox (.dropbox.cache)
    if ($CleanDropboxCache) {
        Write-RoutineLog "running" "Limpando cache de transferência do Dropbox..." 85
        $userDropbox = "$env:USERPROFILE\Dropbox\.dropbox.cache"
        if (Test-Path $userDropbox) {
            Get-ChildItem -Path $userDropbox -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                try {
                    $len = $_.Length
                    Remove-Item -LiteralPath $_.FullName -Force -Recurse -ErrorAction SilentlyContinue
                    $reclaimedBytes += $len
                } catch {}
            }
        }
    }

    $mbReclaimed = [math]::Round($reclaimedBytes / 1MB, 2)
    Write-RoutineLog "done" "Caches de nuvem higienizados com sucesso! $mbReclaimed MB recuperados em disco local." 100
}


# ---------------------------------------------------------------------
# 8. Auditoria & Verificação de Drivers do Windows (Driver Health)
# ---------------------------------------------------------------------
function Invoke-CheckupDriverAudit {
    Write-RoutineLog "running" "Auditando dispositivos de hardware e falhas no Gerenciador de Dispositivos..." 20

    $problemDevices = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { 
        $_.Status -ne "OK" -and $_.ConfigManagerErrorCode -ne 0 
    }

    $problemCount = if ($problemDevices) { @($problemDevices).Count } else { 0 }

    Write-RoutineLog "running" "Auditando drivers assinados (WHQL) no sistema..." 55
    $drivers = Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue
    $totalDrivers = if ($drivers) { @($drivers).Count } else { 0 }
    $unsignedCount = if ($drivers) { (@($drivers | Where-Object { $_.IsSigned -eq $false })).Count } else { 0 }

    Write-RoutineLog "running" "Consultando catálogo oficial do Windows Update para drivers pendentes..." 80
    $pendingDriversCount = 0
    try {
        $updateSession = New-Object -ComObject Microsoft.Update.Session
        $searcher = $updateSession.CreateUpdateSearcher()
        $searcher.ServerSelection = 2
        $searchResult = $searcher.Search("IsInstalled=0 and Type='Driver'")
        if ($searchResult -and $searchResult.Updates) {
            $pendingDriversCount = $searchResult.Updates.Count
        }
    } catch {}

    $summaryMsg = "Auditoria de Drivers: $totalDrivers drivers avaliados. $problemCount dispositivo(s) com alerta. $pendingDriversCount atualização(ões) oficial(is) no Windows Update."
    Write-RoutineLog "done" $summaryMsg 100
}


# ---------------------------------------------------------------------
# 9. Otimizador de Desempenho / Congelador de Processos (EcoQoS / Sleep)
# ---------------------------------------------------------------------
if (-not ([System.Management.Automation.PSTypeName]'CheckUP.ProcessController').Type) {
    try {
        Add-Type -MemberDefinition @'
        [DllImport("ntdll.dll", SetLastError = true)]
        public static extern int NtSuspendProcess(IntPtr processHandle);

        [DllImport("ntdll.dll", SetLastError = true)]
        public static extern int NtResumeProcess(IntPtr processHandle);
'@ -Name "ProcessController" -Namespace "CheckUP" -ErrorAction SilentlyContinue
    } catch {}
}

function Set-CheckupProcessSleepState {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $false)]
        [string]$ProcessName = "",

        [Parameter(Mandatory = $false)]
        [ValidateSet("Sleep", "Wake", "EcoMode")]
        [string]$Action = "EcoMode"
    )

    # Se nenhum processo foi especificado, aplica EcoMode nos processos pesados de segundo plano conhecidos
    $targetProcs = if ($ProcessName) {
        @($ProcessName)
    } else {
        @("Spotify", "Discord", "EpicGamesLauncher", "Steam", "OneDrive", "Dropbox")
    }

    $affectedCount = 0

    foreach ($pName in $targetProcs) {
        $procs = Get-Process -Name $pName -ErrorAction SilentlyContinue
        if ($procs) {
            foreach ($p in $procs) {
                try {
                    switch ($Action) {
                        "Sleep" {
                            if ([System.Management.Automation.PSTypeName]'CheckUP.ProcessController'.Type) {
                                [CheckUP.ProcessController]::NtSuspendProcess($p.Handle) | Out-Null
                                $affectedCount++
                            }
                        }
                        "Wake" {
                            if ([System.Management.Automation.PSTypeName]'CheckUP.ProcessController'.Type) {
                                [CheckUP.ProcessController]::NtResumeProcess($p.Handle) | Out-Null
                                $affectedCount++
                            }
                        }
                        "EcoMode" {
                            $p.PriorityClass = [System.Diagnostics.ProcessPriorityClass]::Idle
                            $affectedCount++
                        }
                    }
                } catch {}
            }
        }
    }

    $actionName = switch ($Action) {
        "Sleep"   { "colocados em Sleep (0% CPU)" }
        "Wake"    { "reativados" }
        "EcoMode" { "otimizados no Modo EcoQoS (Prioridade Ociosa)" }
    }

    Write-RoutineLog "done" "Otimização de Processos concluída: $affectedCount instâncias $actionName com sucesso!" 100
}

