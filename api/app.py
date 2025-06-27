import os
import requests
import datetime
from flask import Flask, request, jsonify
from influxdb import InfluxDBClient

app = Flask(__name__)

# --- Configurações do InfluxDB e Telegram (lidas do ambiente) ---
# O ideal é que estes valores sejam lidos a partir de um arquivo .env pelo docker-compose
INFLUXDB_HOST = os.environ.get('INFLUXDB_HOST')
INFLUXDB_PORT = int(os.environ.get('INFLUXDB_PORT'))
INFLUXDB_USER = os.environ.get('INFLUXDB_USER')
INFLUXDB_PASSWORD = os.environ.get('INFLUXDB_PASSWORD')
INFLUXDB_DB = os.environ.get('INFLUXDB_DB')
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')

# --- Conexão com o Banco de Dados ---
try:
    client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, username=INFLUXDB_USER, password=INFLUXDB_PASSWORD)
    client.switch_database(INFLUXDB_DB)
except Exception as e:
    app.logger.error(f"Não foi possível conectar ao InfluxDB: {e}")

# --- Funções de Alerta ---
def send_telegram_alert(message):
    """Envia uma mensagem de alerta para o grupo configurado no Telegram."""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        app.logger.warning("Token ou Chat ID do Telegram não configurados. Alerta não enviado.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status() # Isso irá gerar um erro para respostas HTTP 4xx/5xx
        app.logger.info("Alerta enviado ao Telegram.")
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Erro ao enviar alerta para o Telegram: {e}")

def check_for_alerts(employee_id, ping_host, packet_loss, latency, jitter):
    """Verifica se os limiares de alerta foram atingidos e envia a notificação."""
    # --- DEFINA SEUS LIMITES DE ALERTA AQUI ---
    PACKET_LOSS_THRESHOLD = 2.0  # Alerta se a perda for maior que 2%
    LATENCY_THRESHOLD = 100.0    # Alerta se a latência for maior que 100ms

    alert_reasons = []
    # Verifica se alguma condição principal de alerta foi atingida
    if packet_loss > PACKET_LOSS_THRESHOLD:
        alert_reasons.append(f"Perda de Pacotes: *{packet_loss:.2f}%*")
    if latency > LATENCY_THRESHOLD:
        alert_reasons.append(f"Latência Alta: *{latency:.2f}ms*")
    
    # Se houver um motivo para alertar...
    if alert_reasons:
        header = f"🚨 *Alerta de Rede para {employee_id}* (Alvo: {ping_host})\n"
        
        # Constrói a mensagem principal com os motivos do alerta
        main_message = "\n".join(alert_reasons)
        
        # Prepara a informação do Jitter para ser adicionada como contexto
        jitter_info = f"Jitter Atual: *{jitter:.2f}ms*"

        # Junta o cabeçalho, a mensagem principal e a informação de jitter
        message = f"{header}{main_message}\n{jitter_info}"
        
        send_telegram_alert(message)

# --- Rotas da API ---
@app.route('/data', methods=['POST'])
def receive_data():
    """Recebe dados em CSV, salva no DB e checa por alertas."""
    csv_data = request.data.decode('utf-8').strip()
    points = []
    try:
        for line in csv_data.split('\n'):
            if not line: continue
            
            # Formato esperado: employee_id,ping_host,packet_loss_percent,avg_latency_ms,jitter_ms
            employee_id, ping_host, packet_loss, latency, jitter = line.split(',')
            
            # Converte os valores para float para processamento
            packet_loss_f = float(packet_loss)
            latency_f = float(latency)
            jitter_f = float(jitter)
            
            # Chama a função que verifica e envia os alertas
            check_for_alerts(employee_id, ping_host, packet_loss_f, latency_f, jitter_f)
            
            # Monta o ponto de dados para o InfluxDB
            points.append({
                "measurement": "network_stats",
                "tags": {"employee_id": employee_id, "ping_host": ping_host},
                "time": datetime.datetime.utcnow().isoformat() + "Z",
                "fields": {
                    "packet_loss_percent": packet_loss_f,
                    "avg_latency_ms": latency_f,
                    "jitter_ms": jitter_f,
                }
            })

        if points:
            client.write_points(points)
            return jsonify({"status": "success", "points": len(points)}), 200
        else:
            return jsonify({"status": "no valid data"}), 400
    except Exception as e:
        app.logger.error(f"Erro ao processar dados: {e}\nDados recebidos: {csv_data}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint simples para verificar se a API está no ar."""
    return "API is running", 200

if __name__ == '__main__':
    # Inicia o servidor Flask, escutando em todas as interfaces de rede na porta 5000
    app.run(host='0.0.0.0', port=5000)