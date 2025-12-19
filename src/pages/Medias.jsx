import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const Medias = () => {
  const { currentTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = localStorage.getItem('vixplay_user');
  const appUser = storedUser ? JSON.parse(storedUser) : null;
  const isAdmin = !!(appUser?.isAdmin || appUser?.role === 'ADMIN' || appUser?.role === 'admin' || appUser?.profile === 'admin');
  const [medias, setMedias] = useState([]);
  const [filteredMedias, setFilteredMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSource, setFilterSource] = useState('all'); // all, own, global
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, title, type
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [deletingMedia, setDeletingMedia] = useState(false);
  const [panels, setPanels] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState('');
  const [selectedPanels, setSelectedPanels] = useState([]);
  const [initialPanelIds, setInitialPanelIds] = useState([]);
  const [associating, setAssociating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    file: null,
    duration: 10,
    mediaGlobal: false
  });
  
  // Modo de envio: arquivo comum ou widget
  const [uploadMode, setUploadMode] = useState('FILE'); // 'FILE' | 'WIDGET'

  // Formulário de widget
  const [widgetForm, setWidgetForm] = useState({
    title: '',
    duration: 10,
    mediaGlobal: false,
    widgetType: 'WEATHER',
    widgetConfig: '{"rss":""}'
  });

  useEffect(() => {
    fetchMedias();
    fetchPanels();
  }, []);

  // Abrir modal de upload automaticamente quando vier com parâmetro/estado
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const shouldOpen = params.get('add') === '1' || params.get('upload') === '1' || params.get('novo') === '1';
      const openState = !!(location.state && (location.state.openAdd || location.state.add || location.state.upload));
      if (shouldOpen || openState) {
        setShowUploadModal(true);
        if (openState) {
          navigate(location.pathname + location.search, { replace: true, state: {} });
        }
      }
    } catch {}
  }, [location, navigate]);

  useEffect(() => {
    filterMedias();
  }, [medias, searchTerm, filterType, filterSource, sortBy]);

  const fetchMedias = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getMedias();
      setMedias(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar mídias:', err);
      setError('Erro ao carregar mídias. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para excluir mídia
  const handleDeleteMedia = (media, event) => {
    event.stopPropagation();
    setMediaToDelete(media);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deletingMedia) return;
    setShowDeleteModal(false);
    setMediaToDelete(null);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete?.id) return;
    try {
      setDeletingMedia(true);
      setError('');
      await apiService.deleteMedia(mediaToDelete.id);
      await fetchMedias();
      setShowDeleteModal(false);
      setMediaToDelete(null);
    } catch (err) {
      console.error('Erro ao excluir mídia:', err);
      setError('Erro ao excluir mídia. Tente novamente.');
    } finally {
      setDeletingMedia(false);
    }
  };

  // Utilitário: checar se a mídia está ativa
  const isMediaActive = (m) => {
    const v = m?.active;
    if (typeof v === 'boolean') return v; // true/false
    if (typeof v === 'number') return v === 1; // 1 => ativo, 0 => inativo
    if (typeof v === 'string') {
      const s = v.trim().toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
      if (s === '1') return true;
      if (s === '0') return false;
    }
    // Se não houver campo, considerar ativo por padrão
    return true;
  };

  // Função para ativar/desativar mídia
  const handleToggleMediaStatus = async (media, event) => {
    event.stopPropagation(); // Evita abrir o preview

    const action = !isMediaActive(media) ? 'ativar' : 'desativar';
    const confirmAction = window.confirm(
      `Tem certeza que deseja ${action} a mídia "${media.title || 'Sem título'}"?`
    );

    if (!confirmAction) return;

    try {
      setError('');
      
      if (!isMediaActive(media)) {
        // Reativar mídia - usando a função de reativar do painel
        await apiService.reactivatePanelMedia(media.id);
      } else {
        // Desativar mídia
        await apiService.deactivatePanelMedia(media.id);
      }
      
      // Recarregar lista de mídias
      await fetchMedias();
      
      // Mostrar mensagem de sucesso (opcional)
      console.log(`Mídia ${action}da com sucesso`);
    } catch (err) {
      console.error(`Erro ao ${action} mídia:`, err);
      setError(`Erro ao ${action} mídia. Tente novamente.`);
    }
  };

  // Botão pequeno para reativar mídia (como no painel)
  const handleReactivateMedia = async (media, event) => {
    event?.stopPropagation?.();
    const confirmAction = window.confirm(
      `Tem certeza que deseja ativar a mídia "${media.title || 'Sem título'}"?`
    );
    if (!confirmAction) return;
    try {
      setError('');
      await apiService.reactivatePanelMedia(media.id);
      await fetchMedias();
      console.log('Mídia reativada com sucesso');
    } catch (err) {
      console.error('Erro ao reativar mídia:', err);
      setError('Erro ao reativar mídia. Tente novamente.');
    }
  };

  const fetchPanels = async () => {
    try {
      const response = await apiService.getPanels();
      setPanels(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
    }
  };

  const filterMedias = () => {
    let filtered = [...medias];

    // Filtro por termo de busca
    if (searchTerm) {
      filtered = filtered.filter(media => {
        const titleMatch = media.title?.toLowerCase().includes(searchTerm.toLowerCase());
        const panelMatch = media.panel?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const panelsMatch = media.panels?.some(panel => 
          panel.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return titleMatch || panelMatch || panelsMatch;
      });
    }

    // Filtro por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(media => {
        const type = media.type?.toLowerCase();
        switch (filterType) {
          case 'image':
            return type?.includes('image') || type === 'photo';
          case 'video':
            return type?.includes('video');
          case 'widget':
            return type === 'widget';
          default:
            return true;
        }
      });
    }

    // Filtro por origem (própria ou global)
    if (filterSource !== 'all') {
      filtered = filtered.filter(media => {
        if (filterSource === 'own') return !media.isGlobal;
        if (filterSource === 'global') return media.isGlobal;
        return true;
      });
    }

    // Ordenação das mídias
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredMedias(filtered);
  };

  const getMediaIcon = (type) => {
    const mediaType = type?.toLowerCase();
    if (mediaType?.includes('video')) return 'bi-play-circle-fill';
    if (mediaType?.includes('image') || mediaType === 'photo') return 'bi-image-fill';
    if (mediaType?.includes('audio')) return 'bi-music-note-beamed';
    if (mediaType?.includes('document') || mediaType?.includes('pdf')) return 'bi-file-pdf-fill';
    return 'bi-file-earmark-fill';
  };

  const getMediaTypeColor = (type) => {
    const mediaType = type?.toLowerCase();
    if (mediaType?.includes('video')) return '#e74c3c';
    if (mediaType?.includes('image') || mediaType === 'photo') return '#3498db';
    if (mediaType?.includes('audio')) return '#9b59b6';
    if (mediaType?.includes('document') || mediaType?.includes('pdf')) return '#e67e22';
    return currentTheme.textSecondary;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    if (duration < 60) return `${duration}s`;
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  const openPreview = (media) => {
    setSelectedMedia(media);
    setShowPreviewModal(true);
  };

  const openAssociateModal = (media, event) => {
    event.stopPropagation(); // Evita abrir o preview
    setSelectedMedia(media);
    setSelectedPanel('');
    // Pré-selecionar painéis já associados à mídia
    const alreadyAssociated = Array.isArray(media.panels) ? media.panels.map(p => p.id) : (media.panelId ? [media.panelId] : []);
    setSelectedPanels(alreadyAssociated);
    setInitialPanelIds(alreadyAssociated);
    setShowAssociateModal(true);
  };

  const closeAssociateModal = () => {
    setShowAssociateModal(false);
    setSelectedMedia(null);
    setSelectedPanel('');
    setSelectedPanels([]);
  };

  const handleAssociateMedia = async () => {
    if (!selectedMedia) return;

    try {
      setAssociating(true);
      // Calcular diferenças entre seleção atual e original
      const current = [...selectedPanels].sort((a, b) => a - b);
      const original = [...initialPanelIds].sort((a, b) => a - b);
      const toAdd = current.filter(id => !original.includes(id));
      const toRemove = original.filter(id => !current.includes(id));

      if (toAdd.length === 0 && toRemove.length === 0 && !selectedPanel) {
        // Nada para aplicar
        return;
      }

      // Primeiro desassociar os removidos
      for (const panelId of toRemove) {
        await apiService.delete(`/private/panels/${panelId}/disassociate-media/${selectedMedia.id}`);
      }

      // Depois associar os adicionados
      if (toAdd.length > 0) {
        await apiService.put(`/private/medias/${selectedMedia.id}/associate-multiple-panels`, {
          panelIds: toAdd
        });
      } else if (selectedPanel) {
        // Compatível com seleção única antiga
        await apiService.put(`/private/medias/${selectedMedia.id}/associate-panel`, {
          panelId: selectedPanel
        });
      }

      // Atualizar a lista de mídias
      await fetchMedias();
      closeAssociateModal();
      setError('');
    } catch (err) {
      console.error('Erro ao aplicar associações:', err);
      setError('Erro ao aplicar associações dos painéis. Tente novamente.');
    } finally {
      setAssociating(false);
    }
  };

  // Funções do modal de upload
  const openUploadModal = () => {
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadForm({
      title: '',
      file: null,
      duration: 10,
      mediaGlobal: false
    });
    // Reset de estado das abas e widget
    setUploadMode('FILE');
    setWidgetForm({
      title: '',
      duration: 10,
      mediaGlobal: false,
      widgetType: 'WEATHER',
      widgetConfig: '{"rss":""}'
    });
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));

      // Se for vídeo, tenta obter a duração automaticamente
      if (file.type && file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const url = URL.createObjectURL(file);
        video.src = url;
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(url);
          const seconds = Math.round(video.duration || 0);
          if (seconds > 0) {
            setUploadForm(prev => ({ ...prev, duration: seconds }));
          }
        };
        video.onerror = () => {
          URL.revokeObjectURL(url);
        };
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    try {
      setUploading(true);
      setUploadProgress(0);

      if (uploadMode === 'FILE') {
        // Validação de arquivo
        if (!uploadForm.file) {
          setError('Por favor, selecione um arquivo.');
          return;
        }

        const formData = new FormData();
        formData.append('file', uploadForm.file);
        formData.append('title', uploadForm.title || uploadForm.file.name);
        formData.append('duration', uploadForm.duration);
        formData.append('mediaGlobal', uploadForm.mediaGlobal ? 'true' : 'false');
        formData.append('globalMedia', uploadForm.mediaGlobal ? 'true' : 'false');

        const uploadResp = await apiService.post('/private/upload-media-standalone', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            if (e.total) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          }
        });

        if (isAdmin && uploadForm.mediaGlobal) {
          const created = uploadResp?.data || uploadResp;
          const mediaId = created?.id || created?.media?.id;
          if (mediaId) {
            try {
              await apiService.updateMedia(mediaId, { mediaGlobal: true, globalMedia: true });
            } catch (updateErr) {
              console.warn('Falha ao atualizar mediaGlobal após upload:', updateErr);
            }
          }
        }
      } else {
        // Envio de Widget (sem arquivo)
        // Validações simples
        if (!widgetForm.widgetType) {
          setError('Selecione o tipo de widget.');
          return;
        }
        if (!widgetForm.widgetConfig || widgetForm.widgetConfig.trim().length === 0) {
          setError('Informe a configuração do widget (JSON ou URL).');
          return;
        }

        const formData = new FormData();
        formData.append('title', (widgetForm.title || 'Widget'));
        formData.append('duration', widgetForm.duration);
        formData.append('mediaGlobal', widgetForm.mediaGlobal ? 'true' : 'false');
        formData.append('globalMedia', widgetForm.mediaGlobal ? 'true' : 'false');
        formData.append('widgetType', widgetForm.widgetType);
        formData.append('widgetConfig', widgetForm.widgetConfig);

        const uploadResp = await apiService.post('/private/upload-media-standalone', formData, {
          onUploadProgress: (e) => {
            if (e.total) {
              const percentComplete = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percentComplete);
            }
          }
        });

        if (isAdmin && widgetForm.mediaGlobal) {
          const created = uploadResp?.data || uploadResp;
          const mediaId = created?.id || created?.media?.id;
          if (mediaId) {
            try {
              await apiService.updateMedia(mediaId, { mediaGlobal: true, globalMedia: true });
            } catch (updateErr) {
              console.warn('Falha ao atualizar mediaGlobal após criação de widget:', updateErr);
            }
          }
        }
      }

      await fetchMedias();
      closeUploadModal();
      setError('');

    } catch (err) {
      console.error('Erro no upload:', err);
      setError(`Erro ao enviar a mídia: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const createMediaPreview = (media) => {
    if (!media.url) return null;

    const type = media.type?.toLowerCase();
    
    if (type?.includes('image') || type === 'photo') {
      return (
        <img 
          src={media.url} 
          alt={media.title || 'Imagem'} 
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain',
            borderRadius: '0.5rem'
          }}
        />
      );
    }
    
    if (type?.includes('video')) {
      return (
        <video 
          controls 
          style={{
            width: '100%',
            maxHeight: '300px',
            borderRadius: '0.5rem'
          }}
        >
          <source src={media.url} type="video/mp4" />
          Seu navegador não suporta o elemento de vídeo.
        </video>
      );
    }
    
    if (type?.includes('audio')) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <i className="bi bi-music-note-beamed" style={{ fontSize: '3rem', color: currentTheme.primary, marginBottom: '1rem' }}></i>
          <audio 
            controls 
            style={{ width: '100%', marginTop: '1rem' }}
          >
            <source src={media.url} type="audio/mpeg" />
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      );
    }
    
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <i className="bi bi-file-earmark-fill" style={{ fontSize: '3rem', color: currentTheme.primary, marginBottom: '1rem' }}></i>
        <p>Preview não disponível para este tipo de arquivo</p>
        <a 
          href={media.url} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: currentTheme.primary, textDecoration: 'none' }}
        >
          Abrir arquivo
        </a>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
        color: currentTheme.textPrimary
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: `4px solid ${currentTheme.border}`,
          borderTop: `4px solid ${currentTheme.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Carregando mídias...</p>
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

  return (
    <div style={{
      padding: '2rem',
      backgroundColor: currentTheme.background,
      minHeight: '100vh',
      color: currentTheme.textPrimary
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '2rem',
            fontWeight: '600',
            color: currentTheme.textPrimary
          }}>
            <i className="bi-play-circle" style={{ marginRight: '0.5rem' }}></i>Mídias
          </h1>
          <p style={{ 
            margin: 0, 
            color: currentTheme.textSecondary,
            fontSize: '1rem'
          }}>
            Gerencie todas as suas mídias
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={openUploadModal}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="bi bi-plus-circle"></i>
             Mídia
          </button>
          
          <button
            onClick={fetchMedias}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="bi bi-arrow-clockwise"></i>
            Atualizar
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        padding: '1.5rem',
        borderRadius: '0.75rem',
        marginBottom: '2rem',
        border: `1px solid ${currentTheme.border}`
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'end'
        }}>
          {/* Busca */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: currentTheme.textPrimary
            }}>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por título ou painel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '1rem'
              }}
            />
          </div>

          {/* Filtro por tipo */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: currentTheme.textPrimary
            }}>
              Tipo
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '1rem'
              }}
            >
              <option value="all">Todos os tipos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
              <option value="widget">Widgets</option>
            </select>
          </div>

          {/* Filtro por origem */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: currentTheme.textPrimary
            }}>
              Origem
            </label>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '1rem'
              }}
            >
              <option value="all">Todas as origens</option>
              <option value="own">Mídias próprias</option>
              <option value="global">Mídias globais</option>
            </select>
          </div>

          {/* Ordenação */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              color: currentTheme.textPrimary
            }}>
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '1rem'
              }}
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigas</option>
              <option value="title">Título (A-Z)</option>
              <option value="type">Tipo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          padding: '1rem',
          borderRadius: '0.5rem',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: currentTheme.primary }}>
            {medias.length}
          </div>
          <div style={{ fontSize: '0.9rem', color: currentTheme.textSecondary }}>
            Total de Mídias
          </div>
        </div>
        
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          padding: '1rem',
          borderRadius: '0.5rem',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3498db' }}>
            {medias.filter(m => !m.isGlobal).length}
          </div>
          <div style={{ fontSize: '0.9rem', color: currentTheme.textSecondary }}>
            Mídias Próprias
          </div>
        </div>
        
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          padding: '1rem',
          borderRadius: '0.5rem',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#e74c3c' }}>
            {medias.filter(m => m.isGlobal).length}
          </div>
          <div style={{ fontSize: '0.9rem', color: currentTheme.textSecondary }}>
            Mídias Globais
          </div>
        </div>
        
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          padding: '1rem',
          borderRadius: '0.5rem',
          border: `1px solid ${currentTheme.border}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#27ae60' }}>
            {filteredMedias.length}
          </div>
          <div style={{ fontSize: '0.9rem', color: currentTheme.textSecondary }}>
            Filtradas
          </div>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div style={{
          backgroundColor: '#fee',
          color: '#c33',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {/* Lista de mídias */}
      {filteredMedias.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: currentTheme.textSecondary
        }}>
          <i className="bi bi-collection" style={{ fontSize: '4rem', marginBottom: '1rem', display: 'block' }}></i>
          <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary }}>
            {medias.length === 0 ? 'Nenhuma mídia encontrada' : 'Nenhuma mídia corresponde aos filtros'}
          </h3>
          <p style={{ margin: 0 }}>
            {medias.length === 0 
              ? 'Você ainda não possui mídias cadastradas.' 
              : 'Tente ajustar os filtros para encontrar suas mídias.'
            }
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredMedias.map((media) => (
            <div
              key={media.id}
              style={{
                backgroundColor: currentTheme.cardBackground,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.75rem',
                overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                opacity: !isMediaActive(media) ? 0.6 : 1
              }}
              onClick={() => openPreview(media)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${currentTheme.primary}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Preview da mídia */}
              <div style={{
                height: '200px',
                backgroundColor: currentTheme.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {media.url && (media.type?.toLowerCase().includes('image') || media.type?.toLowerCase() === 'photo') ? (
                  <img
                    src={media.url}
                    alt={media.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : media.url && (media.type?.toLowerCase().includes('video') || media.type?.toLowerCase() === 'video') ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    backgroundColor: '#000'
                  }}>
                    <video
                      src={media.url}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      muted
                      preload="metadata"
                    />
                    {/* Overlay com ícone de play */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      pointerEvents: 'none'
                    }}>
                      <i 
                        className="bi bi-play-fill"
                        style={{
                          fontSize: '2rem',
                          color: 'white',
                          marginLeft: '4px' // Ajuste visual para centralizar o ícone
                        }}
                      ></i>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i 
                      className={getMediaIcon(media.type)}
                      style={{
                        fontSize: '3rem',
                        color: getMediaTypeColor(media.type)
                      }}
                    ></i>
                    <span style={{
                      fontSize: '0.9rem',
                      color: currentTheme.textSecondary,
                      textTransform: 'uppercase'
                    }}>
                      {media.type || 'Arquivo'}
                    </span>
                  </div>
                )}
                
                {/* Badge de origem */}
                <div style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  backgroundColor: media.isGlobal ? '#e74c3c' : '#3498db',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {media.isGlobal ? 'Global' : 'Própria'}
                </div>
              </div>

              {/* Informações da mídia */}
              <div style={{ padding: '1rem' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {media.title || 'Sem título'}
                    {!isMediaActive(media) && (
                      <span style={{
                        marginLeft: '0.5rem',
                        fontSize: '0.75rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontWeight: '500'
                      }}>
                        INATIVA
                      </span>
                    )}
                  </h3>
                  {!isMediaActive(media) && (
                    <button
                      onClick={(e) => handleReactivateMedia(media, e)}
                      title="Reativar mídia"
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: 'transparent',
                        border: '1px solid #28a745',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#28a745',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#28a745';
                        e.target.style.color = 'white';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#28a745';
                      }}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  )}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <i className="bi bi-display" style={{ color: currentTheme.textSecondary }}></i>
                  <div style={{
                    fontSize: '0.9rem',
                    color: currentTheme.textSecondary,
                    flex: 1
                  }}>
                    {media.panels && media.panels.length > 0 ? (
                      <div>
                        <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                          Painéis associados ({media.panels.length}):
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.25rem'
                        }}>
                          {media.panels.map((panel, index) => (
                            <span
                              key={panel.id || index}
                              style={{
                                backgroundColor: '#0d6efd',
                                color: '#ffffff',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                lineHeight: 1.4,
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}
                            >
                              {panel.name || 'Sem nome'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {media.panel?.name || 'Nenhum painel associado'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  color: currentTheme.textSecondary,
                  marginBottom: '0.75rem'
                }}>
                  <span>
                    {formatDate(media.createdAt)}
                  </span>
                  {media.duration && (
                    <span>
                      {formatDuration(media.duration)}
                    </span>
                  )}
                </div>

                {/* Área de ações */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {/* Botão de associação - só aparece se a mídia não estiver associada a um painel */}
                  {!media.panelId && (
                    <button
                      onClick={(e) => openAssociateModal(media, e)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        backgroundColor: currentTheme.primary,
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = currentTheme.primaryHover || '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = currentTheme.primary;
                      }}
                    >
                      <i className="bi bi-link-45deg"></i>
                      Associar ao Painel
                    </button>
                  )}

                  {/* Botões de ação */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    {/* Botão de desativar/ativar */}
                    <button
                      onClick={(e) => handleToggleMediaStatus(media, e)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: !isMediaActive(media) ? '#10b981' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = !isMediaActive(media) ? '#059669' : '#d97706';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = !isMediaActive(media) ? '#10b981' : '#f59e0b';
                      }}
                    >
                      <i className={`bi ${!isMediaActive(media) ? 'bi-play-circle' : 'bi-pause-circle'}`}></i>
                      {!isMediaActive(media) ? 'Ativar' : 'Desativar'}
                    </button>

                    {/* Botão de excluir */}
                    <button
                      onClick={(e) => handleDeleteMedia(media, e)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#dc2626';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ef4444';
                      }}
                    >
                      <i className="bi bi-trash"></i>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Preview */}
      {showPreviewModal && selectedMedia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            {/* Header do modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  margin: '0 0 0.5rem 0',
                  color: currentTheme.textPrimary,
                  fontSize: '1.5rem'
                }}>
                  {selectedMedia.title || 'Sem título'}
                </h2>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.9rem',
                  color: currentTheme.textSecondary
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-display"></i>
                    {selectedMedia.panels && selectedMedia.panels.length > 0 ? (
                      <div>
                        <span>Painéis ({selectedMedia.panels.length}): </span>
                        {selectedMedia.panels.map((panel, index) => (
                          <span key={panel.id || index}>
                            {panel.name || 'Sem nome'}
                            {index < selectedMedia.panels.length - 1 ? ', ' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>{selectedMedia.panel?.name || 'Nenhum painel associado'}</span>
                    )}
                  </div>
                  <span>
                    <i className="bi bi-calendar"></i> {formatDate(selectedMedia.createdAt)}
                  </span>
                  {selectedMedia.duration && (
                    <span>
                      <i className="bi bi-clock"></i> {formatDuration(selectedMedia.duration)}
                    </span>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Conteúdo do modal */}
            <div style={{ padding: '1.5rem' }}>
              {createMediaPreview(selectedMedia)}
              
              {selectedMedia.description && (
                <div style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: currentTheme.background,
                  borderRadius: '0.5rem',
                  border: `1px solid ${currentTheme.border}`
                }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    color: currentTheme.textPrimary,
                    fontSize: '1rem'
                  }}>
                    Descrição
                  </h4>
                  <p style={{
                    margin: 0,
                    color: currentTheme.textSecondary,
                    lineHeight: '1.5'
                  }}>
                    {selectedMedia.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Associação */}
      {showAssociateModal && selectedMedia && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '500px',
            border: `1px solid ${currentTheme.border}`
          }}>
            {/* Header do modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`
            }}>
              <h2 style={{
                margin: 0,
                color: currentTheme.textPrimary,
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Associar Mídia ao Painel
              </h2>
              
              <button
                onClick={closeAssociateModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.5rem'
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Conteúdo do modal */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{
                  margin: '0 0 1rem 0',
                  color: currentTheme.textSecondary
                }}>
                  Mídia: <strong style={{ color: currentTheme.textPrimary }}>{selectedMedia.title || 'Sem título'}</strong>
                </p>
                
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: currentTheme.textPrimary,
                  fontWeight: '500'
                }}>
                  Selecione os painéis:
                </label>
                
                {/* Opção de seleção múltipla com checkboxes */}
                <div style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  backgroundColor: currentTheme.background,
                  padding: '0.5rem'
                }}>
                  {panels.map((panel) => (
                    <label key={panel.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem',
                      marginBottom: '0.25rem',
                      backgroundColor: selectedPanels.includes(panel.id) ? `${currentTheme.primary}20` : 'transparent'
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedPanels.includes(panel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPanels(prev => [...prev, panel.id]);
                          } else {
                            setSelectedPanels(prev => prev.filter(id => id !== panel.id));
                          }
                        }}
                        style={{
                          marginRight: '0.75rem',
                          accentColor: currentTheme.primary
                        }}
                      />
                      <span style={{ color: currentTheme.textPrimary }}>
                        {panel.name}
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* Botões de seleção rápida */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '0.75rem'
                }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPanels(panels.map(p => p.id))}
                    style={{
                      padding: '0.5rem 1rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.25rem',
                      backgroundColor: 'transparent',
                      color: currentTheme.textPrimary,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Selecionar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPanels([])}
                    style={{
                      padding: '0.5rem 1rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.25rem',
                      backgroundColor: 'transparent',
                      color: currentTheme.textPrimary,
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={closeAssociateModal}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textPrimary,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Cancelar
                </button>
                
                {(() => {
                  const current = [...selectedPanels].sort((a,b)=>a-b);
                  const original = [...initialPanelIds].sort((a,b)=>a-b);
                  const changed = current.length !== original.length || current.some((v,i)=>v!==original[i]) || !!selectedPanel;
                  return (
                    <button
                      onClick={handleAssociateMedia}
                      disabled={!changed || associating}
                      style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        backgroundColor: (!changed || associating) ? currentTheme.textSecondary : currentTheme.primary,
                        color: 'white',
                        cursor: (!changed || associating) ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {associating && <i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i>}
                      {associating ? 'Aplicando...' : 'Aplicar alterações'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Upload de Mídia */}
      {showUploadModal && (
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
            padding: '0',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary
              }}>
                <i className="bi bi-cloud-upload" style={{ marginRight: '0.5rem' }}></i>
                Adicionar Nova Mídia
              </h3>
              
              <button
                onClick={closeUploadModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary,
                  padding: '0.25rem'
                }}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{ padding: '1.5rem' }}>
              {/* Abas de modo de upload */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('FILE')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: uploadMode === 'FILE' ? currentTheme.primary : 'transparent',
                    color: uploadMode === 'FILE' ? 'white' : currentTheme.textPrimary,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Mídia comum
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('WIDGET')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: uploadMode === 'WIDGET' ? currentTheme.primary : 'transparent',
                    color: uploadMode === 'WIDGET' ? 'white' : currentTheme.textPrimary,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Widget
                </button>
              </div>
              <form onSubmit={handleUploadSubmit}>
                {uploadMode === 'WIDGET' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary
                    }}>
                      Título da Mídia
                    </label>
                    <input
                      type="text"
                      value={widgetForm.title}
                      onChange={(e) => {
                        setWidgetForm(prev => ({ ...prev, title: e.target.value }));
                      }}
                      placeholder="Digite o título da mídia (opcional)"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.375rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary,
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                )}

                {uploadMode === 'FILE' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary
                    }}>
                      Selecionar Arquivo
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.375rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary,
                        fontSize: '1rem'
                      }}
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary,
                      marginTop: '0.25rem'
                    }}>
                      Tipos suportados: Imagens (JPG, PNG, GIF), Vídeos (MP4, AVI, MOV), Áudios (MP3, WAV), Documentos (PDF, DOC)
                      <br />Tamanho máximo: 100MB
                    </div>
                    {/* Título - após o arquivo para manter ordem desejada */}
                    <div style={{ marginTop: '1rem' }}>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: currentTheme.textPrimary
                      }}>
                        Título da Mídia
                      </label>
                      <input
                        type="text"
                        value={uploadForm.title}
                        onChange={(e) => {
                          setUploadForm(prev => ({ ...prev, title: e.target.value }));
                        }}
                        placeholder="Digite o título da mídia (opcional)"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.375rem',
                          backgroundColor: currentTheme.background,
                          color: currentTheme.textPrimary,
                          fontSize: '1rem'
                        }}
                      />
                    </div>
                  </div>
                )}

                {uploadMode === 'WIDGET' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary
                    }}>
                      Tipo de Widget
                    </label>
                    <select
                      value={widgetForm.widgetType}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, widgetType: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.375rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary,
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Selecione...</option>
                      <option value="WEATHER">Widget do Tempo</option>
                      <option value="NEWS">Widget de Notícias</option>
                      <option value="LOTTERY">Widget de Loteria</option>
                      <option value="COINS">Widget de Criptomoedas</option>
                    </select>
                    <div style={{
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary,
                      marginTop: '0.25rem'
                    }}>
                      Escolha o tipo de widget a ser exibido.
                    </div>
                  </div>
                )}

                {uploadMode === 'WIDGET' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary
                    }}>
                      Configuração do Widget (JSON ou URL)
                    </label>
                    <textarea
                      value={widgetForm.widgetConfig}
                      onChange={(e) => setWidgetForm(prev => ({ ...prev, widgetConfig: e.target.value }))}
                      placeholder="Informe um JSON com configurações ou uma URL"
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.375rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary,
                        fontSize: '1rem'
                      }}
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary,
                      marginTop: '0.25rem'
                    }}>
                      Exemplo JSON: {`{ "city": "Vitória", "units": "metric" }`} | ou URL: https://exemplo.com/widget
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary
                  }}>
                    Duração (segundos)
                  </label>
                  <input
                    type="number"
                    value={uploadMode === 'FILE' ? uploadForm.duration : widgetForm.duration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      if (uploadMode === 'FILE') {
                        setUploadForm(prev => ({ ...prev, duration: val }));
                      } else {
                        setWidgetForm(prev => ({ ...prev, duration: val }));
                      }
                    }}
                    min="1"
                    placeholder="10"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem'
                    }}
                  />
                  <div style={{
                    fontSize: '0.75rem',
                    color: currentTheme.textSecondary,
                    marginTop: '0.25rem'
                  }}>
                    Tempo de exibição da mídia em segundos (padrão: 10s para fotos)
                  </div>
                </div>

                

                {/* Barra de Progresso */}
                {uploading && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      width: '100%',
                      backgroundColor: currentTheme.border,
                      borderRadius: '0.25rem',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${uploadProgress}%`,
                        height: '0.5rem',
                        backgroundColor: currentTheme.primary,
                        transition: 'width 0.3s ease'
                      }}></div>
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary,
                      marginTop: '0.25rem',
                      textAlign: 'center'
                    }}>
                      {Math.round(uploadProgress)}% enviado
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={closeUploadModal}
                    disabled={uploading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: 'transparent',
                      color: currentTheme.textPrimary,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="submit"
                    disabled={(((uploadMode === 'FILE') ? !uploadForm.file : false) || uploading)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      backgroundColor: ((((uploadMode === 'FILE') ? !uploadForm.file : false) || uploading)) ? currentTheme.textSecondary : '#28a745',
                      color: 'white',
                      cursor: ((((uploadMode === 'FILE') ? !uploadForm.file : false) || uploading)) ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {uploading && <i className="bi bi-arrow-clockwise" style={{ animation: 'spin 1s linear infinite' }}></i>}
                    {uploading ? 'Enviando...' : (uploadMode === 'WIDGET' ? 'Criar Widget' : 'Enviar Mídia')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && mediaToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
            maxWidth: '480px',
            border: `1px solid ${currentTheme.border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${currentTheme.border}`,
              padding: '0.75rem 1rem'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: '600',
                color: currentTheme.textPrimary
              }}>Confirmar exclusão</h3>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: currentTheme.textSecondary,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div style={{ padding: '1rem' }}>
              <p style={{ color: currentTheme.textSecondary, margin: 0 }}>
                Tem certeza que deseja excluir a mídia <strong style={{ color: currentTheme.textPrimary }}>&quot;{mediaToDelete.title || 'Sem título'}&quot;</strong>?
              </p>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: currentTheme.textSecondary }}>Esta ação não pode ser desfeita.</p>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              justifyContent: 'flex-end',
              borderTop: `1px solid ${currentTheme.border}`,
              padding: '0.75rem 1rem'
            }}>
              <button
                type="button"
                onClick={closeDeleteModal}
                style={{
                  padding: '0.5rem 1rem',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textPrimary,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteMedia}
                disabled={deletingMedia}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  backgroundColor: deletingMedia ? '#ef4444aa' : '#ef4444',
                  color: 'white',
                  cursor: deletingMedia ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {deletingMedia ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medias;
