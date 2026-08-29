import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useContext(AuthContext);

  // Если доступ пытается получить неавторизованный пользователь
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. Ограничение интерфейса по ролям
  // Если для маршрута указаны роли, и текущая роль пользователя в них не входит
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
