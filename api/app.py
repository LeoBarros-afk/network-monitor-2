import os
import requests
import datetime
from flask import Flask, request, jsonify
from influxdb import InfluxDBClient

app = Flask(__name__)

# --- Configurações do InfluxDB e Telegram (das variáveis de ambiente) ---
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
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        app.logger.warning("Token ou Chat ID do Telegram não configurados. Alerta não enviado.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"}
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        app.logger.info("Alerta enviado ao Telegram.")
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Erro ao enviar alerta para o Telegram: {e}")

def check_for_alerts(employee_id, ping_host, packet_loss, latency):
    # --- DEFINA SEUS LIMITES DE ALERTA AQUI ---
    PACKET_LOSS_THRESHOLD = 2.0  # Alerta se a perda for maior que 5%
    LATENCY_THRESHOLD = 100.0    # Alerta se a latência for maior que 150ms

    alerts = []
    if packet_loss > PACKET_LOSS_THRESHOLD:
        alerts.append(f"Perda de Pacotes: *{packet_loss:.2f}%*")
    if latency > LATENCY_THRESHOLD:
        alerts.append(f"Latência Alta: *{latency:.2f}ms*")
    
    if alerts:
        header = f"🚨 *Alerta de Rede para {employee_id}* (Alvo: {ping_host})\n"
        message = header + "\n".join(alerts)
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
            
            # Formato esperado: employee_id,ping_host,packet_loss_percent,avg_latency_ms,jitter_ms,download_mbps,upload_mbps
            employee_id, ping_host, packet_loss, latency, jitter, download, upload = line.split(',')
            
            packet_loss_f = float(packet_loss)
            latency_f = float(latency)
            
            # Checa por alertas
            check_for_alerts(employee_id, ping_host, packet_loss_f, latency_f)
            
            # Monta o ponto para o InfluxDB
            points.append({
                "measurement": "network_stats",
                "tags": {"employee_id": employee_id, "ping_host": ping_host},
                "time": datetime.datetime.utcnow().isoformat() + "Z",
                "fields": {
                    "packet_loss_percent": packet_loss_f,
                    "avg_latency_ms": latency_f,
                    "jitter_ms": float(jitter) if jitter != 'N/A' else 0.0,
                    "download_mbps": float(download) if download != 'N/A' else 0.0,
                    "upload_mbps": float(upload) if upload != 'N/A' else 0.0,
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
    return "API is running", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)