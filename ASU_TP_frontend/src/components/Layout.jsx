import React, { useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AppShell, Group, Button, Text, UnstyledButton, Box } from '@mantine/core';
import { AuthContext } from '../context/AuthContext';
import { IconLogout, IconDashboard, IconSettings } from '@tabler/icons-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Компонент для стилизации кнопок навигации в шапке
  const NavItem = ({ label, path, icon: Icon }) => {
    const isActive = location.pathname === path;
    return (
      <UnstyledButton
        onClick={() => navigate(path)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: isActive ? '#e7f5ff' : 'transparent',
          color: isActive ? '#228be6' : '#495057',
          fontWeight: isActive ? 600 : 500,
          transition: 'background-color 0.2s',
        }}
      >
        <Icon size={18} />
        <Text size="sm">{label}</Text>
      </UnstyledButton>
    );
  };

  return (
    <AppShell
      header={{ height: 60 }}
      padding="xl"
      bg="gray.0" // Светло-серый фон для контраста белых карточек
    >
      <AppShell.Header bg="white" style={{ borderBottom: '1px solid #eaeaea' }}>
        <Group h="100%" px="xl" justify="space-between">
          
          {/* Левая часть: Логотип и навигация */}
          <Group gap="xl">
            <Text size="lg" fw={900} c="blue.7" style={{ cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
              PrommAccess
            </Text>
            <Group gap="sm">
              <NavItem label="Управление заявками" path="/dashboard" icon={IconDashboard} />
              {/* Ограничение интерфейса по ролям */}
              {user?.role === 'ADMIN' && (
                <NavItem label="Журнал аудита" path="/admin" icon={IconSettings} />
              )}
            </Group>
          </Group>

          {/* Правая часть: Пользователь и выход */}
          <Group gap="md">
            <Text size="sm" fw={500}>
              {user?.email} <Text span c="blue" fw={700}>({user?.role})</Text>
            </Text>
            <Button
              variant="subtle"
              color="red"
              size="sm"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        {/* Box жестко ограничивает максимальную ширину и центрирует таблицы по экрану */}
        <Box maw={1400} mx="auto" w="100%">
          <Outlet />
        </Box>
      </AppShell.Main>
    </AppShell>
  );
};

export default Layout;
