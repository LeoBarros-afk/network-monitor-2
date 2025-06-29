import json

def test_registrar_ponto_sucesso(test_client):
    """Testa se um funcionário logado pode registrar o ponto."""
    login_res = test_client.post('/api/login', data=json.dumps({'username': 'testfunc', 'password': 'senha_func'}), content_type='application/json')
    token = json.loads(login_res.data)['access_token']

    response = test_client.post('/api/ponto/registrar',
                                 headers={'Authorization': f'Bearer {token}'},
                                 data=json.dumps({'tipo': 'entrada'}),
                                 content_type='application/json')
    assert response.status_code == 201
    assert b"Ponto de 'entrada' registrado com sucesso!" in response.data

def test_acesso_admin_negado_para_funcionario(test_client):
    """Testa se um funcionário não pode acessar uma rota de admin."""
    login_res = test_client.post('/api/login', data=json.dumps({'username': 'testfunc', 'password': 'senha_func'}), content_type='application/json')
    token = json.loads(login_res.data)['access_token']

    response = test_client.get('/api/admin/usuarios',
                               headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403
    assert b"Acesso restrito a administradores!" in response.data