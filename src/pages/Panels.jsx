import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const Panels = () => {
  const { currentTheme } = useTheme();
  const styles = getStyles(currentTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [panelMedias, setPanelMedias] = useState([]);
  const [loadingMedias, setLoadingMedias] = useState(false);

  // Estados para o modal de novo painel
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState(null);
  const [deletingPanel, setDeletingPanel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true,
    type: 'FULL_SCREEN'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPanels();
  }, []);

  // Abrir modal de criar painel automaticamente quando vier com parâmetro/estado
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const shouldOpen = params.get('add') === '1' || params.get('novo') === '1' || params.get('create') === '1';
      const openState = !!(location.state && (location.state.openAdd || location.state.add || location.state.create));
      if (shouldOpen || openState) {
        setShowCreateModal(true);
        if (openState) {
          navigate(location.pathname + location.search, { replace: true, state: {} });
        }
      }
    } catch { }
  }, [location, navigate]);

  const fetchPanels = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await apiService.getPanels();
      const paineis = response.data;

      // Garantir que paineis é um array
      const paineisList = Array.isArray(paineis) ? paineis : (paineis?.data ? paineis.data : []);
      setPanels(paineisList);
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
      setError(`Erro ao carregar painéis: ${err.message}`);
      setPanels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPanel = async (panel) => {
    setSelectedPanel(panel);
    setShowMediaModal(true);
    setLoadingMedias(true);
    setError('');

    try {
      // Chamada real da API para buscar mídias do painel
      const response = await apiService.getPanelMedias(panel.id);
      setPanelMedias(response.data || []);
    } catch (err) {
      console.error('Erro ao buscar mídias do painel:', err);
      setError('Erro ao carregar mídias do painel. Tente novamente.');
      setPanelMedias([]);
    } finally {
      setLoadingMedias(false);
    }
  };

  // Função para editar mídia
  const handleEditMedia = async (media) => {
    const newName = prompt('Digite o novo nome da mídia:', media.name);

    if (newName && newName.trim() !== '' && newName !== media.name) {
      try {
        const updatedData = {
          ...media,
          name: newName.trim()
        };

        // Chamada real da API para atualizar mídia do painel
        await apiService.updatePanelMedia(selectedPanel.id, media.id, updatedData);

        // Atualiza a lista local após sucesso
        setPanelMedias(prevMedias =>
          prevMedias.map(m =>
            m.id === media.id ? { ...m, name: newName.trim() } : m
          )
        );

        console.log('Mídia atualizada com sucesso:', updatedData);
      } catch (err) {
        console.error('Erro ao atualizar mídia:', err);
        setError('Erro ao atualizar mídia. Tente novamente.');
      }
    }
  };

  // Função para excluir mídia
  const handleDeleteMedia = async (media) => {
    if (window.confirm(`Tem certeza que deseja excluir a mídia "${media.name}"?`)) {
      try {
        // Chamada real da API para excluir mídia do painel
        await apiService.deletePanelMedia(selectedPanel.id, media.id);

        // Remove da lista local após sucesso
        setPanelMedias(prevMedias => prevMedias.filter(m => m.id !== media.id));
        console.log('Mídia excluída com sucesso:', media);
      } catch (err) {
        console.error('Erro ao excluir mídia:', err);
        setError('Erro ao excluir mídia. Tente novamente.');
      }
    }
  };

  // Função para adicionar nova mídia
  const handleAddMedia = async () => {
    const mediaName = prompt('Digite o nome da nova mídia:');
    const mediaType = prompt('Digite o tipo da mídia (ex: video/mp4, image/jpeg):');

    if (mediaName && mediaName.trim() !== '' && mediaType && mediaType.trim() !== '') {
      try {
        const newMediaData = {
          name: mediaName.trim(),
          type: mediaType.trim(),
          url: '', // URL será definida após upload
          panelId: selectedPanel.id
        };

        // Chamada real da API para criar nova mídia no painel
        const response = await apiService.createPanelMedia(selectedPanel.id, newMediaData);

        // Adiciona à lista local após sucesso
        setPanelMedias(prevMedias => [...prevMedias, response.data]);

        console.log('Nova mídia criada com sucesso:', response.data);
      } catch (err) {
        console.error('Erro ao criar nova mídia:', err);
        setError('Erro ao criar nova mídia. Tente novamente.');
      }
    }
  };

  const handleCloseModal = () => {
    setShowMediaModal(false);
    setSelectedPanel(null);
    setPanelMedias([]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (active) => {
    return active ? '#10b981' : '#ef4444';
  };

  const getStatusText = (active) => {
    return active ? 'Ativo' : 'Inativo';
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: currentTheme.textPrimary,
        fontFamily: 'Poppins, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `4px solid ${currentTheme.border}`,
          borderTop: `4px solid ${currentTheme.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Carregando painéis...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  // Função para criar painel
  const handleCreatePanel = async () => {
    if (!formData.name.trim()) {
      setError('Nome do painel é obrigatório');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const token = localStorage.getItem('vixplay_token');

      const panelData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        active: true, // Sempre ativo por padrão
        showWeather: formData.showWeather,
        showNews: formData.showNews,
        showLottery: formData.showLottery,
        showCoins: formData.showCoins,
        weatherFrequency: formData.showWeather ? formData.weatherFrequency : null,
        newsFrequency: formData.showNews ? formData.newsFrequency : null,
        lotteryFrequency: formData.showLottery ? formData.lotteryFrequency : null,
        coinsFrequency: formData.showCoins ? formData.coinsFrequency : null
      };

      const response = await apiService.createPanel(panelData);

      if (response && response.status >= 200 && response.status < 300) {
        const painel = response.data;
        setShowCreateModal(false);
        resetForm();
        fetchPanels(); // Recarregar a lista
      } else {
        setError('Erro ao criar painel');
      }
    } catch (err) {
      console.error('Erro ao criar painel:', err);
      setError('Erro de conexão ao criar painel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      active: true,
      type: 'FULL_SCREEN',
      showWeather: false,
      weatherFrequency: 10,
      showNews: false,
      newsFrequency: 10,
      showLottery: false,
      lotteryFrequency: 10,
      showCoins: false,
      coinsFrequency: 10
    });
  };

  // Função para mudanças no formulário
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para selecionar tipo de painel
  const selectPanelType = (type) => {
    setFormData(prev => ({
      ...prev,
      type: type
    }));
  };

  // Função para abrir modal de edição
  const handleEditPanel = (panel) => {
    setEditingPanel(panel);
    setFormData({
      name: panel.name || '',
      description: panel.description || '',
      active: panel.active !== undefined ? panel.active : true,
      type: panel.type || 'FULL_SCREEN',
      showWeather: panel.showWeather || false,
      weatherFrequency: panel.weatherFrequency || 10,
      showNews: panel.showNews || false,
      newsFrequency: panel.newsFrequency || 10,
      showLottery: panel.showLottery || false,
      lotteryFrequency: panel.lotteryFrequency || 10,
      showCoins: panel.showCoins || false,
      coinsFrequency: panel.coinsFrequency || 10,
      showCustomScreen: panel.showCustomScreen || false,
      customScreenFrequency: panel.customScreenFrequency || 2,
      customScreenContent: panel.customScreenContent || ''
    });
    setShowEditModal(true);
  };

  // Função para salvar edição
  const handleUpdatePanel = async () => {
    if (!formData.name.trim()) {
      setError('Nome do painel é obrigatório');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const token = localStorage.getItem('vixplay_token');

      const panelData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        active: true, // Sempre ativo por padrão
        showWeather: formData.showWeather,
        showNews: formData.showNews,
        showLottery: formData.showLottery,
        showCoins: formData.showCoins,
        weatherFrequency: formData.showWeather ? formData.weatherFrequency : null,
        newsFrequency: formData.showNews ? formData.newsFrequency : null,
        lotteryFrequency: formData.showLottery ? formData.lotteryFrequency : null,
        coinsFrequency: formData.showCoins ? formData.coinsFrequency : null
      };

      const response = await apiService.updatePanel(editingPanel.id, panelData);

      if (response && response.status >= 200 && response.status < 300) {
        setShowEditModal(false);
        resetForm();
        setEditingPanel(null);
        fetchPanels(); // Recarregar a lista
      } else {
        setError('Erro ao atualizar painel');
      }
    } catch (err) {
      console.error('Erro ao atualizar painel:', err);
      setError('Erro de conexão ao atualizar painel');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para abrir modal de exclusão
  const handleDeletePanel = (panel) => {
    setDeletingPanel(panel);
    setShowDeleteModal(true);
  };

  // Função para confirmar exclusão
  const handleConfirmDelete = async () => {
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('vixplay_token');

      const response = await apiService.deletePanel(deletingPanel.id);

      if (response && response.status >= 200 && response.status < 300) {
        setShowDeleteModal(false);
        setDeletingPanel(null);
        fetchPanels(); // Recarregar a lista
      } else {
        throw new Error('Erro ao excluir painel');
      }
    } catch (err) {
      console.error('Erro ao excluir painel:', err);
      setError('Erro ao excluir painel. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: currentTheme.background,
      minHeight: '100vh',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: currentTheme.textPrimary,
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            <i className="bi bi-pip" style={{ marginRight: '0.5rem' }}></i>
            Painéis
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            margin: 0,
            fontSize: '1rem'
          }}>
            Gerencie seus painéis de exibição. Esta é a playlist de cada dispositivo.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          <i className="bi bi-plus-lg"></i>
          Novo Painel
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="bi bi-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statsCard, borderLeft: `4px solid ${currentTheme.primary}` }}>
          <div style={{ ...styles.statsIcon, backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}>
            <i className="bi bi-grid-3x3"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Total de Painéis</p>
            <p style={styles.statsValue}>{panels.length}</p>
          </div>
        </div>

        <div style={{ ...styles.statsCard, borderLeft: '4px solid #10b981' }}>
          <div style={{ ...styles.statsIcon, backgroundColor: '#10b98120', color: '#10b981' }}>
            <i className="bi bi-check2-circle"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Painéis Ativos</p>
            <p style={styles.statsValue}>{panels.filter(panel => panel.active).length}</p>
          </div>
        </div>

        <div style={{ ...styles.statsCard, borderLeft: '4px solid #ef4444' }}>
          <div style={{ ...styles.statsIcon, backgroundColor: '#ef444420', color: '#ef4444' }}>
            <i className="bi bi-x-circle"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Painéis Inativos</p>
            <p style={styles.statsValue}>{panels.filter(panel => !panel.active).length}</p>
          </div>
        </div>
      </div>

      {/* Panels List */}
      {panels.length === 0 ? (
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '4rem',
            color: currentTheme.textSecondary,
            marginBottom: '1rem'
          }}>
            📺
          </div>
          <h3 style={{
            color: currentTheme.textPrimary,
            marginBottom: '0.5rem'
          }}>
            Nenhum painel encontrado
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            marginBottom: '1.5rem'
          }}>
            Crie seu primeiro painel para começar a exibir conteúdo
          </p>
          <button style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <i className="bi bi-plus-lg" style={{ marginRight: '0.5rem' }}></i>
            Criar Primeiro Painel
          </button>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Lista de Painéis</h2>
          </div>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 150px 180px 120px',
            gap: '1rem',
            padding: '1rem 1.5rem',
            backgroundColor: currentTheme.borderLight,
            borderBottom: `1px solid ${currentTheme.border}`,
            fontSize: '0.875rem',
            fontWeight: '600',
            color: currentTheme.textSecondary
          }}>
            <div>NOME</div>
            <div>STATUS</div>
            <div>TIPO</div>
            <div>CRIADO EM</div>
            <div>AÇÕES</div>
          </div>

          {/* Table Body */}
          {panels.map((panel, index) => (
            <div key={panel.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 150px 180px 120px',
              gap: '1rem',
              padding: '1rem 1.5rem',
              borderBottom: index < panels.length - 1 ? `1px solid ${currentTheme.border}` : 'none',
              transition: 'background-color 0.2s',
              cursor: 'pointer',
              userSelect: 'none'
            }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.borderLight}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div>
                <div style={{
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  marginBottom: '0.25rem'
                }}>
                  {panel.name}
                </div>
                {panel.description && (
                  <div style={{
                    fontSize: '0.875rem',
                    color: currentTheme.textSecondary
                  }}>
                    {panel.description}
                  </div>
                )}
              </div>

              <div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: panel.active ? '#dcfce7' : '#fef2f2',
                  color: getStatusColor(panel.active)
                }}>
                  {getStatusText(panel.active)}
                </span>
              </div>

              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem'
              }}>
                {panel.type === 'FULL_SCREEN' ? 'Tela Cheia' : panel.type}
              </div>

              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem'
              }}>
                {formatDate(panel.createdAt)}
              </div>

              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={() => navigate(`/panel/${panel.id}`)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textSecondary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#10b981';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }}
                  title="Abrir Painel"
                >
                  <i className="bi bi-folder2-open"></i>
                </button>

                <button
                  onClick={() => handleEditPanel(panel)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textSecondary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.primary;
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }}
                  title="Editar"
                >
                  <i className="bi bi-pencil"></i>
                </button>

                <button
                  onClick={() => handleDeletePanel(panel)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textSecondary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#ef4444';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }}
                  title="Excluir"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Mídias do Painel */}
      {showMediaModal && (
        <div style={{
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
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: currentTheme.textPrimary,
                  margin: 0,
                  marginBottom: '0.25rem'
                }}>
                  <i className="bi bi-folder-open" style={{ marginRight: '0.5rem' }}></i>
                  {selectedPanel?.name}
                </h2>
                <p style={{
                  color: currentTheme.textSecondary,
                  margin: 0,
                  fontSize: '0.875rem'
                }}>
                  Gerenciar mídias do painel
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={handleAddMedia}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.primary;
                  }}
                  title="Adicionar nova mídia"
                >
                  <i className="bi bi-plus-circle"></i>
                  Nova Mídia
                </button>
              </div>

              <button
                onClick={handleCloseModal}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.borderLight;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{
              padding: '1.5rem',
              maxHeight: 'calc(80vh - 120px)',
              overflowY: 'auto'
            }}>
              {loadingMedias ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '3rem',
                  color: currentTheme.textSecondary
                }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    border: `3px solid ${currentTheme.borderLight}`,
                    borderTop: `3px solid ${currentTheme.primary}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '1rem'
                  }}></div>
                  Carregando mídias...
                </div>
              ) : panelMedias.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: currentTheme.textSecondary
                }}>
                  <i className="bi bi-collection" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary }}>
                    Nenhuma mídia encontrada
                  </h3>
                  <p style={{ margin: 0 }}>
                    Este painel ainda não possui mídias associadas.
                  </p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {panelMedias.map((media, index) => (
                    <div key={media.id || index} style={{
                      backgroundColor: currentTheme.background,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <i className="bi bi-file-earmark-play" style={{
                          fontSize: '1.5rem',
                          color: currentTheme.primary,
                          marginRight: '0.75rem'
                        }}></i>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: currentTheme.textPrimary,
                            marginBottom: '0.25rem'
                          }}>
                            {media.name || 'Mídia sem nome'}
                          </h4>
                          <p style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            color: currentTheme.textSecondary
                          }}>
                            {media.type || 'Tipo não definido'}
                          </p>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'flex-end'
                      }}>
                        <button style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'transparent',
                          color: currentTheme.textSecondary,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = currentTheme.primary;
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = currentTheme.textSecondary;
                          }}
                          title="Editar mídia"
                          onClick={() => handleEditMedia(media)}
                        >
                          <i className="bi bi-pencil"></i>
                        </button>

                        <button style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: 'transparent',
                          color: currentTheme.textSecondary,
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#ef4444';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = currentTheme.textSecondary;
                          }}
                          title="Remover mídia"
                          onClick={() => handleDeleteMedia(media)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Painel (reutilizado) */}
      {(showCreateModal || showEditModal) && (
        <div style={{
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
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {showCreateModal ? (
                  <i className="bi bi-plus-circle"></i>
                ) : (
                  <i className="bi bi-pencil-square"></i>
                )}
                {showCreateModal ? 'Novo Painel' : 'Editar Painel'}
              </h2>
              <button
                onClick={() => {
                  if (showCreateModal) {
                    setShowCreateModal(false);
                  } else {
                    setShowEditModal(false);
                    setEditingPanel(null);
                  }
                  resetForm();
                  setError('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              {error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>
                  {error}
                </div>
              )}
              {/* Nome do Painel */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Nome do Painel *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={showCreateModal ? 'Ex: Painel Principal' : 'Digite o nome do painel'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground || currentTheme.background,
                    color: currentTheme.textPrimary,
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = currentTheme.border}
                />
              </div>

              {/* Descrição */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição opcional do painel"
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                  backgroundColor: currentTheme.inputBackground || currentTheme.background,
                  color: currentTheme.textPrimary,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  resize: 'vertical'
                }}
                onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
                onBlur={(e) => e.target.style.borderColor = currentTheme.border}
              />
              </div>

              {/* Tipo de Painel */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Tipo de Painel
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem'
                }}>
                  <div
                    onClick={() => selectPanelType('FULL_SCREEN')}
                    style={{
                      border: `2px solid ${formData.type === 'FULL_SCREEN' ? currentTheme.primary : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    backgroundColor: formData.type === 'FULL_SCREEN' ? `${currentTheme.primary}10` : (currentTheme.inputBackground || currentTheme.background)
                  }}
                  >
                    <i className="bi bi-tv" style={{
                      fontSize: '2rem',
                      color: formData.type === 'FULL_SCREEN' ? currentTheme.primary : currentTheme.textSecondary,
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}></i>
                    <h6 style={{
                      margin: 0,
                      marginBottom: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: formData.type === 'FULL_SCREEN' ? currentTheme.primary : currentTheme.textPrimary
                    }}>
                      Tela Cheia
                    </h6>
                    <small style={{
                      color: currentTheme.textSecondary,
                      fontSize: '0.75rem'
                    }}>
                      Conteúdo em tela completa
                    </small>
                  </div>

                  <div
                    onClick={() => selectPanelType('DIVIDED')}
                    style={{
                      border: `2px solid ${formData.type === 'DIVIDED' ? currentTheme.primary : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                    backgroundColor: formData.type === 'DIVIDED' ? `${currentTheme.primary}10` : (currentTheme.inputBackground || currentTheme.background)
                  }}
                  >
                    <i className="bi bi-layout-split" style={{
                      fontSize: '2rem',
                      color: formData.type === 'DIVIDED' ? currentTheme.primary : currentTheme.textSecondary,
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}></i>
                    <h6 style={{
                      margin: 0,
                      marginBottom: '0.25rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: formData.type === 'DIVIDED' ? currentTheme.primary : currentTheme.textPrimary
                    }}>
                      Dividida
                    </h6>
                    <small style={{
                      color: currentTheme.textSecondary,
                      fontSize: '0.75rem'
                    }}>
                      Conteúdo em seções
                    </small>
                  </div>
                </div>
              </div>

              {/* Configurações de Exibição */}
              <h6 style={{
                margin: 0,
                marginBottom: '1rem',
                fontSize: '1rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="bi bi-gear"></i>
                Configurações de Exibição
              </h6>


              <div style={{ marginBottom: '1rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>

                  <label htmlFor="showCoins" style={{
                    fontSize: '0.875rem',
                    color: currentTheme.textPrimary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>

                    Para formar sua playlist, após a criação desse Painel, vá em Mídias e associe suas mídias ao painel desejado.
                  </label>
                </div>
                {formData.showCoins && (
                  <div style={{ marginLeft: '1.5rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.25rem',
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary
                    }}>
                      Frequência (A cada quantas midias exibidas)
                    </label>
                    <input
                      type="number"
                      value={formData.coinsFrequency}
                      onChange={(e) => handleInputChange('coinsFrequency', parseInt(e.target.value) || 10)}
                      min="1"
                      style={{
                        width: '100px',
                        padding: '0.5rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `1px solid ${currentTheme.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  if (showCreateModal) {
                    setShowCreateModal(false);
                  } else {
                    setShowEditModal(false);
                    setEditingPanel(null);
                  }
                  resetForm();
                  setError('');
                }}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={showCreateModal ? handleCreatePanel : handleUpdatePanel}
                disabled={isSubmitting || !formData.name.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: isSubmitting || !formData.name.trim() ? currentTheme.textSecondary : currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSubmitting || !formData.name.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    {showCreateModal ? 'Criando...' : 'Salvando...'}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle"></i>
                    {showCreateModal ? 'Criar Painel' : 'Atualizar Painel'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Excluir Painel */}
      {showDeleteModal && (
        <div style={{
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
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className="bi bi-exclamation-triangle" style={{ color: '#ef4444' }}></i>
                Excluir Painel
              </h2>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                lineHeight: '1.5'
              }}>
                Tem certeza que deseja excluir o painel <strong style={{ color: currentTheme.textPrimary }}>"{deletingPanel?.name}"</strong>?
              </p>
              <p style={{
                margin: '0.75rem 0 0 0',
                fontSize: '0.75rem',
                color: '#ef4444',
                lineHeight: '1.4'
              }}>
                <strong>ATENÇÃO: Antes de excluir um painel, certifique-se de excluir as midias e o dispositivo associado a ele primeiro. </strong><br /><br />Esta ação não pode ser desfeita. Todas as configurações serão perdidas.
              </p>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `1px solid ${currentTheme.border}`,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem'
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingPanel(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash"></i>
                    Excluir Painel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos alinhados com a página Clients
const getStyles = (currentTheme) => ({
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
    justifyContent: 'center',
    fontSize: '22px'
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
  }
});

export default Panels;