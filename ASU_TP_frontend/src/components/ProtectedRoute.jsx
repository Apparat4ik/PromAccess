import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useContext(AuthContext);

  // Если доступ пытается получить неавторизованный пользователь
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Перенаправление гостя на страницу ожидания
  if (user.role === 'USER') {
    return <Navigate to="/waiting-room" replace />;
  }

  // Если для маршрута указаны роли, и текущая роль пользователя в них не входит
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
