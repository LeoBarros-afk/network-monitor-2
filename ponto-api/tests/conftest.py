import pytest
from app import create_app, db, Usuario, bcrypt
from config import TestingConfig

@pytest.fixture(scope='module')
def test_app():
    """Cria uma instância da aplicação Flask para os testes."""
    app = create_app(TestingConfig)
    
    with app.app_context():
        db.create_all()
        
        hashed_password_admin = bcrypt.generate_password_hash('senha_admin').decode('utf-8')
        admin = Usuario(nome_completo='Admin de Teste', username='testadmin', password_hash=hashed_password_admin, role='admin')
        
        hashed_password_func = bcrypt.generate_password_hash('senha_func').decode('utf-8')
        func = Usuario(nome_completo='Func de Teste', username='testfunc', password_hash=hashed_password_func, role='funcionario')

        db.session.add(admin)
        db.session.add(func)
        db.session.commit()

        yield app

        db.session.remove()
        db.drop_all()

@pytest.fixture(scope='module')
def test_client(test_app):
    """Cria um cliente de teste para fazer requisições à API."""
    return test_app.test_client()