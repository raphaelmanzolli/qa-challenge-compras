param(
    [ValidateSet('read', 'bids')][string]$Scenario = 'read',
    [ValidateRange(1, 100)][int]$Users = 1,
    [ValidateRange(1, 600)][int]$Duration = 15,
    [ValidateRange(1, 60)][int]$Warmup = 5,
    [ValidateRange(1, 10000)][int]$ThinkMs = 100,
    [ValidateRange(100, 30000)][int]$TimeoutMs = 5000,
    [ValidateRange(1, 60000)][int]$P95LimitMs = 1000,
    [ValidateRange(0, 1)][double]$MaxErrorRate = 0.01,
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$OutputDir
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$base = [uri]$BaseUrl
if ($base.Scheme -ne 'http' -or $base.Host -notin @('localhost', '127.0.0.1', '[::1]') -or
    $base.UserInfo -or $base.AbsolutePath -ne '/' -or $base.Query -or $base.Fragment) {
    throw 'BaseUrl deve ser uma origem HTTP local, sem credenciais, caminho ou query.'
}
$jmeterHome = $env:JMETER_HOME
if (-not $jmeterHome -and $env:LOCALAPPDATA) { $jmeterHome = Join-Path $env:LOCALAPPDATA 'qa-tools/apache-jmeter-5.6.3' }
if (-not $jmeterHome) { throw 'Defina JMETER_HOME com a pasta do JMeter; veja docs/03-performance.md.' }
$jmeterJar = Join-Path $jmeterHome 'bin/ApacheJMeter.jar'
if (-not (Test-Path -LiteralPath $jmeterJar)) { throw 'Instale JMeter 5.6.3 e defina JMETER_HOME; veja docs/03-performance.md.' }
$java = (Get-Command java -ErrorAction Stop).Source
if (-not $OutputDir) {
    $runId = [DateTime]::UtcNow.ToString('yyyy-MM-ddTHH-mm-ss-fffZ')
    $OutputDir = Join-Path $repoRoot "resultados/jmeter-$runId-$Scenario"
}
$OutputDir = [IO.Path]::GetFullPath($OutputDir)
if (Test-Path -LiteralPath $OutputDir) { throw 'Use uma pasta de saída nova para preservar os resultados anteriores.' }
New-Item -ItemType Directory -Path $OutputDir | Out-Null
$plan = if ($Scenario -eq 'read') { 'leitura.jmx' } else { 'lances.jmx' }
$hasher = [Security.Cryptography.SHA256]::Create()
try {
    $planHash = [BitConverter]::ToString($hasher.ComputeHash([IO.File]::ReadAllBytes((Join-Path $PSScriptRoot $plan)))).Replace('-', '')
} finally { $hasher.Dispose() }
$manifest = [ordered]@{
    status = 'INCOMPLETO'; scenario = $Scenario; users = $Users; durationSeconds = $Duration
    warmupSeconds = $Warmup; thinkMs = $ThinkMs; timeoutMs = $TimeoutMs; baseUrl = $base.AbsoluteUri
    p95LimitMs = $P95LimitMs; maxErrorRate = $MaxErrorRate
    startedAt = [DateTime]::UtcNow.ToString('o'); plan = $plan
    planSha256 = $planHash
}
Push-Location $repoRoot
try {
    $arguments = @('-jar', $jmeterJar, '-n', '-t', (Join-Path $PSScriptRoot $plan),
        '-q', (Join-Path $PSScriptRoot 'jmeter.properties'), '-j', (Join-Path $OutputDir 'jmeter.log'),
        "-Jusers=$Users", "-Jduration=$Duration", "-Jwarmup=$Warmup", "-Jthink_ms=$ThinkMs", "-Jtimeout=$TimeoutMs",
        "-Jhost=$($base.Host)", "-Jport=$($base.Port)", "-Joutput_dir=$OutputDir",
        "-Jresults_file=$(Join-Path $OutputDir 'resultados.jtl')", "-Jscripts_dir=$(Join-Path $PSScriptRoot 'scripts')")
    Write-Host "JMeter: $Scenario, $Users threads, $Warmup s de aquecimento + $Duration s medidos."
    & $java @arguments
    if ($LASTEXITCODE -ne 0) { throw "JMeter encerrou com codigo $LASTEXITCODE." }
    $prepared = Get-Content (Join-Path $OutputDir 'preparacao.json') -Raw | ConvertFrom-Json
    if ($prepared.status -ne 'PRONTO') { throw "Preparacao incompleta: $($prepared.error)" }
    $consistency = Get-Content (Join-Path $OutputDir 'consistencia.json') -Raw | ConvertFrom-Json
    # Dashboard e percentis calculados pelo proprio JMeter, a partir do JTL medido.
    & $java -jar $jmeterJar -g (Join-Path $OutputDir 'resultados.jtl') -o (Join-Path $OutputDir 'dashboard') `
        -q (Join-Path $PSScriptRoot 'jmeter.properties') -j (Join-Path $OutputDir 'dashboard.log')
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao gerar dashboard do JMeter.' }
    $stats = Get-Content (Join-Path $OutputDir 'dashboard/statistics.json') -Raw | ConvertFrom-Json
    if (-not $stats.Total -or $stats.Total.sampleCount -le 0) { throw 'Sem amostras medidas; rodada invalida.' }
    $manifest.status = 'CONCLUIDO'
    $manifest.jmeterVersion = $prepared.jmeterVersion
    $manifest.statistics = $stats.Total
    $manifest.consistency = $consistency
    $manifest.passed = $stats.Total.pct2ResTime -le $P95LimitMs -and
        ($stats.Total.errorPct / 100) -le $MaxErrorRate -and $consistency.ok
    Write-Host "Req=$($stats.Total.sampleCount); P95=$($stats.Total.pct2ResTime) ms; erros=$($stats.Total.errorPct)%; criterios=$($manifest.passed)."
    if (-not $manifest.passed) { throw 'Rodada fora dos criterios de latencia, erros ou consistencia.' }
} catch {
    $manifest.error = $_.Exception.Message
    throw
} finally {
    $manifest.finishedAt = [DateTime]::UtcNow.ToString('o')
    $manifest | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $OutputDir 'execucao.json') -Encoding UTF8
    Pop-Location
    Write-Host "Evidencias: $OutputDir"
}
