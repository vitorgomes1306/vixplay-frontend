import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const GlobalMediasAdmin = () => {
  const { currentTheme } = useTheme();
  const [globalMedias, setGlobalMedias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    file: null,
    duration: 10,
    category: '',
    description: '',
    dateExpire: '',
    active: true
  });
  const [form, setForm] = useState({
    title: '',
    url: '',
    type: '',
    category: '',
    duration: '',
    description: '',
    dateExpire: '',
    active: true
  });

  // Filtros e modal de detalhes
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsPanels, setDetailsPanels] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadGlobalMedias();
  }, []);

  const loadGlobalMedias = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await apiService.listVisibleMedias();
      const all = Array.isArray(resp.data) ? resp.data : [];
      const globals = all.filter((m) => m.mediaGlobal === true || m.mediaGlobal === 1 || m.mediaGlobal === 'true');
      setGlobalMedias(globals);
    } catch (err) {
      console.error('Erro ao carregar mídias globais:', err);
      setError('Erro ao carregar mídias globais');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setForm({
      title: '',
      url: '',
      type: '',
      category: '',
      duration: '',
      description: '',
      dateExpire: '',
      active: true
    });
    setShowCreateModal(true);
  };

  const openEditModal = (media) => {
    setSelectedMedia(media);
    setForm({
      title: media.title || '',
      url: media.url || '',
      type: media.type || '',
      category: media.category || '',
      duration: media.duration || '',
      description: media.description || '',
      dateExpire: media.expiresAt ? new Date(media.expiresAt).toISOString().slice(0, 10) : '',
      active: media.active !== undefined ? media.active : true
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setSelectedMedia(null);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const openUploadModal = () => {
    setShowUploadModal(true);
    setUploadForm({ title: '', file: null, duration: 10, category: '', description: '', dateExpire: '', active: true });
    setUploadProgress(0);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploading(false);
    setUploadProgress(0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file }));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      setError('Por favor, selecione um arquivo.');
      return;
    }
    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      // Envie apenas o campo esperado pelo backend (Multer .single('file'))
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title || uploadForm.file.name);
      formData.append('duration', uploadForm.duration);
      const token = localStorage.getItem('vixplay_token');
      if (token) {
        formData.append('token', token);
      }

      const uploadResp = await apiService.uploadMedia(formData, {
        onUploadProgress: (e) => {
          if (e.total) {
            const percentComplete = (e.loaded / e.total) * 100;
            setUploadProgress(percentComplete);
          }
        }
      });

      const respData = uploadResp?.data || {};
      const detectedType = (respData.type || uploadForm.file?.type || '').toLowerCase();
      const prismaType = detectedType.includes('video') ? 'VIDEO' : 'PHOTO';

      await apiService.createMedia({
        title: uploadForm.title || uploadForm.file.name,
        url: respData.url,
        type: prismaType,
        duration: uploadForm.duration ? Number(uploadForm.duration) : undefined,
        description: uploadForm.description || undefined,
        expiresAt: uploadForm.dateExpire || undefined,
        category: uploadForm.category || undefined,
        active: uploadForm.active,
        mediaGlobal: true
      });

      setSuccess('Mídia global enviada e criada com sucesso');
      setShowUploadModal(false);
      await loadGlobalMedias();
    } catch (err) {
      console.error('Erro ao enviar/criar mídia global:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao enviar/criar mídia global');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setSuccess('');
    try {
      if (!form.title || !form.url || !form.type) {
        setError('Título, URL e tipo são obrigatórios');
        return;
      }
      const payload = {
        title: form.title,
        url: form.url,
        type: form.type,
        duration: form.duration ? Number(form.duration) : undefined,
        description: form.description || undefined,
        expiresAt: form.dateExpire || undefined,
        category: form.category || undefined,
        active: form.active,
        mediaGlobal: true
      };
      await apiService.createMedia(payload);
      setSuccess('Mídia global criada com sucesso');
      closeModals();
      await loadGlobalMedias();
    } catch (err) {
      console.error('Erro ao criar mídia global:', err);
      setError(err.response?.data?.error || 'Erro ao criar mídia global');
    }
  };

  const handleUpdate = async () => {
    if (!selectedMedia) return;
    setError('');
    setSuccess('');
    try {
      if (!form.title || !form.url || !form.type) {
        setError('Título, URL e tipo são obrigatórios');
        return;
      }
      const payload = {
        title: form.title,
        url: form.url,
        type: form.type,
        duration: form.duration !== '' ? Number(form.duration) : undefined,
        description: form.description || undefined,
        expiresAt: form.dateExpire || undefined,
        category: form.category || undefined,
        active: form.active,
        mediaGlobal: true
      };
      await apiService.updateMedia(selectedMedia.id, payload);
      setSuccess('Mídia global atualizada com sucesso');
      closeModals();
      await loadGlobalMedias();
    } catch (err) {
      console.error('Erro ao atualizar mídia global:', err);
      setError(err.response?.data?.error || 'Erro ao atualizar mídia global');
    }
  };

  const handleDelete = async (media) => {
    if (!window.confirm(`Excluir a mídia global "${media.title}"?`)) return;
    try {
      await apiService.deleteMedia(media.id);
      setSuccess('Mídia global excluída com sucesso');
      await loadGlobalMedias();
    } catch (err) {
      console.error('Erro ao excluir mídia global:', err);
      setError(err.response?.data?.error || 'Erro ao excluir mídia global');
    }
  };

  const styles = {
    container: { padding: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    title: { fontSize: '1.5rem', fontWeight: 600, color: currentTheme.textPrimary },
    actions: { display: 'flex', gap: '0.5rem' },
    buttonPrimary: { backgroundColor: currentTheme.primary, color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer' },
    buttonDanger: { backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.6rem', cursor: 'pointer' },
    buttonSecondary: { backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary, border: `1px solid ${currentTheme.border}`, borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', backgroundColor: currentTheme.cardBackground, border: `1px solid ${currentTheme.border}` },
    th: { textAlign: 'left', padding: '0.5rem', borderBottom: `1px solid ${currentTheme.border}`, color: currentTheme.textSecondary, fontWeight: 500 },
    td: { padding: '0.5rem', borderBottom: `1px solid ${currentTheme.border}`, color: currentTheme.textPrimary },
    badgeActive: { backgroundColor: '#27ae60', color: 'white', borderRadius: '0.25rem', padding: '0.125rem 0.375rem', fontSize: '0.75rem' },
    badgeInactive: { backgroundColor: '#c0392b', color: 'white', borderRadius: '0.25rem', padding: '0.125rem 0.375rem', fontSize: '0.75rem' },
    alertError: { backgroundColor: '#fee', color: '#c33', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid #fcc' },
    alertSuccess: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid #c8e6c9' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { backgroundColor: currentTheme.cardBackground, border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', width: 'min(700px, 96vw)', maxHeight: '90vh', overflow: 'auto', padding: '1rem' },
    input: { width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.background, color: currentTheme.textPrimary },
    filtersCard: { backgroundColor: currentTheme.cardBackground, border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem' },
    label: { fontSize: '0.9rem', color: currentTheme.textSecondary, marginBottom: '0.25rem' },
    select: { width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.background, color: currentTheme.textPrimary },
    previewImg: { maxWidth: '150px', maxHeight: '90px', objectFit: 'cover', borderRadius: '4px' }
  };

  // Mapas de rótulos
  const categoryLabels = {
    MES_SAZONAL: 'Mês Sazonal',
    NOTICIAS_LOCAIS: 'Notícias Locais',
    ESPORTES: 'Esportes',
    DICAS: 'Dicas',
    CURIOSIDADES: 'Curiosidades',
    QUIZ: 'Quiz',
    VOCE_SABIA: 'Você Sabia?'
  };
  const typeLabels = { PHOTO: 'Foto', VIDEO: 'Vídeo', RSS: 'RSS', WEATHER: 'Clima' };

  // Abrir/fechar detalhes
  const openDetailsModal = async (media) => {
    setSelectedMedia(media);
    setShowDetailsModal(true);
    setDetailsLoading(true);
    try {
      const resp = await apiService.getPanelsForMedia(media.id);
      const panels = Array.isArray(resp.data) ? resp.data : (resp.data?.panels || []);
      setDetailsPanels(panels);
    } catch (err) {
      console.error('Erro ao carregar detalhes da mídia:', err);
      setError(err.response?.data?.error || 'Erro ao carregar detalhes da mídia');
    } finally {
      setDetailsLoading(false);
    }
  };
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setDetailsPanels([]);
    setSelectedMedia(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Mídias Globais (Admin)</div>
        <div style={styles.actions}>
          <button style={styles.buttonPrimary} onClick={openUploadModal}>+ Nova mídia global</button>
         
        </div>
      </div>

      {error && <div style={styles.alertError}>{error}</div>}
      {success && <div style={styles.alertSuccess}>{success}</div>}

      <div style={styles.filtersCard}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          <div>
            <div style={styles.label}>Filtrar por Categoria:</div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={styles.select}>
              <option value="">Todas as Categorias</option>
              <option value="MES_SAZONAL">Mês Sazonal</option>
              <option value="NOTICIAS_LOCAIS">Notícias Locais</option>
              <option value="ESPORTES">Esportes</option>
              <option value="DICAS">Dicas</option>
              <option value="CURIOSIDADES">Curiosidades</option>
              <option value="QUIZ">Quiz</option>
              <option value="VOCE_SABIA">Você Sabia?</option>
            </select>
          </div>
          <div>
            <div style={styles.label}>Filtrar por Tipo:</div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={styles.select}>
              <option value="">Todos os Tipos</option>
              <option value="PHOTO">Foto</option>
              <option value="VIDEO">Vídeo</option>
              <option value="RSS">RSS</option>
              <option value="WEATHER">Clima</option>
            </select>
          </div>
          <div>
            <div style={styles.label}>Buscar pelo título:</div>
            <input value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)} placeholder="Digite o título..." style={styles.select} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: currentTheme.textSecondary }}>
          <div style={{ width: '40px', height: '40px', border: `4px solid ${currentTheme.border}`, borderTop: `4px solid ${currentTheme.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          Carregando mídias globais...
        </div>
      ) : globalMedias.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: currentTheme.textSecondary }}>
          <i className="bi bi-collection" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}></i>
          <p>Nenhuma mídia global encontrada.</p>
        </div>
      ) : (
        // Lista filtrada
        (() => {
          const filteredMedias = globalMedias.filter((m) => {
            const matchCategoria = !filterCategory || m.category === filterCategory;
            const matchTipo = !filterType || m.type === filterType;
            const q = filterQuery.trim().toLowerCase();
            const matchBusca = !q || (m.title || '').toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q);
            return matchCategoria && matchTipo && matchBusca;
          });
          return (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Preview</th>
                  <th style={styles.th}>Título</th>
                  <th style={styles.th}>Categoria</th>
                  <th style={styles.th}>Tipo</th>
                  <th style={styles.th}>Duração</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Expira em</th>
                  <th style={styles.th}>Criado em</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredMedias.map((m) => (
                  <tr key={m.id}>
                    <td style={styles.td}>
                      {m.type === 'PHOTO' ? (
                        <img src={m.url} alt="Preview" style={styles.previewImg} />
                      ) : m.type === 'VIDEO' ? (
                        <video style={{ ...styles.previewImg }} controls>
                          <source src={m.url} type="video/mp4" />
                        </video>
                      ) : (
                        <i className={`bi bi-${m.type === 'RSS' ? 'rss' : 'cloud-sun'}`} style={{ fontSize: '1.5rem', color: currentTheme.textSecondary }}></i>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600 }}>{m.title}</div>
                      {m.description && (
                        <div style={{ fontSize: '0.8rem', color: currentTheme.textSecondary }}>{m.description}</div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: currentTheme.textSecondary }}>{m.url}</div>
                    </td>
                    <td style={styles.td}>{categoryLabels[m.category] || m.category || '-'}</td>
                    <td style={styles.td}>{typeLabels[m.type] || m.type || '-'}</td>
                    <td style={styles.td}>{m.duration ? `${m.duration}s` : '-'}</td>
                    <td style={styles.td}>
                      {(m.active ?? true) ? (
                        <span style={styles.badgeActive}>Ativa</span>
                      ) : (
                        <span style={styles.badgeInactive}>Inativa</span>
                      )}
                    </td>
                    <td style={styles.td}>{m.expiresAt ? new Date(m.expiresAt).toLocaleDateString() : <span style={{ color: currentTheme.textSecondary }}>Sem expiração</span>}</td>
                    <td style={styles.td}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button style={styles.buttonSecondary} onClick={() => openDetailsModal(m)}>Ver detalhes</button>
                        <button style={styles.buttonSecondary} onClick={() => openEditModal(m)}>Editar</button>
                        <button style={styles.buttonDanger} onClick={() => handleDelete(m)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        })()
      )}

      {/* Modal de detalhes da mídia global */}
      {showDetailsModal && selectedMedia && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Detalhes da Mídia Global</h3>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
              {selectedMedia.type === 'PHOTO' ? (
                <img src={selectedMedia.url} alt="Preview" style={styles.previewImg} />
              ) : selectedMedia.type === 'VIDEO' ? (
                <video style={{ ...styles.previewImg }} controls>
                  <source src={selectedMedia.url} type="video/mp4" />
                </video>
              ) : (
                <i className={`bi bi-${selectedMedia.type === 'RSS' ? 'rss' : 'cloud-sun'}`} style={{ fontSize: '1.5rem', color: currentTheme.textSecondary }}></i>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedMedia.title}</div>
                {selectedMedia.description && (
                  <div style={{ fontSize: '0.9rem', color: currentTheme.textSecondary }}>{selectedMedia.description}</div>
                )}
                <div style={{ fontSize: '0.85rem', color: currentTheme.textSecondary }}>{selectedMedia.url}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={styles.label}>Categoria</div>
                <div>{categoryLabels[selectedMedia.category] || selectedMedia.category || '-'}</div>
              </div>
              <div>
                <div style={styles.label}>Tipo</div>
                <div>{typeLabels[selectedMedia.type] || selectedMedia.type || '-'}</div>
              </div>
              <div>
                <div style={styles.label}>Duração</div>
                <div>{selectedMedia.duration ? `${selectedMedia.duration}s` : '-'}</div>
              </div>
              <div>
                <div style={styles.label}>Status</div>
                <div>{(selectedMedia.active ?? true) ? 'Ativa' : 'Inativa'}</div>
              </div>
              <div>
                <div style={styles.label}>Expira em</div>
                <div>{selectedMedia.expiresAt ? new Date(selectedMedia.expiresAt).toLocaleDateString() : 'Sem expiração'}</div>
              </div>
              <div>
                <div style={styles.label}>Criado em</div>
                <div>{selectedMedia.createdAt ? new Date(selectedMedia.createdAt).toLocaleString() : '-'}</div>
              </div>
            </div>

            <div>
              <div style={{ ...styles.label, marginBottom: '0.5rem' }}>Painéis associados</div>
              {detailsLoading ? (
                <div style={{ color: currentTheme.textSecondary }}>Carregando painéis...</div>
              ) : (detailsPanels && detailsPanels.length > 0) ? (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {detailsPanels.map((p) => (
                    <div key={p.id} style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.375rem', padding: '0.5rem' }}>
                      <div style={{ fontWeight: 600 }}>{p.name || p.panelName || `Painel ${p.id}`}</div>
                      <div style={{ fontSize: '0.85rem', color: currentTheme.textSecondary }}>ID: {p.id}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: currentTheme.textSecondary }}>Nenhum painel associado.</div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button style={styles.buttonSecondary} onClick={closeDetailsModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {(showCreateModal || showEditModal) && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>{showCreateModal ? 'Nova mídia global' : 'Editar mídia global'}</h3>

            <label>Título</label>
            <input name="title" value={form.title} onChange={handleChange} style={styles.input} />

            <label>URL</label>
            <input name="url" value={form.url} onChange={handleChange} style={styles.input} />

            <label>Tipo</label>
            <select name="type" value={form.type} onChange={handleChange} style={styles.input}>
              <option value="">Selecione um tipo</option>
              <option value="PHOTO">Foto</option>
              <option value="VIDEO">Vídeo</option>
              <option value="RSS">RSS</option>
              <option value="WEATHER">Clima</option>
            </select>

            <label>Categoria</label>
            <select name="category" value={form.category} onChange={handleChange} style={styles.input}>
              <option value="">Selecione uma categoria</option>
              <option value="MES_SAZONAL">Mês Sazonal</option>
              <option value="NOTICIAS_LOCAIS">Notícias Locais</option>
              <option value="ESPORTES">Esportes</option>
              <option value="DICAS">Dicas</option>
              <option value="CURIOSIDADES">Curiosidades</option>
              <option value="QUIZ">Quiz</option>
              <option value="VOCE_SABIA">Você Sabia?</option>
            </select>

            <label>Duração (segundos)</label>
            <input name="duration" type="number" value={form.duration} onChange={handleChange} style={styles.input} />

            <label>Descrição</label>
            <textarea name="description" value={form.description} onChange={handleChange} style={{ ...styles.input, minHeight: '100px' }} />

            <label>Data de expiração</label>
            <input name="dateExpire" type="date" value={form.dateExpire} onChange={handleChange} style={styles.input} />

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" name="active" checked={form.active} onChange={handleChange} />
              Ativa
            </label>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={styles.buttonSecondary} onClick={closeModals}>Cancelar</button>
              {showCreateModal ? (
                <button style={styles.buttonPrimary} onClick={handleCreate}>Criar</button>
              ) : (
                <button style={styles.buttonPrimary} onClick={handleUpdate}>Salvar</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={{ marginTop: 0 }}>Upload de mídia global</h3>

            <label>Título</label>
            <input value={uploadForm.title} onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))} style={styles.input} />

            <label>Arquivo</label>
            <input type="file" onChange={handleFileChange} style={styles.input} />

            <label>Categoria</label>
             <select value={uploadForm.category} onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))} style={styles.input}>
               <option value="">Selecione uma categoria</option>
               <option value="MES_SAZONAL">Mês Sazonal</option>
               <option value="NOTICIAS_LOCAIS">Notícias Locais</option>
               <option value="ESPORTES">Esportes</option>
               <option value="DICAS">Dicas</option>
               <option value="CURIOSIDADES">Curiosidades</option>
               <option value="QUIZ">Quiz</option>
               <option value="VOCE_SABIA">Você Sabia?</option>
             </select>

            <label>Duração (segundos)</label>
            <input type="number" value={uploadForm.duration} onChange={(e) => setUploadForm(prev => ({ ...prev, duration: e.target.value }))} style={styles.input} />

            <label>Descrição</label>
            <textarea value={uploadForm.description} onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))} style={{ ...styles.input, minHeight: '100px' }} />

            <label>Data de expiração</label>
            <input type="date" value={uploadForm.dateExpire} onChange={(e) => setUploadForm(prev => ({ ...prev, dateExpire: e.target.value }))} style={styles.input} />

            {uploading && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ height: '8px', backgroundColor: currentTheme.border, borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: currentTheme.primary }}></div>
                </div>
                <div style={{ fontSize: '0.85rem', color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
                  {Math.floor(uploadProgress)}%
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button style={styles.buttonSecondary} onClick={closeUploadModal} type="button">Cancelar</button>
              <button style={styles.buttonPrimary} onClick={handleUploadSubmit} disabled={uploading || !uploadForm.file} type="button">
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalMediasAdmin;