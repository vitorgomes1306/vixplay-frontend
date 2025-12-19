import React, { useState, useEffect } from 'react';
import { DndContext, useDraggable, useDroppable, useSensors, useSensor, MouseSensor, TouchSensor, closestCenter } from '@dnd-kit/core';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import sucessoImg from '../assets/img/sucesso.png';
import delImg from '../assets/img/del.png';

export default function PanelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  
  const [panel, setPanel] = useState(null);
  const [medias, setMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaToDelete, setMediaToDelete] = useState(null);

  // Estado para alertas Bootstrap
  const [alert, setAlert] = useState(null);

  // Função para mostrar alertas Bootstrap
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Estado para modal de visualização de imagem
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState({ url: '', title: '' });

  // Estados para upload de arquivo
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [activeDragId, setActiveDragId] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { pressDelay: 120, pressThreshold: 5 })
  );

  // Função para abrir modal de visualização de imagem
  const openImageModal = (url, title) => {
    setSelectedImage({ url, title });
    setShowImageModal(true);
  };

  // Função para mover mídia para cima
  const handleMoveMediaUp = async (mediaId) => {
    const currentIndex = medias.findIndex(m => m.id === mediaId);
    if (currentIndex <= 0) return; // Já está no topo
    
    try {
      // Criar nova ordem
      const newMedias = [...medias];
      [newMedias[currentIndex], newMedias[currentIndex - 1]] = [newMedias[currentIndex - 1], newMedias[currentIndex]];
      
      // Atualizar ordem no backend
      await updateMediaOrder(newMedias);
      
      // Atualizar estado local
      setMedias(newMedias);
      showAlert('Ordem das mídias atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao mover mídia:', error);
      showAlert('Erro ao atualizar ordem das mídias', 'danger');
    }
  };

  // Função para mover mídia para baixo
  const handleMoveMediaDown = async (mediaId) => {
    const currentIndex = medias.findIndex(m => m.id === mediaId);
    if (currentIndex >= medias.length - 1) return; // Já está no final
    
    try {
      // Criar nova ordem
      const newMedias = [...medias];
      [newMedias[currentIndex], newMedias[currentIndex + 1]] = [newMedias[currentIndex + 1], newMedias[currentIndex]];
      
      // Atualizar ordem no backend
      await updateMediaOrder(newMedias);
      
      // Atualizar estado local
      setMedias(newMedias);
      showAlert('Ordem das mídias atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao mover mídia:', error);
      showAlert('Erro ao atualizar ordem das mídias', 'danger');
    }
  };

  // Função para atualizar ordem das mídias no backend
  const updateMediaOrder = async (orderedMedias) => {
    const orderUpdates = orderedMedias.map((media, index) => ({
      mediaId: media.id,
      order: index + 1
    }));

    const response = await fetch(`${import.meta.env.VITE_API_URL}/private/panels/${id}/medias/order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('vixplay_token')}`
      },
      body: JSON.stringify({ mediaOrder: orderUpdates })
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar ordem das mídias');
    }
  };

  // Utilitário para mover item no array
  const arrayMove = (array, fromIndex, toIndex) => {
    const newArray = array.slice();
    const [movedItem] = newArray.splice(fromIndex, 1);
    newArray.splice(toIndex, 0, movedItem);
    return newArray;
  };

  // Handler de drag end para reordenar
  const handleDragEnd = async ({ active, over }) => {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = medias.findIndex((m) => m.id === active.id);
    const newIndex = medias.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    try {
      const newMedias = arrayMove(medias, oldIndex, newIndex);
      await updateMediaOrder(newMedias);
      setMedias(newMedias);
      showAlert('Ordem das mídias atualizada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao reordenar via drag-and-drop:', error);
      showAlert('Erro ao atualizar ordem das mídias', 'danger');
    }
  };

  // Componente interno para tornar cartões sorteáveis
  const SortableMediaCard = ({ media }) => {
    // Torna o card um alvo de drop e item arrastável
    const { setNodeRef: setDropRef } = useDroppable({ id: media.id });
    const { setNodeRef: setDragRef, attributes, listeners, isDragging, transform } = useDraggable({ id: media.id });

    // O container é o elemento arrastável; vamos usar um handle para listeners
    const setContainerRef = (node) => {
      setDropRef(node);
      setDragRef(node);
    };

    const dragStyle = transform
      ? { transform: `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)` }
      : {};

    return (
      <div
        ref={setContainerRef}
        style={{
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          border: `1px solid ${currentTheme.border}`,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s',
          opacity: media.active === false ? 0.6 : 1,
          cursor: 'grab',
          outline: isDragging ? `2px dashed ${currentTheme.primary}` : 'none',
          touchAction: 'none',
          userSelect: 'none',
          ...dragStyle
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <i 
              className={getMediaIcon(media.type)}
              style={{
                fontSize: '1.5rem',
                color: currentTheme.primary
              }}
            ></i>
            <div>
              <h3 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                color: currentTheme.textPrimary
              }}>
                {media.title}
                {media.active === false && (
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
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary
              }}>
                {media.type}
              </p>

              {/* Handle de arrasto */}
              <button
                title="Arrastar para reordenar"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: 'transparent',
                  border: `1px dashed ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  color: currentTheme.textSecondary,
                  cursor: 'grab'
                }}
                {...attributes}
                {...listeners}
              >
                <i className="bi bi-grip-vertical"></i> Arraste
              </button>

              {/* Botões de ordenação */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => handleMoveMediaUp(media.id)}
                  disabled={medias.findIndex(m => m.id === media.id) === 0}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    cursor: medias.findIndex(m => m.id === media.id) === 0 ? 'not-allowed' : 'pointer',
                    color: medias.findIndex(m => m.id === media.id) === 0 ? currentTheme.textSecondary : currentTheme.primary,
                    transition: 'all 0.2s',
                    opacity: medias.findIndex(m => m.id === media.id) === 0 ? 0.5 : 1,
                    fontSize: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (medias.findIndex(m => m.id === media.id) !== 0) {
                      e.target.style.backgroundColor = currentTheme.primary;
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (medias.findIndex(m => m.id === media.id) !== 0) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = currentTheme.primary;
                    }
                  }}
                  title="Mover para cima"
                >
                  <i className="bi bi-arrow-up"></i>
                </button>
                <button
                  onClick={() => handleMoveMediaDown(media.id)}
                  disabled={medias.findIndex(m => m.id === media.id) === medias.length - 1}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    cursor: medias.findIndex(m => m.id === media.id) === medias.length - 1 ? 'not-allowed' : 'pointer',
                    color: medias.findIndex(m => m.id === media.id) === medias.length - 1 ? currentTheme.textSecondary : currentTheme.primary,
                    transition: 'all 0.2s',
                    opacity: medias.findIndex(m => m.id === media.id) === medias.length - 1 ? 0.5 : 1,
                    fontSize: '0.75rem'
                  }}
                  onMouseEnter={(e) => {
                    if (medias.findIndex(m => m.id === media.id) !== medias.length - 1) {
                      e.target.style.backgroundColor = currentTheme.primary;
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (medias.findIndex(m => m.id === media.id) !== medias.length - 1) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = currentTheme.primary;
                    }
                  }}
                  title="Mover para baixo"
                >
                  <i className="bi bi-arrow-down"></i>
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {media.active === false && (
              <button
                onClick={() => handleReactivateMedia(media.id)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: `1px solid #28a745`,
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
                title="Reativar mídia"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            )}

            <button
              onClick={() => openEditModal(media)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                color: currentTheme.textSecondary,
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
            >
              <i className="bi bi-pencil"></i>
            </button>

            {media.active !== false && (
              <button
                onClick={() => handleDeactivateMedia(media.id)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: `1px solid #ffc107`,
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  color: '#ffc107',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#ffc107';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#ffc107';
                }}
                title="Desativar mídia"
              >
                <i className="bi bi-pause-circle"></i>
              </button>
            )}

            <button
              onClick={() => handleDeleteMedia(media)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                cursor: 'pointer',
                color: currentTheme.textSecondary,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#dc3545';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.textSecondary;
              }}
              title="Deletar mídia"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        </div>

        {/* Preview da mídia */}
        <div style={{ marginBottom: '1rem' }}>
          {createMediaPreview(media)}
        </div>

        {media.url && (
          <div style={{
            padding: '0.75rem',
            backgroundColor: currentTheme.background,
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            color: currentTheme.textSecondary,
            wordBreak: 'break-all'
          }}>
          </div>
        )}
      </div>
    );
  };

  // Função para lidar com seleção de arquivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar tamanho do arquivo (100MB)
    if (file.size > 100 * 1024 * 1024) {
      showAlert('Arquivo muito grande. Tamanho máximo: 100MB', 'warning');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    
    // Definir nome automaticamente baseado no arquivo
    if (!formData.name) {
      setFormData(prev => ({
        ...prev,
        name: file.name.replace(/\.[^/.]+$/, "") // Remove extensão
      }));
    }

    // Criar preview do arquivo
    createFilePreview(file);
  };

  // Função para criar preview do arquivo
  const createFilePreview = (file) => {
    const type = file.type;
    
    if (type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview({
          type: 'image',
          url: e.target.result,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
      // Para imagens, manter duração padrão de 10 segundos
      setFormData(prev => ({...prev, duration: 10}));
    } else if (type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setFilePreview({
        type: 'video',
        url: url,
        name: file.name
      });
      // Para vídeos, detectar duração automaticamente
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        setFormData(prev => ({...prev, duration}));
      };
      video.onerror = () => {
        console.error('Erro ao carregar vídeo para preview');
      };
      video.src = url;
    } else if (type.startsWith('audio/')) {
      setFilePreview({
        type: 'audio',
        name: file.name
      });
    } else {
      setFilePreview({
        type: 'document',
        name: file.name
      });
    }
  };

  // Função para upload de arquivo
  const handleFileUpload = async () => {
    if (!selectedFile) {
      showAlert('Por favor, selecione um arquivo', 'warning');
      return;
    }

    const title = formData.name.trim();
    if (!title) {
      showAlert('Por favor, digite o título da mídia', 'warning');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', selectedFile);
      uploadFormData.append('title', title);
      uploadFormData.append('panelId', id);
      uploadFormData.append('duration', formData.duration || 10);

      // Usar XMLHttpRequest para acompanhar progresso
      const xhr = new XMLHttpRequest();

      // Configurar progresso do upload
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      // Configurar Promise para aguardar conclusão
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = function () {
          if (xhr.status === 201) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            const errorResponse = JSON.parse(xhr.responseText);
            reject(new Error(errorResponse.error || 'Erro no envio.'));
          }
        };

        xhr.onerror = function () {
          reject(new Error('Erro de rede durante o envio.'));
        };
      });

      // Configurar e enviar requisição
      const token = localStorage.getItem('vixplay_token');
      xhr.open('POST', window.buildApiUrl('/private/uploadmidia'));
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(uploadFormData);

      // Aguardar resultado
      const resultado = await uploadPromise;

      console.log('✅ Upload realizado com sucesso:', resultado);

      // Recarregar lista de mídias
      await loadMedias();

      // Limpar formulário e fechar modal
      setFormData({ name: '', type: '', url: '', duration: 10 });
      setSelectedFile(null);
      setFilePreview(null);
      setShowCreateModal(false);
      setUploadProgress(0);

      // Mostrar modal de sucesso
      setShowSuccessModal(true);

    } catch (err) {
      console.error('❌ Erro no upload:', err);
      showAlert(`Erro ao enviar a mídia: ${err.message}`, 'danger');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Função para criar preview da mídia
  const createMediaPreview = (media) => {
    if (!media.url) return null;

    const type = media.type?.toUpperCase();
    
    switch (type) {
      case 'PHOTO':
        return (
          <img 
            src={media.url} 
            alt={media.title || 'Imagem'} 
            style={{
              width: '100%',
              maxHeight: '200px',
              objectFit: 'cover',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
            onClick={() => openImageModal(media.url, media.title)}
          />
        );
      
      case 'VIDEO':
        return (
          <video 
            controls 
            style={{
              width: '100%',
              maxHeight: '200px',
              borderRadius: '0.375rem'
            }}
          >
            <source src={media.url} type="video/mp4" />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        );
      
      case 'AUDIO':
        return (
          <audio 
            controls 
            style={{
              width: '100%'
            }}
          >
            <source src={media.url} type="audio/mpeg" />
            Seu navegador não suporta o elemento de áudio.
          </audio>
        );
      
      case 'DOCUMENT':
        return (
          <a 
            href={media.url} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '1rem',
              backgroundColor: currentTheme.primary,
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.375rem',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}
          >
            <i className="bi bi-file-earmark" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}></i>
            <br />
            Abrir Documento
          </a>
        );
      
      default:
        return (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: currentTheme.background,
            borderRadius: '0.375rem',
            border: `1px dashed ${currentTheme.border}`
          }}>
            <i className="bi bi-file-earmark" style={{ fontSize: '2rem', color: currentTheme.textSecondary }}></i>
            <p style={{ margin: '0.5rem 0 0 0', color: currentTheme.textSecondary }}>
              Clique para visualizar
            </p>
          </div>
        );
    }
  };
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    url: '',
    duration: 10
  });

  useEffect(() => {
    loadPanelData();
    loadMedias();
  }, [id]);

  const loadPanelData = async () => {
    try {
      // Busca todos os painéis e filtra pelo ID (mesmo método do painel.html)
      const response = await apiService.getPanels();
      const panels = response.data || [];
      const foundPanel = panels.find(p => p.id == id);
      
      if (foundPanel) {
        setPanel(foundPanel);
      } else {
        setError('Painel não encontrado');
      }
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
      setError('Erro ao carregar dados do painel');
    }
  };

  const loadMedias = async () => {
    try {
      setLoading(true);
      setError(''); // Limpar erro anterior
      const response = await apiService.getPanelMedias(id);
      console.log('Mídias carregadas para o painel', id, ':', response.data);
      setMedias(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar mídias:', err);
      
      // Tratamento de erro mais detalhado
      let errorMessage = 'Erro ao carregar mídias do painel';
      
      if (err.response) {
        // Erro de resposta do servidor
        const status = err.response.status;
        const data = err.response.data;
        
        switch (status) {
          case 404:
            errorMessage = 'Endpoint de mídias não encontrado. Verifique se o backend suporta /private/painel/{id}/midias';
            break;
          case 500:
            errorMessage = `Erro interno do servidor (500). ${data?.message || 'Verifique se o endpoint /private/painel/${id}/midias está implementado no backend'}`;
            break;
          case 401:
            errorMessage = 'Não autorizado. Verifique seu token de acesso';
            break;
          case 403:
            errorMessage = 'Acesso negado para este painel';
            break;
          default:
            errorMessage = `Erro ${status}: ${data?.message || 'Erro desconhecido'}`;
        }
      } else if (err.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão. Verifique se o backend está rodando';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMedia = async (e) => {
    e.preventDefault();
    try {
      const response = await apiService.createPanelMedia(id, formData);
      setMedias([...medias, response.data]);
      setShowCreateModal(false);
      setFormData({ name: '', type: '', url: '' });
      // Mostrar modal de sucesso
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Erro ao criar mídia:', err);
      setError('Erro ao criar mídia');
    }
  };

  const handleReactivateMedia = async (mediaId) => {
    try {
      const response = await apiService.reactivatePanelMedia(mediaId);
      
      setMedias(medias.map(media => 
        media.id === mediaId ? { ...media, active: true } : media
      ));
    } catch (err) {
      console.error('Erro ao reativar mídia:', err);
      setError('Erro ao reativar mídia');
    }
  };

  const handleDeactivateMedia = async (mediaId) => {
    try {
      const response = await apiService.deactivatePanelMedia(mediaId);
      
      setMedias(medias.map(media => 
        media.id === mediaId ? { ...media, active: false } : media
      ));
    } catch (err) {
      console.error('Erro ao desativar mídia:', err);
      setError('Erro ao desativar mídia');
    }
  };

  const handleEditMedia = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        title: formData.name,
        duration: parseInt(formData.duration) || null
      };
      
      const response = await apiService.updatePanelMedia(id, selectedMedia.id, updateData);
      setMedias(medias.map(media => 
        media.id === selectedMedia.id ? response.data : media
      ));
      setShowEditModal(false);
      setSelectedMedia(null);
      setFormData({ name: '', duration: '' });
    } catch (err) {
      console.error('Erro ao editar mídia:', err);
      setError('Erro ao editar mídia');
    }
  };

  const handleDeleteMedia = (media) => {
    setMediaToDelete(media);
    setShowDeleteModal(true);
  };

  const confirmDeleteMedia = async () => {
    if (!mediaToDelete) return;
    
    try {
      console.log('Tentando excluir mídia:', mediaToDelete);
      console.log('Panel ID:', id, 'Media ID:', mediaToDelete.id);
      
      // Chamada real da API para excluir mídia do painel
      await apiService.deletePanelMedia(id, mediaToDelete.id);
      
      // Remove da lista local após sucesso
      setMedias(prevMedias => prevMedias.filter(media => media.id !== mediaToDelete.id));
      console.log('Mídia excluída com sucesso:', mediaToDelete);
      setShowDeleteModal(false);
      setMediaToDelete(null);
      
      // Mostrar modal de sucesso de exclusão
      setShowDeleteSuccessModal(true);
    } catch (err) {
      console.error('Erro ao excluir mídia:', err);
      console.error('Detalhes do erro:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url,
        method: err.config?.method
      });
      
      let errorMessage = 'Erro ao excluir mídia. ';
      
      if (err.response?.status === 404) {
        errorMessage += `O endpoint DELETE ${err.config?.url} não foi encontrado no backend. Verifique se o servidor backend suporta a exclusão de mídias de painéis.`;
      } else if (err.response?.status === 401) {
        errorMessage += 'Token de autenticação inválido ou expirado.';
      } else if (err.response?.status === 403) {
        errorMessage += 'Você não tem permissão para excluir esta mídia.';
      } else if (err.response?.status === 500) {
        errorMessage += 'Erro interno do servidor.';
      } else {
        errorMessage += 'Tente novamente.';
      }
      
      setError(errorMessage);
      setShowDeleteModal(false);
      setMediaToDelete(null);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: '', type: '', url: '', duration: 10 });
    setSelectedFile(null);
    setFilePreview(null);
    setUploadProgress(0);
    setActiveTab('upload');
    setShowCreateModal(true);
  };

  const openEditModal = (media) => {
    setSelectedMedia(media);
    setFormData({
      name: media.title || '',
      duration: media.duration || ''
    });
    setShowEditModal(true);
  };

  const getMediaIcon = (type) => {
    if (type?.includes('video')) return 'bi-play-circle';
    if (type?.includes('image')) return 'bi-image';
    if (type?.includes('pdf')) return 'bi-file-pdf';
    return 'bi-file-earmark';
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
      {/* Alerta Bootstrap */}
      {alert && (
        <div 
          className={`alert alert-${alert.type} alert-dismissible fade show`}
          role="alert"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}
        >
          <i className={`bi bi-${
            alert.type === 'success' ? 'check-circle-fill' :
            alert.type === 'danger' ? 'exclamation-triangle-fill' :
            alert.type === 'warning' ? 'exclamation-triangle-fill' :
            'info-circle-fill'
          }`}></i>
          <span>{alert.message}</span>
          <button 
            type="button" 
            className="btn-close" 
            aria-label="Close"
            onClick={() => setAlert(null)}
          ></button>
        </div>
      )}
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <button
            onClick={() => navigate('/panels')}
            style={{
              background: 'none',
              border: 'none',
              color: currentTheme.primary,
              cursor: 'pointer',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <i className="bi bi-arrow-left"></i>
            Voltar para Painéis
          </button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            margin: 0,
            color: currentTheme.textPrimary
          }}>
            <i className="bi bi-folder-open" style={{ marginRight: '0.5rem' }}></i>
            {panel?.name || 'Painel'}
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            margin: '0.5rem 0 0 0'
          }}>
            Gerenciar mídias do painel
          </p>
          <p style={{
            color: currentTheme.textSecondary,
            margin: '0.5rem 0 0 0',
            fontSize: '0.75rem'
            
          }}>
            Para ordenar as midias, mova para cima ou para baixo com as setas ↑ ↓ ou clique, segure e arraste o card
          </p>
        </div>
        
        <button
          onClick={openCreateModal}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#0056b3';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = currentTheme.primary;
          }}
        >
          <i className="bi bi-plus-circle"></i>
          Nova Mídia
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid #fecaca',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          fontSize: '0.95rem',
          lineHeight: '1.5'
        }}>
          <i className="bi bi-exclamation-triangle-fill" style={{
            fontSize: '1.25rem',
            marginTop: '0.125rem',
            flexShrink: 0
          }}></i>
          <div>
            <strong>Erro ao carregar mídias:</strong>
            <br />
            {error}
            {error.includes('500') && (
              <div style={{ 
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: '#991b1b'
              }}>
                <strong>Possíveis soluções:</strong>
                <ul style={{ margin: '0.25rem 0 0 1rem', paddingLeft: '1rem' }}>
                  <li>Verifique se o backend está rodando</li>
                  <li>Confirme se o endpoint <code>/private/painel/{'{id}'}/midias</code> está implementado</li>
                  <li>Verifique os logs do servidor para mais detalhes</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Grid com Drag-and-Drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setActiveDragId(active.id)}
        onDragEnd={handleDragEnd}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {medias.map((media) => (
            <SortableMediaCard key={media.id} media={media} />
          ))}

          {medias.length === 0 && (
            <div style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '3rem',
              color: currentTheme.textSecondary
            }}>
              <i className="bi bi-folder-x" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
              <p style={{ fontSize: '1.125rem', margin: 0 }}>
                Nenhuma mídia encontrada neste painel
              </p>
              <p style={{ margin: '0.5rem 0 0 0' }}>
                Clique em "Nova Mídia" para adicionar a primeira mídia
              </p>
            </div>
          )}
        </div>
      </DndContext>

      {/* Create Modal */}
      {showCreateModal && (
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
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.textPrimary
              }}>
                Nova Mídia
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary,
                  padding: '0.25rem',
                  borderRadius: '0.25rem'
                }}
              >
                ×
              </button>
            </div>

            {/* Abas */}
            <div style={{
              display: 'flex',
              borderBottom: `1px solid ${currentTheme.border}`,
              marginBottom: '1.5rem'
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: activeTab === 'upload' ? currentTheme.primary : 'transparent',
                  color: activeTab === 'upload' ? 'white' : currentTheme.textSecondary,
                  borderRadius: '0.375rem 0.375rem 0 0',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <i className="bi bi-cloud-upload"></i>
                Upload de Arquivo
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('url')}
                style={{
                  padding: '0.75rem 1rem',
                  border: 'none',
                  background: activeTab === 'url' ? currentTheme.primary : 'transparent',
                  color: activeTab === 'url' ? 'white' : currentTheme.textSecondary,
                  borderRadius: '0.375rem 0.375rem 0 0',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <i className="bi bi-link-45deg"></i>
                URL
              </button>
            </div>

            {/* Conteúdo das Abas */}
            {activeTab === 'upload' && (
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary
                  }}>
                    Selecionar Arquivo
                  </label>
                  <input
                    type="file"
                    onChange={handleFileSelect}
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
                    fontSize: '0.875rem',
                    color: currentTheme.textSecondary,
                    marginTop: '0.5rem'
                  }}>
                    Tipos suportados: Imagens (JPG, PNG, GIF), Vídeos (MP4, AVI, MOV), Áudios (MP3, WAV), Documentos (PDF, DOC)
                    <br />Tamanho máximo: 100MB
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary
                  }}>
                    Título da Mídia
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Digite o título da mídia"
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

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary
                  }}>
                    Duração (segundos)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 10})}
                    placeholder="Tempo em segundos"
                    disabled={filePreview && filePreview.type === 'video'}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      backgroundColor: (filePreview && filePreview.type === 'video') ? currentTheme.textSecondary + '20' : currentTheme.background,
                      color: currentTheme.textPrimary,
                      fontSize: '1rem',
                      cursor: (filePreview && filePreview.type === 'video') ? 'not-allowed' : 'text'
                    }}
                  />
                  <div style={{
                    fontSize: '0.875rem',
                    color: currentTheme.textSecondary,
                    marginTop: '0.5rem'
                  }}>
                    {filePreview && filePreview.type === 'video' 
                      ? 'Duração detectada automaticamente do vídeo'
                      : 'Tempo de exibição da mídia em segundos (padrão: 10s para imagens)'
                    }
                  </div>
                </div>

                {/* Preview do arquivo */}
                {filePreview && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary
                    }}>
                      Preview
                    </label>
                    <div style={{
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.375rem',
                      padding: '1rem',
                      backgroundColor: currentTheme.background
                    }}>
                      {filePreview.type === 'image' && (
                        <img
                          src={filePreview.url}
                          alt={filePreview.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            objectFit: 'contain',
                            borderRadius: '0.375rem'
                          }}
                        />
                      )}
                      {filePreview.type === 'video' && (
                        <video
                          src={filePreview.url}
                          controls
                          style={{
                            maxWidth: '100%',
                            maxHeight: '200px',
                            borderRadius: '0.375rem'
                          }}
                        />
                      )}
                      {(filePreview.type === 'audio' || filePreview.type === 'document') && (
                        <div style={{
                          textAlign: 'center',
                          padding: '2rem',
                          color: currentTheme.textSecondary
                        }}>
                          <i className={`bi bi-${filePreview.type === 'audio' ? 'music-note' : 'file-earmark'}`} 
                             style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                          <p style={{ margin: 0 }}>{filePreview.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Barra de progresso */}
                {isUploading && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      backgroundColor: currentTheme.background,
                      borderRadius: '0.375rem',
                      overflow: 'hidden',
                      height: '1.5rem',
                      border: `1px solid ${currentTheme.border}`
                    }}>
                      <div style={{
                        backgroundColor: currentTheme.primary,
                        height: '100%',
                        width: `${uploadProgress}%`,
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {uploadProgress}%
                      </div>
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
                    onClick={() => setShowCreateModal(false)}
                    disabled={isUploading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: 'transparent',
                      color: currentTheme.textSecondary,
                      border: `1px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500',
                      opacity: isUploading ? 0.5 : 1
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleFileUpload}
                    disabled={!selectedFile || isUploading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: (!selectedFile || isUploading) ? currentTheme.textSecondary : currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.5rem',
                      cursor: (!selectedFile || isUploading) ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      fontWeight: '500'
                    }}
                  >
                    {isUploading ? 'Enviando...' : 'Enviar Arquivo'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'url' && (
              <form onSubmit={handleCreateMedia}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    color: currentTheme.textPrimary
                  }}>
                    Nome da Mídia
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
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
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Tipo da Mídia
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
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
                  <option value="">Selecione o tipo</option>
                  <option value="video/mp4">Vídeo (MP4)</option>
                  <option value="image/jpeg">Imagem (JPEG)</option>
                  <option value="image/png">Imagem (PNG)</option>
                  <option value="application/pdf">PDF</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  URL da Mídia
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  required
                  placeholder="https://exemplo.com/midia.jpg"
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

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Duração (segundos)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 10})}
                  placeholder="Tempo em segundos"
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
                  fontSize: '0.875rem',
                  color: currentTheme.textSecondary,
                  marginTop: '0.5rem'
                }}>
                  Tempo de exibição da mídia em segundos (padrão: 10s)
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    color: currentTheme.textSecondary,
                    fontSize: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Criar Mídia
                </button>
              </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
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
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h2 style={{
              margin: '0 0 1.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: currentTheme.textPrimary
            }}>
              Editar Mídia
            </h2>
            
            <form onSubmit={handleEditMedia}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Nome da Mídia
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
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
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: currentTheme.textPrimary
                }}>
                  Duração (segundos)
                </label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  placeholder="Tempo de exibição em segundos"
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
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedMedia(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    color: currentTheme.textSecondary,
                    fontSize: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Imagem */}
      {showImageModal && (
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
          zIndex: 1050,
          padding: '2rem'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header do Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h5 style={{
                margin: 0,
                color: currentTheme.textPrimary,
                fontSize: '1.125rem',
                fontWeight: '600'
              }}>
                {selectedImage.title || 'Visualizar Imagem'}
              </h5>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary,
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.background;
                  e.target.style.color = currentTheme.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = currentTheme.textSecondary;
                }}
              >
                ×
              </button>
            </div>
            
            {/* Imagem */}
            <div style={{
              padding: '1rem',
              textAlign: 'center'
            }}>
              <img
                src={selectedImage.url}
                alt={selectedImage.title || 'Imagem'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: '0.375rem'
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && (
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
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              marginBottom: '1.5rem'
            }}>
              <img 
                src={sucessoImg} 
                alt="Sucesso" 
                style={{
                  width: '80px',
                  height: '80px',
                  marginBottom: '1rem'
                }}
              />
              <h3 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                marginBottom: '0.5rem'
              }}>
                Sucesso!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '1rem',
                color: currentTheme.textSecondary
              }}>
                Mídia enviada com sucesso!
              </p>
            </div>
            
            <button
              onClick={() => setShowSuccessModal(false)}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: currentTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <img 
                src={delImg} 
                alt="Excluir" 
                style={{
                  width: '64px',
                  
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                marginBottom: '0.5rem'
              }}>
                Confirmar Exclusão
              </h3>
              <p style={{
                margin: 0,
                fontSize: '1rem',
                color: currentTheme.textSecondary,
                lineHeight: '1.5'
              }}>
                Tem certeza que deseja excluir a mídia <strong>"{mediaToDelete?.title}"</strong>?
                <br />
                Esta ação não pode ser desfeita.
              </p>
            </div>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setMediaToDelete(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary,
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.borderLight;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                Cancelar
              </button>
              
              <button
                onClick={confirmDeleteMedia}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#c82333';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#dc3545';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Sucesso de Exclusão */}
      {showDeleteSuccessModal && (
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
            padding: '2rem',
            width: '90%',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              marginBottom: '1.5rem'
            }}>
              <img 
                src={sucessoImg} 
                alt="Sucesso" 
                style={{
                  width: '80px',
                  height: '80px',
                  marginBottom: '1rem'
                }}
              />
              <h3 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                marginBottom: '0.5rem'
              }}>
                Mídia Excluída!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '1rem',
                color: currentTheme.textSecondary
              }}>
                A mídia foi excluída com sucesso!
              </p>
            </div>
            
            <button
              onClick={() => setShowDeleteSuccessModal(false)}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: currentTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};