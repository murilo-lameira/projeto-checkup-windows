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
