# Arquivo: ponto-api/app.py
# Este é o ponto de entrada da nossa nova API.
# Por enquanto, ele apenas cria a aplicação e uma rota de teste.

from flask import Flask

app = Flask(__name__)

@app.route('/api/healthcheck', methods=['GET'])
def health_check():
    """
    Um endpoint simples para verificar se a API de ponto está no ar.
    """
    return "API do Sistema de Ponto está funcionando!", 200

if __name__ == '__main__':
    # O host '0.0.0.0' faz com que a API seja acessível
    # por outros contêineres na rede Docker.
    app.run(host='0.0.0.0', port=5001)
