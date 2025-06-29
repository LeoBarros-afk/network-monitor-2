import json

def test_login_sucesso(test_client):
    """Testa se o login funciona com credenciais corretas."""
    response = test_client.post('/api/login',
                                 data=json.dumps({'username': 'testadmin', 'password': 'senha_admin'}),
                                 content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data

def test_login_falha(test_client):
    """Testa se o login falha com senha incorreta."""
    response = test_client.post('/api/login',
                                 data=json.dumps({'username': 'testadmin', 'password': 'senha_errada'}),
                                 content_type='application/json')
    assert response.status_code == 401
    data = json.loads(response.data)
    assert data['msg'] == 'Usuário ou senha inválidos'

def test_criar_usuario_admin(test_client):
    """Testa se um admin pode criar um novo usuário."""
    # Primeiro, faz login como admin para pegar o token
    login_res = test_client.post('/api/login', data=json.dumps({'username': 'testadmin', 'password': 'senha_admin'}), content_type='application/json')
    token = json.loads(login_res.data)['access_token']

    # Tenta criar um novo usuário usando o token
    response = test_client.post('/api/admin/usuarios',
                                 headers={'Authorization': f'Bearer {token}'},
                                 data=json.dumps({
                                     'nome_completo': 'Novo Funcionario',
                                     'username': 'novofunc',
                                     'password': 'senha_nova',
                                     'role': 'funcionario'
                                 }),
                                 content_type='application/json')
    assert response.status_code == 201
    assert b'Usuario criado com sucesso!' in response.data
