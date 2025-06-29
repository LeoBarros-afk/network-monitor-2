import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaUserPlus } from 'react-icons/fa'; // Ícone para o novo botão

// Configuração do Axios para enviar o token automaticamente
const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const PainelAdmin = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Estado para controlar a visibilidade do formulário de criação
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Estados para o formulário de novo usuário
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('funcionario');

    const fetchUsuarios = async () => {
        try {
            const response = await api.get('/api/admin/usuarios');
            setUsuarios(response.data);
            setIsLoading(false);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_role');
        navigate('/');
    };

    const resetForm = () => {
        setNomeCompleto('');
        setUsername('');
        setPassword('');
        setRole('funcionario');
    };

    const submitCreateUser = async () => {
        try {
            const response = await api.post('/api/admin/usuarios', {
                nome_completo: nomeCompleto,
                username,
                password,
                role
            });
            Swal.fire('Sucesso!', response.data.msg, 'success');
            resetForm();
            setShowCreateForm(false); // Esconde o formulário após o sucesso
            fetchUsuarios(); // Atualiza a lista de usuários
        } catch (error) {
            Swal.fire('Erro!', error.response?.data?.msg || 'Não foi possível criar o usuário.', 'error');
        }
    };

    const handleCreateUser = (e) => {
        e.preventDefault();
        // Mostra um modal de confirmação antes de criar o usuário
        Swal.fire({
            title: 'Confirmar Criação',
            html: `
                <div style="text-align: left; padding-left: 1rem;">
                    <p><strong>Nome:</strong> ${nomeCompleto}</p>
                    <p><strong>Username:</strong> ${username}</p>
                    <p><strong>Permissão:</strong> ${role}</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--success-green)',
            cancelButtonColor: 'var(--tag-admin)',
            confirmButtonText: 'Sim, criar usuário!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Se o admin confirmar, chama a função que realmente envia os dados
                submitCreateUser();
            }
        });
    };

    return (
        <div className="App">
            <div className="admin-container">
                <header className="dashboard-header">
                    <h2>Painel do Administrador</h2>
                    <button onClick={handleLogout} className="logout-button">Sair</button>
                </header>

                <div className="admin-content">
                    <div className="form-section">
                        <h3>Gestão de Usuários</h3>
                        
                        {/* Botão que controla a visibilidade do formulário */}
                        {!showCreateForm ? (
                            <button onClick={() => setShowCreateForm(true)} className="create-user-button">
                                <FaUserPlus style={{ marginRight: '8px' }} />
                                Criar Novo Usuário
                            </button>
                        ) : (
                            <form onSubmit={handleCreateUser} className="user-form">
                                <input type="text" placeholder="Nome Completo" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
                                <input type="text" placeholder="Username (login)" value={username} onChange={e => setUsername(e.target.value)} required />
                                <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
                                <select value={role} onChange={e => setRole(e.target.value)}>
                                    <option value="funcionario">Funcionário</option>
                                    <option value="admin">Administrador</option>
                                </select>
                                <div className="form-actions">
                                    <button type="submit">Confirmar Criação</button>
                                    <button type="button" onClick={() => { setShowCreateForm(false); resetForm(); }} className="cancel-button">
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="list-section">
                        <h3>Usuários Cadastrados</h3>
                        {isLoading ? <p>Carregando usuários...</p> : (
                            <ul className="user-list">
                                {usuarios.map(user => (
                                    <li key={user.id}>
                                        <span>{user.nome_completo} ({user.username})</span>
                                        <span className={`role-tag ${user.role}`}>{user.role}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PainelAdmin;
