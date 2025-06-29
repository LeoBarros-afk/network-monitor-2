# Arquivo: ponto-api/config.py
# Este arquivo centraliza as configurações da nossa aplicação.

import os

class Config:
    """Configuração base que se aplica a todos os ambientes."""
    # Define uma chave secreta padrão, mas o ideal é que ela venha do ambiente.
    SECRET_KEY = os.environ.get('SECRET_KEY')
    
    # Lê a chave secreta do JWT do ambiente.
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    
    # Desativa uma funcionalidade do SQLAlchemy que não usamos e que consome recursos.
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """Configuração para o ambiente de desenvolvimento (o que usamos no Docker)."""
    # Lê a URL de conexão com o banco de dados PostgreSQL do ambiente.
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    DEBUG = False

class TestingConfig(Config):
    """Configuração específica para quando estivermos rodando os testes automatizados."""
    TESTING = True
    
    # Para os testes, usamos um banco de dados SQLite em memória.
    # Isso torna os testes super rápidos e garante que eles não toquem nos seus dados reais.
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # A chave JWT pode ser fixa para os testes, não precisa ser um segredo.
    JWT_SECRET_KEY = 'chave_secreta_para_testes'