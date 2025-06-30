# ===================================================================
# Sistema de Monitoramento de Rede v4.0 - Modo Ping a Ping
# ===================================================================

# --- CONFIGURAÇÕES ---
$ApiEndpoint = "http://187.33.93.122:5000/data" # Use localhost para testes locais
$PingTargets = @("8.8.8.8", "187.33.93.122", "38.91.107.164", "br11.td.commpeak.com") 
$IntervalSecondsBetweenPings = 1 # Pausa de 1 segundo entre cada ping

# Lógica robusta para encontrar a pasta do script/executável
try {
    $scriptDir = Split-Path -Path $MyInvocation.MyCommand.Path
} catch {
    $scriptPath = (Get-Process -Id $PID).Path
    $scriptDir = Split-Path -Path $scriptPath
}
$QueueFile = Join-Path $scriptDir "pending_data.csv"
$configFile = Join-Path $scriptDir "userid.cfg"

# --- FUNÇÃO PARA ENVIAR DADOS ---
function Send-Data($Payload) {
    try {
        Invoke-RestMethod -Uri $ApiEndpoint -Method Post -Body $Payload -ContentType "text/csv; charset=utf-8" -TimeoutSec 5
        return $true
    } catch {
        return $false
    }
}

# --- INÍCIO DA EXECUÇÃO ---
Clear-Host
Write-Host "Iniciando Monitor de Rede da Empresa (v4.0 - Ping a Ping)..." -ForegroundColor Green

# Lógica para carregar ou pedir o ID do funcionário (inalterada)
$EmployeeID = ""
if ((Test-Path $configFile) -and (-not [string]::IsNullOrWhiteSpace((Get-Content $configFile -ErrorAction SilentlyContinue)))) {
    $EmployeeID = Get-Content $configFile
} else {
    do { $EmployeeID = Read-Host -Prompt "Bem-vindo! Por favor, digite seu nome de identificacao (ex: joao.silva)" } until (-not [string]::IsNullOrWhiteSpace($EmployeeID))
    try { Set-Content -Path $configFile -Value $EmployeeID; Write-Host "ID salvo para usos futuros." } catch { Write-Warning "Nao foi possivel salvar o ID do usuario." }
}
Write-Host "Monitoramento iniciado para o usuário '$EmployeeID'. Pressione CTRL+C para parar."
Start-Sleep -Seconds 2

# --- LOOP PRINCIPAL ---
while ($true) {
    foreach ($target in $PingTargets) {
        $latency = 0
        $success = 0 # 0 para falha, 1 para sucesso

        # Envia um único ping
        $pingResult = Test-Connection -ComputerName $target -Count 1 -ErrorAction SilentlyContinue
        
        if ($pingResult -and $pingResult.StatusCode -eq 0) {
            # Ping bem-sucedido
            $latency = $pingResult.ResponseTime
            $success = 1
            Write-Host "[$([string](Get-Date -Format 'HH:mm:ss'))] Alvo: $target -> Sucesso! Latencia: ${latency}ms" -ForegroundColor Green
        } else {
            # Ping falhou
            Write-Host "[$([string](Get-Date -Format 'HH:mm:ss'))] Alvo: $target -> FALHA" -ForegroundColor Red
        }

        # Novo formato CSV: employee_id,ping_host,latency_ms,success_flag
        $csvPayload = "$EmployeeID,$target,$latency,$success`n"

        # Tenta enviar o dado. Se falhar, adiciona à fila.
        if (-not (Send-Data -Payload $csvPayload)) {
            Write-Warning "Falha no envio. Armazenando na fila..."
            Add-Content -Path $QueueFile -Value $csvPayload
        }

        # Verifica e tenta reenviar dados da fila se a conexão atual funcionou
        if ($success -eq 1 -and (Test-Path $QueueFile)) {
             $pendingData = Get-Content $QueueFile
             if (Send-Data -Payload $pendingData) {
                 Write-Host "Dados da fila reenviados com sucesso!"
                 Remove-Item $QueueFile
             }
        }

        Start-Sleep -Seconds $IntervalSecondsBetweenPings
    }
}
