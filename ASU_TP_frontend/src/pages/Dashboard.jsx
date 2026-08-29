import React, { useState, useEffect, useContext } from 'react';
import { Table, Group, Button, Badge, Select, Title, Paper, Loader, Center, Modal, TextInput, Textarea, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconCheck, IconX } from '@tabler/icons-react';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [equipmentList, setEquipmentList] = useState([]);

  
  // Управление открытием/закрытием модального окна
  const [opened, { open, close }] = useDisclosure(false);

  console.log("Текущий пользователь:", user);

  // Форма создания заявки
  const form = useForm({
    initialValues: {
      equipment_id: '',
      start_time: '',
      end_time: '',
      reason: '',
    },
    validate: {
      equipment_id: (value) => (value ? null : 'Укажите ID оборудования'),
      start_time: (value) => (value ? null : 'Укажите дату начала'),
      end_time: (value) => (value ? null : 'Укажите дату окончания'),
      reason: (value) => (value.length > 5 ? null : 'Причина должна быть длиннее 5 символов'),
    },
  });

  const fetchRequests = async () => {
    try {
      const response = await axiosClient.get('/api/requests');
      setRequests(response.data);
    } catch (error) {
      console.error('Ошибка загрузки заявок', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    
    // Параллельная загрузка списка оборудования
    const fetchEquipment = async () => {
      try {
        const response = await axiosClient.get('/api/equipment');
        // Mantine Select требует, чтобы value всегда было строкой
        const formattedData = response.data.map(eq => ({
          value: eq.id.toString(),
          label: `${eq.name} (${eq.inventory_number})`
        }));
        setEquipmentList(formattedData);
      } catch (error) {
        console.error('Ошибка загрузки оборудования', error);
      }
    };
    
    fetchEquipment();
  }, []);

  const getEquipmentLabel = (id) => {
    const eq = equipmentList.find((item) => item.value === id.toString());
    return eq ? eq.label : `Неизвестно (ID: ${id})`;
  };


  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/api/requests/${id}`);
      setRequests(requests.filter((req) => req.id !== id));
      notifications.show({ title: 'Успешно', message: 'Заявка удалена', color: 'green' });
    } catch (error) {
      console.error('Ошибка удаления', error);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axiosClient.put(`/api/requests/${id}/status`, { status: newStatus });
      setRequests(requests.map((req) => (req.id === id ? { ...req, status: newStatus } : req)));
      notifications.show({ title: 'Статус обновлен', message: `Новый статус: ${newStatus}`, color: 'blue' });
    } catch (error) {
       console.error('Ошибка изменения статуса', error);
    }
  };

  // Обработчик отправки формы создания заявки
  const handleCreateRequest = async (values) => {
    try {
      // Преобразуем данные под формат Pydantic схемы RequestCreate[span_4](start_span)[span_4](end_span)
      const payload = {
        equipment_id: parseInt(values.equipment_id, 10),
        start_time: new Date(values.start_time).toISOString(),
        end_time: new Date(values.end_time).toISOString(),
        reason: values.reason,
      };

      const response = await axiosClient.post('/api/requests', payload);
      
      // Добавляем новую сущность в начало таблицы через обновление стейта[span_5](start_span)[span_5](end_span)
      setRequests([response.data, ...requests]);
      
      notifications.show({ title: 'Успешно', message: 'Заявка создана', color: 'green' });
      close(); // Закрываем модальное окно
      form.reset(); // Очищаем форму
    } catch (error) {
      console.error('Ошибка создания заявки', error);
      // Ошибки валидации (например, start_time >= end_time) отловятся глобальным перехватчиком 
      // или здесь можно добавить специфичную обработку.
    }
  };

  const filteredRequests = requests.filter(
    (req) => filter === 'ALL' || req.status === filter
  );

  const statusColors = {
    PENDING: 'yellow',
    APPROVED: 'green',
    REJECTED: 'red',
    REVOKED: 'gray',
  };

  return (
    <Paper p="md" shadow="sm" radius="md">
      {/* Модальное окно создания заявки */}
      <Modal opened={opened} onClose={close} title="Новая заявка на доступ" styles={{ title: { color: 'black' } }}>
        <form onSubmit={form.onSubmit(handleCreateRequest)}>
          <Stack>
            <Select
              label="Оборудование"
              placeholder="Выберите оборудование"
              data={equipmentList}
              searchable
              required
              {...form.getInputProps('equipment_id')}
            />
            {/* Используем нативные поля datetime-local для простоты */}
            <TextInput
              label="Время начала"
              type="datetime-local"
              required
              {...form.getInputProps('start_time')}
            />
            <TextInput
              label="Время окончания"
              type="datetime-local"
              required
              {...form.getInputProps('end_time')}
            />
            <Textarea
              label="Обоснование (причина)"
              placeholder="Подробно опишите причину доступа..."
              required
              {...form.getInputProps('reason')}
            />
            <Button type="submit" fullWidth mt="md">
              Отправить заявку
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="md">
        <Title order={2} c="dark.9">Управление заявками</Title>
        <Badge color="cyan">Моя роль: {user?.role}</Badge>
        
        <Group>
          <Select
            value={filter}
            onChange={setFilter}
            data={[
              { value: 'ALL', label: 'Все статусы' },
              { value: 'PENDING', label: 'На рассмотрении' },
              { value: 'APPROVED', label: 'Одобрено' },
              { value: 'REJECTED', label: 'Отклонено' },
            ]}
            placeholder="Фильтр по статусу"
          />
          {/* Отображаем кнопку создания, если роль строго совпадает с ENGINEER */}
          {user?.role === 'ENGINEER' && (
            <Button leftSection={<IconPlus size={16} />} color="blue" onClick={open}>
              Создать заявку
            </Button>
          )}
        </Group>
      </Group>

      {loading ? (
        <Center h={200}><Loader /></Center>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Оборудование</Table.Th>
              <Table.Th>Причина</Table.Th>
              <Table.Th>Начало</Table.Th>
              <Table.Th>Конец</Table.Th>
              <Table.Th>Статус</Table.Th>
              <Table.Th>Действия</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredRequests.map((req) => (
              <Table.Tr key={req.id}>
                <Table.Td>{req.id}</Table.Td>
                <Table.Td fw={500}>{getEquipmentLabel(req.equipment_id)}</Table.Td>
                <Table.Td>{req.reason}</Table.Td>
                <Table.Td>{new Date(req.start_time).toLocaleString('ru-RU')}</Table.Td>
                <Table.Td>{new Date(req.end_time).toLocaleString('ru-RU')}</Table.Td>
                <Table.Td>
                  <Badge color={statusColors[req.status] || 'gray'} styles={{ label: { textOverflow: 'unset', overflow: 'visible' } }}>
                    {req.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    {(user?.role === 'SECURITY_OFFICER' || user?.role === 'ADMIN') && req.status === 'PENDING' && (
                      <>
                        <Button size="xs" color="green" variant="light" onClick={() => handleStatusChange(req.id, 'APPROVED')} title="Одобрить">
                          <IconCheck size={16} />
                        </Button>
                        <Button size="xs" color="red" variant="light" onClick={() => handleStatusChange(req.id, 'REJECTED')} title="Отклонить">
                          <IconX size={16} />
                        </Button>
                      </>
                    )}
                    {(user?.role === 'ENGINEER' || user?.role === 'ADMIN') && (
                      <Button size="xs" color="red" variant="subtle" onClick={() => handleDelete(req.id)} title="Удалить">
                        <IconTrash size={16} />
                      </Button>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {filteredRequests.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={7} style={{ textAlign: 'center' }}>Нет заявок</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
};

export default Dashboard;
