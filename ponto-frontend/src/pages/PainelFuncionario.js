import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaCheckCircle, FaCalendarAlt } from 'react-icons/fa';
import { useNavigate, Link } from 'react-router-dom';

const api = axios.create();
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const PainelFuncionario = () => {
  const [userData, setUserData] = useState(null);
  const [registrosDoDia, setRegistrosDoDia] = useState([]);
  const navigate = useNavigate();

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_role');
    navigate('/');
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await api.get('/api/me/hoje');
        setUserData(response.data);
        setRegistrosDoDia(response.data.registros_hoje);
      } catch (error) {
        console.error("Sessão expirada ou inválida.", error);
        handleLogout();
      }
    };
    fetchUserData();
  }, []);

  const handleRegisterPoint = async (tipo) => {
    try {
      const response = await api.post('/api/ponto/registrar', { tipo });
      setRegistrosDoDia([...registrosDoDia, tipo]);

      if (tipo === 'saida') {
        Swal.fire({
          title: 'Até logo!',
          text: 'Obrigado por mais um dia de trabalho. Seu ponto foi encerrado!',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'Sucesso!',
          text: response.data.msg,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
        });
      }

    } catch (error) {
      Swal.fire({
        title: 'Erro!',
        text: error.response?.data?.msg || `Erro ao registrar ${tipo}`,
        icon: 'error',
      });
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const BOTAO_PONTO = [
    { tipo: 'entrada', texto: 'Registrar Entrada', classe: 'entrada' },
    { tipo: 'saida_almoco', texto: 'Sair para Almoço', classe: 'almoco' },
    { tipo: 'volta_almoco', texto: 'Voltar do Almoço', classe: 'almoco' },
    { tipo: 'saida', texto: 'Encerrar Expediente', classe: 'saida' },
  ];

  return (
    <div className="App">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <h2>Bem-vindo(a), {userData?.nome_completo || '...'}!</h2>
            <p className="current-date">{getCurrentDate()}</p>
          </div>
          <button onClick={handleLogout} className="logout-button">Sair</button>
        </header>
        <div className="actions-container">
          {BOTAO_PONTO.map((btn) => (
            <button
              key={btn.tipo}
              onClick={() => handleRegisterPoint(btn.tipo)}
              className={`action-button ${btn.classe}`}
              disabled={registrosDoDia.includes(btn.tipo)}
            >
              {registrosDoDia.includes(btn.tipo) ? <FaCheckCircle size={24} /> : btn.texto}
            </button>
          ))}
        </div>
        <div className="extra-actions">
          <Link to="/meus-registros" className="extra-button">
            <FaCalendarAlt style={{ marginRight: '8px' }} />
            Meus Registros do Mês
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PainelFuncionario;