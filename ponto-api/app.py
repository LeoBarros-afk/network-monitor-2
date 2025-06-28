# Arquivo: ponto-api/app.py

from flask import Flask

app = Flask(__name__)

# Rota para o teste de saúde.
@app.route('/api/healthcheck', methods=['GET'])
def health_check():
    return "API do Sistema de Ponto esta funcionando!", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)