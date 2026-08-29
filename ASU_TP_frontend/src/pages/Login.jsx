import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Инициализация формы с помощью хука useForm
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Неверный формат email'),
      password: (value) => (value.length < 1 ? 'Введите пароль' : null),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      // Вызываем функцию login из контекста (она делает запрос к API и сохраняет токен)
      await login(values.email, values.password);
      
      notifications.show({
        title: 'Успешный вход',
        message: 'Вы успешно авторизовались в системе',
        color: 'green',
      });
      
      // Перенаправляем пользователя на главную страницу после успешного входа
      navigate('/dashboard');
    } catch (error) {
      // Ошибки сервера (401 и др.) уже перехватываются и показываются в axiosClient.
      // Здесь мы можем дополнительно сбросить пароль в форме, если вход не удался.
      form.setFieldValue('password', '');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} c="dark.9" >
        Вход в систему
      </Title>
        <Text c="dimmed" size="sm" ta="center" mt={5}>
          Нет аккаунта?{' '}
          <Link to="/register" style={{ textDecoration: 'none', color: '#228be6' }}>
            Зарегистрироваться
          </Link>
        </Text>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="ваша@почта.ru"
              required
              {...form.getInputProps('email')}
            />
            <PasswordInput
              label="Пароль"
              placeholder="Ваш пароль"
              required
              {...form.getInputProps('password')}
            />
            <Button type="submit" fullWidth mt="xl" loading={loading}>
              Войти
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
