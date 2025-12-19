import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { getAvatarUrl, updateUserAvatar } from '../utils/avatarUtils';
import alertaIcon from '../assets/img/alerta.png';

const UserProfile = () => {
  const { currentTheme } = useTheme();
  const { user, token, login, updateUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('dados');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    cellphone: '',
    cpfCnpj: '',
    workName: '',
    type: '',
    zipCode: '',
    city: '',
    state: '',
    street: '',
    number: '',
    complement: '',
    zone: '',
    dayOfPayment: null,
    address: '',
    picture: '',
    vipClient: false,
  });
  const [userSettings, setUserSettings] = useState({
    notifications: true,
    emailAlerts: true,
    theme: 'auto'
  });
  const [financialData, setFinancialData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('error'); // 'success' ou 'error'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Verificar se há parâmetro de aba na URL
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'notificacoes') {
      setActiveTab('notificacoes');
    }

    loadUserData();
    loadFinancialData();
    loadNotifications();
  }, [location.search]);

  // Normaliza diferentes formatos de isAdmin (boolean, string, number)
  const normalizeIsAdmin = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'sim';
    }
    if (typeof val === 'number') return val === 1;
    return !!val;
  };

  const loadUserData = async () => {
    try {
      const response = await apiService.getProfile();
      setUserData(response.data);
      // Sincronizar contexto de autenticação com dados do perfil (id, nome, email, isAdmin)
      updateUser({
        id: response.data?.id,
        name: response.data?.name,
        email: response.data?.email,
        isAdmin: normalizeIsAdmin(response.data?.isAdmin),
        vipClient: !!response.data?.vipClient,
      });
      // Atualizar avatar no contexto
      if (response.data.picture) {
        updateUserAvatar(updateUser, response.data.picture);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
    }
  };

  const loadFinancialData = async () => {
    try {
      // Evita chamar rota admin para usuários não-admin
      if (!user?.isAdmin) {
        setFinancialData([]);
        return;
      }
      // Garantir que temos o ID do usuário
      const profileRes = await apiService.getProfile();
      const userId = profileRes?.data?.id;
      if (!userId) {
        console.warn('ID do usuário não encontrado ao carregar dados financeiros');
        return;
      }
      const response = await apiService.getFinancialTitles(userId);
      setFinancialData(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      // Por enquanto, vamos simular as notificações já que não há endpoint específico
      const mockNotifications = [
        {
          id: 1,
          title: 'Bem-vindo ao VixPlay!',
          message: 'Sua conta foi criada com sucesso.',
          date: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          title: 'Sistema atualizado',
          message: 'Nova versão do sistema disponível com melhorias.',
          date: new Date(Date.now() - 86400000).toISOString(),
          read: true
        }
      ];
      setNotifications(mockNotifications);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setLoading(false);
    }
  };

  // Função para salvar o perfil
  const resolveUserId = () => {
    const candidate = (user && user.id) ? user.id : userData?.id;
    if (typeof candidate === 'number') return candidate;
    if (typeof candidate === 'string') {
      const parsed = parseInt(candidate, 10);
      return isNaN(parsed) ? null : parsed;
    }
    if (candidate && typeof candidate === 'object') {
      // Tentar extrair id de objeto aninhado
      if (typeof candidate.id === 'number') return candidate.id;
      if (typeof candidate.id === 'string') {
        const parsed = parseInt(candidate.id, 10);
        return isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  };
  const handleSaveProfile = async () => {
    try {
      const targetUserId = resolveUserId();
      console.log('Salvar perfil - targetUserId:', targetUserId, 'tipo:', typeof targetUserId);
      if (!targetUserId) {
        console.error('ID do usuário ausente ao salvar perfil');
      }
      const payload = {
        ...userData,
        dayOfPayment:
          userData.dayOfPayment === '' || userData.dayOfPayment === undefined
            ? null
            : parseInt(userData.dayOfPayment, 10)
      };
      if (user?.isAdmin) {
        await apiService.updateUser(targetUserId, payload);
      } else {
        await apiService.updateProfile(payload);
      }
      setAlertMessage('Perfil atualizado com sucesso!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setAlertMessage('Erro ao atualizar perfil. Tente novamente.');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    }
  };

  const handleSaveUserData = async () => {
    setSaving(true);
    try {
      const targetUserId = resolveUserId();
      console.log('Salvar dados - targetUserId:', targetUserId, 'tipo:', typeof targetUserId);
      if (!targetUserId) {
        console.error('ID do usuário ausente ao salvar dados do usuário');
      }
      const payload = {
        ...userData,
        dayOfPayment:
          userData.dayOfPayment === '' || userData.dayOfPayment === undefined
            ? null
            : parseInt(userData.dayOfPayment, 10)
      };
      if (user?.isAdmin) {
        await apiService.updateUser(targetUserId, payload);
      } else {
        await apiService.updateProfile(payload);
      }
      setAlertMessage('Dados salvos com sucesso!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    } catch (error) {
      console.error('Erro ao salvar dados:', error);
      setAlertMessage('Erro ao salvar dados');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    }
    setSaving(false);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiService.put('/user/settings', userSettings);
      setAlertMessage('Configurações salvas com sucesso!');
      setAlertType('success');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setAlertMessage('Erro ao salvar configurações');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    }
    setSaving(false);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await apiService.put(`/user/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Função para buscar endereço pelo CEP
  const handleCepSearch = async (cep) => {
    // Limpar CEP (remover caracteres não numéricos)
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return;
    }

    try {
      // Buscar endereço pelo CEP na API ViaCEP
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setAlertMessage('CEP não encontrado.');
        setAlertType('error');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 5000);
        return;
      }

      // Preencher os campos automaticamente
      setUserData(prevData => ({
        ...prevData,
        street: data.logradouro || '',
        zone: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        address: `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}`
      }));

    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      setAlertMessage('Erro ao buscar CEP. Tente novamente.');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    }
  };

  // Função para formatar telefone celular
  const formatCellphone = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 2) {
      return `(${cleanValue}`;
    } else if (cleanValue.length <= 7) {
      return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2)}`;
    } else {
      return `(${cleanValue.slice(0, 2)}) ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;
    }
  };

  // Função para lidar com mudança no cellphone
  const handleCellphoneChange = (e) => {
    const formattedCellphone = formatCellphone(e.target.value);
    setUserData({ ...userData, cellphone: formattedCellphone });
  };

  // Função para formatar CEP
  const formatCep = (value) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 5) {
      return cleanValue;
    }
    return cleanValue.replace(/(\d{5})(\d{1,3})/, '$1-$2');
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setAlertMessage('Formato de arquivo não suportado. Use JPG, PNG ou GIF.');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      return;
    }

    // Validar tamanho do arquivo (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setAlertMessage('Arquivo muito grande. Tamanho máximo: 5MB.');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
      return;
    }

    // Upload do arquivo usando apiService
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setSaving(true);

      const response = await apiService.uploadAvatar(formData);

      if (response.data) {
        // Recarregar os dados do usuário para obter a nova URL do avatar
        await loadUserData();

        setAlertMessage('Avatar atualizado com sucesso!');
        setAlertType('success');
        setShowAlert(true);
        setTimeout(() => setShowAlert(false), 3000);
      }
    } catch (error) {
      console.error('Erro ao fazer upload do avatar:', error);
      setAlertMessage('Erro ao fazer upload do avatar. Tente novamente.');
      setAlertType('error');
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    } finally {
      setSaving(false);
    }
  };
  const handleCepChange = (e) => {
    const formattedCep = formatCep(e.target.value);
    setUserData({ ...userData, zipCode: formattedCep });

    // Se o CEP estiver completo (8 dígitos), buscar automaticamente
    const cleanCep = formattedCep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      handleCepSearch(formattedCep);
    }
  };

  // Cálculo de dias restantes do período de avaliação (7 dias)
  const computeAvaliationDaysLeft = (dateCreatedStr) => {
    if (!dateCreatedStr) return null;
    const start = new Date(dateCreatedStr);
    if (Number.isNaN(start.getTime())) return null;
    const now = new Date();
    const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    const left = 7 - diffDays;
    return left > 0 ? left : 0;
  };

  const tabs = [
    { id: 'dados', label: 'Meus Dados', icon: 'bi-person' },
    { id: 'financeiro', label: 'Financeiro', icon: 'bi-credit-card' },
    { id: 'configuracoes', label: 'Configurações', icon: 'bi-gear' },
    { id: 'notificacoes', label: 'Notificações', icon: 'bi-bell' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dados':
        return (
          <div style={{ padding: '2rem' }}>
            {userData?.avaliationPeriod && (() => {
              const daysLeft = computeAvaliationDaysLeft(userData?.dateCreated);
              return (
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: `1px solid ${currentTheme.primary}`,
                  backgroundColor: currentTheme.cardBackground
                }}>
                  <div style={{ fontWeight: 700, color: currentTheme.primary, marginBottom: '0.25rem' }}>
                    Você está no período de avaliação
                  </div>
                  <div style={{ color: currentTheme.textPrimary }}>
                    {typeof daysLeft === 'number' ? `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'} para encerrar seu período.` : 'Calculando dias restantes...'}
                  </div>
                </div>
              );
            })()}

            {/* Alert Bootstrap para erros de CEP */}
            {showAlert && (
              <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                backgroundColor: alertType === 'success' ? '#d4edda' : '#f8d7da',
                color: alertType === 'success' ? '#155724' : '#721c24',
                border: `1px solid ${alertType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
                borderRadius: '0.375rem',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '400px',
                fontFamily: 'Poppins, sans-serif'
              }}>
                <img
                  src={alertaIcon}
                  alt="Alerta"
                  style={{ width: '24px', height: '24px' }}
                />
                <div style={{ flex: 1 }}>
                  <strong>{alertType === 'success' ? 'Sucesso!' : 'Erro!'}</strong> {alertMessage}
                </div>
                <button
                  onClick={() => setShowAlert(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: alertType === 'success' ? '#155724' : '#721c24',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    padding: '0',
                    lineHeight: '1'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {/* Dados Pessoais */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '1rem',
                borderBottom: `2px solid ${currentTheme.primary}`,
                paddingBottom: '0.5rem'
              }}>
                Dados Pessoais
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Avatar */}
                <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Logo da empresa
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Preview do Avatar */}
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `2px solid ${currentTheme.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: currentTheme.cardBackground
                    }}>
                      {userData.picture ? (
                        <img
                          src={getAvatarUrl(userData.picture)}
                          alt="Avatar"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <i className="bi bi-person-circle" style={{
                          fontSize: '3rem',
                          color: currentTheme.textSecondary
                        }}></i>
                      )}
                    </div>

                    {/* Input de Upload */}
                    <div>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="avatar-upload"
                        style={{
                          display: 'inline-block',
                          padding: '0.5rem 1rem',
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          fontFamily: 'Poppins, sans-serif',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          border: 'none',
                          transition: 'all 0.2s'
                        }}
                      >
                        {saving ? 'Enviando...' : 'Escolher Foto'}
                      </label>
                      <div style={{
                        fontSize: '0.75rem',
                        color: currentTheme.textSecondary,
                        marginTop: '0.25rem'
                      }}>
                        JPG, PNG ou GIF (máx. 5MB)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nome Completo */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={userData.name || ''}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={userData.email || ''}
                    onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                    disabled
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif',
                      opacity: 0.6,
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Cliente VIP (somente leitura) */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Cliente VIP
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={!!userData.vipClient}
                      readOnly
                      disabled
                      style={{ cursor: 'not-allowed' }}
                    />
                    <span style={{ color: currentTheme.textSecondary }}>
                      {userData.vipClient ? 'Ativo' : 'Não ativo'}
                    </span>
                  </div>
                </div>

                {/* Celular */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Celular
                  </label>
                  <input
                    type="tel"
                    value={userData.cellphone || ''}
                    onChange={handleCellphoneChange}
                    placeholder="(85) 9999-9999"
                    maxLength="15"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* CPF/CNPJ */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    value={userData.cpfCnpj || ''}
                    onChange={(e) => setUserData({ ...userData, cpfCnpj: e.target.value })}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Tipo de Pessoa */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Tipo de Pessoa
                  </label>
                  <select
                    value={userData.type || ''}
                    onChange={(e) => setUserData({ ...userData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    <option value="">Selecione...</option>
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Pessoa Jurídica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Dados da Empresa */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '1rem',
                borderBottom: `2px solid ${currentTheme.primary}`,
                paddingBottom: '0.5rem'
              }}>
                Dados da Empresa
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Nome de Trabalho */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Nome da empresa
                  </label>
                  <input
                    type="text"
                    value={userData.workName || ''}
                    onChange={(e) => setUserData({ ...userData, workName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Dia de Pagamento */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Dia de Pagamento
                  </label>
                  <select
                    value={userData.dayOfPayment || ''}
                    onChange={(e) => setUserData({ ...userData, dayOfPayment: e.target.value })}
                    disabled={!userData?.avaliationPeriod && !user?.isAdmin}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    <option value="">Selecione...</option>
                    {[5, 10, 15, 20, 25, 30].map(day => (
                      <option key={day} value={day}>
                        {String(day).padStart(2, '0')}
                      </option>
                    ))}
                  </select>

                </div>
              </div>
            </div>

            {/* Endereço */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '1rem',
                borderBottom: `2px solid ${currentTheme.primary}`,
                paddingBottom: '0.5rem'
              }}>
                Endereço
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* CEP */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    CEP
                  </label>
                  <input
                    type="text"
                    value={userData.zipCode || ''}
                    onChange={handleCepChange}
                    placeholder="00000-000"
                    maxLength="9"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Estado */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Estado
                  </label>
                  <select
                    value={userData.state || ''}
                    onChange={(e) => setUserData({ ...userData, state: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    <option value="">Selecione...</option>
                    <option value="AC">Acre</option>
                    <option value="AL">Alagoas</option>
                    <option value="AP">Amapá</option>
                    <option value="AM">Amazonas</option>
                    <option value="BA">Bahia</option>
                    <option value="CE">Ceará</option>
                    <option value="DF">Distrito Federal</option>
                    <option value="ES">Espírito Santo</option>
                    <option value="GO">Goiás</option>
                    <option value="MA">Maranhão</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PA">Pará</option>
                    <option value="PB">Paraíba</option>
                    <option value="PR">Paraná</option>
                    <option value="PE">Pernambuco</option>
                    <option value="PI">Piauí</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="RN">Rio Grande do Norte</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="RO">Rondônia</option>
                    <option value="RR">Roraima</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="SP">São Paulo</option>
                    <option value="SE">Sergipe</option>
                    <option value="TO">Tocantins</option>
                  </select>
                </div>

                {/* Cidade */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={userData.city || ''}
                    onChange={(e) => setUserData({ ...userData, city: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Bairro/Zona */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Bairro/Zona
                  </label>
                  <input
                    type="text"
                    value={userData.zone || ''}
                    onChange={(e) => setUserData({ ...userData, zone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Rua */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Rua
                  </label>
                  <input
                    type="text"
                    value={userData.street || ''}
                    onChange={(e) => setUserData({ ...userData, street: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Número */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Número
                  </label>
                  <input
                    type="text"
                    value={userData.number || ''}
                    onChange={(e) => setUserData({ ...userData, number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>

                {/* Complemento */}
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={userData.complement || ''}
                    onChange={(e) => setUserData({ ...userData, complement: e.target.value })}
                    placeholder="Apartamento, bloco, etc."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  />
                </div>
              </div>

              {/* Endereço Completo */}
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Endereço Completo
                </label>
                <textarea
                  value={userData.address || ''}
                  onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                  rows={3}
                  placeholder="Endereço completo para correspondência"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: currentTheme.background,
                    color: currentTheme.textPrimary,
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>

            {/* Botão Salvar */}
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button
                onClick={handleSaveProfile}
                style={{
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  fontFamily: 'Poppins, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  ':hover': {
                    backgroundColor: currentTheme.primaryHover || currentTheme.primary,
                    transform: 'translateY(-1px)'
                  }
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.primaryHover || currentTheme.primary;
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = currentTheme.primary;
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Salvar Alterações
              </button>
            </div>
            </div>
          );

      case 'financeiro':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{
              color: currentTheme.textPrimary,
              marginBottom: '2rem',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Registros Financeiros
            </h3>

            <div style={{
              backgroundColor: currentTheme.cardBackground,
              borderRadius: '0.5rem',
              border: `1px solid ${currentTheme.border}`,
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '1rem',
                backgroundColor: currentTheme.borderLight,
                borderBottom: `1px solid ${currentTheme.border}`,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr 1fr',
                gap: '1rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif'
              }}>
                <span>Data</span>
                <span>Descrição</span>
                <span>Valor</span>
                <span>Status</span>
              </div>

              {financialData.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: currentTheme.textSecondary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Nenhum registro financeiro encontrado
                </div>
              ) : (
                financialData.map((item, index) => (
                  <div key={index} style={{
                    padding: '1rem',
                    borderBottom: index < financialData.length - 1 ? `1px solid ${currentTheme.border}` : 'none',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: '1rem',
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    <span>{new Date(item.date).toLocaleDateString('pt-BR')}</span>
                    <span>{item.description}</span>
                    <span>R$ {item.amount.toFixed(2)}</span>
                    <span style={{
                      color: item.status === 'paid' ? '#10b981' : item.status === 'pending' ? '#f59e0b' : '#ef4444'
                    }}>
                      {item.status === 'paid' ? 'Pago' : item.status === 'pending' ? 'Pendente' : 'Vencido'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'configuracoes':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{
              color: currentTheme.textPrimary,
              marginBottom: '2rem',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Configurações
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h4 style={{
                  color: currentTheme.textPrimary,
                  marginBottom: '1rem',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Notificações
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="checkbox"
                    id="notifications"
                    checked={userSettings.notifications}
                    onChange={(e) => setUserSettings({ ...userSettings, notifications: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor="notifications" style={{
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Receber notificações do sistema
                  </label>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="emailAlerts"
                    checked={userSettings.emailAlerts}
                    onChange={(e) => setUserSettings({ ...userSettings, emailAlerts: e.target.checked })}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor="emailAlerts" style={{
                    color: currentTheme.textPrimary,
                    fontFamily: 'Poppins, sans-serif'
                  }}>
                    Receber alertas por email
                  </label>
                </div>
              </div>

              <div>
                <h4 style={{
                  color: currentTheme.textPrimary,
                  marginBottom: '1rem',
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Tema
                </h4>

                <select
                  value={userSettings.theme}
                  onChange={(e) => setUserSettings({ ...userSettings, theme: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: currentTheme.background,
                    color: currentTheme.textPrimary,
                    fontSize: '1rem',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  <option value="auto">Automático</option>
                  <option value="light">Claro</option>
                  <option value="dark">Escuro</option>
                </select>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontFamily: 'Poppins, sans-serif'
                  }}
                >
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'notificacoes':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{
              color: currentTheme.textPrimary,
              marginBottom: '2rem',
              fontFamily: 'Poppins, sans-serif'
            }}>
              Notificações do Sistema
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: currentTheme.textSecondary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Nenhuma notificação encontrada
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    style={{
                      padding: '1rem',
                      backgroundColor: notification.read ? currentTheme.background : currentTheme.borderLight,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      opacity: notification.read ? 0.7 : 1
                    }}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem'
                    }}>
                      <h5 style={{
                        margin: 0,
                        color: currentTheme.textPrimary,
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: '500'
                      }}>
                        {notification.title}
                      </h5>
                      <span style={{
                        fontSize: '0.875rem',
                        color: currentTheme.textSecondary,
                        fontFamily: 'Poppins, sans-serif'
                      }}>
                        {new Date(notification.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p style={{
                      margin: 0,
                      color: currentTheme.textSecondary,
                      fontFamily: 'Poppins, sans-serif',
                      fontSize: '0.9rem'
                    }}>
                      {notification.message}
                    </p>
                    {!notification.read && (
                      <div style={{
                        marginTop: '0.5rem',
                        fontSize: '0.8rem',
                        color: currentTheme.primary,
                        fontFamily: 'Poppins, sans-serif'
                      }}>
                        Clique para marcar como lida
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        color: currentTheme.textPrimary,
        fontFamily: 'Poppins, sans-serif'
      }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: currentTheme.background,
      minHeight: '100vh',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderBottom: `1px solid ${currentTheme.border}`,
        padding: '2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '0.375rem',
              color: currentTheme.textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="bi bi-arrow-left"></i>
          </button>
          <h1 style={{
            margin: 0,
            color: currentTheme.textPrimary,
            fontSize: '1.5rem',
            fontWeight: '600'
          }}>
            Perfil do Usuário
          </h1>
        </div>

        <p style={{
          margin: 0,
          color: currentTheme.textSecondary,
          fontSize: '1rem'
        }}>
          Gerencie seus dados pessoais, configurações e visualize informações da conta
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderBottom: `1px solid ${currentTheme.border}`,
        padding: '0 2rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '2rem'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 0',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${currentTheme.primary}` : '2px solid transparent',
                color: activeTab === tab.id ? currentTheme.primary : currentTheme.textSecondary,
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                fontFamily: 'Poppins, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        minHeight: 'calc(100vh - 200px)'
      }}>
        {renderTabContent()}
      </div>
    </div>
  );
};

export default UserProfile;