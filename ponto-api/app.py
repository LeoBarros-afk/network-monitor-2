from flask import Flask

app = Flask(__name__)

# AJUSTE: A rota agora é apenas '/healthcheck', pois o '/api' é tratado pelo Nginx.
@app.route('/healthcheck', methods=['GET'])
def health_check():
    """
    Um endpoint simples para verificar se a API de ponto está no ar.
    """
    return "API do Sistema de Ponto está funcionando PERFEITAMENTE!", 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)

