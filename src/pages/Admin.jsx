import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  DollarSign, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  Check, 
  AlertCircle, 
  User, 
  Target, 
  Calendar,
  Shield,
  Database,
  Monitor,
  FileText,
  CreditCard,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  QrCode,
  Download,
  Upload,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Activity,
  Package,
  Building2,
  LayoutDashboard,
  Image
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  
  // Estados principais
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados dos dados
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPanels: 0,
    totalDevices: 0,
    totalMedia: 0,
    totalClients: 0,
    totalCampaigns: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    monthlyGrowth: 0
  });

  // Estados dos modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [showBulkTitlesModal, setShowBulkTitlesModal] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [userDetailsTab, setUserDetailsTab] = useState('usuario');

  // Estados dos usuários
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsUserId, setDetailsUserId] = useState(null);

  // Estados das configurações do sistema
  const [systemConfig, setSystemConfig] = useState({
    valueDevice: '',
    urlWebHookApi: '',
    urlWebHookSlack: '',
    tokenApi: '',
    clientId: '',
    clientSecret: '',
    urlObtainToken: '',
    urlRenewToken: '',
    urlApi: '',
    apiPagamentos: 'PAGARME'
  });

  // Estados dos títulos financeiros
  const [financialTitles, setFinancialTitles] = useState([]);
  const [pixData, setPixData] = useState(null);
  const [bulkTitlesData, setBulkTitlesData] = useState({
    clientId: '',
    description: '',
    amount: '',
    startDate: '',
    months: 1
  });

  // Estados do formulário de edição de usuário
  const [editUserData, setEditUserData] = useState({
    id: '',
    name: '',
    email: '',
    cpfCnpj: '',
    workName: '',
    cellphone: '',
    pictureUrl: '',
    dayOfPayment: 1,
    isAdmin: false,
    isBlocked: false,
    password: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData();
  }, []);

  // Função para carregar dados iniciais
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadSystemConfig()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
      setError('Erro ao carregar dados da administração');
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar estatísticas
  const loadStats = async () => {
    try {
      const response = await apiService.get('/private/admin/stats');
      if (response.data) {
        const defaults = {
          totalUsers: 0,
          totalPanels: 0,
          totalDevices: 0,
          totalMedia: 0,
          totalClients: 0,
          totalCampaigns: 0,
          totalRevenue: 0,
          activeSubscriptions: 0,
          monthlyGrowth: 0,
          totalGlobalMedias: 0
        };
        setStats({ ...defaults, ...response.data });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Função para carregar usuários
  const loadUsers = async () => {
    try {
      const response = await apiService.get('/private/admin/users');
      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError('Erro ao carregar lista de usuários');
    }
  };

  // Função para carregar configurações do sistema
  const loadSystemConfig = async () => {
    try {
      const response = await apiService.get('/private/admin/system-config');
      if (response.data) {
        setSystemConfig(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  // Função para carregar detalhes do usuário (admin)
  const loadUserDetails = async (userId) => {
    try {
      // Preferir rota já existente que retorna o usuário completo (como no admin.html)
      const userResp = await apiService.getUser(userId);
      const userData = userResp?.data || {};
      // Alguns backends retornam o usuário aninhado em "user"/"User"/"usuario"/"Usuario" ou dentro de data.user
      const rootUser = (
        userData.user || userData.User || userData.usuario || userData.Usuario ||
        (userData.data && (userData.data.user || userData.data.User)) ||
        userData
      );

      // Utilitário para normalizar listas possivelmente encapsuladas
      const normalizeList = (src) => {
        if (!src) return [];
        if (Array.isArray(src)) return src;
        if (typeof src === 'object') {
          const keys = ['items', 'list', 'data', 'medias', 'media', 'Medias', 'Midia', 'midias', 'midia'];
          for (const k of keys) {
            const v = src[k];
            if (Array.isArray(v)) return v;
          }
        }
        return [];
      };

      // Painéis: aceitar várias convenções no payload
      const panels = Array.isArray(rootUser.panels)
        ? rootUser.panels
        : (Array.isArray(rootUser.paineis)
            ? rootUser.paineis
            : (Array.isArray(rootUser.Panels)
                ? rootUser.Panels
                : (Array.isArray(rootUser.Paineis)
                    ? rootUser.Paineis
                    : (Array.isArray(rootUser.panel)
                        ? rootUser.panel
                        : []))));

      // Dispositivos: tentar flatten dos painéis; se vazio, buscar pela rota dedicada
      let devices = [];
      if (panels.length > 0) {
        devices = panels.flatMap(p => Array.isArray(p.devices) ? p.devices : []);
      }
      if (!Array.isArray(devices) || devices.length === 0) {
        try {
          const devResp = await apiService.getUserDevices(userId);
          devices = Array.isArray(devResp?.data) ? devResp.data : [];
        } catch (_) {
          // Ignorar erro secundário; manter devices vazio
          devices = [];
        }
      }

      // Mídias: usar rota dedicada do Admin para mídias do usuário selecionado
      let media = [];
      try {
        const resp = await apiService.getUserMedias(userId);
        media = Array.isArray(resp?.data) ? resp.data : normalizeList(resp?.data);
      } catch (_) {
        // Fallback: tentar extrair do payload do usuário (allMedias/medias/media)
        const candidates = [rootUser.allMedias, rootUser.medias, rootUser.media, rootUser.Medias, rootUser.Midia, rootUser.midias, rootUser.midia];
        for (const src of candidates) {
          const arr = normalizeList(src);
          if (arr.length > 0) { media = arr; break; }
        }
      }

      // Não derivar de painéis: a aba "Midias" deve listar apenas
      // mídias diretamente relacionadas ao usuário (sem relação com painéis).

      // Fallback final: se ainda vazio e o usuário selecionado for o mesmo usuário logado, usar getMedias()
      if ((!Array.isArray(media) || media.length === 0)) {
        try {
          const storedUser = localStorage.getItem('vixplay_user');
          const appUser = storedUser ? JSON.parse(storedUser) : null;
          const isSameUser = appUser?.id && String(appUser.id) === String(userId);
          if (isSameUser) {
            const resp = await apiService.getMedias();
            const ownMedias = Array.isArray(resp?.data) ? resp.data : [];
            media = ownMedias;
          }
        } catch (_) {
          // Ignorar erro do fallback; manter media como []
        }
      }

      // Clientes
      const clients = Array.isArray(userData.clients) ? userData.clients : [];

      // Campanhas: se existir em userData, usar; senão, coletar das campanhas dos clientes
      let campaigns = Array.isArray(userData.campaigns) ? userData.campaigns : [];
      if (campaigns.length === 0 && clients.length > 0) {
        campaigns = clients.flatMap(c => Array.isArray(c.campaigns) ? c.campaigns : []);
      }

      setUserDetails({ panels, devices, media, clients, campaigns });
    } catch (error) {
      console.error('Erro ao carregar detalhes do usuário:', error);
      setUserDetails({ panels: [], devices: [], media: [], clients: [], campaigns: [] });
    }
  };

  // Abrir modal de detalhes do usuário
  const openUserDetailsModal = (user) => {
    if (!user?.id) return;
    setSelectedUser(user);
    setDetailsUserId(user.id);
    setUserDetailsTab('usuario');
    setShowUserDetailsModal(true);
    setUserDetailsLoading(true);
    loadUserDetails(user.id).finally(() => setUserDetailsLoading(false));
  };

  const closeUserDetailsModal = () => {
    setShowUserDetailsModal(false);
    setUserDetailsTab('usuario');
    setDetailsUserId(null);
  };

  // Handlers de exclusão (admin)
  const handleDeletePanel = async (panelId) => {
    if (!panelId) return;
    if (!window.confirm('Excluir este Painel? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deletePanel(panelId);
      setSuccess('Painel excluído com sucesso');
      await Promise.all([
        loadStats(),
        detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro ao excluir painel:', error);
      setError('Erro ao excluir painel');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!deviceId) return;
    if (!window.confirm('Excluir este Dispositivo? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deleteDevice(deviceId);
      setSuccess('Dispositivo excluído com sucesso');
      await Promise.all([
        loadStats(),
        detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro ao excluir dispositivo:', error);
      setError('Erro ao excluir dispositivo');
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!mediaId) return;
    if (!window.confirm('Excluir esta Mídia? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deleteMedia(mediaId);
      setSuccess('Mídia excluída com sucesso');
      await Promise.all([
        loadStats(),
        detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro ao excluir mídia:', error);
      setError('Erro ao excluir mídia');
    }
  };

  const handleDeleteClient = async (clientId) => {
    if (!clientId) return;
    if (!window.confirm('Excluir este Cliente? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deleteClient(clientId);
      setSuccess('Cliente excluído com sucesso');
      await Promise.all([
        loadStats(),
        detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      setError('Erro ao excluir cliente');
    }
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!campaignId) return;
    if (!window.confirm('Excluir esta Campanha? Esta ação não pode ser desfeita.')) return;
    try {
      await apiService.deleteCampaign(campaignId);
      setSuccess('Campanha excluída com sucesso');
      await Promise.all([
        loadStats(),
        detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Erro ao excluir campanha:', error);
      setError('Erro ao excluir campanha');
    }
  };

  // Função para abrir modal de edição de usuário
  const openEditUserModal = (user) => {
    setEditUserData({
      id: user.id,
      name: user.name || '',
      email: user.email || '',
      cpfCnpj: user.cpfCnpj || '',
      workName: user.workName || '',
      cellphone: user.cellphone || '',
      pictureUrl: user.pictureUrl || '',
      dayOfPayment: user.dayOfPayment || 1,
      isAdmin: user.isAdmin || false,
      isBlocked: user.isBlocked || false,
      password: ''
    });
    setShowEditUserModal(true);
  };

  // Função para salvar alterações do usuário
  const saveUserChanges = async () => {
    try {
      const response = await apiService.put(`/private/admin/users/${editUserData.id}`, editUserData);
      if (response.data) {
        setSuccess('Usuário atualizado com sucesso!');
        setShowEditUserModal(false);
        loadUsers();
      }
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      setError('Erro ao salvar alterações do usuário');
    }
  };

  // Função para deletar usuário
  const deleteUser = async (userId) => {
    try {
      await apiService.delete(`/private/admin/users/${userId}`);
      setSuccess('Usuário deletado com sucesso!');
      setShowDeleteModal(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setError('Erro ao deletar usuário');
    }
  };

  // Função para salvar configurações do sistema
  const saveSystemConfig = async () => {
    try {
      const response = await apiService.post('/private/admin/system-config', systemConfig);
      if (response.data) {
        setSuccess('Configurações salvas com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Erro ao salvar configurações do sistema');
    }
  };

  // Função para verificar bloqueios de usuários inadimplentes
  const checkBlockOverdueUsers = async () => {
    try {
      const response = await apiService.post('/private/admin/test-block-overdue-users');
      if (response.data) {
        setSuccess(`Verificação concluída: ${response.data.message}`);
        loadStats(); // Recarregar estatísticas
      }
    } catch (error) {
      console.error('Erro ao verificar bloqueios:', error);
      setError('Erro ao verificar usuários inadimplentes');
    }
  };

  // Função para filtrar usuários
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && !user.isBlocked) ||
                         (filterStatus === 'blocked' && user.isBlocked) ||
                         (filterStatus === 'admin' && user.isAdmin);
    
    return matchesSearch && matchesFilter;
  });

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  // Função para formatar data
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  // Obter estilos com o tema atual
  const styles = getStyles(currentTheme);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <RefreshCw className="animate-spin" size={32} />
          <p>Carregando dados da administração...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.headerLeft}>
            <Shield size={32} style={styles.headerIcon} />
            <div>
              <h1 style={styles.title}>Administração</h1>
              <p style={styles.subtitle}>Painel de controle administrativo</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div style={styles.alert.error}>
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')} style={styles.alert.closeButton}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div style={styles.alert.success}>
          <Check size={20} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} style={styles.alert.closeButton}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Estatísticas */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Users size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalUsers}</h3>
            <p style={styles.statLabel}>Total de Usuários</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Monitor size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalPanels}</h3>
            <p style={styles.statLabel}>Painéis</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Database size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalDevices}</h3>
            <p style={styles.statLabel}>Dispositivos</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <FileText size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalMedia}</h3>
            <p style={styles.statLabel}>Mídias</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Target size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalClients}</h3>
            <p style={styles.statLabel}>Clientes</p>
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>
            <Activity size={24} />
          </div>
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalCampaigns}</h3>
            <p style={styles.statLabel}>Campanhas</p>
          </div>
        </div>
         <div style={styles.statCard} 
         onClick={() => navigate('/admin/global-medias')}
              title="Cadastrar mídias globais"
              cursor="pointer"
         >
          <div style={styles.statIcon}>
            <Activity size={24} />
          </div>
          
          <div style={styles.statContent}>
            <h3 style={styles.statNumber}>{stats.totalGlobalMedias}</h3>
            <p style={styles.statLabel}>Midias globais</p>
          </div>
        </div>
      </div>

      {/* Tabs de navegação */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'users' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('users')}
          >
            <Users size={20} />
            Usuários
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'settings' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={20} />
            Configurações
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'financial' ? styles.activeTab : {})
            }}
            onClick={() => setActiveTab('financial')}
          >
            <DollarSign size={20} />
            Financeiro
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'batch-license' ? styles.activeTab : {})
            }}
            onClick={() => navigate('/batch-license')}
          >
            <Package size={20} />
            Licenciamento em Lote
          </button>
        </div>
      </div>

      {/* Conteúdo das tabs */}
      <div style={styles.tabContent}>
        {activeTab === 'users' && (
          <UsersTab
            users={filteredUsers}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            openUserDetailsModal={openUserDetailsModal}
            openEditUserModal={openEditUserModal}
            setShowDeleteModal={setShowDeleteModal}
            setSelectedUser={setSelectedUser}
            styles={styles}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            systemConfig={systemConfig}
            setSystemConfig={setSystemConfig}
            saveSystemConfig={saveSystemConfig}
            styles={styles}
          />
        )}

        {activeTab === 'financial' && (
          <FinancialTab
            stats={stats}
            checkBlockOverdueUsers={checkBlockOverdueUsers}
            styles={styles}
          />
        )}
      </div>

      {/* Modais */}
      {showEditUserModal && (
        <EditUserModal
          editUserData={editUserData}
          setEditUserData={setEditUserData}
          saveUserChanges={saveUserChanges}
          setShowEditUserModal={setShowEditUserModal}
          styles={styles}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          selectedUser={selectedUser}
          deleteUser={deleteUser}
          setShowDeleteModal={setShowDeleteModal}
          styles={styles}
        />
      )}

      {showUserDetailsModal && (
        <UserDetailsModal
          visible={showUserDetailsModal}
          onClose={closeUserDetailsModal}
          user={selectedUser}
          details={userDetails}
          detailsLoading={userDetailsLoading}
          tab={userDetailsTab}
          setTab={setUserDetailsTab}
          styles={styles}
          onDeletePanel={handleDeletePanel}
          onDeleteDevice={handleDeleteDevice}
          onDeleteMedia={handleDeleteMedia}
          onDeleteClient={handleDeleteClient}
          onDeleteCampaign={handleDeleteCampaign}
          refreshDetails={() => detailsUserId ? loadUserDetails(detailsUserId) : Promise.resolve()}
        />
      )}
    </div>
  );
};

// Componente da aba de usuários
const UsersTab = ({ 
  users, 
  searchTerm, 
  setSearchTerm, 
  filterStatus, 
  setFilterStatus,
  openUserDetailsModal,
  openEditUserModal,
  setShowDeleteModal,
  setSelectedUser,
  styles 
}) => (
  <div>
    {/* Controles de busca e filtro */}
    <div style={styles.controls}>
      <div style={styles.searchContainer}>
        <Search size={20} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>
      
      <div style={styles.filterContainer}>
        <Filter size={20} style={styles.filterIcon} />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="blocked">Bloqueados</option>
          <option value="admin">Administradores</option>
        </select>
      </div>
    </div>

    {/* Lista de usuários */}
    <div style={styles.usersList}>
      {users.map(user => (
        <UserCard
          key={user.id}
          user={user}
          openUserDetailsModal={openUserDetailsModal}
          openEditUserModal={openEditUserModal}
          setShowDeleteModal={setShowDeleteModal}
          setSelectedUser={setSelectedUser}
          styles={styles}
        />
      ))}
    </div>
  </div>
);

// Componente do card de usuário
const UserCard = ({ 
  user, 
  openUserDetailsModal,
  openEditUserModal, 
  setShowDeleteModal, 
  setSelectedUser,
  styles 
}) => (
  <div style={styles.userCard}>
    <div style={styles.userCardHeader}>
      <div style={styles.userInfo}>
        <div style={styles.userAvatar}>
          {user.pictureUrl ? (
            <img src={user.pictureUrl} alt={user.name} style={styles.avatarImage} />
          ) : (
            <User size={24} />
          )}
        </div>
        <div style={styles.userDetails}>
          <h3 style={styles.userName}>{user.name}</h3>
          <p style={styles.userEmail}>{user.email}</p>
          <div style={styles.userBadges}>
            {user.isAdmin && <span style={styles.badge.admin}>Admin</span>}
            {user.isBlocked && <span style={styles.badge.blocked}>Bloqueado</span>}
            {!user.isBlocked && <span style={styles.badge.active}>Ativo</span>}
          </div>
        </div>
      </div>
      
      <div style={styles.userActions}>
        <button
          onClick={() => openUserDetailsModal(user)}
          style={styles.actionButton}
          title="Ver detalhes"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={() => openEditUserModal(user)}
          style={styles.actionButton}
          title="Editar"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={() => {
            setSelectedUser(user);
            setShowDeleteModal(true);
          }}
          style={styles.actionButton}
          title="Deletar"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>

    {/* Detalhes expandidos substituídos por modal */}
  </div>
);

// Modal de detalhes do usuário com abas
const UserDetailsModal = ({
  visible,
  onClose,
  user,
  details,
  detailsLoading,
  tab,
  setTab,
  styles,
  onDeletePanel,
  onDeleteDevice,
  onDeleteMedia,
  onDeleteClient,
  onDeleteCampaign,
  refreshDetails
}) => {
  const [previewMedia, setPreviewMedia] = useState(null);
  const [editingMedia, setEditingMedia] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', url: '', type: '' });

  const openPreview = (m) => {
    setPreviewMedia(m);
    setEditingMedia(null);
    setEditForm({
      title: m.title || m.name || '',
      description: m.description || '',
      url: m.url || '',
      type: m.type || ''
    });
  };
  const closePreview = () => {
    setPreviewMedia(null);
    setEditingMedia(null);
  };
  const startEditing = () => {
    if (!previewMedia) return;
    setEditingMedia(previewMedia);
  };
  const saveEdit = async () => {
    if (!editingMedia) return;
    try {
      await apiService.updateMedia(editingMedia.id, {
        title: editForm.title,
        description: editForm.description
      });
      setEditingMedia(null);
      if (typeof refreshDetails === 'function') {
        await refreshDetails();
      }
    } catch (err) {
      console.error('Erro ao atualizar mídia:', err);
      alert(err?.response?.data?.error || 'Erro ao atualizar mídia');
    }
  };

  if (!visible) return null;
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h3 style={styles.modalTitle}>Detalhes do Usuário</h3>
          <button onClick={onClose} style={styles.modalCloseButton}>
            <X size={20} />
          </button>
        </div>

        {/* Abas - estilo igual ao /admin com ícones Lucide */}
        <div style={styles.tabsContainer}>
          <div style={styles.tabs}>
            {[
              { key: 'usuario', label: 'Perfil', Icon: User },
              { key: 'empresas', label: 'Empresas', Icon: Building2 },
              { key: 'dispositivos', label: 'Dispositivos', Icon: Monitor },
              { key: 'paineis', label: 'Paineis', Icon: LayoutDashboard },
              { key: 'midias', label: 'Midias', Icon: Image },
              { key: 'clientes', label: 'Clientes', Icon: Users },
              { key: 'campanhas', label: 'Campanhas', Icon: Target },
              { key: 'logs', label: 'Logs', Icon: FileText },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  ...styles.tab,
                  ...(tab === t.key ? styles.activeTab : {})
                }}
              >
                <t.Icon size={18} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div style={styles.modalBody}>
          {detailsLoading && (
            <div style={{ padding: 16 }}>Carregando...</div>
          )}

          {!detailsLoading && tab === 'usuario' && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Perfil</h4>
              <div style={styles.detailItem}><span>Nome</span><span>{user?.name}</span></div>
              <div style={styles.detailItem}><span>E-mail</span><span>{user?.email}</span></div>
              <div style={styles.detailItem}><span>Status</span><span>{user?.isBlocked ? 'Bloqueado' : 'Ativo'}</span></div>
              <div style={styles.detailItem}><span>Tipo</span><span>{user?.isAdmin ? 'Admin' : 'Usuário'}</span></div>
              {user?.dayOfPayment !== undefined && (
                <div style={styles.detailItem}><span>Dia de Pagamento</span><span>{user?.dayOfPayment}</span></div>
              )}
            </div>
          )}

          {!detailsLoading && tab === 'empresas' && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Empresas relacionadas</h4>
              <div style={{ padding: 12, color: '#64748b' }}>
                Exibição de empresas do usuário alvo será adicionada. No momento, utilize a aba "Minhas Empresas" no perfil.
              </div>
            </div>
          )}

          {!detailsLoading && tab === 'dispositivos' && Array.isArray(details?.devices) && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Dispositivos ({details.devices.length})</h4>
              {details.devices.map((device) => (
                <div key={device.id} style={styles.detailItem}>
                  <span>{device.name || device.serialNumber || device.macAddress}</span>
                  <button onClick={() => onDeleteDevice(device.id)} style={styles.actionButton} title="Excluir Dispositivo">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!detailsLoading && tab === 'paineis' && Array.isArray(details?.panels) && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Paineis ({details.panels.length})</h4>
              {details.panels.map((panel) => (
                <div key={panel.id} style={styles.detailItem}>
                  <span>{panel.name || panel.title}</span>
                  <button onClick={() => onDeletePanel(panel.id)} style={styles.actionButton} title="Excluir Painel">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!detailsLoading && tab === 'midias' && Array.isArray(details?.media) && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Midias ({details.media.length})</h4>
              <div style={styles.mediaGrid}>
                {details.media.map((m, idx) => {
                  const safeKey = m?.id ?? `${m?.url || 'no-url'}-${m?.panelId || 'no-panel'}-${idx}`;
                  const isImage = (m.type?.toLowerCase().includes('image') || m.type?.toLowerCase() === 'photo');
                  const isVideo = m.type?.toLowerCase().includes('video');
                  const mediaTypeLabel = isImage ? 'Foto' : isVideo ? 'Vídeo' : 'Widget';
                  const mediaTypeClass = isImage ? 'bg-primary' : isVideo ? 'bg-danger' : 'bg-secondary';
                  return (
                    <div key={safeKey} style={styles.mediaCard}>
                      <div style={styles.mediaThumb} onClick={() => openPreview(m)} title="Visualizar">
                        {m.url ? (
                          isImage ? (
                            <img src={m.url} alt={m.title || m.name || 'Mídia'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          ) : isVideo ? (
                            <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} muted />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '8px', border: `1px solid ${styles.border || '#e5e7eb'}` }}>Link</div>
                          )
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '8px', border: `1px solid ${styles.border || '#e5e7eb'}` }}>Sem prévia</div>
                        )}
                      </div>
                      <div style={styles.mediaInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <div style={styles.mediaTitle}>{m.title || m.name || m.filename || 'Mídia'}</div>
                          <span className={`badge ${mediaTypeClass} rounded-pill`}>{mediaTypeLabel}</span>
                        </div>
                        <div style={styles.mediaActions}>
                          <button onClick={() => openPreview(m)} style={styles.actionButton} title="Ampliar">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => { setPreviewMedia(m); startEditing(); }} style={styles.actionButton} title="Editar">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => onDeleteMedia(m.id)} style={styles.actionButton} title="Excluir">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {previewMedia && (
                <div style={styles.modalOverlay}>
                  <div style={styles.lightbox}>
                    <div style={styles.lightboxHeader}>
                      <h4 style={styles.modalTitle}>{previewMedia.title || previewMedia.name || 'Prévia da Mídia'}</h4>
                      <button onClick={closePreview} style={styles.modalCloseButton} title="Fechar">
                        <X size={20} />
                      </button>
                    </div>
                    <div style={styles.lightboxBody}>
                      {previewMedia.url ? (
                        (previewMedia.type?.toLowerCase().includes('image') || previewMedia.type?.toLowerCase() === 'photo') ? (
                          <img src={previewMedia.url} alt={previewMedia.title || 'Prévia'} style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: '8px' }} />
                        ) : previewMedia.type?.toLowerCase().includes('video') ? (
                          <video src={previewMedia.url} style={{ maxWidth: '100%', maxHeight: '50vh', borderRadius: '8px' }} controls />
                        ) : (
                          <a href={previewMedia.url} target="_blank" rel="noreferrer" style={{ color: styles.linkColor || '#2563eb' }}>{previewMedia.url}</a>
                        )
                      ) : (
                        <div style={{ padding: 16, color: '#64748b' }}>Sem URL disponível para prévia.</div>
                      )}

                      {editingMedia && (
                        <div style={{ marginTop: 16 }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={styles.label}>Título</label>
                            <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={styles.input} />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={styles.label}>Descrição</label>
                            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} style={{ ...styles.input, minHeight: 80 }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={styles.lightboxFooter}>
                      {editingMedia ? (
                        <>
                          <button onClick={saveEdit} style={styles.primaryButton}>
                            <Check size={16} />
                            Salvar alterações
                          </button>
                          <button onClick={() => setEditingMedia(null)} style={styles.secondaryButton}>
                            Cancelar edição
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={startEditing} style={styles.primaryButton}>
                            <Edit size={16} />
                            Editar dados
                          </button>
                          <button onClick={() => onDeleteMedia(previewMedia.id)} style={styles.dangerButton}>
                            <Trash2 size={16} />
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {!detailsLoading && tab === 'clientes' && Array.isArray(details?.clients) && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Clientes ({details.clients.length})</h4>
              {details.clients.map((c) => (
                <div key={c.id} style={styles.detailItem}>
                  <span>{c.name || c.workName || c.email}</span>
                  <button onClick={() => onDeleteClient(c.id)} style={styles.actionButton} title="Excluir Cliente">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!detailsLoading && tab === 'campanhas' && Array.isArray(details?.campaigns) && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Campanhas ({details.campaigns.length})</h4>
              {details.campaigns.map((camp) => (
                <div key={camp.id} style={styles.detailItem}>
                  <span>{camp.title || camp.name}</span>
                  <button onClick={() => onDeleteCampaign(camp.id)} style={styles.actionButton} title="Excluir Campanha">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!detailsLoading && tab === 'logs' && (
            <div style={styles.detailsSection}>
              <h4 style={styles.detailsTitle}>Logs</h4>
              <div style={{ padding: 12, color: '#64748b' }}>Logs relacionados ao usuário serão adicionados posteriormente.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente da aba de configurações
const SettingsTab = ({ systemConfig, setSystemConfig, saveSystemConfig, styles }) => (
  <div style={styles.settingsContainer}>
    <h3 style={styles.sectionTitle}>Configurações do Sistema</h3>
    
    <div style={styles.configGrid}>
      <div style={styles.configSection}>
        <h4 style={styles.configTitle}>Configurações Gerais</h4>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Valor do Dispositivo (R$)</label>
          <input
            type="text"
            value={systemConfig.valueDevice}
            onChange={(e) => setSystemConfig({...systemConfig, valueDevice: e.target.value})}
            style={styles.input}
            placeholder="30,00"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>URL WebHook API</label>
          <input
            type="url"
            value={systemConfig.urlWebHookApi}
            onChange={(e) => setSystemConfig({...systemConfig, urlWebHookApi: e.target.value})}
            style={styles.input}
            placeholder="https://api.exemplo.com/webhook"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>URL WebHook Slack</label>
          <input
            type="url"
            value={systemConfig.urlWebHookSlack}
            onChange={(e) => setSystemConfig({...systemConfig, urlWebHookSlack: e.target.value})}
            style={styles.input}
            placeholder="https://hooks.slack.com/..."
          />
        </div>
      </div>

      <div style={styles.configSection}>
        <h4 style={styles.configTitle}>Configurações de API</h4>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Token API</label>
          <input
            type="password"
            value={systemConfig.tokenApi}
            onChange={(e) => setSystemConfig({...systemConfig, tokenApi: e.target.value})}
            style={styles.input}
            placeholder="Token de autenticação"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Client ID</label>
          <input
            type="text"
            value={systemConfig.clientId}
            onChange={(e) => setSystemConfig({...systemConfig, clientId: e.target.value})}
            style={styles.input}
            placeholder="ID do cliente"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Client Secret</label>
          <input
            type="password"
            value={systemConfig.clientSecret}
            onChange={(e) => setSystemConfig({...systemConfig, clientSecret: e.target.value})}
            style={styles.input}
            placeholder="Chave secreta do cliente"
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>API de Pagamentos</label>
          <select
            value={systemConfig.apiPagamentos}
            onChange={(e) => setSystemConfig({...systemConfig, apiPagamentos: e.target.value})}
            style={styles.select}
          >
            <option value="PAGARME">Pagar.me</option>
            <option value="MERCADOPAGO">Mercado Pago</option>
            <option value="STRIPE">Stripe</option>
          </select>
        </div>
      </div>
    </div>

    <div style={styles.configActions}>
      <button onClick={saveSystemConfig} style={styles.primaryButton}>
        <Check size={16} />
        Salvar Configurações
      </button>
    </div>
  </div>
);

// Componente da aba financeira
const FinancialTab = ({ stats, checkBlockOverdueUsers, styles }) => (
  <div style={styles.financialContainer}>
    <h3 style={styles.sectionTitle}>Relatórios Financeiros</h3>
    
    <div style={styles.financialGrid}>
      <div style={styles.financialCard}>
        <div style={styles.financialIcon}>
          <DollarSign size={24} />
        </div>
        <div style={styles.financialContent}>
          <h3 style={styles.financialNumber}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(stats.totalRevenue / 100)}
          </h3>
          <p style={styles.financialLabel}>Receita Total</p>
        </div>
      </div>

      <div style={styles.financialCard}>
        <div style={styles.financialIcon}>
          <CreditCard size={24} />
        </div>
        <div style={styles.financialContent}>
          <h3 style={styles.financialNumber}>{stats.activeSubscriptions}</h3>
          <p style={styles.financialLabel}>Assinaturas Ativas</p>
        </div>
      </div>

      <div style={styles.financialCard}>
        <div style={styles.financialIcon}>
          <TrendingUp size={24} />
        </div>
        <div style={styles.financialContent}>
          <h3 style={styles.financialNumber}>{stats.monthlyGrowth}%</h3>
          <p style={styles.financialLabel}>Crescimento Mensal</p>
        </div>
      </div>
    </div>

    <div style={styles.financialActions}>
      <button onClick={checkBlockOverdueUsers} style={styles.warningButton}>
        <Lock size={16} />
        Verificar Bloqueios
      </button>
    </div>
  </div>
);

// Modal de edição de usuário
const EditUserModal = ({ 
  editUserData, 
  setEditUserData, 
  saveUserChanges, 
  setShowEditUserModal, 
  styles 
}) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <div style={styles.modalHeader}>
        <h3 style={styles.modalTitle}>Editar Usuário</h3>
        <button
          onClick={() => setShowEditUserModal(false)}
          style={styles.modalCloseButton}
        >
          <X size={20} />
        </button>
      </div>

      <div style={styles.modalBody}>
        <div style={styles.formGrid}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nome</label>
            <input
              type="text"
              value={editUserData.name}
              onChange={(e) => setEditUserData({...editUserData, name: e.target.value})}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={editUserData.email}
              onChange={(e) => setEditUserData({...editUserData, email: e.target.value})}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CPF/CNPJ</label>
            <input
              type="text"
              value={editUserData.cpfCnpj}
              onChange={(e) => setEditUserData({...editUserData, cpfCnpj: e.target.value})}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Celular</label>
            <input
              type="text"
              value={editUserData.cellphone}
              onChange={(e) => setEditUserData({...editUserData, cellphone: e.target.value})}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Dia do Pagamento</label>
            <input
              type="number"
              min="1"
              max="31"
              value={editUserData.dayOfPayment}
              onChange={(e) => setEditUserData({...editUserData, dayOfPayment: parseInt(e.target.value)})}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Nova Senha (opcional)</label>
            <input
              type="password"
              value={editUserData.password}
              onChange={(e) => setEditUserData({...editUserData, password: e.target.value})}
              style={styles.input}
              placeholder="Deixe em branco para manter a atual"
            />
          </div>
        </div>

        <div style={styles.checkboxGroup}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={editUserData.isAdmin}
              onChange={(e) => setEditUserData({...editUserData, isAdmin: e.target.checked})}
              style={styles.checkbox}
            />
            Administrador
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={editUserData.isBlocked}
              onChange={(e) => setEditUserData({...editUserData, isBlocked: e.target.checked})}
              style={styles.checkbox}
            />
            Bloqueado
          </label>
        </div>
      </div>

      <div style={styles.modalFooter}>
        <button
          onClick={() => setShowEditUserModal(false)}
          style={styles.secondaryButton}
        >
          Cancelar
        </button>
        <button
          onClick={saveUserChanges}
          style={styles.primaryButton}
        >
          <Check size={16} />
          Salvar Alterações
        </button>
      </div>
    </div>
  </div>
);

// Modal de confirmação de exclusão
const DeleteModal = ({ selectedUser, deleteUser, setShowDeleteModal, styles }) => (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <div style={styles.modalHeader}>
        <h3 style={styles.modalTitle}>Confirmar Exclusão</h3>
        <button
          onClick={() => setShowDeleteModal(false)}
          style={styles.modalCloseButton}
        >
          <X size={20} />
        </button>
      </div>

      <div style={styles.modalBody}>
        <div style={styles.deleteConfirmation}>
          <AlertCircle size={48} style={styles.deleteIcon} />
          <p style={styles.deleteMessage}>
            Tem certeza que deseja deletar o usuário <strong>{selectedUser?.name}</strong>?
          </p>
          <p style={styles.deleteWarning}>
            Esta ação não pode ser desfeita.
          </p>
        </div>
      </div>

      <div style={styles.modalFooter}>
        <button
          onClick={() => setShowDeleteModal(false)}
          style={styles.secondaryButton}
        >
          Cancelar
        </button>
        <button
          onClick={() => deleteUser(selectedUser?.id)}
          style={styles.dangerButton}
        >
          <Trash2 size={16} />
          Deletar
        </button>
      </div>
    </div>
  </div>
);

// Função para obter estilos baseados no tema
const getStyles = (theme) => ({
  container: {
    padding: '24px',
    backgroundColor: theme.background,
    minHeight: '100vh',
    color: theme.textPrimary
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '400px',
    gap: '16px'
  },

  header: {
    marginBottom: '32px'
  },

  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  headerIcon: {
    color: theme.primary
  },

  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    margin: 0,
    color: theme.textPrimary
  },

  subtitle: {
    fontSize: '16px',
    color: theme.textSecondary,
    margin: 0
  },

  alert: {
    error: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: '#fee2e2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      color: '#dc2626',
      marginBottom: '24px'
    },
    success: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      backgroundColor: '#dcfce7',
      border: '1px solid #bbf7d0',
      borderRadius: '8px',
      color: '#16a34a',
      marginBottom: '24px'
    },
    closeButton: {
      marginLeft: 'auto',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '4px'
    }
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },

  statCard: {
    backgroundColor: theme.cardBackground,
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  statIcon: {
    padding: '12px',
    backgroundColor: theme.primary + '20',
    borderRadius: '8px',
    color: theme.primary
  },

  statContent: {
    flex: 1
  },

  statNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: theme.textPrimary
  },

  statLabel: {
    fontSize: '14px',
    color: theme.textSecondary,
    margin: 0
  },

  tabsContainer: {
    marginBottom: '24px'
  },

  tabs: {
    display: 'flex',
    borderBottom: `2px solid ${theme.border}`
  },

  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: theme.textSecondary,
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },

  activeTab: {
    color: theme.primary,
    // Evitar mistura de shorthand/non-shorthand. Use borderBottom completo.
    borderBottom: `2px solid ${theme.primary}`
  },

  tabContent: {
    backgroundColor: theme.cardBackground,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    padding: '24px'
  },

  mediaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px'
  },

  mediaCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  mediaThumb: {
    width: '100%',
    height: '120px',
    borderRadius: '8px',
    border: `1px solid ${theme.border}`,
    overflow: 'hidden',
    cursor: 'pointer'
  },

  mediaInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px'
  },

  mediaTitle: {
    fontSize: '14px',
    color: theme.textPrimary,
    wordBreak: 'break-word',
    whiteSpace: 'normal'
  },

  mediaActions: {
    display: 'flex',
    gap: '6px'
  },

  lightbox: {
    backgroundColor: theme.cardBackground,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    maxWidth: '900px',
    width: '900px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },

  lightboxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: `1px solid ${theme.border}`
  },

  lightboxBody: {
    padding: '16px',
    overflowY: 'auto'
  },

  lightboxFooter: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    borderTop: `1px solid ${theme.border}`
  },

  controls: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },

  searchContainer: {
    position: 'relative',
    flex: 1,
    minWidth: '300px'
  },

  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: theme.textSecondary
  },

  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 44px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: theme.background,
    color: theme.textPrimary
  },

  filterContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },

  filterIcon: {
    color: theme.textSecondary
  },

  filterSelect: {
    padding: '12px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: theme.background,
    color: theme.textPrimary,
    minWidth: '150px'
  },

  usersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  userCard: {
    backgroundColor: theme.background,
    border: `1px solid ${theme.border}`,
    borderRadius: '12px',
    overflow: 'hidden'
  },

  userCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px'
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  userAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: theme.primary + '20',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.primary,
    overflow: 'hidden'
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },

  userDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },

  userName: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: theme.textPrimary
  },

  userEmail: {
    fontSize: '14px',
    color: theme.textPrimarySecondary,
    margin: 0
  },

  userBadges: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px'
  },

  badge: {
    admin: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#fbbf24',
      color: '#92400e'
    },
    blocked: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#fca5a5',
      color: '#dc2626'
    },
    active: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: '#bbf7d0',
      color: '#16a34a'
    }
  },

  userActions: {
    display: 'flex',
    gap: '8px'
  },

  actionButton: {
    padding: '8px',
    border: `1px solid ${theme.border}`,
    borderRadius: '6px',
    backgroundColor: theme.cardBackground,
    color: theme.textPrimarySecondary,
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  userDetailsExpanded: {
    borderTop: `1px solid ${theme.border}`,
    padding: '20px',
    backgroundColor: theme.cardBackground
  },

  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },

  detailsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  detailsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: 0,
    color: theme.textPrimary,
    marginBottom: '8px'
  },

  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: theme.background,
    borderRadius: '6px',
    fontSize: '14px'
  },

  settingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  sectionTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: 0,
    color: theme.textPrimary
  },

  configGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px'
  },

  configSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  configTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    color: theme.textPrimary,
    marginBottom: '8px'
  },

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },

  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: theme.textPrimary
  },

  input: {
    padding: '12px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: theme.background,
    color: theme.textPrimary
  },

  select: {
    padding: '12px',
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: theme.background,
    color: theme.textPrimary
  },

  configActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },

  financialContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },

  financialGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },

  financialCard: {
    backgroundColor: theme.background,
    padding: '24px',
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },

  financialIcon: {
    padding: '12px',
    backgroundColor: theme.primary + '20',
    borderRadius: '8px',
    color: theme.primary
  },

  financialContent: {
    flex: 1
  },

  financialNumber: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: theme.textPrimary
  },

  financialLabel: {
    fontSize: '14px',
    color: theme.textPrimarySecondary,
    margin: 0
  },

  financialActions: {
    display: 'flex',
    gap: '12px'
  },

  primaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: theme.primary,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  secondaryButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: theme.textPrimarySecondary,
    border: `1px solid ${theme.border}`,
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  warningButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  dangerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modal: {
    backgroundColor: theme.cardBackground,
    borderRadius: '12px',
    border: `1px solid ${theme.border}`,
    maxWidth: '1200px',
    width: '1200px',
    height: '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },

  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: `1px solid ${theme.border}`
  },

  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
    color: theme.textPrimary
  },

  modalCloseButton: {
    padding: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: theme.textPrimarySecondary,
    borderRadius: '4px'
  },

  modalBody: {
    padding: '20px',
    flex: 1,
    overflowY: 'auto'
  },

  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px',
    borderTop: `1px solid ${theme.border}`
  },

  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },

  checkboxGroup: {
    display: 'flex',
    gap: '20px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: theme.textPrimary,
    cursor: 'pointer'
  },

  checkbox: {
    width: '16px',
    height: '16px'
  },

  deleteConfirmation: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    textAlign: 'center'
  },

  deleteIcon: {
    color: '#dc2626'
  },

  deleteMessage: {
    fontSize: '16px',
    color: theme.textPrimary,
    margin: 0
  },

  deleteWarning: {
    fontSize: '14px',
    color: theme.textPrimarySecondary,
    margin: 0
  }
});

export default Admin;
