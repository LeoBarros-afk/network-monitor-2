
from app import create_app, db, bcrypt, Usuario

# --- LISTA DE ADMINISTRADORES A SEREM CRIADOS ---
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
        "nome_completo": "Isis Valentina",
        "username": "Isis",
        "password": "admin"
    },

   
]

def criar_admins():
    # AJUSTE: Primeiro, criamos uma instância da nossa aplicação.
    app = create_app()
    
    # Agora, usamos o contexto desta nova instância para interagir com o banco de dados.
    with app.app_context():
        print("Iniciando criação de administradores...")
        for admin_data in admins:
            usuario_existente = Usuario.query.filter_by(username=admin_data['username']).first()
            if usuario_existente:
                print(f"Usuário '{admin_data['username']}' já existe. Pulando.")
                continue

            hashed_password = bcrypt.generate_password_hash(admin_data['password']).decode('utf-8')

            novo_admin = Usuario(
                nome_completo=admin_data['nome_completo'],
                username=admin_data['username'],
                password_hash=hashed_password,
                role='admin'
            )

            db.session.add(novo_admin)
            print(f"Usuário '{admin_data['username']}' criado com sucesso.")
        
        db.session.commit()
        print("Processo de criação de administradores finalizado.")

if __name__ == '__main__':
    criar_admins()
