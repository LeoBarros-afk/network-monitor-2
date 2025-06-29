import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { FaSearch } from 'react-icons/fa';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) { config.headers.Authorization = `Bearer ${token}`; }
  return config;
}, (error) => Promise.reject(error));

const MeusRegistros = () => {
    const [registros, setRegistros] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mes, setMes] = useState(new Date().getMonth() + 1);
    const [ano, setAno] = useState(new Date().getFullYear());

    const fetchMeusRegistros = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/api/me/registros', { params: { mes, ano } });
            setRegistros(response.data);
        } catch (error) {
            setRegistros([]);
            console.error("Erro ao buscar meus registros:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Busca os registros automaticamente na primeira vez que a página carrega
    useEffect(() => {
        fetchMeusRegistros();
    }, []);

    const handleSearch = () => {
        fetchMeusRegistros();
    };

    return (
        <div className="App">
            <div className="admin-container large">
                <header className="dashboard-header">
                    <h2>Meus Registros de Ponto</h2>
                    <Link to="/registro-de-ponto" className="action-link-button">Voltar ao Painel</Link>
                </header>

                <div className="filters-toolbar">
                    <input type="number" value={mes} onChange={e => setMes(e.target.value)} placeholder="Mês (1-12)"/>
                    <input type="number" value={ano} onChange={e => setAno(e.target.value)} placeholder="Ano (YYYY)"/>
                    <button onClick={handleSearch} className="search-button"><FaSearch/> Buscar</button>
                </div>

                <div className="records-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Hora</th>
                                <th>Tipo de Registro</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan="3">Carregando...</td></tr>
                            ) : registros.length > 0 ? registros.map(r => (
                                <tr key={r.id}>
                                    <td>{new Date(r.timestamp).toLocaleDateString('pt-BR')}</td>
                                    <td>{new Date(r.timestamp).toLocaleTimeString('pt-BR')}</td>
                                    <td><span className={`role-tag tipo-${r.tipo_registro.replace('_', '-')}`}>{r.tipo_registro.replace('_', ' ')}</span></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="3">Nenhum registro encontrado para este período.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MeusRegistros;
