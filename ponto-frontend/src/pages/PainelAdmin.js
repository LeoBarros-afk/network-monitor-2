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

    const [isEditing, setIsEditing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [nomeCompleto, setNomeCompleto] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('funcionario');

    const fetchUsuarios = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/admin/usuarios');
            setUsuarios(response.data);
        } catch (error) {
            Swal.fire('Erro!', 'Não foi possível buscar a lista de usuários.', 'error');
        } finally {
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
        setShowCreateForm(false);
    };

    const handleEditClick = (user) => {
        setIsEditing(true);
        setCurrentUserId(user.id);
        setNomeCompleto(user.nome_completo);
        setUsername(user.username);
        setRole(user.role);
        setPassword('');
        setShowCreateForm(true);
    };
    
    const submitForm = async () => {
        const url = isEditing ? `/api/admin/usuarios/${currentUserId}` : '/api/admin/usuarios';
        const method = isEditing ? 'put' : 'post';
        const data = { nome_completo: nomeCompleto, username, role };
        // AJUSTE: Apenas envia a senha se o campo não estiver vazio
        if (password) {
            data.password = password;
        }

        try {
            const response = await api[method](url, data);
            Swal.fire('Sucesso!', response.data.msg, 'success');
            resetForm();
            fetchUsuarios();
        } catch (error) {
            Swal.fire('Erro!', error.response?.data?.msg || 'Operação falhou.', 'error');
        }
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        // AJUSTE: Validação para não permitir senha em branco na criação
        if (!isEditing && !password) {
            Swal.fire('Atenção!', 'O campo de senha é obrigatório para criar um novo usuário.', 'warning');
            return;
        }

        const userData = isEditing ? 
            `<b>Nome:</b> ${nomeCompleto}<br/><b>Username:</b> ${username}<br/><b>Permissão:</b> ${role}<br/><i>(A senha só será alterada se o campo foi preenchido)</i>` :
            `<b>Nome:</b> ${nomeCompleto}<br/><b>Username:</b> ${username}<br/><b>Permissão:</b> ${role}`;

        Swal.fire({
            title: isEditing ? 'Confirmar Alteração' : 'Confirmar Criação',
            html: `<div style="text-align: left; padding-left: 1rem;">${userData}</div>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--confirm-color)',
            cancelButtonColor: 'var(--delete-color)',
            confirmButtonText: isEditing ? 'Salvar Alterações' : 'Criar Usuário',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) {
                submitForm();
            }
        });
    };
    
    const handleDeleteUser = (user) => {
        Swal.fire({
            title: 'Você tem certeza?',
            text: `Isso irá deletar permanentemente o usuário "${user.nome_completo}". Esta ação não pode ser desfeita!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--delete-color)',
            cancelButtonColor: 'var(--secondary-gray)',
            confirmButtonText: 'Sim, deletar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await api.delete(`/api/admin/usuarios/${user.id}`);
                    Swal.fire('Deletado!', response.data.msg, 'success');
                    fetchUsuarios();
                } catch (error) {
                    Swal.fire('Erro!', 'Não foi possível deletar o usuário.', 'error');
                }
            }
        });
    };
    
    const handleExport = async () => {
        const { value: formValues } = await Swal.fire({
            title: 'Exportar Relatório Mensal',
            html:
              '<input id="swal-input-ano" class="swal2-input" placeholder="Ano (ex: 2025)" type="number">' +
              '<input id="swal-input-mes" class="swal2-input" placeholder="Mês (1-12)" type="number">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Gerar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
              return {
                ano: document.getElementById('swal-input-ano').value,
                mes: document.getElementById('swal-input-mes').value
              }
            }
          });
          
          if (formValues && formValues.ano && formValues.mes) {
            try {
                const response = await api.get(`/api/admin/relatorio?ano=${formValues.ano}&mes=${formValues.mes}`, {
                    responseType: 'blob',
                });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `relatorio_ponto_${formValues.ano}_${formValues.mes}.xlsx`);
                document.body.appendChild(link);
                link.click();
                link.remove();
            } catch (error) {
                Swal.fire('Erro', 'Não foi possível gerar o relatório. Verifique se existem dados para o período.', 'error');
            }
          }
    };
    
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
                    <button onClick={() => { resetForm(); setShowCreateForm(!showCreateForm); }} className="action-link-button create-user-button">
                        <FaUserPlus /> {showCreateForm ? 'Ocultar Formulário' : 'Criar Usuário'}
                    </button>
                    <Link to="/admin/registros-de-ponto" className="action-link-button">
                        <FaClipboardList /> Visualizar Registros
                    </Link>
                    <button onClick={handleExport} className="action-link-button export-button">
                        <FaFileExcel /> Exportar Relatório
                    </button>
                </div>

                {showCreateForm && (
                     <div className="form-section">
                        <h3>{isEditing ? 'Editar Usuário' : 'Criar Novo Usuário'}</h3>
                        <form onSubmit={handleFormSubmit} className="user-form">
                            <input type="text" placeholder="Nome Completo" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
                            <input type="text" placeholder="Username (login)" value={username} onChange={e => setUsername(e.target.value)} required />
                            <input type="password" placeholder="Nova Senha (deixe em branco para não alterar)" value={password} onChange={e => setPassword(e.target.value)} />
                            <select value={role} onChange={e => setRole(e.target.value)}>
                                <option value="funcionario">Funcionário</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <div className="form-actions">
                                <button type="submit">{isEditing ? 'Salvar Alterações' : 'Confirmar Criação'}</button>
                                <button type="button" onClick={resetForm} className="cancel-button">
                                    Cancelar
                                </button>
                            </div>
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
                                <li key={user.id}>
                                    <div className="user-info">
                                        <span>{user.nome_completo} ({user.username})</span>
                                        <span className={`role-tag ${user.role}`}>{user.role}</span>
                                    </div>
                                    <div className="user-actions">
                                        <button title="Editar Usuário" className="icon-button" onClick={() => handleEditClick(user)}><FaEdit /></button>
                                        <button title="Deletar Usuário" className="icon-button delete" onClick={() => handleDeleteUser(user)}><FaTrash /></button>
                                    </div>
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