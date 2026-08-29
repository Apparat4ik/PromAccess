import axios from 'axios';
import { notifications } from '@mantine/notifications';
import { getToken, setToken, removeToken } from './tokenStorage';

const axiosClient = axios.create({ 
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true 
});

// Перехватчик запроса: добавляем токен, если он есть в памяти
axiosClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ответа: обрабатываем ошибки 401, 403, 500
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      const originalRequest = error.config;
      
      // Обработка 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
        originalRequest._retry = true;
        
        try {
          // Отправляем запрос на обновление токена (куки отправятся автоматически благодаря withCredentials)
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/refresh`, {}, { withCredentials: true });
          
          const newAccessToken = response.data.access_token;
          setToken(newAccessToken);
          
          // Обновляем заголовок в оригинальном запросе и повторяем его
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest);
        } catch (refreshError) {
          removeToken();
          
          notifications.show({
            title: 'Сессия истекла',
            message: 'Пожалуйста, войдите в систему заново.',
            color: 'red',
          });
          
          if (window.location.pathname !== '/login') {
              window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      } 
      // Обработка 403 Forbidden
      else if (status === 403) {
        notifications.show({
          title: 'Доступ запрещен',
          message: 'Недостаточно прав для выполнения данного действия.', // Текст ошибки совпадает с бэкендом
          color: 'red',
        });
      }
      // Глобальная ошибка сервера
      else if (status >= 500) {
        notifications.show({
          title: 'Ошибка сервера',
          message: 'Внутренняя ошибка сервера. Обратитесь к администратору.', // Сообщение об ошибке без раскрытия технических деталей
          color: 'red',
        });
      }
    } else {
        notifications.show({
            title: 'Сетевая ошибка',
            message: 'Не удалось связаться с сервером.',
            color: 'red',
        });
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
