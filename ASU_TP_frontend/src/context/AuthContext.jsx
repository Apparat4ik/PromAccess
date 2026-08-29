import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axiosClient from '../api/axiosClient';
import { setToken as setTokenInStorage, removeToken as removeTokenFromStorage } from '../api/tokenStorage';

// Создаем контекст
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // При загрузке приложения пытаемся восстановить сессию через HttpOnly куку
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await axiosClient.post('/api/auth/refresh');
        const newAccessToken = response.data.access_token;
        setToken(newAccessToken);
        setTokenInStorage(newAccessToken);
        
        const decoded = jwtDecode(newAccessToken);
        setUser({ email: decoded.sub, role: decoded.role });
      } catch (error) {
        console.log("Сессия не найдена или истекла");
        removeTokenFromStorage();
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  // Функция входа
  const login = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const response = await axiosClient.post('/api/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token } = response.data;
    setToken(access_token);
    setTokenInStorage(access_token);
    
    const decoded = jwtDecode(access_token);
    setUser({ email: decoded.sub, role: decoded.role });
  };

  // Функция выхода
  const logout = async () => {
    if (token) {
        try {
            await axiosClient.post('/api/auth/logout');
        } catch (e) {
            console.error("Ошибка при выходе", e);
        }
    }
    setToken(null);
    removeTokenFromStorage();
    setUser(null);
  };

  if (loading) {
      return null; // Или компонент спиннера загрузки
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
