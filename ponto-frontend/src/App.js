import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import PainelFuncionario from './pages/PainelFuncionario';
import PainelAdmin from './pages/PainelAdmin';
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
    </Routes>
  );
}

export default App;