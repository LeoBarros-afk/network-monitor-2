import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaUserPlus, FaFileExcel, FaClipboardList, FaSearch, FaEdit, FaTrash } from 'react-icons/fa';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) { config.headers.Authorization = `Bearer ${token}`; }
  return config;
}, (error) => Promise.reject(error));

const PainelAdmin = () => {
    const navigate = useNavigate();
    const [usuarios, setUsuarios] = useState([]);
    const [filtroNome, setFiltroNome] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [activeUserMenu, setActiveUserMenu] = useState(null);

    // Estados para o formulário de criação/edição
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
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

    useEffect(() => { fetchUsuarios(); }, []);

    const handleLogout = () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_role');
        navigate('/');
    };

    const resetForm = () => {
        setIsEditing(false);
        setCurrentUserId(null);
        setNomeCompleto('');
        setUsername('');
        setPassword('');
        setRole('funcionario');
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        const userData = isEditing ? 
            `Nome: ${nomeCompleto}<br/>Username: ${username}<br/>Permissão: ${role}<br/>(Senha será alterada se preenchida)` :
            `Nome: ${nomeCompleto}<br/>Username: ${username}<br/>Permissão: ${role}`;

        Swal.fire({
            title: isEditing ? 'Confirmar Alteração' : 'Confirmar Criação',
            html: `<div style="text-align: left; padding-left: 1rem;">${userData}</div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--success-green)',
            cancelButtonColor: 'var(--tag-admin)',
            confirmButtonText: isEditing ? 'Sim, salvar alterações!' : 'Sim, criar usuário!',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                if (isEditing) {
                    submitEditUser();
                } else {
                    submitCreateUser();
                }
            }
        });
    };
    
    const submitCreateUser = async () => { /* ... (código existente) ... */ };
    const submitEditUser = async () => { /* ... (código a ser adicionado) ... */ };
    const handleDeleteUser = (user) => { /* ... (código a ser adicionado) ... */ };
    
    const filteredUsers = usuarios.filter(user => 
        user.nome_completo.toLowerCase().includes(filtroNome.toLowerCase()) ||
        user.username.toLowerCase().includes(filtroNome.toLowerCase())
    );

    return (
        <div className="App">
            <div className="admin-container">
                <header className="dashboard-header">
                    <h2>Painel do Administrador</h2>
                    <button onClick={handleLogout} className="logout-button">Sair</button>
                </header>

                <div className="admin-toolbar">
                    <button onClick={() => { setIsEditing(false); resetForm(); setShowCreateForm(!showCreateForm); }} className="create-user-button">
                        <FaUserPlus /> {showCreateForm ? 'Cancelar Criação' : 'Criar Novo Usuário'}
                    </button>
                    <Link to="/admin/registros-de-ponto" className="action-link-button">
                        <FaClipboardList /> Visualizar Registros
                    </Link>
                    <button className="export-button"><FaFileExcel /> Exportar Relatório</button>
                </div>

                {showCreateForm && (
                     <div className="form-section">
                        <h3>{isEditing ? 'Editar Usuário' : 'Criar Novo Usuário'}</h3>
                        <form onSubmit={handleFormSubmit} className="user-form">
                            {/* ... (formulário JSX) ... */}
                        </form>
                    </div>
                )}
                
                <div className="list-section">
                     <div className="search-bar">
                        <FaSearch className="search-icon" />
                        <input type="text" placeholder="Pesquisar por nome ou username..." value={filtroNome} onChange={e => setFiltroNome(e.target.value)} />
                    </div>
                    {isLoading ? <p>Carregando...</p> : (
                        <ul className="user-list">
                            {filteredUsers.map(user => (
                                <li key={user.id} onClick={() => setActiveUserMenu(activeUserMenu === user.id ? null : user.id)} className={activeUserMenu === user.id ? 'active' : ''}>
                                    <div className="user-info">
                                        <span>{user.nome_completo} ({user.username})</span>
                                        <span className={`role-tag ${user.role}`}>{user.role}</span>
                                    </div>
                                    {activeUserMenu === user.id && (
                                        <div className="user-actions">
                                            <button title="Editar Usuário" className="icon-button" onClick={(e) => {e.stopPropagation(); /* ... */}}><FaEdit /></button>
                                            <button title="Deletar Usuário" className="icon-button delete" onClick={(e) => {e.stopPropagation(); /* ... */}}><FaTrash /></button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PainelAdmin;