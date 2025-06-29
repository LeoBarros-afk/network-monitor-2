import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// ... (código axios e o resto do componente permanecem iguais)
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

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/admin/usuarios', {
                nome_completo: nomeCompleto,
                username,
                password,
                role
            });
            Swal.fire('Sucesso!', response.data.msg, 'success');
            setNomeCompleto('');
            setUsername('');
            setPassword('');
            setRole('funcionario');
            fetchUsuarios();
        } catch (error) {
            Swal.fire('Erro!', error.response?.data?.msg || 'Não foi possível criar o usuário.', 'error');
        }
    };

    return (
        <div className="App"> {/* Adicionada a classe App para herdar o fundo */}
            <div className="admin-container">
                <header className="dashboard-header">
                    <h2>Painel do Administrador</h2>
                    <button onClick={handleLogout} className="logout-button">Sair</button>
                </header>
                {/* ... (resto do JSX do admin) ... */}
                <div className="admin-content">
                    <div className="form-section">
                        <h3>Criar Novo Usuário</h3>
                        <form onSubmit={handleCreateUser} className="user-form">
                            <input type="text" placeholder="Nome Completo" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
                            <input type="text" placeholder="Username (login)" value={username} onChange={e => setUsername(e.target.value)} required />
                            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} required />
                            <select value={role} onChange={e => setRole(e.target.value)}>
                                <option value="funcionario">Funcionário</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <button type="submit">Criar Usuário</button>
                        </form>
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