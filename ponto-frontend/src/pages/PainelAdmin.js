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

    const handleLogout = () => { /* ... (código inalterado) ... */ };
    const resetForm = () => { /* ... (código inalterado) ... */ };
    const handleEditClick = (user) => { /* ... (código inalterado) ... */ };
    const submitForm = async () => { /* ... (código inalterado) ... */ };
    const handleFormSubmit = (e) => { /* ... (código inalterado) ... */ };
    const handleDeleteUser = (user) => { /* ... (código inalterado) ... */ };
    
    const handleExport = async () => {
        // Gera o HTML para o dropdown de usuários
        const userOptions = usuarios.map(u => `<option value="${u.id}">${u.nome_completo}</option>`).join('');
        
        const { value: formValues } = await Swal.fire({
            title: 'Exportar Relatório Mensal',
            html:
              '<input id="swal-input-ano" class="swal2-input" placeholder="Ano (ex: 2025)" type="number">' +
              '<input id="swal-input-mes" class="swal2-input" placeholder="Mês (1-12)" type="number">' +
              '<select id="swal-input-usuario" class="swal2-input"><option value="">Todos os Funcionários</option>' + userOptions + '</select>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Gerar',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
              return {
                ano: document.getElementById('swal-input-ano').value,
                mes: document.getElementById('swal-input-mes').value,
                usuario_id: document.getElementById('swal-input-usuario').value,
              }
            }
          });
          
          if (formValues && formValues.ano && formValues.mes) {
            try {
                const params = { ano: formValues.ano, mes: formValues.mes };
                if (formValues.usuario_id) {
                    params.usuario_id = formValues.usuario_id;
                }
                const response = await api.get('/api/admin/relatorio', {
                    params: params,
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
                {/* ... (resto do JSX inalterado) ... */}
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
                            <div className="form-grid">
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <input type="text" placeholder="Nome do Funcionário" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Username (login)</label>
                                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Senha</label>
                                    <input type="password" placeholder={isEditing ? "Deixe em branco para não alterar" : "Senha obrigatória"} value={password} onChange={e => setPassword(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Permissão (Role)</label>
                                    <select value={role} onChange={e => setRole(e.target.value)}>
                                        <option value="funcionario">Funcionário</option>
                                        <option value="admin">Administrador</option>
                                    </select>
                                </div>
                            </div>
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
