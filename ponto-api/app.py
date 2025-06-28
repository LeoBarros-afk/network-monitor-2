import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager

app = Flask(__name__)

# --- CONFIGURAÇÕES ---
# Lê a URL do banco de dados do ambiente
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Lê a chave secreta do JWT do ambiente
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

# --- INICIALIZAÇÃO DAS EXTENSÕES ---
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# --- MODELOS DO BANCO DE DADOS (NOSSAS TABELAS) ---

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='funcionario')

class RegistroPonto(db.Model):
    __tablename__ = 'registros_ponto'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False)
    tipo_registro = db.Column(db.String(20), nullable=False)
    justificativa = db.Column(db.Text, nullable=True)

# --- ROTAS DA API ---

@app.route('/api/healthcheck', methods=['GET'])
def health_check():
    try:
        db.session.execute('SELECT 1')
        return "API do Sistema de Ponto funcionando E conectada ao banco de dados!", 200
    except Exception as e:
        return f"API funcionando, mas FALHA ao conectar ao banco de dados: {e}", 500

# --- NOVA ROTA DE LOGIN ---
@app.route('/api/login', methods=['POST'])
def login():
    # Pega o username e a password enviados no corpo da requisição
    username = request.json.get('username', None)
    password = request.json.get('password', None)

    # Procura o usuário no banco de dados
    user = Usuario.query.filter_by(username=username).first()

    # Verifica se o usuário existe e se a senha está correta
    if user and bcrypt.check_password_hash(user.password_hash, password):
        # Se estiver tudo certo, cria um token de acesso com a identidade do usuário
        # Podemos incluir informações extras no token, como o 'role'
        additional_claims = {"role": user.role}
        access_token = create_access_token(identity=user.id, additional_claims=additional_claims)
        return jsonify(access_token=access_token)

    # Se o usuário ou a senha estiverem incorretos, retorna um erro de não autorizado
    return jsonify({"msg": "Usuário ou senha inválidos"}), 401


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)