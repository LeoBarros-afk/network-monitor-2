import os

class Config:
    """Configuração base."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'chave_secreta_padrao')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

class DevelopmentConfig(Config):
    """Configuração de Desenvolvimento (a que usamos no Docker)."""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

class TestingConfig(Config):
    """Configuração de Teste."""
    TESTING = True
    # Usa um banco de dados SQLite em memória para os testes serem rápidos e isolados.
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    # A chave JWT pode ser fixa para os testes.
    JWT_SECRET_KEY = 'chave_secreta_de_teste'