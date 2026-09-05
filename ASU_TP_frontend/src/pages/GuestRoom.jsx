import { useNavigate } from 'react-router-dom';

const GuestWaitingRoom = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', textAlign: 'center', padding: '20px' }}>
      <h2>Аккаунт на модерации</h2>
      <p style={{ maxWidth: '450px', margin: '20px 0', lineHeight: '1.5' }}>
        Ваша учетная запись успешно создана. В целях безопасности доступ к системе предоставляется только после проверки администратором. Пожалуйста, ожидайте выдачи прав.
      </p>
      <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        Выйти из системы
      </button>
    </div>
  );
};

export default GuestWaitingRoom;
