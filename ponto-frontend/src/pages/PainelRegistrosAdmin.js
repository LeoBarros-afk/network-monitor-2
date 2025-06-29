import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaPlusCircle, FaEdit, FaTrash } from 'react-icons/fa';

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
    const [isLoading, setIsLoading] = useState(true);
    const [showManualForm, setShowManualForm] = useState(false);

    // Estados dos filtros
    const [filtroUsuario, setFiltroUsuario] = useState('');
    const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
    const [filtroAno, setFiltroAno] = useState(new Date().getFullYear());

    // Estados do formulário de lançamento manual
    const [manualUserId, setManualUserId] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [manualEntrada, setManualEntrada] = useState('');
    const [manualSaidaAlmoco, setManualSaidaAlmoco] = useState('');
    const [manualVoltaAlmoco, setManualVoltaAlmoco] = useState('');
    const [manualSaida, setManualSaida] = useState('');

    const fetchRegistros = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/admin/registros', {
                params: {
                    usuario_id: filtroUsuario,
                    mes: filtroMes,
                    ano: filtroAno,
                }
            });
            setRegistros(response.data);
        } catch (error) {
            setRegistros([]); // Limpa os registros em caso de erro (ex: 404)
            console.error("Erro ao buscar registros:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsuarios = async () => {
        try {
            const response = await api.get('/api/admin/usuarios');
            setUsuarios(response.data);
            if (response.data.length > 0) {
                setFiltroUsuario(response.data[0].id); // Seleciona o primeiro usuário por padrão
            }
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        }
    };
    
    useEffect(() => { fetchUsuarios(); }, []);
    useEffect(() => { if(filtroUsuario) fetchRegistros(); }, [filtroUsuario, filtroMes, filtroAno]);

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
            fetchRegistros(); // Atualiza a lista
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
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                    </select>
                    <input type="number" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} placeholder="Mês"/>
                    <input type="number" value={filtroAno} onChange={e => setFiltroAno(e.target.value)} placeholder="Ano"/>
                    <button onClick={() => setShowManualForm(!showManualForm)}>
                        <FaPlusCircle/> {showManualForm ? 'Fechar Lançamento' : 'Lançamento Manual'}
                    </button>
                </div>

                {showManualForm && (
                    <div className="form-section manual-entry">
                        <h3>Lançamento Manual de Dia Completo</h3>
                        <form onSubmit={handleManualSubmit}>
                            <select value={manualUserId} onChange={e => setManualUserId(e.target.value)} required>
                                <option value="">Selecione um funcionário...</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                            </select>
                            <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
                            <input type="time" title="Entrada" value={manualEntrada} onChange={e => setManualEntrada(e.target.value)} />
                            <input type="time" title="Saída Almoço" value={manualSaidaAlmoco} onChange={e => setManualSaidaAlmoco(e.target.value)} />
                            <input type="time" title="Volta Almoço" value={manualVoltaAlmoco} onChange={e => setManualVoltaAlmoco(e.target.value)} />
                            <input type="time" title="Saída" value={manualSaida} onChange={e => setManualSaida(e.target.value)} />
                            <button type="submit">Salvar Dia</button>
                        </form>
                    </div>
                )}

                <div className="records-table">
                    {isLoading ? <p>Carregando registros...</p> : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Hora</th>
                                    <th>Tipo</th>
                                    <th>Justificativa</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {registros.length > 0 ? registros.map(r => (
                                    <tr key={r.id}>
                                        <td>{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                                        <td>{new Date(r.timestamp).toLocaleTimeString('pt-BR')}</td>
                                        <td><span className={`role-tag ${r.tipo_registro}`}>{r.tipo_registro}</span></td>
                                        <td>{r.justificativa}</td>
                                        <td className="record-actions">
                                            <button className="icon-button" title="Editar"><FaEdit/></button>
                                            <button className="icon-button delete" title="Deletar"><FaTrash/></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5">Nenhum registro encontrado para este período.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PainelRegistrosAdmin;
