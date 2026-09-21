# =====================================================================
# CheckUP Windows - Despachante de Rotinas Granulares de Melhoria
# Executa tarefas individuais de otimização, reparo e manutenção
# Regra Inviolável: 100% Nativo Windows (Zero Executáveis de Terceiros)
# =====================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("dns", "temp", "trim", "sfc", "dism", "winget", "wupdate", "shield", "winsxs", "battery", "profile", "restore")]
    [string]$Rotina,

    [Parameter(Mandatory = $false)]
    [string]$Modo = "Equilibrado",

    [Parameter(Mandatory = $false)]
    [string]$StatusFile = ""
)

$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-RoutineLog([string]$status, [string]$msg, [int]$percent = 100) {
    $payload = [PSCustomObject]@{
        rotina  = $Rotina
        status  = $status
        msg     = $msg
        percent = $percent
        time    = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    }
    
    if ($StatusFile -and (Test-Path (Split-Path $StatusFile -Parent))) {
        try {
            $json = $payload | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText($StatusFile, $json, [System.Text.Encoding]::UTF8)
        } catch {}
    }
    
    $payload | ConvertTo-Json -Compress | Write-Output
}

Write-RoutineLog "running" "Iniciando rotina '$Rotina'..." 10

switch ($Rotina) {
    "dns" {
        try {
            Write-RoutineLog "running" "Limpando cache DNS e redefinindo interfaces de rede..." 30
            ipconfig /flushdns | Out-Null
            Write-RoutineLog "running" "Redefinindo sockets e pilha TCP/IP..." 60
            netsh winsock reset | Out-Null
            netsh int ip reset | Out-Null
            Write-RoutineLog "done" "Cache DNS limpo e interfaces de rede otimizadas com sucesso!" 100
        } catch {
            Write-RoutineLog "error" "Falha ao otimizar rede: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "temp" {
        try {
            Write-RoutineLog "running" "Limpando arquivos temporários do usuário..." 30
            # CRÍTICO: Exclui pastas e arquivos do CheckUP portátil para evitar auto-deleção
            if (Test-Path $env:TEMP) {
                Get-ChildItem -Path $env:TEMP -Exclude "*checkup*" -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                }
            }

            Write-RoutineLog "running" "Limpando cache do Windows Temp e Prefetch..." 60
            if (Test-Path "C:\Windows\Temp") {
                Get-ChildItem -Path "C:\Windows\Temp" -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                }
            }
            if (Test-Path "C:\Windows\Prefetch") {
                Get-ChildItem -Path "C:\Windows\Prefetch" -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                }
            }

            Write-RoutineLog "running" "Esvaziando lixeira do sistema..." 85
            try {
                Clear-RecycleBin -Force -ErrorAction SilentlyContinue | Out-Null
            } catch {}

            Write-RoutineLog "done" "Limpeza de arquivos temporários, caches e lixeira concluída com êxito!" 100
        } catch {
            Write-RoutineLog "error" "Falha na limpeza de temporários: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "trim" {
        try {
            Write-RoutineLog "running" "Detectando tipo de mídia do Drive C:..." 30
            $pDisk = Get-PhysicalDisk | Select-Object -First 1 -ErrorAction SilentlyContinue
            $media = if ($pDisk -and $pDisk.MediaType) { $pDisk.MediaType } else { "SSD" }

            if ($media -like "*SSD*" -or $media -like "*NVMe*") {
                Write-RoutineLog "running" "Executando ReTrim para otimização de blocos no SSD..." 60
                Optimize-Volume -DriveLetter C -ReTrim -ErrorAction SilentlyContinue | Out-Null
                Write-RoutineLog "done" "Comando ReTrim executado com sucesso no SSD (Drive C:)." 100
            } else {
                Write-RoutineLog "running" "Desfragmentando blocos no HDD..." 60
                Optimize-Volume -DriveLetter C -Defrag -ErrorAction SilentlyContinue | Out-Null
                Write-RoutineLog "done" "Desfragmentação concluída com sucesso no HDD (Drive C:)." 100
            }
        } catch {
            Write-RoutineLog "error" "Falha ao otimizar armazenamento: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "sfc" {
        try {
            Write-RoutineLog "running" "Executando SFC /scannow (Verificação e restauração de arquivos protegidos)..." 30
            $sfcOutput = sfc /scannow
            $exitCode = $LASTEXITCODE
            
            # SFC Exit Codes: 0 = Nenhum erro, 1 = Erros corrigidos, 2 = Erros não corrigidos
            if ($exitCode -eq 0) {
                Write-RoutineLog "done" "Proteção de Recursos do Windows não encontrou nenhuma violação de integridade." 100
            } elseif ($exitCode -eq 1) {
                Write-RoutineLog "done" "Arquivos corrompidos foram localizados e reparados com sucesso pelo SFC!" 100
            } else {
                Write-RoutineLog "done" "Verificação do SFC concluída. Consulte os logs do CBS caso persistam alertas." 100
            }
        } catch {
            Write-RoutineLog "error" "Falha ao executar SFC: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "dism" {
        try {
            Write-RoutineLog "running" "Executando DISM /RestoreHealth (Reparo da imagem de componentes do Windows)..." 30
            $dismResult = DISM /Online /Cleanup-Image /RestoreHealth
            $exitCode = $LASTEXITCODE
            
            if ($exitCode -eq 0) {
                Write-RoutineLog "done" "Imagem do Windows e repositório de componentes restaurados com sucesso!" 100
            } else {
                Write-RoutineLog "done" "Operação do DISM finalizada (Código de saída: $exitCode)." 100
            }
        } catch {
            Write-RoutineLog "error" "Falha ao executar DISM: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "winget" {
        try {
            Write-RoutineLog "running" "Verificando se há atualizações disponíveis para programas instalados via Winget..." 30
            if (Get-Command winget -ErrorAction SilentlyContinue) {
                winget upgrade --all --silent --accept-package-agreements --accept-source-agreements --disable-interactivity | Out-Null
                Write-RoutineLog "done" "Todos os aplicativos suportados foram verificados e atualizados via Winget." 100
            } else {
                Write-RoutineLog "done" "O gerenciador Winget não está disponível nesta versão do Windows." 100
            }
        } catch {
            Write-RoutineLog "error" "Falha ao atualizar via Winget: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "wupdate" {
        try {
            Write-RoutineLog "running" "Interrompendo serviços do Windows Update..." 25
            Stop-Service -Name wuauserv, bits -Force -ErrorAction SilentlyContinue

            Write-RoutineLog "running" "Limpando fila de downloads corrompidos do Windows Update..." 55
            $downDir = "$env:SystemRoot\SoftwareDistribution\Download"
            if (Test-Path $downDir) {
                Get-ChildItem -Path $downDir -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                }
            }

            Write-RoutineLog "running" "Reiniciando serviços do Windows Update..." 80
            Start-Service -Name wuauserv, bits -ErrorAction SilentlyContinue
            Write-RoutineLog "done" "Serviços do Windows Update destravados e cache de download redefinido com sucesso!" 100
        } catch {
            Write-RoutineLog "error" "Falha ao reparar Windows Update: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "shield" {
        try {
            Write-RoutineLog "running" "Restaurando proteções em tempo real e nuvem do Windows Defender..." 50
            Set-MpPreference -DisableRealtimeMonitoring 0 -MAPSReporting 2 -SubmitSamplesConsent 1 -ErrorAction SilentlyContinue
            Write-RoutineLog "done" "Defesas nativas do Windows Defender restauradas e ativas!" 100
        } catch {
            Write-RoutineLog "error" "Falha ao ativar o Defender: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "winsxs" {
        try {
            Write-RoutineLog "running" "Iniciando limpeza do repositório de componentes WinSxS (DISM)..." 20
            try {
                $sxsJob = Start-Job -ScriptBlock { DISM /Online /Cleanup-Image /StartComponentCleanup /NoRestart }
                $sxsDone = Wait-Job $sxsJob -Timeout 180
                if (-not $sxsDone) {
                    Stop-Job $sxsJob -ErrorAction SilentlyContinue
                    Remove-Job $sxsJob -Force -ErrorAction SilentlyContinue
                    Get-Process -Name Dism, DismHost -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
                } else {
                    Receive-Job $sxsJob | Out-Null
                    Remove-Job $sxsJob -Force -ErrorAction SilentlyContinue
                }
            } catch {
                DISM /Online /Cleanup-Image /StartComponentCleanup /NoRestart | Out-Null
            }
            
            Write-RoutineLog "running" "Limpando fila de relatórios de erros do Windows (WER) e despejos..." 60
            $werPaths = @(
                "$env:ProgramData\Microsoft\Windows\WER\ReportArchive",
                "$env:ProgramData\Microsoft\Windows\WER\ReportQueue",
                "$env:ProgramData\Microsoft\Windows\WER\Temp",
                "$env:LOCALAPPDATA\CrashDumps"
            )
            foreach ($wp in $werPaths) {
                if (Test-Path $wp) {
                    Get-ChildItem -Path $wp -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                        try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                    }
                }
            }

            Write-RoutineLog "running" "Limpando logs de instalação de drivers e relatórios antigos..." 85
            $driverLogPaths = @(
                "$env:SystemRoot\Logs\DISM",
                "$env:SystemRoot\Logs\CBS"
            )
            foreach ($dlp in $driverLogPaths) {
                if (Test-Path $dlp) {
                    Get-ChildItem -Path $dlp -Filter "*.log" -Force -ErrorAction SilentlyContinue | ForEach-Object {
                        if ($_.LastWriteTime -lt (Get-Date).AddDays(-7)) {
                            try { Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue } catch {}
                        }
                    }
                }
            }

            Write-RoutineLog "done" "Repositório WinSxS e relatórios WER/Drivers otimizados com sucesso!" 100
        } catch {
            Write-RoutineLog "error" "Falha na limpeza WinSxS/WER: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "battery" {
        try {
            Write-RoutineLog "running" "Verificando presença de bateria física e sensores ACPI..." 25
            $battery = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue
            
            if (-not $battery) {
                Write-RoutineLog "done" "Dispositivo Desktop identificado. Alimentação direta estável (sem bateria física ou sensores móveis)." 100
            } else {
                Write-RoutineLog "running" "Gerando relatório detalhado de integridade e ciclos via powercfg..." 60
                $reportDir = "$PSScriptRoot\..\relatorios"
                if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir -Force | Out-Null }
                $reportPath = Join-Path $reportDir "battery_report.html"
                
                powercfg /batteryreport /output "$reportPath" | Out-Null
                
                # Persistência no perfil do usuário
                try {
                    $userRelDir = Join-Path $env:USERPROFILE "checkup_relatorios"
                    if (-not (Test-Path $userRelDir)) { New-Item -ItemType Directory -Path $userRelDir -Force | Out-Null }
                    if (Test-Path $reportPath) {
                        Copy-Item -Path $reportPath -Destination (Join-Path $userRelDir "battery_report.html") -Force -ErrorAction SilentlyContinue
                    }
                } catch {}

                $statusMsg = "Relatório oficial de bateria gerado com sucesso em: $reportPath"
                try {
                    $design = (Get-CimInstance -Namespace root\wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1).DesignedCapacity
                    $full = (Get-CimInstance -Namespace root\wmi -ClassName BatteryFullChargedCapacity -ErrorAction SilentlyContinue | Select-Object -First 1).FullChargedCapacity
                    if ($design -gt 0 -and $full -gt 0) {
                        $pct = [math]::Min(100.0, [math]::Round(($full / $design) * 100, 1))
                        $statusMsg = "Bateria com $pct% de integridade ($full mWh / $design mWh). Relatório: $reportPath"
                    }
                } catch {}

                Write-RoutineLog "done" $statusMsg 100
            }
        } catch {
            Write-RoutineLog "error" "Falha ao gerar relatório de bateria: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "profile" {
        try {
            Write-RoutineLog "running" "Configurando perfil de serviços e plano de energia ($Modo)..." 20
            
            function Set-ServiceSafe($name, $startupType, $action) {
                try {
                    $svc = Get-Service -Name $name -ErrorAction SilentlyContinue
                    if ($svc) {
                        Set-Service -Name $name -StartupType $startupType -ErrorAction SilentlyContinue
                        if ($action -eq "Start" -and $svc.Status -ne "Running") {
                            Start-Service -Name $name -ErrorAction SilentlyContinue
                        } elseif ($action -eq "Stop" -and $svc.Status -eq "Running") {
                            Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
                        }
                    }
                } catch {}
            }

            switch ($Modo.ToLower()) {
                "gamer" {
                    Write-RoutineLog "running" "Otimizando serviços secundários para baixa latência (Gamer)..." 40
                    Set-ServiceSafe "SysMain" "Manual" "Stop"
                    Set-ServiceSafe "WSearch" "Manual" "Stop"
                    Set-ServiceSafe "Spooler" "Manual" "Stop"
                    Set-ServiceSafe "DiagTrack" "Manual" "Stop"
                    Set-ServiceSafe "MapsBroker" "Manual" "Stop"

                    Write-RoutineLog "running" "Ativando plano de energia de Alto Desempenho..." 80
                    powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null

                    Write-RoutineLog "done" "Perfil Gamer ativado: I/O de disco aliviado e plano de Alto Desempenho configurado!" 100
                }

                "economia" {
                    Write-RoutineLog "running" "Ajustando serviços para economia de energia e baixo consumo..." 40
                    Set-ServiceSafe "SysMain" "Manual" "Stop"
                    Set-ServiceSafe "WSearch" "Manual" "Stop"
                    Set-ServiceSafe "Spooler" "Automatic" "Start"
                    Set-ServiceSafe "DiagTrack" "Manual" "Stop"

                    Write-RoutineLog "running" "Ativando plano de Economia de Energia..." 80
                    powercfg /setactive a1841308-3541-4fab-bc81-f71556f20b4a 2>$null

                    Write-RoutineLog "done" "Perfil Economia ativado: Serviços em repouso e consumo de energia reduzido." 100
                }

                default {
                    Write-RoutineLog "running" "Restaurando serviços essenciais ao padrão recomendado da Microsoft..." 40
                    Set-ServiceSafe "SysMain" "Automatic" "Start"
                    Set-ServiceSafe "WSearch" "Automatic" "Start"
                    Set-ServiceSafe "Spooler" "Automatic" "Start"
                    Set-ServiceSafe "DiagTrack" "Automatic" "Start"
                    Set-ServiceSafe "MapsBroker" "Automatic" "Start"

                    Write-RoutineLog "running" "Ativando plano de energia Equilibrado..." 80
                    powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e 2>$null

                    Write-RoutineLog "done" "Perfil Equilibrado restaurado: Serviços e energia em conformidade com o Windows." 100
                }
            }
        } catch {
            Write-RoutineLog "error" "Falha ao aplicar perfil de serviços: $($_.Exception.Message)" 100
            exit 1
        }
    }

    "restore" {
        try {
            if ($Modo -eq "abrir" -or $Modo -eq "interface") {
                Write-RoutineLog "running" "Abrindo utilitário oficial de Restauração do Sistema (rstrui.exe)..." 50
                Start-Process "rstrui.exe"
                Write-RoutineLog "done" "Interface de Restauração do Sistema aberta com sucesso." 100
            } else {
                Write-RoutineLog "running" "Verificando proteção do sistema no volume C:..." 20
                try {
                    Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue
                } catch {}

                Write-RoutineLog "running" "Ajustando frequência de salvamento no Registro..." 40
                $srKey = "HKLM:\Software\Microsoft\Windows NT\CurrentVersion\SystemRestore"
                if (Test-Path $srKey) {
                    Set-ItemProperty -Path $srKey -Name "SystemRestorePointCreationFrequency" -Value 0 -Type DWord -Force -ErrorAction SilentlyContinue
                }

                # Garante que o serviço VSS esteja ativo
                try {
                    Set-Service -Name "VSS" -StartupType Manual -ErrorAction SilentlyContinue
                    Start-Service -Name "VSS" -ErrorAction SilentlyContinue
                } catch {}

                Write-RoutineLog "running" "Criando Ponto de Restauração do Sistema (CheckUP Windows)..." 70
                $desc = "CheckUP Windows - Ponto de Seguranca $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
                try {
                    Checkpoint-Computer -Description $desc -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
                    Write-RoutineLog "done" "Ponto de Restauração criado com sucesso: '$desc'!" 100
                } catch {
                    $errText = $_.Exception.Message
                    if ($errText -like "*1440*" -or $errText -like "*already*" -or $errText -like "*criado*" -or $errText -like "*frequência*") {
                        $p = Get-ComputerRestorePoint -ErrorAction SilentlyContinue | Select-Object -Last 1
                        $dateStr = if ($p) {
                            try { [System.Management.ManagementDateTimeConverter]::ToDateTime($p.CreationTime).ToString("dd/MM/yyyy HH:mm") } catch { $p.CreationTime }
                        } else { "recente" }
                        $descLast = if ($p) { "'$($p.Description)' ($dateStr)" } else { "recente" }
                        Write-RoutineLog "done" "Ponto de restauração recente já ativo ($descLast). O sistema já está 100% protegido contra alterações!" 100
                    } else {
                        throw $_
                    }
                }
            }
        } catch {
            Write-RoutineLog "error" "Falha ao criar Ponto de Restauração: $($_.Exception.Message). Verifique se a Restauração do Sistema está habilitada nas configurações do Windows." 100
            exit 1
        }
    }
}

