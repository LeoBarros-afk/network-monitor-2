import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('/api/login', { username, password });
      const { access_token, role } = response.data;
      
      localStorage.setItem('user_token', access_token);
      localStorage.setItem('user_role', role);

      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/registro-de-ponto');
      }
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

export default Login;