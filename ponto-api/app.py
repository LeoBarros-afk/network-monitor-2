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

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='funcionario')
    registros = db.relationship('RegistroPonto', backref='usuario', lazy=True, cascade="all, delete-orphan")

class RegistroPonto(db.Model):
    __tablename__ = 'registros_ponto'
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id', ondelete='CASCADE'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    tipo_registro = db.Column(db.String(20), nullable=False)
    justificativa = db.Column(db.Text, nullable=True)

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')

    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    @app.route('/api/login', methods=['POST'])
    def login():
        username = request.json.get('username', None)
        password = request.json.get('password', None)
        user = Usuario.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            additional_claims = {"role": user.role}
            access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
            return jsonify(access_token=access_token, role=user.role)
        return jsonify({"msg": "Usuário ou senha inválidos"}), 401
    
    # ... (outras rotas de funcionário permanecem iguais)
    @app.route('/api/me/hoje', methods=['GET'])
    @jwt_required()
    def get_user_and_today_records():
        current_user_id = get_jwt_identity()
        user = Usuario.query.get(int(current_user_id))
        today_start = datetime.combine(date.today(), datetime.min.time())
        registros_hoje = RegistroPonto.query.filter(RegistroPonto.usuario_id == int(current_user_id), RegistroPonto.timestamp >= today_start).all()
        tipos_registrados = [r.tipo_registro for r in registros_hoje]
        user_data = { "id": user.id, "nome_completo": user.nome_completo, "registros_hoje": tipos_registrados }
        return jsonify(user_data)
        
    @app.route('/api/ponto/registrar', methods=['POST'])
    @jwt_required()
    def registrar_ponto():
        tipo = request.json.get('tipo', None)
        tipos_validos = ['entrada', 'saida_almoco', 'volta_almoco', 'saida']
        if not tipo or tipo not in tipos_validos: return jsonify({"msg": "Tipo de registro inválido ou ausente"}), 400
        current_user_id = get_jwt_identity()
        novo_registro = RegistroPonto(usuario_id=int(current_user_id), tipo_registro=tipo)
        db.session.add(novo_registro)
        db.session.commit()
        return jsonify({"msg": f"Ponto de '{tipo}' registrado com sucesso!"}), 201

    # --- ROTAS DE ADMINISTRAÇÃO ---
    @app.route('/api/admin/usuarios', methods=['GET', 'POST'])
    @admin_required()
    def gerenciar_usuarios():
        if request.method == 'GET':
            usuarios = Usuario.query.order_by(Usuario.nome_completo).all()
            return jsonify([{"id": u.id, "nome_completo": u.nome_completo, "username": u.username, "role": u.role} for u in usuarios])
        if request.method == 'POST':
            dados = request.json
            if not all([dados.get('username'), dados.get('password'), dados.get('nome_completo')]): return jsonify({"msg": "Dados incompletos"}), 400
            if Usuario.query.filter_by(username=dados['username']).first(): return jsonify({"msg": "Username já existe"}), 409
            hashed_password = bcrypt.generate_password_hash(dados['password']).decode('utf-8')
            novo_usuario = Usuario(username=dados['username'], password_hash=hashed_password, nome_completo=dados['nome_completo'], role=dados.get('role', 'funcionario'))
            db.session.add(novo_usuario)
            db.session.commit()
            return jsonify({"msg": "Usuário criado com sucesso!"}), 201

    @app.route('/api/admin/usuarios/<int:usuario_id>', methods=['PUT', 'DELETE'])
    @admin_required()
    def gerenciar_usuario_especifico(usuario_id):
        user = Usuario.query.get_or_404(usuario_id)
        if request.method == 'PUT':
            dados = request.json
            if 'username' in dados: user.username = dados['username']
            if 'nome_completo' in dados: user.nome_completo = dados['nome_completo']
            if 'role' in dados: user.role = dados['role']
            if 'password' in dados and dados['password']:
                user.password_hash = bcrypt.generate_password_hash(dados['password']).decode('utf-8')
            db.session.commit()
            return jsonify({"msg": "Usuário atualizado com sucesso!"})
        if request.method == 'DELETE':
            db.session.delete(user)
            db.session.commit()
            return jsonify({"msg": "Usuário deletado com sucesso!"})

    @app.route('/api/admin/registros', methods=['GET', 'POST'])
    @admin_required()
    def gerenciar_registros():
        if request.method == 'GET':
            usuario_id = request.args.get('usuario_id', type=int)
            mes = request.args.get('mes', type=int)
            ano = request.args.get('ano', type=int)
            dia = request.args.get('dia', type=int) # Novo filtro por dia

            query = RegistroPonto.query.join(Usuario).order_by(Usuario.nome_completo, RegistroPonto.timestamp.desc())
            if usuario_id: query = query.filter(RegistroPonto.usuario_id == usuario_id)
            if mes: query = query.filter(extract('month', RegistroPonto.timestamp) == mes)
            if ano: query = query.filter(extract('year', RegistroPonto.timestamp) == ano)
            if dia: query = query.filter(extract('day', RegistroPonto.timestamp) == dia) # Aplica o filtro de dia
                
            registros = query.all()
            return jsonify([{"id": r.id, "usuario_id": r.usuario_id, "nome_usuario": r.usuario.nome_completo, "timestamp": r.timestamp.isoformat(), "tipo_registro": r.tipo_registro, "justificativa": r.justificativa} for r in registros])

        if request.method == 'POST':
            # ... (código para lançamento manual permanece o mesmo) ...
            dados = request.json
            usuario_id = dados.get('usuario_id')
            data_str = dados.get('data') # "YYYY-MM-DD"
            registros_ponto = dados.get('registros', {})
            if not all([usuario_id, data_str, registros_ponto]): return jsonify({"msg": "Dados incompletos"}), 400
            data_base = datetime.strptime(data_str, '%Y-%m-%d')
            for tipo, hora_str in registros_ponto.items():
                if hora_str:
                    hora, minuto = map(int, hora_str.split(':'))
                    timestamp_completo = data_base.replace(hour=hora, minute=minuto)
                    novo_registro = RegistroPonto(usuario_id=usuario_id, tipo_registro=tipo, timestamp=timestamp_completo, justificativa="Lançamento Manual")
                    db.session.add(novo_registro)
            db.session.commit()
            return jsonify({"msg": "Registros manuais inseridos com sucesso!"}), 201

    @app.route('/api/admin/registros/<int:registro_id>', methods=['PUT', 'DELETE'])
    @admin_required()
    def gerenciar_registro_especifico(registro_id):
        # ... (código para editar/deletar registro específico permanece o mesmo)
        registro = RegistroPonto.query.get_or_404(registro_id)
        if request.method == 'PUT':
            dados = request.json
            if 'timestamp' in dados: registro.timestamp = datetime.fromisoformat(dados['timestamp'])
            if 'tipo_registro' in dados: registro.tipo_registro = dados['tipo_registro']
            if 'justificativa' in dados: registro.justificativa = dados['justificativa']
            db.session.commit()
            return jsonify({"msg": "Registro atualizado com sucesso!"})
        if request.method == 'DELETE':
            db.session.delete(registro)
            db.session.commit()
            return jsonify({"msg": "Registro deletado com sucesso!"})

    # ... (outras rotas permanecem iguais) ...
    @app.route('/api/admin/relatorio', methods=['GET'])
    @admin_required()
    def gerar_relatorio():
        ano = request.args.get('ano', type=int)
        mes = request.args.get('mes', type=int)
        if not ano or not mes: return jsonify({"msg": "Parâmetros 'ano' e 'mes' são obrigatórios."}), 400
        registros = RegistroPonto.query.join(Usuario).filter(extract('year', RegistroPonto.timestamp) == ano, extract('month', RegistroPonto.timestamp) == mes).order_by(Usuario.nome_completo, RegistroPonto.timestamp).all()
        if not registros: return jsonify({"msg": "Nenhum registro encontrado para este período."}), 404
        dados_para_excel = [{'ID Registro': r.id, 'Funcionário': r.usuario.nome_completo, 'Username': r.usuario.username, 'Data e Hora': r.timestamp.strftime('%Y-%m-%d %H:%M:%S'), 'Tipo': r.tipo_registro, 'Justificativa': r.justificativa} for r in registros]
        df = pd.DataFrame(dados_para_excel)
        output = io.BytesIO()
        writer = pd.ExcelWriter(output, engine='openpyxl')
        df.to_excel(writer, index=False, sheet_name='Registros de Ponto')
        writer.close()
        output.seek(0)
        return send_file(output, mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', as_attachment=True, download_name=f'relatorio_ponto_{ano}_{mes}.xlsx')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5001)