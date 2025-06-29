import json

def test_registrar_ponto_sucesso(test_client):
    """Testa se um funcionário logado pode registrar o ponto."""
    # AJUSTE: Removido o prefixo /api/ da rota de login
    login_res = test_client.post('/login', data=json.dumps({'username': 'testfunc', 'password': 'senha_func'}), content_type='application/json')
    token = json.loads(login_res.data)['access_token']

    # AJUSTE: Removido o prefixo /api/ da rota de registro
    response = test_client.post('/ponto/registrar',
                                 headers={'Authorization': f'Bearer {token}'},
                                 data=json.dumps({'tipo': 'entrada'}),
                                 content_type='application/json')
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['msg'] == "Ponto de 'entrada' registrado com sucesso!"

def test_acesso_admin_negado_para_funcionario(test_client):
    """Testa se um funcionário não pode acessar uma rota de admin."""
    # AJUSTE: Removido o prefixo /api/ da rota de login
    login_res = test_client.post('/login', data=json.dumps({'username': 'testfunc', 'password': 'senha_func'}), content_type='application/json')
    token = json.loads(login_res.data)['access_token']

    # AJUSTE: Removido o prefixo /api/ da rota de admin
    response = test_client.get('/admin/usuarios',
                               headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 403
    data = json.loads(response.data)
    assert data['msg'] == "Acesso restrito a administradores!"