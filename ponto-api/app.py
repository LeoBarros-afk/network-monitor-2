# Arquivo: ponto-api/app.py

from flask import Flask

app = Flask(__name__)

# A rota é '/healthcheck', pois o Nginx cuidará do prefixo '/api'.
@app.route('/healthcheck', methods=['GET'])
def health_check():
    return "API do Sistema de Ponto funcionando DE VERDADE!", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)