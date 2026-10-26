param(
    [ValidateRange(1, 10)][int]$Repetitions = 3,
    [ValidateRange(1, 600)][int]$BaselineSeconds = 15,
    [ValidateRange(1, 300)][int]$LoadSeconds = 60,
    [ValidateRange(1, 60)][int]$Warmup = 5,
    [string]$BaseUrl = 'http://localhost:8080'
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$dockerPath = 'C:/Program Files/Docker/Docker/resources/bin/docker.exe'
$jmeterOnWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
$docker = if ($jmeterOnWindows -and (Test-Path -LiteralPath $dockerPath)) { $dockerPath } else { (Get-Command docker -ErrorAction Stop).Source }
$root = Join-Path $repoRoot ('resultados/jmeter-campanha-' + [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH-mm-ss-fffZ'))
New-Item -ItemType Directory -Path $root | Out-Null
$campaign = [ordered]@{ status = 'INCOMPLETO'; engine = 'Apache JMeter'; runs = @(); restored = $false }
$originalProcessDuration = $env:DISPUTE_DURATION_SECONDS
$changed = $false
Push-Location $repoRoot
try {
    $container = & $docker compose ps -q app
    if ($LASTEXITCODE -ne 0 -or -not $container) { throw 'Aplicacao Docker nao encontrada; siga o README.' }
    $actualEnv = & $docker inspect --format '{{json .Config.Env}}' $container | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel consultar duracao da disputa.' }
    $durationEntry = @($actualEnv | Where-Object { $_ -like 'DISPUTE_DURATION_SECONDS=*' })
    if ($durationEntry.Count -ne 1) { throw 'Duracao original ausente ou ambigua.' }
    $originalDuration = $durationEntry[0].Split('=')[1]
    $campaign.originalDurationSeconds = [int]$originalDuration
    $hostInfo = & $docker info --format '{{json .}}' | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel consultar ambiente Docker.' }
    $campaign.dockerHost = @{ version = $hostInfo.ServerVersion; cpus = $hostInfo.NCPU; memoryBytes = $hostInfo.MemTotal; os = $hostInfo.OperatingSystem }
    foreach ($scenario in @('read', 'bids')) {
        if ($scenario -eq 'bids') {
            $changed = $true
            $env:DISPUTE_DURATION_SECONDS = '600'
            & $docker compose up -d --force-recreate --wait --wait-timeout 180 app
            if ($LASTEXITCODE -ne 0) { throw 'Falha ao ampliar duracao de escrita.' }
        }
        foreach ($profile in @(@{ users = 1; seconds = $BaselineSeconds }, @{ users = 10; seconds = $LoadSeconds })) {
            for ($repeat = 1; $repeat -le $Repetitions; $repeat++) {
                $label = "$scenario-$($profile.users)vu-rodada$repeat"
                $destination = Join-Path $root $label
                Write-Host "INICIO $label"
                try {
                    & (Join-Path $PSScriptRoot 'run.ps1') -Scenario $scenario -Users $profile.users -Duration $profile.seconds `
                        -Warmup $Warmup -BaseUrl $BaseUrl -OutputDir $destination
                } catch {
                    if (-not (Test-Path -LiteralPath (Join-Path $destination 'execucao.json'))) { throw }
                    Write-Warning $_.Exception.Message
                }
                $manifest = Get-Content (Join-Path $destination 'execucao.json') -Raw | ConvertFrom-Json
                $campaign.runs += @{ label = $label; result = $manifest }
                if ($manifest.status -ne 'CONCLUIDO') { throw "Rodada $label incompleta; campanha interrompida." }
                $campaign | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $root 'campanha.json') -Encoding UTF8
            }
        }
    }
    $campaign.status = 'CONCLUIDO'
} catch {
    $campaign.error = $_.Exception.Message
    throw
} finally {
    if ($changed) {
        $env:DISPUTE_DURATION_SECONDS = $originalDuration
        & $docker compose up -d --force-recreate --wait --wait-timeout 180 app
        $campaign.restored = $LASTEXITCODE -eq 0
    } else { $campaign.restored = $true }
    $env:DISPUTE_DURATION_SECONDS = $originalProcessDuration
    $campaign.finishedAt = [DateTime]::UtcNow.ToString('o')
    $campaign.passed = $campaign.status -eq 'CONCLUIDO' -and $campaign.restored -and
        @($campaign.runs | Where-Object { -not $_.result.passed }).Count -eq 0
    $campaign | ConvertTo-Json -Depth 30 | Set-Content (Join-Path $root 'campanha.json') -Encoding UTF8
    $rows = @('# Campanha Apache JMeter', '', "Rodadas: $($campaign.runs.Count). Criterios atendidos: $($campaign.passed). Duracao original restaurada: $($campaign.restored).", '',
        '| Rodada | Req | Media ms | P90 ms | P95 ms | Req/s | Erros % | Criterios |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    foreach ($run in $campaign.runs) {
        $s = $run.result.statistics
        $rows += "| [$($run.label)]($($run.label)/execucao.json) | $($s.sampleCount) | $($s.meanResTime) | $($s.pct1ResTime) | $($s.pct2ResTime) | $($s.throughput) | $($s.errorPct) | $($run.result.passed) |"
    }
    $rows += @('', 'Metricas calculadas pelo JMeter por rodada. Nao foi calculada media de percentis. JTL e dashboard em cada subpasta. Recursos de CPU/memoria nao foram amostrados nesta campanha; metadados do host constam no manifesto.')
    $rows | Set-Content (Join-Path $root 'resumo.md') -Encoding UTF8
    Pop-Location
    Write-Host "Campanha: $root"
}
if (-not $campaign.passed) { throw 'Campanha incompleta, fora dos criterios ou sem restauracao confirmada.' }
