import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // Estados para o formulário de login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para controlar a aplicação
  const [message, setMessage] = useState('');
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);

  // Efeito que roda quando o componente carrega
  useEffect(() => {
    // Tenta carregar o token do armazenamento local do navegador
    const storedToken = localStorage.getItem('user_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []); // O array vazio significa que este efeito roda apenas uma vez

  // Função para lidar com o login
  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(''); // Limpa mensagens antigas
    try {
      const response = await axios.post('/api/login', { username, password });
      const receivedToken = response.data.access_token;
      setToken(receivedToken);
      // Salva o token no armazenamento local para "lembrar" do login
      localStorage.setItem('user_token', receivedToken);
      setMessage('Login realizado com sucesso!');
    } catch (error) {
      setMessage(error.response?.data?.msg || 'Erro ao fazer login');
    }
  };

  // Função para lidar com o logout
  const handleLogout = () => {
    setToken(null);
    setUsername('');
    setPassword('');
    setMessage('');
    localStorage.removeItem('user_token'); // Remove o token
  };

  // Função para registrar o ponto
  const handleRegisterPoint = async (tipo) => {
    setMessage('');
    try {
      // Faz a chamada para a API, enviando o token de autorização
      const response = await axios.post(
        '/api/ponto/registrar', 
        { tipo }, // Corpo da requisição com o tipo de registro
        { headers: { Authorization: `Bearer ${token}` } } // Cabeçalho de autorização
      );
      setMessage(response.data.msg); // Mostra a mensagem de sucesso da API
    } catch (error) {
      setMessage(error.response?.data?.msg || `Erro ao registrar ${tipo}`);
      // Se o token expirar (erro 401), faz o logout
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  // Renderização condicional: mostra o formulário de login OU o painel do funcionário
  if (!token) {
    // TELA DE LOGIN
    return (
      <div className="App">
        <div className="login-container">
          <h1>Sistema de Ponto</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Usuário:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Senha:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit">Entrar</button>
          </form>
          {message && <p className="message">{message}</p>}
        </div>
      </div>
    );
  }

  // PAINEL DO FUNCIONÁRIO (mostrado após o login)
  return (
    <div className="App">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h2>Painel do Funcionário</h2>
          <button onClick={handleLogout} className="logout-button">Sair</button>
        </header>
        <div className="actions-container">
          <button onClick={() => handleRegisterPoint('entrada')} className="action-button entrada">Registrar Entrada</button>
          <button onClick={() => handleRegisterPoint('saida_almoco')} className="action-button almoco">Sair para Almoço</button>
          <button onClick={() => handleRegisterPoint('volta_almoco')} className="action-button almoco">Voltar do Almoço</button>
          <button onClick={() => handleRegisterPoint('saida')} className="action-button saida">Encerrar Expediente</button>
        </div>
        {message && <p className="message dashboard-message">{message}</p>}
        {/* Futuramente, aqui entrará a tabela com os registros do dia */}
      </div>
    </div>
  );
}

export default App;