# --- CONFIGURAÇÕES INICIAIS ---
$ApiEndpoint = "http://3.145.115.67:5000/data" # IP do seu servidor AWS
$PingTargets = @("8.8.8.8", "187.33.93.122", "br11.td.commpeak.com") 
$IntervalSeconds = 5
$PingsPerInterval = 5

# --- FUNÇÃO DE JITTER ---
function Get-Jitter($latencies) {
    if ($latencies.Count -lt 2) { return 0 }
    $jitterSum = 0; for ($i = 1; $i -lt $latencies.Count; $i++) { $jitterSum += [math]::Abs($latencies[$i] - $latencies[$i-1]) }
    return $jitterSum / ($latencies.Count - 1)
}

# --- INÍCIO DA EXECUÇÃO ---

# Limpa a tela para uma experiência mais limpa
Clear-Host
Write-Host "Iniciando Monitor de Rede da Empresa..." -ForegroundColor Green

# --- LÓGICA PARA CARREGAR OU PEDIR O ID DO FUNCIONÁRIO ---

# AJUSTE: Lógica robusta para encontrar a pasta do executável
try {
    # Obtém o caminho completo do processo .exe que está rodando
    $exePath = (Get-Process -Id $PID).Path
    # Extrai apenas o diretório (a pasta) desse caminho
    $exeDir = Split-Path -Path $exePath
    # Constrói o caminho para o nosso arquivo de configuração dentro dessa pasta
    $configFile = Join-Path $exeDir "userid.cfg"
} catch {
    # Fallback para o caso de estar rodando como script .ps1 puro
    $configFile = Join-Path $PSScriptRoot "userid.cfg"
}

$EmployeeID = ""

# Verifica se o arquivo de configuração existe e não está vazio
if ((Test-Path $configFile) -and (-not [string]::IsNullOrWhiteSpace((Get-Content $configFile -ErrorAction SilentlyContinue)))) {
    # Se existe, lê o ID do arquivo
    $EmployeeID = Get-Content $configFile
    Write-Host "Usuário '$EmployeeID' identificado. Iniciando monitoramento."
} else {
    # Se não existe, pede o ID ao usuário
    do {
        $EmployeeID = Read-Host -Prompt "Bem-vindo! Esta é a primeira execução. Por favor, digite seu nome de identificacao (ex: joao.silva)"
    } until (-not [string]::IsNullOrWhiteSpace($EmployeeID))

    # Salva o ID no arquivo para as próximas execuções
    try {
        Set-Content -Path $configFile -Value $EmployeeID
        Write-Host "Obrigado! Seu ID foi salvo para usos futuros."
    } catch {
        Write-Warning "Nao foi possivel salvar o ID do usuario. Ele sera solicitado novamente na proxima execucao."
    }
}

Start-Sleep -Seconds 2 # Uma pequena pausa para o usuário ler a mensagem

# --- LOOP PRINCIPAL ---
Write-Host "Monitoramento de rede iniciado. Por favor, mantenha esta janela aberta."
# (O resto do script permanece exatamente o mesmo...)
while ($true) {
    $cycleStart = Get-Date
    
    $csvPayload = ""
    foreach ($target in $PingTargets) {
        Write-Host "[$([string](Get-Date -Format 'HH:mm:ss'))] Testando $target..." -NoNewline
        $pings = Test-Connection -ComputerName $target -Count $PingsPerInterval -ErrorAction SilentlyContinue
        
        $successfulPings = $pings | Where-Object { $_.StatusCode -eq 0 }
        $packetLoss = if ($pings) { (($pings.Count - $successfulPings.Count) / $pings.Count) * 100 } else { 100 }
        
        if ($successfulPings) {
            $latencies = $successfulPings.ResponseTime
            $avgLatency = $latencies | Measure-Object -Average | Select-Object -ExpandProperty Average
            $jitter = Get-Jitter -latencies $latencies
            Write-Host " -> Latencia: $([math]::Round($avgLatency,0))ms, Perda: $([math]::Round($packetLoss,0))%"
        } else {
            $avgLatency = 0; $jitter = 0
            Write-Host " -> FALHA NO PING" -ForegroundColor Red
        }

        # Formato: employee_id,ping_host,packet_loss_percent,avg_latency_ms,jitter_ms
        $csvPayload += "$EmployeeID,$target,$([math]::Round($packetLoss,2)),$([math]::Round($avgLatency,2)),$([math]::Round($jitter,2))`n"
    }

    if ($csvPayload) {
        try {
            Invoke-RestMethod -Uri $ApiEndpoint -Method Post -Body $csvPayload -ContentType "text/csv; charset=utf-8"
        } catch {
            Write-Warning "ERRO AO ENVIAR DADOS PARA A API."
        }
    }
    
    $elapsed = (Get-Date) - $cycleStart
    $sleepTime = [TimeSpan]::FromSeconds($IntervalSeconds) - $elapsed
    if ($sleepTime.TotalSeconds -gt 0) {
        Start-Sleep -Seconds $sleepTime.TotalSeconds
    }
}