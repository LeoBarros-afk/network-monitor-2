import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaPlusCircle, FaEdit, FaTrash, FaSearch } from 'react-icons/fa';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) { config.headers.Authorization = `Bearer ${token}`; }
  return config;
}, (error) => Promise.reject(error));

const PainelRegistrosAdmin = () => {
    const navigate = useNavigate();
    const [registros, setRegistros] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);

    const [filtroUsuario, setFiltroUsuario] = useState('');
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroDia, setFiltroDia] = useState('');

    const [manualUserId, setManualUserId] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualEntrada, setManualEntrada] = useState('');
    const [manualSaidaAlmoco, setManualSaidaAlmoco] = useState('');
    const [manualVoltaAlmoco, setManualVoltaAlmoco] = useState('');
    const [manualSaida, setManualSaida] = useState('');

    const fetchRegistros = async () => {
        setIsLoading(true);
        try {
            const params = {
                usuario_id: filtroUsuario || undefined,
                mes: filtroMes,
                ano: filtroAno,
                dia: filtroDia || undefined,
            };
            const response = await api.get('/api/admin/registros', { params });
            setRegistros(response.data);
        } catch (error) {
            setRegistros([]);
            console.error("Erro ao buscar registros:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await api.get('/api/admin/usuarios');
            setUsuarios(response.data);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        }
    };
    
    useEffect(() => { fetchUsuarios(); }, []);
    
    const handleDeleteRecord = (registroId) => {
        Swal.fire({
            title: 'Você tem certeza?',
            text: `Isso irá deletar o registro #${registroId}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: 'var(--delete-color)',
            cancelButtonColor: 'var(--secondary-gray)',
            confirmButtonText: 'Sim, deletar!',
            cancelButtonText: 'Cancelar'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await api.delete(`/api/admin/registros/${registroId}`);
                    Swal.fire('Deletado!', 'O registro foi deletado.', 'success');
                    fetchRegistros();
                } catch (error) {
                    Swal.fire('Erro!', 'Não foi possível deletar o registro.', 'error');
                }
            }
        });
    };

    const handleEditRecord = async (registro) => {
        const { value: formValues } = await Swal.fire({
          title: 'Editar Registro',
          html:
            `<input id="swal-input-datetime" type="datetime-local" class="swal2-input" value="${registro.timestamp.slice(0,16)}">` +
            `<input id="swal-input-justificativa" class="swal2-input" placeholder="Justificativa" value="${registro.justificativa || ''}">`,
          focusConfirm: false,
          showCancelButton: true,
          confirmButtonText: 'Salvar',
          preConfirm: () => {
            return {
              timestamp: document.getElementById('swal-input-datetime').value,
              justificativa: document.getElementById('swal-input-justificativa').value,
            }
          }
        });

        if (formValues) {
            try {
                await api.put(`/api/admin/registros/${registro.id}`, { timestamp: formValues.timestamp, justificativa: formValues.justificativa });
                Swal.fire('Sucesso!', 'Registro atualizado.', 'success');
                fetchRegistros();
            } catch (error) {
                Swal.fire('Erro!', 'Não foi possível atualizar o registro.', 'error');
            }
        }
    };
    
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/admin/registros', {
                usuario_id: manualUserId,
                data: manualDate,
                registros: {
                    entrada: manualEntrada,
                    saida_almoco: manualSaidaAlmoco,
                    volta_almoco: manualVoltaAlmoco,
                    saida: manualSaida,
                }
            });
            Swal.fire('Sucesso!', 'Registros manuais lançados com sucesso.', 'success');
            setShowManualForm(false);
            fetchRegistros();
        } catch (error) {
            Swal.fire('Erro!', error.response?.data?.msg || 'Não foi possível lançar os registros.', 'error');
        }
    };

    return (
        <div className="App">
            <div className="admin-container large">
                <header className="dashboard-header">
                    <h2>Gerenciamento de Registros de Ponto</h2>
                    <Link to="/admin" className="logout-button">Voltar ao Painel</Link>
                </header>

                <div className="filters-toolbar">
                    <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}>
                        <option value="">Todos os Funcionários</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                    </select>
                    <input type="number" value={filtroDia} onChange={e => setFiltroDia(e.target.value)} placeholder="Dia"/>
                    <input type="number" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} placeholder="Mês"/>
                    <input type="number" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} placeholder="Ano"/>
                    <button onClick={fetchRegistros} className="search-button"><FaSearch/> Buscar</button>
                    <button onClick={() => setShowManualForm(!showManualForm)} className="manual-button">
                        <FaPlusCircle/> {showManualForm ? 'Fechar Lançamento' : 'Lançamento Manual'}
                    </button>
                </div>

                {showManualForm && (
                    <div className="form-section manual-entry">
                        <h3>Lançamento Manual de Dia Completo</h3>
                        <form onSubmit={handleManualSubmit}>
                            <div className="form-group"><label>Funcionário:</label><select value={manualUserId} onChange={e => setManualUserId(e.target.value)} required><option value="">Selecione...</option>{usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}</select></div>
                            <div className="form-group"><label>Data:</label><input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required /></div>
                            <div className="form-group"><label>Entrada:</label><input type="time" value={manualEntrada} onChange={e => setManualEntrada(e.target.value)} /></div>
                            <div className="form-group"><label>Saída Almoço:</label><input type="time" value={manualSaidaAlmoco} onChange={e => setManualSaidaAlmoco(e.target.value)} /></div>
                            <div className="form-group"><label>Volta Almoço:</label><input type="time" value={manualVoltaAlmoco} onChange={e => setManualVoltaAlmoco(e.target.value)} /></div>
                            <div className="form-group"><label>Saída:</label><input type="time" value={manualSaida} onChange={e => setManualSaida(e.target.value)} /></div>
                            <button type="submit" className="full-width-button">Salvar Dia</button>
                        </form>
                    </div>
                )}

                <div className="records-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Funcionário</th>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Tipo</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="5">Carregando...</td></tr>
                            ) : registros.length > 0 ? registros.map(r => (
                                <tr key={r.id}>
                                    <td>{r.nome_usuario}</td>
                                    <td>{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                                    <td>{new Date(r.timestamp).toLocaleTimeString('pt-BR')}</td>
                                    <td><span className={`role-tag tipo-${r.tipo_registro.replace('_', '-')}`}>{r.tipo_registro.replace('_', ' ')}</span></td>
                                    <td className="record-actions">
                                        <button className="icon-button" title="Editar Registro" onClick={() => handleEditRecord(r)}><FaEdit/></button>
                                        <button className="icon-button delete" title="Deletar Registro" onClick={() => handleDeleteRecord(r.id)}><FaTrash/></button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan="5">Nenhum registro encontrado para a seleção atual.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PainelRegistrosAdmin;