import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

app = Flask(__name__)

# --- CONFIGURAÇÃO DO BANCO DE DADOS ---
# A URL de conexão é lida da variável de ambiente que definimos no docker-compose.yml
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicializa as extensões
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- MODELOS DO BANCO DE DADOS (NOSSAS TABELAS) ---

# SQLAlchemy vai transformar esta classe em uma tabela chamada 'usuarios'
class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='funcionario') # 'admin' ou 'funcionario'

# SQLAlchemy vai transformar esta classe em uma tabela chamada 'registros_ponto'
class RegistroPonto(db.Model):
    __tablename__ = 'registros_ponto'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    tipo_registro = db.Column(db.String(20), nullable=False) # 'entrada', 'saida_almoco', etc.
    justificativa = db.Column(db.Text, nullable=True)

# --- ROTAS DA API ---

@app.route('/healthcheck', methods=['GET'])
def health_check():
    # Vamos adicionar um teste de conexão com o DB aqui
    try:
        db.session.execute('SELECT 1')
        return "API do Sistema de Ponto funcionando E conectada ao banco de dados!", 200
    except Exception as e:
        return f"API funcionando, mas FALHA ao conectar ao banco de dados: {e}", 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)

