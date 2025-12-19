import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Filter, Edit, Trash2, Eye, Plus, X, Check, AlertCircle, User, Target, Calendar } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const Clients = () => {
  const { currentTheme } = useTheme();
  
  // Obter estilos com o tema atual
  const styles = getStyles(currentTheme);

  // Estados do componente
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedClient, setSelectedClient] = useState(null);
  const [deleteClientData, setDeleteClientData] = useState({ id: null, name: '' });
  const [activeViewTab, setActiveViewTab] = useState('info'); // Nova aba ativa para o modal de visualização
  const [clientCampaigns, setClientCampaigns] = useState([]); // Campanhas do cliente
  const [loadingCampaigns, setLoadingCampaigns] = useState(false); // Loading das campanhas
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    cpfCnpj: '',
    email: '',
    phone: '',
    cellphone: '',
    password: '',
    street: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    zip: '',
    zone: '',
    type: 'PF' // PF ou PJ
  });

  // Estados das estatísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    new: 0
  });

  // Carregar clientes ao montar o componente
  useEffect(() => {
    loadClients();
  }, []);

  // Atualizar estatísticas quando clientes mudarem
  useEffect(() => {
    updateStats();
  }, [clients]);

  // Função para carregar clientes
  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.getClients();
      console.log('Resposta da API:', response);
      
      if (response && response.data && Array.isArray(response.data)) {
        setClients(response.data);
      } else if (response && Array.isArray(response)) {
        setClients(response);
      } else {
        console.warn('Formato de resposta inesperado:', response);
        setClients([]);
      }
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      
      // Melhor tratamento de erro
      if (error.response) {
        // Erro de resposta do servidor
        const status = error.response.status;
        if (status === 404) {
          setError('Endpoint de clientes não encontrado. Verifique a configuração da API.');
        } else if (status === 401) {
          setError('Não autorizado. Faça login novamente.');
        } else if (status === 500) {
          setError('Erro interno do servidor. Tente novamente mais tarde.');
        } else {
          setError(`Erro do servidor: ${status}`);
        }
      } else if (error.request) {
        // Erro de rede
        setError('Erro de conexão. Verifique sua internet e se o servidor está rodando.');
      } else {
        // Outros erros
        setError(`Erro: ${error.message}`);
      }
      
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar estatísticas
  const updateStats = () => {
    const total = clients.length;
    const active = clients.filter(client => client.active).length;
    
    // Novos clientes (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newClients = clients.filter(client => 
      new Date(client.createdAt) >= sevenDaysAgo
    ).length;

    setStats({ total, active, new: newClients });
  };

  // Função para filtrar clientes
  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.cpfCnpj.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || 
                         (filterStatus === 'active' && client.active) ||
                         (filterStatus === 'inactive' && !client.active);

    return matchesSearch && matchesFilter;
  });

  // Função para buscar CEP
  const fetchAddressByCep = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          street: data.logradouro || '',
          city: data.localidade || '',
          zone: data.bairro || '',
          state: data.uf || ''
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    }
  };

  // Função para formatar telefone fixo (99) 9999-9999
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 10);
  };

  // Função para formatar celular (99) 99999-9999
  const formatCellphone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return numbers.slice(0, 11);
  };

  // Função para formatar CEP
  const formatCep = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length === 8) {
      return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return numbers.slice(0, 8);
  };

  // Função para buscar campanhas do cliente
  const fetchClientCampaigns = async (clientId) => {
    setLoadingCampaigns(true);
    try {
      const response = await fetch(`${window.APP_CONFIG?.API_BASE_URL || 'http://10.0.10.17:4000'}/private/campaigns/client/${clientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('vixplay_token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const campaigns = await response.json();
        setClientCampaigns(campaigns);
      } else {
        console.error('Erro ao carregar campanhas:', response.statusText);
        setClientCampaigns([]);
      }
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
      setClientCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Função para abrir modal
  const openModal = (mode, client = null) => {
    setModalMode(mode);
    setSelectedClient(client);
    setActiveViewTab('info'); // Reset para aba de informações
    
    if (mode === 'view' && client) {
      // Buscar campanhas quando abrir modal de visualização
      fetchClientCampaigns(client.id);
    }
    
    if (mode === 'add') {
      setFormData({
        name: '',
        cpfCnpj: '',
        email: '',
        phone: '',
        cellphone: '',
        password: '',
        street: '',
        number: '',
        complement: '',
        city: '',
        state: '',
        zip: '',
        zone: '',
        type: 'PF'
      });
    } else if (client) {
      setFormData({
        name: client.name || '',
        cpfCnpj: client.cpfCnpj || '',
        email: client.email || '',
        phone: client.phone || '',
        cellphone: client.cellphone || '',
        password: '',
        street: client.street || '',
        number: client.number || '',
        complement: client.complement || '',
        city: client.city || '',
        state: client.state || '',
        zip: client.zip || '',
        zone: client.zone || '',
        type: client.type || 'PF'
      });
    }
    
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  // Função para fechar modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedClient(null);
    setError('');
    setSuccess('');
  };

  // Função para lidar com mudanças no formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    let formattedValue = value;

    // Aplicar formatações específicas
    if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'cellphone') {
      formattedValue = formatCellphone(value);
    } else if (name === 'zip') {
      formattedValue = formatCep(value);
      // Buscar endereço quando CEP estiver completo
      if (formattedValue.replace(/\D/g, '').length === 8) {
        fetchAddressByCep(formattedValue);
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : formattedValue
    }));
  };

  // Função para salvar cliente
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const clientData = {
        name: formData.name,
        cpfCnpj: formData.cpfCnpj,
        email: formData.email,
        phone: formData.phone,
        cellphone: formData.cellphone,
        password: formData.password,
        street: formData.street,
        number: formData.number,
        complement: formData.complement,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        zone: formData.zone,
        type: formData.type,
        active: true // Sempre ativo por padrão
      };

      if (modalMode === 'edit' && !clientData.password) {
        delete clientData.password;
      }

      if (modalMode === 'add') {
        await apiService.createClient(clientData);
        setSuccess('Cliente adicionado com sucesso!');
      } else if (modalMode === 'edit') {
        await apiService.updateClient(selectedClient.id, clientData);
        setSuccess('Cliente atualizado com sucesso!');
      }

      await loadClients();
      
      setTimeout(() => {
        closeModal();
      }, 1500);

    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      
      if (error.response) {
        const status = error.response.status;
        if (status === 400) {
          setError('Dados inválidos. Verifique os campos preenchidos.');
        } else if (status === 401) {
          setError('Não autorizado. Faça login novamente.');
        } else if (status === 409) {
          setError('Cliente já existe com este CPF/CNPJ ou email.');
        } else {
          setError(`Erro do servidor: ${status}`);
        }
      } else {
        setError('Erro ao salvar cliente. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para abrir modal de exclusão
  const openDeleteModal = (client) => {
    setDeleteClientData({ id: client.id, name: client.name });
    setShowDeleteModal(true);
  };

  // Função para fechar modal de exclusão
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteClientData({ id: null, name: '' });
  };

  // Função para deletar cliente
  const handleDelete = async () => {
    if (!deleteClientData.id) return;

    try {
      await apiService.deleteClient(deleteClientData.id);
      setSuccess('Cliente excluído com sucesso!');
      loadClients();
      closeDeleteModal();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      console.error('Detalhes do erro:', error.response?.data);
      console.error('Status do erro:', error.response?.status);
      
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Erro desconhecido';
        
        if (status === 404) {
          setError('Cliente não encontrado.');
        } else if (status === 401) {
          setError('Não autorizado. Faça login novamente.');
        } else if (status === 500) {
          setError(`Erro interno do servidor: ${errorMessage}`);
        } else {
          setError(`Erro do servidor (${status}): ${errorMessage}`);
        }
      } else if (error.request) {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        setError('Erro ao excluir cliente. Tente novamente.');
      }
      closeDeleteModal();
    }
  };

  // Função para formatar CPF/CNPJ
  const formatCpfCnpj = (value) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  return (
    <div style={styles.container}>
      {/* Cabeçalho */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Users size={32} style={styles.titleIcon} />
            Clientes
          </h1>
          <p style={styles.subtitle}>Gerencie seus clientes</p>
        </div>
        
        <div style={styles.headerActions}>
          <div style={styles.searchContainer}>
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all" style={{ backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary }}>Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
          
          <button
            onClick={() => openModal('add')}
            style={styles.addButton}
          >
            <UserPlus size={20} />
            Adicionar Cliente
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div style={{...styles.alert, ...styles.alertError}}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}
      
      {success && (
        <div style={{...styles.alert, ...styles.alertSuccess}}>
          <Check size={20} />
          {success}
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div style={styles.statsGrid}>
        <div style={{...styles.statsCard, borderLeft: `4px solid ${currentTheme.primary || '#3b82f6'}`}}>
          <div style={styles.statsIcon}>
            <Users size={24} />
          </div>
          <div>
            <p style={styles.statsLabel}>Total de Clientes</p>
            <p style={styles.statsValue}>{stats.total}</p>
          </div>
        </div>
        
        <div style={{...styles.statsCard, borderLeft: `4px solid ${currentTheme.success || '#10b981'}`}}>
          <div style={{...styles.statsIcon, backgroundColor: `${currentTheme.success || '#10b981'}20`, color: currentTheme.success || '#10b981'}}>
            <Users size={24} />
          </div>
          <div>
            <p style={styles.statsLabel}>Clientes Ativos</p>
            <p style={styles.statsValue}>{stats.active}</p>
          </div>
        </div>
        
        <div style={{...styles.statsCard, borderLeft: `4px solid ${currentTheme.warning || '#f59e0b'}`}}>
          <div style={{...styles.statsIcon, backgroundColor: `${currentTheme.warning || '#f59e0b'}20`, color: currentTheme.warning || '#f59e0b'}}>
            <UserPlus size={24} />
          </div>
          <div>
            <p style={styles.statsLabel}>Novos Clientes</p>
            <p style={styles.statsValue}>{stats.new}</p>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <h2 style={styles.tableTitle}>Lista de Clientes</h2>
        </div>
        
        <div style={styles.tableContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p>Carregando clientes...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={styles.emptyState}>
              <Users size={48} style={styles.emptyIcon} />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>CPF/CNPJ</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Telefone</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
  key={client.id}
  style={styles.tr}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.borderLight || `${currentTheme.border}20`}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
>
                    <td style={styles.td}>{client.name || ''}</td>
                    <td style={styles.td}>{formatCpfCnpj(client.cpfCnpj)}</td>
                    <td style={styles.td}>{client.email || ''}</td>
                    <td style={styles.td}>{formatPhone(client.phone)}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.status,
                        ...(client.active ? styles.statusActive : styles.statusInactive)
                      }}>
                        {client.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => openModal('view', client)}
                          style={{...styles.actionButton, ...styles.viewButton}}
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openModal('edit', client)}
                          style={{...styles.actionButton, ...styles.editButton}}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(client)}
                          style={{...styles.actionButton, ...styles.deleteButton}}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {modalMode === 'add' && <><UserPlus size={24} /> Adicionar Cliente</>}
                {modalMode === 'edit' && <><Edit size={24} /> Editar Cliente</>}
                {modalMode === 'view' && <><Eye size={24} /> Visualizar Cliente</>}
              </h2>
              <button onClick={closeModal} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              {modalMode === 'view' ? (
                <div>
                  {/* Abas de navegação */}
                  <div style={styles.tabNavigation}>
                    <button
                      type="button"
                      onClick={() => setActiveViewTab('info')}
                      style={{
                        ...styles.tabButton,
                        ...(activeViewTab === 'info' ? styles.tabButtonActive : {})
                      }}
                    >
                      <User size={16} style={{ marginRight: '8px' }} />
                      Informações
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveViewTab('campaigns')}
                      style={{
                        ...styles.tabButton,
                        ...(activeViewTab === 'campaigns' ? styles.tabButtonActive : {})
                      }}
                    >
                      <Target size={16} style={{ marginRight: '8px' }} />
                      Campanhas
                    </button>
                  </div>

                  {/* Conteúdo das abas */}
                  {activeViewTab === 'info' && (
                    <div style={styles.viewContainer}>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>Nome:</label>
                        <span style={styles.viewValue}>{selectedClient?.name}</span>
                      </div>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>CPF/CNPJ:</label>
                        <span style={styles.viewValue}>{formatCpfCnpj(selectedClient?.cpfCnpj || '')}</span>
                      </div>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>Email:</label>
                        <span style={styles.viewValue}>{selectedClient?.email}</span>
                      </div>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>Telefone:</label>
                        <span style={styles.viewValue}>{formatPhone(selectedClient?.phone || '')}</span>
                      </div>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>Endereço:</label>
                        <span style={styles.viewValue}>{selectedClient?.address}</span>
                      </div>
                      <div style={styles.viewField}>
                        <label style={styles.viewLabel}>Status:</label>
                        <span style={{
                          ...styles.status,
                          ...(selectedClient?.active ? styles.statusActive : styles.statusInactive)
                        }}>
                          {selectedClient?.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  )}

                  {activeViewTab === 'campaigns' && (
                    <div style={styles.campaignsContainer}>
                      {loadingCampaigns ? (
                        <div style={styles.loadingContainer}>
                          <div style={styles.spinner}></div>
                          <p style={styles.loadingText}>Carregando campanhas...</p>
                        </div>
                      ) : clientCampaigns.length === 0 ? (
                        <div style={styles.emptyState}>
                          <Target size={48} style={styles.emptyIcon} />
                          <p style={styles.emptyText}>Nenhuma campanha encontrada para este cliente.</p>
                        </div>
                      ) : (
                        <div style={styles.campaignsGrid}>
                          {clientCampaigns.map(campaign => (
                            <div key={campaign.id} style={styles.campaignCard}>
                              <div style={styles.campaignHeader}>
                                <h6 style={styles.campaignTitle}>{campaign.name}</h6>
                                <span style={{
                                  ...styles.campaignStatus,
                                  ...(campaign.active ? styles.campaignStatusActive : styles.campaignStatusInactive)
                                }}>
                                  {campaign.active ? 'Ativa' : 'Inativa'}
                                </span>
                              </div>
                              <p style={styles.campaignDescription}>
                                {campaign.description || 'Sem descrição'}
                              </p>
                              <div style={styles.campaignDates}>
                                <Calendar size={14} style={{ marginRight: '6px' }} />
                                {new Date(campaign.startDate).toLocaleDateString('pt-BR')} - {new Date(campaign.endDate).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={styles.form}>
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Nome *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Digite o nome do cliente"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>CPF/CNPJ *</label>
                      <input
                        type="text"
                        name="cpfCnpj"
                        value={formData.cpfCnpj}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Digite o CPF ou CNPJ"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Digite o email"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Tipo *</label>
                      <select
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                      >
                        <option value="PF">Pessoa Física (PF)</option>
                        <option value="PJ">Pessoa Jurídica (PJ)</option>
                      </select>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Telefone Fixo</label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="(99) 9999-9999"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Celular *</label>
                      <input
                        type="text"
                        name="cellphone"
                        value={formData.cellphone}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="(99) 99999-9999"
                      />
                    </div>
                  </div>
                  
                  <div style={styles.formGrid}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>CEP *</label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="00000-000"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Rua *</label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Preenchido automaticamente"
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Número *</label>
                      <input
                        type="text"
                        name="number"
                        value={formData.number}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Digite o número"
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Complemento</label>
                      <input
                        type="text"
                        name="complement"
                        value={formData.complement}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Apartamento, bloco, etc."
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Bairro *</label>
                      <input
                        type="text"
                        name="zone"
                        value={formData.zone}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Preenchido automaticamente"
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Cidade *</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Preenchido automaticamente"
                        readOnly
                      />
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Estado *</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Preenchido automaticamente"
                        readOnly
                      />
                    </div>
                  </div>
                  
                  {modalMode === 'add' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Senha *</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        style={styles.input}
                        placeholder="Digite a senha"
                      />
                    </div>
                  )}
                  
                  {modalMode === 'edit' && (
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Nova Senha (deixe em branco para manter)</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Digite a nova senha"
                      />
                    </div>
                  )}
                  
                  <div style={styles.modalFooter}>
                    <button
                      type="button"
                      onClick={closeModal}
                      style={styles.cancelButton}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        ...styles.submitButton,
                        ...(isSubmitting ? styles.submitButtonDisabled : {})
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <div style={styles.buttonSpinner}></div>
                          {modalMode === 'add' ? 'Criando...' : 'Salvando...'}
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          {modalMode === 'add' ? 'Criar Cliente' : 'Salvar Alterações'}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão Bootstrap */}
      {showDeleteModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.bootstrapModal}>
            <div style={styles.bootstrapModalHeader}>
              <h5 style={styles.bootstrapModalTitle}>
                <Trash2 size={20} style={{ marginRight: '8px' }} />
                Excluir Cliente
              </h5>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={styles.bootstrapCloseButton}
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.bootstrapModalBody}>
              <p>Tem certeza que deseja excluir o cliente <strong>{deleteClientData.name}</strong>?</p>
              <p style={styles.warningText}>Esta ação não pode ser desfeita.</p>
            </div>
            <div style={styles.bootstrapModalFooter}>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={styles.bootstrapCancelButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                style={styles.bootstrapDeleteButton}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos CSS-in-JS
const getStyles = (currentTheme) => ({
  container: {
    padding: '24px',
    backgroundColor: currentTheme.background || '#f8fafc',
    minHeight: '100vh',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: currentTheme.text || '#1e293b',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  titleIcon: {
    color: currentTheme.primary || '#3b82f6'
  },
  
  subtitle: {
    fontSize: '16px',
    color: currentTheme.textSecondary || '#64748b',
    margin: 0
  },
  
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#64748b',
    zIndex: 1
  },
  
  searchInput: {
    padding: '12px 12px 12px 44px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    width: '300px',
    outline: 'none',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  
  filterSelect: {
    padding: '12px 16px',
    border: `1px solid ${currentTheme.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: currentTheme.cardBackground,
    color: currentTheme.textPrimary,
    cursor: 'pointer',
    outline: 'none'
  },
  
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    fontWeight: '500'
  },
  
  alertError: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca'
  },
  
  alertSuccess: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0'
  },
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  
  statsCard: {
    padding: '1.5rem',
    backgroundColor: currentTheme.cardBackground,
    borderRadius: '0.75rem',
    border: `1px solid ${currentTheme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s'
  },
  
  statsIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  statsValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: currentTheme.primary,
    margin: '0.25rem 0 0 0'
  },
  
  statsLabel: {
    margin: 0,
    fontSize: '0.875rem',
    color: currentTheme.textSecondary,
    fontWeight: '500'
  },
  
  tableCard: {
    backgroundColor: currentTheme.cardBackground,
    borderRadius: '0.75rem',
    border: `1px solid ${currentTheme.border}`,
    overflow: 'hidden'
  },
  
  tableHeader: {
    padding: '1.5rem',
    borderBottom: `1px solid ${currentTheme.border}`
  },
  
  tableTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: currentTheme.textPrimary,
    margin: 0
  },
  
  tableContainer: {
    overflowX: 'auto'
  },
  
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: currentTheme.textPrimary,
    backgroundColor: currentTheme.headerBackground || currentTheme.border,
    borderBottom: `1px solid ${currentTheme.border}`
  },
  
  tr: {
    transition: 'background-color 0.2s',
    userSelect: 'none'
  },
  
  td: {
    padding: '1rem',
    fontSize: '0.875rem',
    color: currentTheme.textPrimary,
    borderBottom: `1px solid ${currentTheme.border}`
  },
  
  status: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500'
  },
  
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  
  statusInactive: {
    backgroundColor: '#fef2f2',
    color: '#dc2626'
  },
  
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  
  actionButton: {
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  viewButton: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    ':hover': {
      backgroundColor: '#e5e7eb'
    }
  },
  
  editButton: {
    backgroundColor: '#dbeafe',
    color: '#3b82f6',
    ':hover': {
      backgroundColor: '#bfdbfe'
    }
  },
  
  deleteButton: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    ':hover': {
      backgroundColor: '#fecaca'
    }
  },
  
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px',
    color: '#64748b'
  },
  
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #f3f4f6',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px'
  },
  
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px',
    color: '#64748b'
  },
  
  emptyIcon: {
    marginBottom: '16px',
    opacity: 0.5
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
    zIndex: 1000,
    padding: '20px'
  },
  
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #e2e8f0'
  },
  
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  
  closeButton: {
    padding: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    borderRadius: '6px',
    color: '#64748b',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f1f5f9'
    }
  },
  
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },
  
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151'
  },
  
  input: {
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: '#3b82f6',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    }
  },
  
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer'
  },
  
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  
  viewContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  
  viewField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  
  viewLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#6b7280'
  },
  
  viewValue: {
    fontSize: '16px',
    color: '#1f2937'
  },
  
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0'
  },
  
  cancelButton: {
    padding: '12px 24px',
    border: '1px solid #d1d5db',
    backgroundColor: 'white',
    color: '#374151',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#f9fafb'
    }
  },
  
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#2563eb'
    }
  },
  
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: '#9ca3af'
    }
  },
  
  buttonSpinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },

  // Estilos do Modal Bootstrap
  bootstrapModal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    overflow: 'hidden'
  },

  bootstrapModalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  bootstrapModalTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#dc3545',
    margin: 0,
    display: 'flex',
    alignItems: 'center'
  },

  bootstrapCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#6c757d',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#e9ecef'
    }
  },

  bootstrapModalBody: {
    padding: '20px',
    fontSize: '14px',
    lineHeight: '1.5'
  },

  warningText: {
    color: '#dc3545',
    fontSize: '13px',
    marginTop: '8px',
    marginBottom: 0
  },

  bootstrapModalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  bootstrapCancelButton: {
    padding: '8px 16px',
    border: '1px solid #6c757d',
    backgroundColor: 'transparent',
    color: '#6c757d',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#6c757d',
      color: 'white'
    }
  },

  bootstrapDeleteButton: {
    padding: '8px 16px',
    border: '1px solid #dc3545',
    backgroundColor: '#dc3545',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    ':hover': {
      backgroundColor: '#c82333',
      borderColor: '#bd2130'
    }
  },

  // Estilos das abas do modal de visualização
  tabNavigation: {
    display: 'flex',
    borderBottom: '1px solid #dee2e6',
    marginBottom: '20px'
  },

  tabButton: {
    padding: '12px 16px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#6c757d',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
    ':hover': {
      color: '#495057',
      backgroundColor: '#f8f9fa'
    }
  },

  tabButtonActive: {
    color: '#007bff',
    borderBottomColor: '#007bff',
    backgroundColor: '#f8f9fa'
  },

  // Estilos da seção de campanhas
  campaignsContainer: {
    minHeight: '200px'
  },

  campaignsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px'
  },

  campaignCard: {
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    transition: 'all 0.2s',
    ':hover': {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
  },

  campaignHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px'
  },

  campaignTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#212529',
    margin: 0,
    flex: 1
  },

  campaignStatus: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    textTransform: 'uppercase'
  },

  campaignStatusActive: {
    backgroundColor: '#d4edda',
    color: '#155724'
  },

  campaignStatusInactive: {
    backgroundColor: '#f8d7da',
    color: '#721c24'
  },

  campaignDescription: {
    fontSize: '14px',
    color: '#6c757d',
    marginBottom: '12px',
    lineHeight: '1.4'
  },

  campaignDates: {
    fontSize: '13px',
    color: '#495057',
    display: 'flex',
    alignItems: 'center'
  },

  loadingText: {
    color: '#6c757d',
    fontSize: '14px',
    textAlign: 'center',
    margin: 0
  },

  emptyText: {
    color: '#6c757d',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '12px'
  }
});

// Adicionar animação CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default Clients;
