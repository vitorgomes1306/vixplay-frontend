import React, { useEffect, useState } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { apiService } from '../services/api'

export const Content = () => {
  const { currentTheme } = useTheme();
  const [panels, setPanels] = useState([]);
  const [selectedPanelId, setSelectedPanelId] = useState('');

  const [availableGlobalMedias, setAvailableGlobalMedias] = useState([]);
  const [associatedGlobalMedias, setAssociatedGlobalMedias] = useState([]);

  const [loadingPanels, setLoadingPanels] = useState(true);
  const [loadingMedias, setLoadingMedias] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal de associação
  const [showAssociateModal, setShowAssociateModal] = useState(false);
  const [assocTargetMedia, setAssocTargetMedia] = useState(null);
  const [assocPanelId, setAssocPanelId] = useState('');

  useEffect(() => {
    loadPanels();
    loadAvailableGlobalMedias();
  }, []);

  useEffect(() => {
    if (selectedPanelId) {
      loadAssociatedGlobalMedias(selectedPanelId);
    }
  }, [selectedPanelId]);

  const loadPanels = async () => {
    setLoadingPanels(true);
    setError('');
    try {
      const resp = await apiService.getPanels();
      const list = resp.data || [];
      setPanels(list);
      if (list.length > 0) {
        setSelectedPanelId(String(list[0].id));
        setAssocPanelId(String(list[0].id));
      }
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
      setError('Erro ao carregar painéis');
    } finally {
      setLoadingPanels(false);
    }
  };

  const loadAvailableGlobalMedias = async () => {
    setLoadingMedias(true);
    setError('');
    try {
      const resp = await apiService.listVisibleMedias();
      const all = resp.data || [];
      const globals = Array.isArray(all) ? all.filter(m => m.mediaGlobal === true) : [];
      setAvailableGlobalMedias(globals);
    } catch (err) {
      console.error('Erro ao carregar mídias globais disponíveis:', err);
      setError('Erro ao carregar mídias globais disponíveis');
    } finally {
      setLoadingMedias(false);
    }
  };

  const loadAssociatedGlobalMedias = async (panelId) => {
    setLoadingMedias(true);
    setError('');
    try {
      const resp = await apiService.getPanelGlobalMedias(panelId);
      setAssociatedGlobalMedias(resp.data || []);
    } catch (err) {
      console.error('Erro ao carregar mídias globais associadas:', err);
      setError('Erro ao carregar mídias globais associadas');
    } finally {
      setLoadingMedias(false);
    }
  };

  // Abrir modal de associação e definir mídia alvo
  const openAssociateModal = (media) => {
    setAssocTargetMedia(media);
    setAssocPanelId(selectedPanelId || (panels[0]?.id ? String(panels[0].id) : ''));
    setShowAssociateModal(true);
  };
  const closeAssociateModal = () => {
    setShowAssociateModal(false);
    setAssocTargetMedia(null);
  };

  const handleAssociateConfirm = async () => {
    if (!assocTargetMedia || !assocPanelId) return;
    setError('');
    setSuccess('');
    try {
      await apiService.post(`/private/panels/${assocPanelId}/associate-global-media-v2`, { globalMediaId: Number(assocTargetMedia.id) });
      setSuccess('Mídia associada ao painel com sucesso');
      closeAssociateModal();
      await Promise.all([
        loadAssociatedGlobalMedias(selectedPanelId || assocPanelId),
        loadAvailableGlobalMedias()
      ]);
    } catch (err) {
      console.error('Erro ao associar mídia:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setError(serverMsg || 'Erro ao associar mídia');
    }
  };

  const handleDisassociate = async (mediaId) => {
    if (!selectedPanelId) return;
    setError('');
    setSuccess('');
    try {
      await apiService.delete(`/private/panels/${selectedPanelId}/disassociate-media/${mediaId}`);
      setSuccess('Mídia desassociada do painel com sucesso');
      await Promise.all([
        loadAssociatedGlobalMedias(selectedPanelId),
        loadAvailableGlobalMedias()
      ]);
    } catch (err) {
      console.error('Erro ao desassociar mídia:', err);
      setError(err.response?.data?.error || 'Erro ao desassociar mídia');
    }
  };

  const styles = {
    container: { padding: '1.5rem' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
    title: { fontSize: '1.5rem', fontWeight: 600, color: currentTheme.textPrimary },
    select: { padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.background, color: currentTheme.textPrimary },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' },
    card: { backgroundColor: currentTheme.cardBackground, border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '1rem' },
    list: { display: 'grid', gap: '0.75rem', maxHeight: '60vh', overflowY: 'auto' },
    mediaItem: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', border: `1px solid ${currentTheme.border}`, borderRadius: '0.375rem', backgroundColor: currentTheme.background },
    mediaTitle: { fontWeight: 600, color: currentTheme.textPrimary },
    mediaMeta: { fontSize: '0.8rem', color: currentTheme.textSecondary },
    buttonPrimary: { backgroundColor: currentTheme.primary, color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.6rem', cursor: 'pointer' },
    buttonDanger: { backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '0.375rem', padding: '0.375rem 0.6rem', cursor: 'pointer' },
    alertError: { backgroundColor: '#fee', color: '#c33', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid #fcc' },
    alertSuccess: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', border: '1px solid #c8e6c9' },
    previewImg: { width: 100, height: 60, objectFit: 'cover', borderRadius: '4px', border: `1px solid ${currentTheme.border}` }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.title}>Conteúdos
                  <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary, fontSize: 12 }}>
              <p>Este é administrado pela Vix Play e atualizado periódicamente.</p>
            </div>  
        </div>

        <div>
          <label style={{ marginRight: '0.5rem', color: currentTheme.textSecondary }}>Painel:</label>
          <select value={selectedPanelId} onChange={(e) => setSelectedPanelId(e.target.value)} style={styles.select}>
            {panels.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div style={styles.alertError}>{error}</div>}
      {success && <div style={styles.alertSuccess}>{success}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={{ ...styles.title, fontSize: '1rem', marginBottom: '0.75rem' }}>Mídias globais disponíveis</div>
          {loadingMedias ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              <div style={{ width: '32px', height: '32px', border: `4px solid ${currentTheme.border}`, borderTop: `4px solid ${currentTheme.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
              Carregando...
            </div>
          ) : availableGlobalMedias.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              <p>Nenhuma mídia global disponível.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {availableGlobalMedias.map(m => (
                <div key={m.id} style={styles.mediaItem}>
                  {m.type === 'PHOTO' ? (
                    <img src={m.url} alt="Preview" style={styles.previewImg} />
                  ) : m.type === 'VIDEO' ? (
                    <video style={{ width: 100, height: 60, borderRadius: '4px', border: `1px solid ${currentTheme.border}` }}>
                      <source src={m.url} type="video/mp4" />
                    </video>
                  ) : (
                    <i className={`bi bi-${m.type === 'RSS' ? 'rss' : 'cloud-sun'}`} style={{ fontSize: '1.5rem', color: currentTheme.textSecondary }}></i>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={styles.mediaTitle}>{m.title}</div>
                    <div style={styles.mediaMeta}>{m.type} • global • {m.duration ? `${m.duration}s` : 'sem duração'}</div>
                  </div>
                  <button style={styles.buttonPrimary} onClick={() => openAssociateModal(m)}>Relacionar</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={{ ...styles.title, fontSize: '1rem', marginBottom: '0.75rem' }}>Mídias globais deste painel</div>
          {loadingMedias ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              <div style={{ width: '32px', height: '32px', border: `4px solid ${currentTheme.border}`, borderTop: `4px solid ${currentTheme.primary}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
              Carregando...
            </div>
          ) : associatedGlobalMedias.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              <p>Este painel não possui mídias globais associadas.</p>
            </div>
          ) : (
            <div style={styles.list}>
              {associatedGlobalMedias.map(m => (
                <div key={m.id} style={styles.mediaItem}>
                  <div style={{ flex: 1 }}>
                    <div style={styles.mediaTitle}>{m.title}</div>
                    <div style={styles.mediaMeta}>{m.type} • {m.duration ? `${m.duration}s` : 'sem duração'} • associado em {m.associatedAt ? new Date(m.associatedAt).toLocaleString() : '-'}</div>
                  </div>
                  <button style={styles.buttonDanger} onClick={() => handleDisassociate(m.mediaId || m.id)}>Desrelacionar</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAssociateModal && assocTargetMedia && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: currentTheme.cardBackground, border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', width: 'min(520px, 96vw)', padding: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>Relacionar mídia ao painel</h3>
            <p style={{ color: currentTheme.textSecondary }}>Selecione o painel que receberá a mídia global:</p>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', color: currentTheme.textSecondary }}>Painel</label>
              <select value={assocPanelId} onChange={(e) => setAssocPanelId(e.target.value)} style={styles.select}>
                {panels.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button style={styles.buttonDanger} onClick={closeAssociateModal}>Cancelar</button>
              <button style={styles.buttonPrimary} onClick={handleAssociateConfirm}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default Content
