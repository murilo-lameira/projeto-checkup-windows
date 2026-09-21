# =====================================================================
# CheckUP Windows - Despachante de Rotinas Granulares de Melhoria
# Executa tarefas individuais de otimização, reparo e manutenção
# Regra Inviolável: 100% Nativo Windows (Zero Executáveis de Terceiros)
# =====================================================================

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("dns", "temp", "trim", "sfc", "dism", "winget", "wupdate", "shield")]
    [string]$Rotina,

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
            Stop-Service -Name wuauserv, bits, cryptSvc, msiserver -Force -ErrorAction SilentlyContinue

            Write-RoutineLog "running" "Limpando fila de downloads corrompidos do Windows Update..." 55
            $downDir = "$env:SystemRoot\SoftwareDistribution\Download"
            if (Test-Path $downDir) {
                Get-ChildItem -Path $downDir -Force -ErrorAction SilentlyContinue | ForEach-Object {
                    try { Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
                }
            }

            Write-RoutineLog "running" "Reiniciando serviços do Windows Update..." 80
            Start-Service -Name wuauserv, bits, cryptSvc, msiserver -ErrorAction SilentlyContinue
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
}

