import React, { useState } from 'react';
import axios from 'axios'; // Usaremos axios para fazer as chamadas à API
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault(); // Impede o formulário de recarregar a página
    try {
      // Faz a requisição de login para o nosso backend
      const response = await axios.post('/api/login', {
        username,
        password,
      });
      // Se der certo, salva o token e mostra uma mensagem de sucesso
      setToken(response.data.access_token);
      setMessage('Login realizado com sucesso!');
    } catch (error) {
      // Se der errado, mostra a mensagem de erro da API
      setMessage(error.response.data.msg || 'Erro ao fazer login');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Sistema de Ponto</h1>
        {!token ? (
          <form onSubmit={handleLogin}>
            <div>
              <label>Usuário:</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label>Senha:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit">Entrar</button>
          </form>
        ) : (
          <div>
            <h2>Bem-vindo!</h2>
            <p>Você está logado.</p>
          </div>
        )}
        {message && <p className="message">{message}</p>}
      </header>
    </div>
  );
}

export default App;
