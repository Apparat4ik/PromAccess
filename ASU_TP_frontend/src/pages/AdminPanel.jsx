import React, { useState, useEffect, useContext } from 'react';
import { Table, Title, Paper, Loader, Center, Tabs, Select, Badge } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconHistory, IconUsers } from '@tabler/icons-react';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    fetchLogs();
    fetchUsers();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await axiosClient.get('/api/audit-log');
      setLogs(response.data);
    } catch (error) {
      console.error('Ошибка загрузки логов', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axiosClient.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Ошибка загрузки пользователей', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axiosClient.put(`/api/users/${userId}/role`, { new_role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      notifications.show({ title: 'Успешно', message: 'Роль обновлена', color: 'green' });
      fetchLogs();
    } catch (error) {
      console.error('Ошибка изменения роли', error);
      notifications.show({ title: 'Ошибка', message: 'Не удалось изменить роль', color: 'red' });
    }
  };

  const roleColors = {
    ADMIN: 'red',
    SECURITY_OFFICER: 'blue',
    ENGINEER: 'orange',
    USER: 'gray',
  };

  return (
    <Paper p="xl" shadow="md" radius="lg" withBorder bg="white" mt="sm">
      <Tabs defaultValue="audit">
        <Tabs.List mb="md">
          <Tabs.Tab value="audit" leftSection={<IconHistory size={16} />}>
            Журнал аудита
          </Tabs.Tab>
          <Tabs.Tab value="users" leftSection={<IconUsers size={16} />}>
            Управление пользователями
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="audit">
          <Title order={3} mb="md" c="dark.9">Журнал событий безопасности</Title>
          {loadingLogs ? (
            <Center h={200}><Loader /></Center>
          ) : (
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th c="dimmed">ID</Table.Th>
                  <Table.Th c="dimmed">Пользователь</Table.Th>
                  <Table.Th c="dimmed">Действие</Table.Th>
                  <Table.Th c="dimmed">Сущность</Table.Th>
                  <Table.Th c="dimmed">ID Сущности</Table.Th>
                  <Table.Th c="dimmed">IP Адрес</Table.Th>
                  <Table.Th c="dimmed">Время</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{log.id}</Table.Td>
                    <Table.Td fw={500}>{log.user_id || 'Система'}</Table.Td>
                    <Table.Td c="blue.7" fw={600} style={{ whiteSpace: 'nowrap' }}>{log.action}</Table.Td>
                    <Table.Td>{log.entity_type}</Table.Td>
                    <Table.Td>{log.entity_id}</Table.Td>
                    <Table.Td>{log.ip_address}</Table.Td>
                    <Table.Td>{new Date(log.timestamp).toLocaleString('ru-RU')}</Table.Td>
                  </Table.Tr>
                ))}
                {logs.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>Нет записей в журнале</Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="users">
          <Title order={3} mb="md" c="dark.9">Учетные записи системы</Title>
          {loadingUsers ? (
            <Center h={200}><Loader /></Center>
          ) : (
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th c="dimmed">ID</Table.Th>
                  <Table.Th c="dimmed">Email</Table.Th>
                  <Table.Th c="dimmed">Текущая роль</Table.Th>
                  <Table.Th c="dimmed">Назначить роль</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {users.map((u) => (
                  <Table.Tr key={u.id}>
                    <Table.Td>{u.id}</Table.Td>
                    <Table.Td fw={500}>{u.email}</Table.Td>
                    <Table.Td>
                      <Badge color={roleColors[u.role] || 'gray'}>{u.role}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Select
                        size="xs"
                        value={u.role}
                        onChange={(val) => handleRoleChange(u.id, val)}
                        disabled={u.email === user.email} // Админ не может случайно изменить роль сам себе
                        data={[
                          { value: 'USER', label: 'USER' },
                          { value: 'ENGINEER', label: 'ENGINEER' },
                          { value: 'SECURITY_OFFICER', label: 'SECURITY_OFFICER' },
                          { value: 'ADMIN', label: 'ADMIN' },
                        ]}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Tabs.Panel>
      </Tabs>
    </Paper>
  );
};

export default AdminPanel;