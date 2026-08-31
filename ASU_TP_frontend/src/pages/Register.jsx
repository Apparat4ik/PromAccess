import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Stack, Select, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import axiosClient from '../api/axiosClient';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      role_name: 'USER',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Неверный формат email'),
      password: (value) => (value.length < 8 ? 'Пароль должен быть не менее 8 символов' : null),
      role_name: (value) => (value ? null : 'Выберите роль'),
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axiosClient.post('/api/auth/register', values);
      
      notifications.show({
        title: 'Регистрация успешна',
        message: 'Теперь вы можете войти, используя свои данные',
        color: 'green',
      });
      navigate('/login');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        form.setFieldError('email', 'Email уже зарегистрирован');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900} c="dark.9">Регистрация</Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Уже есть аккаунт?{' '}
        <Link to="/login" style={{ textDecoration: 'none', color: '#228be6' }}>
          Войти
        </Link>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Email" placeholder="ваша@почта.ru" required {...form.getInputProps('email')} />
            <PasswordInput label="Пароль" placeholder="Ваш пароль" required {...form.getInputProps('password')} />
            <Select
              label="Роль в системе"
              placeholder="Выберите роль"
              data={[
                { value: 'USER', label: 'Пользователь' },
                { value: 'ENGINEER', label: 'Инженер' }
              ]}
              required
              {...form.getInputProps('role_name')}
            />
            <Button type="submit" fullWidth mt="xl" loading={loading}>Зарегистрироваться</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
};

export default Register;
