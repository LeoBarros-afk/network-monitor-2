import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, adminOnly = false }) => {
    const token = localStorage.getItem('user_token');
    const role = localStorage.getItem('user_role');

    if (!token) {
        return <Navigate to="/" />;
    }

    if (adminOnly && role !== 'admin') {
        return <Navigate to="/registro-de-ponto" />;
    }

    return children;
};

export default ProtectedRoute;