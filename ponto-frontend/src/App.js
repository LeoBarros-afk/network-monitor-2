import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaCheckCircle } from 'react-icons/fa';
import './App.css';

// Configuração do Axios para enviar o token em todas as requisições
const api = axios.create();

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('user_token'));
  const [userData, setUserData] = useState(null);
  const [registrosDoDia, setRegistrosDoDia] = useState([]);

  // Efeito que busca os dados do usuário e seus registros quando o token muda
  useEffect(() => {
    const fetchUserData = async () => {
      if (token) {
        try {
          const response = await api.get('/api/me/hoje');
          setUserData(response.data);
          setRegistrosDoDia(response.data.registros_hoje);
        } catch (error) {
          console.error("Sessão expirada ou inválida.", error);
          handleLogout();
        }
      }
    };
    fetchUserData();
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setUserData(null);
    localStorage.removeItem('user_token');
  };

  const handleRegisterPoint = async (tipo) => {
    try {
      const response = await api.post('/api/ponto/registrar', { tipo });
      // Atualiza a lista de registros do dia para desabilitar o botão
      setRegistrosDoDia([...registrosDoDia, tipo]);
      // Mostra um alerta de sucesso
      Swal.fire({
        title: 'Sucesso!',
        text: response.data.msg,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      // Mostra um alerta de erro
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

  if (!token) {
    return <LoginScreen setToken={setToken} />;
  }

  return <DashboardScreen user={userData} registros={registrosDoDia} onLogout={handleLogout} onRegister={handleRegisterPoint} />;
}

// --- Componente da Tela de Login ---
const LoginScreen = ({ setToken }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/api/login', { username, password });
      const receivedToken = response.data.access_token;
      localStorage.setItem('user_token', receivedToken);
      setToken(receivedToken);
    } catch (err) {
      setError(err.response?.data?.msg || 'Erro ao fazer login');
    }
  };

  return (
    <div className="App">
      <div className="login-container">
        <h1>Sistema de Ponto</h1>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Usuário:</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Senha:</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit">Entrar</button>
        </form>
        {error && <p className="message">{error}</p>}
      </div>
    </div>
  );
};

// --- Componente do Painel Principal ---
const DashboardScreen = ({ user, registros, onLogout, onRegister }) => {
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
          <h2>Bem-vindo(a), {user?.nome_completo || '...'}!</h2>
          <button onClick={onLogout} className="logout-button">Sair</button>
        </header>
        <div className="actions-container">
          {BOTAO_PONTO.map((btn) => (
            <button
              key={btn.tipo}
              onClick={() => onRegister(btn.tipo)}
              className={`action-button ${btn.classe}`}
              disabled={registros.includes(btn.tipo)}
            >
              {registros.includes(btn.tipo) ? <FaCheckCircle size={24} /> : btn.texto}
            </button>
          ))}
        </div>
        {/* Futuramente, aqui entrará a tabela com os registros do dia */}
      </div>
    </div>
  );
};

export default App;