# Arquivo: ponto-api/app.py
import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from functools import wraps

# As extensões são inicializadas aqui
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

# --- DECORADOR DE VERIFICAÇÃO DE ADMIN ---
def admin_required():
    def wrapper(fn):
        @wraps(fn)
        @jwt_required()
        def decorator(*args, **kwargs):
            claims = get_jwt()
            if claims.get("role") == "admin":
                return fn(*args, **kwargs)
            else:
                return jsonify(msg="Acesso restrito a administradores!"), 403
        return decorator
    return wrapper

# --- MODELOS DO BANCO DE DADOS ---
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
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    tipo_registro = db.Column(db.String(20), nullable=False)
    justificativa = db.Column(db.Text, nullable=True)

# --- FUNÇÃO "FÁBRICA" QUE CRIA A APLICAÇÃO ---
def create_app():
    app = Flask(__name__)

    # Carrega as configurações
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

    # Vincula as extensões à aplicação
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # --- ROTAS DA API ---
    @app.route('/api/login', methods=['POST'])
    def login():
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        user = Usuario.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            additional_claims = {"role": user.role}
            access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
            return jsonify(access_token=access_token)
        return jsonify({"msg": "Usuário ou senha inválidos"}), 401

    @app.route('/api/ponto/registrar', methods=['POST'])
    @jwt_required()
    def registrar_ponto():
        tipo = request.json.get('tipo', None)
        tipos_validos = ['entrada', 'saida_almoco', 'volta_almoco', 'saida']
        if not tipo or tipo not in tipos_validos:
            return jsonify({"msg": "Tipo de registro inválido ou ausente"}), 400
        current_user_id = get_jwt_identity()
        novo_registro = RegistroPonto(usuario_id=int(current_user_id), tipo_registro=tipo)
        db.session.add(novo_registro)
        db.session.commit()
        return jsonify({"msg": f"Ponto de '{tipo}' registrado com sucesso!"}), 201
    
    # --- ROTAS DE ADMINISTRAÇÃO ---

    @app.route('/api/admin/usuarios', methods=['GET'])
    @admin_required()
    def listar_usuarios():
        usuarios = Usuario.query.all()
        lista_usuarios = [{"id": u.id, "nome_completo": u.nome_completo, "username": u.username, "role": u.role} for u in usuarios]
        return jsonify(lista_usuarios)

    @app.route('/api/admin/registros/<int:usuario_id>', methods=['GET'])
    @admin_required()
    def listar_registros_usuario(usuario_id):
        registros = RegistroPonto.query.filter_by(usuario_id=usuario_id).order_by(RegistroPonto.timestamp.desc()).all()
        lista_registros = [{"id": r.id, "timestamp": r.timestamp.isoformat(), "tipo_registro": r.tipo_registro, "justificativa": r.justificativa} for r in registros]
        return jsonify(lista_registros)

    # --- NOVA ROTA PARA EDITAR UM REGISTRO ---
    @app.route('/api/admin/registros/<int:registro_id>', methods=['PUT'])
    @admin_required()
    def editar_registro(registro_id):
        registro = RegistroPonto.query.get_or_404(registro_id)
        dados = request.json
        
        # O admin pode alterar o timestamp, o tipo do registro ou adicionar uma justificativa
        if 'timestamp' in dados:
            # Converte a string de data/hora enviada para um objeto datetime do Python
            try:
                registro.timestamp = datetime.fromisoformat(dados['timestamp'])
            except ValueError:
                return jsonify({"msg": "Formato de timestamp inválido. Use o formato ISO (YYYY-MM-DDTHH:MM:SS)"}), 400
        
        if 'tipo_registro' in dados:
            registro.tipo_registro = dados['tipo_registro']
        
        if 'justificativa' in dados:
            registro.justificativa = dados['justificativa']

        db.session.commit()
        return jsonify({"msg": "Registro atualizado com sucesso!"})

    # --- NOVA ROTA PARA DELETAR UM REGISTRO ---
    @app.route('/api/admin/registros/<int:registro_id>', methods=['DELETE'])
    @admin_required()
    def deletar_registro(registro_id):
        # Encontra o registro ou retorna um erro 404 se não existir
        registro = RegistroPonto.query.get_or_404(registro_id)
        
        db.session.delete(registro)
        db.session.commit()
        return jsonify({"msg": "Registro deletado com sucesso!"})

    return app

# A execução principal agora cria a aplicação usando a nossa "fábrica"
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001)