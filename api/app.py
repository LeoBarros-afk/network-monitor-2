# Arquivo: api/app.py (API de Monitoramento, não a de ponto)

import os
import datetime
from flask import Flask, request, jsonify
from influxdb import InfluxDBClient

app = Flask(__name__)

# Configurações do InfluxDB (lidas do ambiente do Docker)
INFLUXDB_HOST = os.environ.get('INFLUXDB_HOST')
INFLUXDB_PORT = int(os.environ.get('INFLUXDB_PORT'))
INFLUXDB_USER = os.environ.get('INFLUXDB_USER')
INFLUXDB_PASSWORD = os.environ.get('INFLUXDB_PASSWORD')
INFLUXDB_DB = os.environ.get('INFLUXDB_DB')

try:
    client = InfluxDBClient(host=INFLUXDB_HOST, port=INFLUXDB_PORT, username=INFLUXDB_USER, password=INFLUXDB_PASSWORD)
    client.switch_database(INFLUXDB_DB)
except Exception as e:
    app.logger.error(f"Não foi possível conectar ao InfluxDB: {e}")


@app.route('/data', methods=['POST'])
def receive_data():
    """Recebe dados de pings individuais e os salva no InfluxDB."""
    csv_data = request.data.decode('utf-8').strip()
    points = []
    try:
        for line in csv_data.split('\n'):
            if not line: continue
            
            # Novo formato: employee_id,ping_host,latency_ms,success_flag
            employee_id, ping_host, latency_ms, success = line.split(',')
            
            # Monta o ponto de dados para o InfluxDB
            points.append({
                "measurement": "ping_results", # Novo nome para a "tabela"
                "tags": {
                    "employee_id": employee_id,
                    "ping_host": ping_host
                },
                "time": datetime.datetime.now().isoformat() + "Z",
                "fields": {
                    "latency_ms": int(latency_ms),
                    "success": int(success) # 1 para sucesso, 0 para falha
                }
            })

        if points:
            client.write_points(points)
            return jsonify({"status": "success", "points_received": len(points)}), 200
        else:
            return jsonify({"status": "no valid data"}), 400
    except Exception as e:
        app.logger.error(f"Erro ao processar dados: {e}\nDados recebidos: {csv_data}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)