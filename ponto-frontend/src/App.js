import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import PainelFuncionario from './pages/PainelFuncionario';
import PainelAdmin from './pages/PainelAdmin';
import PainelRegistrosAdmin from './pages/PainelRegistrosAdmin'; // Importa a nova página
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route 
        path="/registro-de-ponto" 
        element={
          <ProtectedRoute>
            <PainelFuncionario />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly={true}>
            <PainelAdmin />
          </ProtectedRoute>
        } 
      />
      {/* NOVA ROTA PARA A TELA DE REGISTROS DO ADMIN */}
      <Route 
        path="/admin/registros-de-ponto" 
        element={
          <ProtectedRoute adminOnly={true}>
            <PainelRegistrosAdmin />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;