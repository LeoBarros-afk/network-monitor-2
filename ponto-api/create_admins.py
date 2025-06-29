from app import app, db, bcrypt, Usuario

# --- LISTA DE ADMINISTRADORES A SEREM CRIADOS ---
# Adicione ou modifique os usuários nesta lista conforme necessário.
admins = [
    {
        "nome_completo": "Leonardo Barros",
        "username": "leonardoAdmin",
        "password": "admin@q!"
    },
    {
        "nome_completo": "Dorian James",
        "username": "DorianAdmin",
        "password": "admin@q@"
    },
    {
        "nome_completo": "IsisValentina",
        "username": "Isis",
        "password": "admin"
    },
    
]

def criar_admins():
    # O 'with app.app_context()' é necessário para que o script
    # tenha acesso às configurações da aplicação Flask, incluindo o banco de dados.
    with app.app_context():
        print("Iniciando criação de administradores...")
        for admin_data in admins:
            # Verifica se o usuário já existe no banco de dados
            usuario_existente = Usuario.query.filter_by(username=admin_data['username']).first()
            if usuario_existente:
                print(f"Usuário '{admin_data['username']}' já existe. Pulando.")
                continue

            # Criptografa a senha antes de salvar
            hashed_password = bcrypt.generate_password_hash(admin_data['password']).decode('utf-8')

            # Cria a nova instância do usuário
            novo_admin = Usuario(
                nome_completo=admin_data['nome_completo'],
                username=admin_data['username'],
                password_hash=hashed_password,
                role='admin' # Define a permissão como 'admin'
            )

            # Adiciona o novo usuário à sessão do banco de dados e salva
            db.session.add(novo_admin)
            print(f"Usuário '{admin_data['username']}' criado com sucesso.")
        
        db.session.commit()
        print("Processo de criação de administradores finalizado.")

# Esta linha faz com que a função criar_admins() seja executada
# quando chamarmos o script com 'python create_admins.py'
if __name__ == '__main__':
    criar_admins()