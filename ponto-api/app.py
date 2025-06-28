# Arquivo: ponto-api/app.py
import os
import io
import pandas as pd
from flask import Flask, request, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, JWTManager, jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, date
from functools import wraps
from sqlalchemy import extract

# (Inicialização das extensões e decorador de admin permanecem os mesmos)
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

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

# (Modelos do banco de dados permanecem os mesmos)
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
    usuario = db.relationship('Usuario', backref='registros')

# --- FUNÇÃO "FÁBRICA" QUE CRIA A APLICAÇÃO ---
def create_app():
    app = Flask(__name__)

    # (Configurações permanecem as mesmas)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    # --- ROTAS DA API ---
    @app.route('/api/login', methods=['POST'])
    def login():
        # (código do login permanece o mesmo)
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        user = Usuario.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            additional_claims = {"role": user.role, "nome_completo": user.nome_completo}
            access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
            return jsonify(access_token=access_token)
        return jsonify({"msg": "Usuário ou senha inválidos"}), 401

    @app.route('/api/ponto/registrar', methods=['POST'])
    @jwt_required()
    def registrar_ponto():
        # (código do registro de ponto permanece o mesmo)
        tipo = request.json.get('tipo', None)
        tipos_validos = ['entrada', 'saida_almoco', 'volta_almoco', 'saida']
        if not tipo or tipo not in tipos_validos:
            return jsonify({"msg": "Tipo de registro inválido ou ausente"}), 400
        current_user_id = get_jwt_identity()
        novo_registro = RegistroPonto(usuario_id=int(current_user_id), tipo_registro=tipo)
        db.session.add(novo_registro)
        db.session.commit()
        return jsonify({"msg": f"Ponto de '{tipo}' registrado com sucesso!"}), 201
    
    # --- NOVA ROTA PARA BUSCAR DADOS DO DIA E DO USUÁRIO ---
    @app.route('/api/me/hoje', methods=['GET'])
    @jwt_required()
    def get_user_and_today_records():
        current_user_id = get_jwt_identity()
        user = Usuario.query.get(int(current_user_id))
        
        # Busca os registros de hoje
        today_start = datetime.combine(date.today(), datetime.min.time())
        registros_hoje = RegistroPonto.query.filter(
            RegistroPonto.usuario_id == int(current_user_id),
            RegistroPonto.timestamp >= today_start
        ).all()
        
        tipos_registrados = [r.tipo_registro for r in registros_hoje]
        
        user_data = {
            "id": user.id,
            "nome_completo": user.nome_completo,
            "username": user.username,
            "role": user.role,
            "registros_hoje": tipos_registrados
        }
        return jsonify(user_data)


    # (Rotas de Admin permanecem as mesmas)
    @app.route('/api/admin/usuarios', methods=['GET'])
    @admin_required()
    def listar_usuarios():
        # ...
        usuarios = Usuario.query.all()
        lista_usuarios = [{"id": u.id, "nome_completo": u.nome_completo, "username": u.username, "role": u.role} for u in usuarios]
        return jsonify(lista_usuarios)

    @app.route('/api/admin/registros/<int:usuario_id>', methods=['GET'])
    @admin_required()
    def listar_registros_usuario(usuario_id):
        # ...
        registros = RegistroPonto.query.filter_by(usuario_id=usuario_id).order_by(RegistroPonto.timestamp.desc()).all()
        lista_registros = [{"id": r.id, "timestamp": r.timestamp.isoformat(), "tipo_registro": r.tipo_registro, "justificativa": r.justificativa} for r in registros]
        return jsonify(lista_registros)

    @app.route('/api/admin/registros/<int:registro_id>', methods=['PUT'])
    @admin_required()
    def editar_registro(registro_id):
        # ...
        registro = RegistroPonto.query.get_or_404(registro_id)
        dados = request.json
        if 'timestamp' in dados:
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

    @app.route('/api/admin/registros/<int:registro_id>', methods=['DELETE'])
    @admin_required()
    def deletar_registro(registro_id):
        # ...
        registro = RegistroPonto.query.get_or_404(registro_id)
        db.session.delete(registro)
        db.session.commit()
        return jsonify({"msg": "Registro deletado com sucesso!"})

    @app.route('/api/admin/relatorio', methods=['GET'])
    @admin_required()
    def gerar_relatorio():
        # ...
        ano = request.args.get('ano', type=int)
        mes = request.args.get('mes', type=int)

        if not ano or not mes:
            return jsonify({"msg": "Parâmetros 'ano' e 'mes' são obrigatórios."}), 400

        registros = RegistroPonto.query.join(Usuario).filter(
            extract('year', RegistroPonto.timestamp) == ano,
            extract('month', RegistroPonto.timestamp) == mes
        ).order_by(Usuario.nome_completo, RegistroPonto.timestamp).all()

        if not registros:
            return jsonify({"msg": "Nenhum registro encontrado para este período."}), 404
        
        dados_para_excel = []
        for r in registros:
            dados_para_excel.append({
                'ID Registro': r.id,
                'Funcionário': r.usuario.nome_completo,
                'Username': r.usuario.username,
                'Data e Hora': r.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                'Tipo': r.tipo_registro,
                'Justificativa': r.justificativa
            })
        
        df = pd.DataFrame(dados_para_excel)
        
        output = io.BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name='Registros de Ponto')
        writer.close()
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'relatorio_ponto_{ano}_{mes}.xlsx'
        )

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001)
