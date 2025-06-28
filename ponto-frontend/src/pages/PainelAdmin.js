import React from 'react';
import { useNavigate } from 'react-router-dom';

const PainelAdmin = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_role');
        navigate('/');
      };

    return (
        <div className="App">
            <div className="dashboard-container">
                <header className="dashboard-header">
                    <h2>Painel do Administrador</h2>
                    <button onClick={handleLogout} className="logout-button">Sair</button>
                </header>
                <p>Funcionalidades de gerenciamento virão aqui.</p>
            </div>
        </div>
    );
};

export default PainelAdmin;
