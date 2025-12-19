import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from 'recharts';
import { Monitor, Layout, MonitorOff, DollarSign, Image, Video, FileText, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import WelcomeImg from '../assets/img/welcome.png';
import { useTheme } from '../contexts/ThemeContext';

function Dash() {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [stats, setStats] = useState({
    devices: 0,
    panels: 0,
    medias: 0,
    campaigns: 0,
    clients: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para modais
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Estados para formulários
  const [deviceFormData, setDeviceFormData] = useState({
    deviceKey: ['', '', '', '', '', ''],
    name: '',
    format: 'HORIZONTAL',
    panelId: '',
    type: 'display',
    geoLocation: '',
    sendNotification: false,
    showClientInfo: false,
    personalTextDevice: ''
  });

  const [panelFormData, setPanelFormData] = useState({
    name: '',
    description: '',
    type: 'FULL_SCREEN'
  });

  const [panels, setPanels] = useState([]);

  // Dados fictícios para os gráficos
  const [deviceStatus, setDeviceStatus] = useState([
    { name: 'Online', value: 0, color: '#10b981' },
    { name: 'Offline', value: 0, color: '#ef4444' }
  ]);

  const [financialData, setFinancialData] = useState([
    // Inicializa vazio; será preenchido com valores reais
  ]);

  const monthLabels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const extractPaidAmountFromNotes = (notes) => {
    if (!notes || typeof notes !== 'string') return null;
    const match = notes.match(/PAID_AMOUNT\s*:\s*([0-9.,]+)/i);
    if (!match) return null;
    const raw = match[1].replace(/\./g, '').replace(',', '.');
    const n = parseFloat(raw);
    return isNaN(n) ? null : n;
  };

  const buildFinancialDataFromPayments = (allPayments) => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
    }
    const data = months.map(({ year, monthIndex }) => {
      const monthNumber = monthIndex + 1;
      const label = monthLabels[monthIndex];
      let paid = 0;
      let overdue = 0;
      let open = 0;
      allPayments.forEach(p => {
        const refMonth = Number(p.referenceMonth);
        const refYear = Number(p.referenceYear);
        if (refMonth === monthNumber && refYear === year) {
          const val = typeof p.value === 'number' ? p.value : Number(p.value) || 0;
          if (p.status === 'PAID') {
            const amt = extractPaidAmountFromNotes(p.notes) ?? val;
            paid += amt || 0;
          } else if (p.status === 'PENDING') {
            const due = p.dueDate ? new Date(p.dueDate) : null;
            const normalize = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
            const isOverdue = due && normalize(due) < normalize(now);
            if (isOverdue) {
              overdue += val || 0;
            } else {
              open += val || 0;
            }
          }
        }
      });
      return { month: label, paid: Math.round(paid), open: Math.round(open), overdue: Math.round(overdue) };
    });
    return data;
  };

  const deriveMediaTypes = (mediasArray) => {
    const counts = { images: 0, videos: 0, documents: 0 };
    mediasArray.forEach(m => {
      const type = (m.type || m.contentType || m.mime || '').toLowerCase();
      const title = (m.title || m.filename || '').toLowerCase();
      const extMatch = title.match(/\.([a-z0-9]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      const isImage = type.includes('image') || type === 'photo' || ['jpg','jpeg','png','gif','bmp','webp'].includes(ext);
      const isVideo = type.includes('video') || ['mp4','webm','avi','mov','mkv'].includes(ext);
      const isDocument = type.includes('document') || type.includes('pdf') || ['pdf','doc','docx','ppt','pptx','xls','xlsx','txt'].includes(ext);
      if (isImage) counts.images++;
      else if (isVideo) counts.videos++;
      else if (isDocument) counts.documents++;
      else {
        const fileType = (m.fileType || '').toLowerCase();
        if (fileType.includes('image')) counts.images++;
        else if (fileType.includes('video')) counts.videos++;
        else counts.documents++;
      }
    });
    return [
      { name: 'Imagens', value: counts.images, color: '#3b82f6' },
      { name: 'Vídeos', value: counts.videos, color: '#f59e0b' },
    
    ];
  };

  const [mediaTypes, setMediaTypes] = useState([
    { name: 'Imagens', value: 0, color: '#3b82f6' },
    { name: 'Vídeos', value: 0, color: '#f59e0b' },
    { name: 'Documentos', value: 0, color: '#8b5cf6' }
  ]);

  const [recentMedias, setRecentMedias] = useState([]);

  // Estados de mídias globais
  const [globalMedias, setGlobalMedias] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const getDashMediaIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('video')) return 'bi-play-circle-fill';
    if (t.includes('image') || t === 'photo') return 'bi-image-fill';
    if (t.includes('audio')) return 'bi-music-note-beamed';
    if (t.includes('document') || t.includes('pdf')) return 'bi-file-pdf-fill';
    return 'bi-file-earmark-fill';
  };

  const loadGlobalMedias = async () => {
    try {
      setGlobalLoading(true);
      setGlobalError('');
      const resp = await apiService.getGlobalMedias();
      setGlobalMedias(resp.data || []);
    } catch (err) {
      console.error('Erro ao carregar mídias globais:', err);
      setGlobalError('Erro ao carregar mídias globais');
    } finally {
      setGlobalLoading(false);
    }
  };

  useEffect(() => {
    loadGlobalMedias();
  }, []);

  // Estados para boas-vindas
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [avaliationPeriod, setAvaliationPeriod] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchPanels();
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiService.getProfile();
      const profile = response.data || {};
      setAvaliationPeriod(profile.avaliationPeriod ?? null);
      if (profile.textWelcome === true) {
        setShowWelcomeModal(true);
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    fetchPanels();
  }, []);

  // Função para buscar painéis
  const fetchPanels = async () => {
    try {
      const response = await apiService.getPanels();
      setPanels(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
    }
  };

  // Funções para manipular formulário de dispositivo
  const handleDeviceKeyChange = (index, value) => {
    if (value.length <= 1 && /^[A-Za-z0-9]*$/.test(value)) {
      const newKey = [...deviceFormData.deviceKey];
      newKey[index] = value.toUpperCase();
      setDeviceFormData({ ...deviceFormData, deviceKey: newKey });
      
      // Auto-focus no próximo input
      if (value && index < 5) {
        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const resetDeviceForm = () => {
    setDeviceFormData({
      deviceKey: ['', '', '', '', '', ''],
      name: '',
      format: 'HORIZONTAL',
      panelId: '',
      type: 'display',
      geoLocation: '',
      sendNotification: false,
      showClientInfo: false,
      personalTextDevice: ''
    });
    setModalError('');
  };

  const resetPanelForm = () => {
    setPanelFormData({
      name: '',
      description: '',
      type: 'FULL_SCREEN'
    });
    setModalError('');
  };

  // Função para criar dispositivo
  const handleCreateDevice = async (e) => {
    e.preventDefault();
    
    if (!deviceFormData.name.trim()) {
      setModalError('Nome do dispositivo é obrigatório');
      return;
    }
    
    const deviceKey = deviceFormData.deviceKey.join('');
    if (deviceKey.length !== 6) {
      setModalError('Chave do dispositivo deve ter 6 dígitos');
      return;
    }
    
    if (!deviceFormData.panelId) {
      setModalError('Selecione um painel');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError('');
      
      const deviceData = {
        deviceKey,
        name: deviceFormData.name,
        format: deviceFormData.format,
        panelId: parseInt(deviceFormData.panelId),
        type: deviceFormData.type,
        geoLocation: deviceFormData.geoLocation || null,
        sendNotification: deviceFormData.sendNotification,
        showClientInfo: deviceFormData.showClientInfo,
        personalTextDevice: deviceFormData.personalTextDevice || null
      };

      await apiService.createDevice(deviceData);
      setShowDeviceModal(false);
      resetDeviceForm();
      fetchDashboardStats(); // Recarregar estatísticas
    } catch (err) {
      console.error('Erro ao criar dispositivo:', err);
      setModalError('Erro ao criar dispositivo. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para criar painel
  const handleCreatePanel = async (e) => {
    e.preventDefault();
    
    if (!panelFormData.name.trim()) {
      setModalError('Nome do painel é obrigatório');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError('');
      
      const panelData = {
        name: panelFormData.name.trim(),
        description: panelFormData.description.trim(),
        type: panelFormData.type,
        active: true
      };

      await apiService.createPanel(panelData);
      setShowPanelModal(false);
      resetPanelForm();
      fetchDashboardStats(); // Recarregar estatísticas
      fetchPanels(); // Recarregar lista de painéis
    } catch (err) {
      console.error('Erro ao criar painel:', err);
      setModalError('Erro ao criar painel. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      console.log('Iniciando carregamento das estatísticas do dashboard...');
      
      // Função auxiliar para fazer requisições com retry
      const fetchWithRetry = async (fetchFunction, name, maxRetries = 2) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`Tentativa ${attempt} para ${name}...`);
            const result = await fetchFunction();
            console.log(`✓ ${name} carregado com sucesso`);
            return result;
          } catch (error) {
            console.warn(`✗ Tentativa ${attempt} falhou para ${name}:`, error.message);
            if (attempt === maxRetries) {
              console.error(`✗ Todas as tentativas falharam para ${name}`);
              return { data: [] }; // Retorna dados vazios em caso de falha
            }
            // Aguarda 1 segundo antes da próxima tentativa
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      };

      // Executa todas as requisições com retry
      const [devicesRes, panelsRes, mediasRes, campaignsRes, clientsRes] = await Promise.allSettled([
        fetchWithRetry(() => apiService.getDevices(), 'Dispositivos'),
        fetchWithRetry(() => apiService.getPanels(), 'Painéis'),
        fetchWithRetry(() => apiService.getMedias(), 'Mídias'),
        fetchWithRetry(() => apiService.getCampaigns(), 'Campanhas'),
        fetchWithRetry(() => apiService.getClients(), 'Clientes')
      ]);

      // Processa os resultados
      const devices = devicesRes.status === 'fulfilled' ? devicesRes.value.data : [];
      const panels = panelsRes.status === 'fulfilled' ? panelsRes.value.data : [];
      const medias = mediasRes.status === 'fulfilled' ? mediasRes.value.data : [];
      const campaigns = campaignsRes.status === 'fulfilled' ? campaignsRes.value.data : [];
      const clients = clientsRes.status === 'fulfilled' ? clientsRes.value.data : [];

      // Log dos resultados
      console.log('Resultados finais:', {
        devices: devices.length,
        panels: panels.length,
        medias: medias.length,
        campaigns: campaigns.length,
        clients: clients.length
      });

      const newStats = {
        devices: devices.length,
        panels: panels.length,
        medias: medias.length,
        campaigns: campaigns.length,
        clients: clients.length
      };

      setStats(newStats);

      // Calcular dispositivos online/offline baseado nos dados reais
      const onlineDevices = devices.filter(device => 
        device.status === 'Ativo' && device.statusDevice === true
      ).length;
      const offlineDevices = devices.filter(device => 
        device.status === 'Ativo' && device.statusDevice === false
      ).length;
      const inactiveDevices = devices.filter(device => 
        device.status !== 'Ativo'
      ).length;
      
      setDeviceStatus([
        { name: 'Online', value: onlineDevices, color: '#10b981' },
        { name: 'Offline', value: offlineDevices, color: '#ef4444' },
        { name: 'Inativos', value: inactiveDevices, color: '#6b7280' }
      ]);

      // Tipos de mídia reais a partir dos dados
      setMediaTypes(deriveMediaTypes(medias));

      // Buscar mídias recentes (simulado)
      setRecentMedias([
        { id: 1, name: 'Promoção Verão 2024', type: 'image', thumbnail: '/api/placeholder/80/60' },
        { id: 2, name: 'Video Institucional', type: 'video', thumbnail: '/api/placeholder/80/60' },
        { id: 3, name: 'Banner Black Friday', type: 'image', thumbnail: '/api/placeholder/80/60' },
        { id: 4, name: 'Apresentação Q4', type: 'document', thumbnail: '/api/placeholder/80/60' }
      ]);

      // Carregar parcelas mensais das campanhas recorrentes e montar gráfico real
      try {
        const recurringCampaigns = campaigns.filter(c => c.isRecurring || c.campaignType === 'recorrente');
        const paymentResponses = await Promise.allSettled(
          recurringCampaigns.map(c => apiService.getMonthlyPayments(c.id))
        );
        const allPayments = [];
        paymentResponses.forEach(res => {
          if (res.status === 'fulfilled') {
            const mp = res.value?.data?.monthlyPayments || res.value?.data || [];
            allPayments.push(...mp);
          }
        });

        // Incluir campanhas únicas (não recorrentes) como pagamentos únicos no gráfico
        const uniqueCampaigns = campaigns.filter(c => !(c.isRecurring || c.campaignType === 'recorrente'));
        uniqueCampaigns.forEach(c => {
          const val = typeof c.value === 'number' ? c.value : Number(c.value) || 0;
          const d = c.dueDate ? new Date(c.dueDate) : null;
          if (!val || !d) return; // precisa de valor e vencimento
          const paymentLike = {
            referenceMonth: d.getMonth() + 1,
            referenceYear: d.getFullYear(),
            status: (c.paymentStatus === 'PAGO') ? 'PAID' : 'PENDING',
            value: val,
            dueDate: c.dueDate
          };
          allPayments.push(paymentLike);
        });

        setFinancialData(buildFinancialDataFromPayments(allPayments));
      } catch (e) {
        console.warn('Falha ao carregar parcelas mensais para gráfico financeiro:', e);
      }

      setError('');
    } catch (err) {
      console.error('Erro ao carregar estatísticas do dashboard:', err);
      setError('Erro ao carregar dados do dashboard');
      // Define valores padrão em caso de erro geral
      setStats({
        devices: 0,
        panels: 0,
        medias: 0,
        campaigns: 0,
        clients: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '1.2rem',
        color: currentTheme.textSecondary
      }}>
        Carregando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: `${currentTheme.error}20`,
        border: `1px solid ${currentTheme.border}`,
        color: currentTheme.error,
        padding: '0.75rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.875rem'
      }}>
        {error}
      </div>
    );
  }

  const handleWelcomeConfirm = async () => {
    try {
      if (dontShowAgain) {
        await apiService.updateTextWelcome();
      }
      setShowWelcomeModal(false);
    } catch (err) {
      console.error('Erro ao atualizar preferência de boas-vindas:', err);
      setShowWelcomeModal(false);
    }
  };

  return (
    <div>
      {showWelcomeModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '12px', padding: '24px',
            width: '90%', maxWidth: '520px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <img src={WelcomeImg} alt="Bem-vindo" style={{ maxWidth: '100%', height: 'auto' }} />
            </div>
            <h2 style={{ marginTop: 0 }}>Por que preciso completar meu cadastro?</h2>
            <p>Para que todas os recusros do sistema funcionem corretamente, é necessário que você preencha alguns campos do seu perfil como nome da empresa, logomarca, dia de vencimento, etc.</p>
            <a href="profile" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>Ir para perfil</a>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center' }}>
              <input
                id="dontShowAgain"
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <label htmlFor="dontShowAgain">Não mostrar novamente</label>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWelcomeModal(false)} style={{ marginRight: '8px', backgroundColor: '#eb2525ff', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px' }}>Fechar</button>
              <button onClick={handleWelcomeConfirm} style={{ backgroundColor: '#229b06dc', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px' }}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Section */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderRadius: '0.5rem',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: currentTheme.shadow,
        border: `1px solid ${currentTheme.border}`
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: currentTheme.textPrimary,
          margin: '0 0 0.5rem 0'
        }}>
          Bem-vindo ao Vix Play
        </h1>
        <p style={{
          color: currentTheme.textSecondary,
          fontSize: '1.1rem',
          margin: 0
        }}>
          Gerencie seus paineis, dispositivos, midias, clientes e campanhas de forma rápida e eficiente
        </p>
      </div>


      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <a href="/devices" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: currentTheme.shadow,
            borderLeft: `4px solid ${currentTheme.primary}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.s ease',
            transform: 'translateX(0)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderLeftWidth = '8px';
            e.currentTarget.style.transform = 'translateX(2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderLeftWidth = '4px';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>Dispositivos</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: currentTheme.primary, margin: 0 }}>{stats.devices}</p>
              </div>
              <Monitor size={32} style={{ color: currentTheme.primary, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: currentTheme.textSecondary }}>
              <TrendingUp size={16} style={{ marginRight: '0.25rem', color: currentTheme.success }} />
              +12% este mês
            </div>
          </div>
        </a>

        <a href="/panels" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: currentTheme.shadow,
            borderLeft: `4px solid ${currentTheme.success}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: 'translateX(0)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderLeftWidth = '8px';
            e.currentTarget.style.transform = 'translateX(2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderLeftWidth = '4px';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>Painéis</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: currentTheme.success, margin: 0 }}>{stats.panels}</p>
              </div>
              <Layout size={32} style={{ color: currentTheme.success, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: currentTheme.textSecondary }}>
              <TrendingUp size={16} style={{ marginRight: '0.25rem', color: currentTheme.success }} />
              +8% este mês
            </div>
          </div>
        </a>

        <a href="/medias" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: currentTheme.shadow,
            borderLeft: `4px solid ${currentTheme.warning}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: 'translateX(0)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderLeftWidth = '8px';
            e.currentTarget.style.transform = 'translateX(2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderLeftWidth = '4px';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>Mídias</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: currentTheme.warning, margin: 0 }}>{stats.medias}</p>
              </div>
              <Image size={32} style={{ color: currentTheme.warning, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: currentTheme.textSecondary }}>
              <TrendingUp size={16} style={{ marginRight: '0.25rem', color: currentTheme.success }} />
              +25% este mês
            </div>
          </div>
        </a>

        <a href="/campaigns" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: currentTheme.shadow,
            borderLeft: `4px solid ${currentTheme.error}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: 'translateX(0)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderLeftWidth = '8px';
            e.currentTarget.style.transform = 'translateX(2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderLeftWidth = '4px';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>Campanhas</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: currentTheme.error, margin: 0 }}>{stats.campaigns}</p>
              </div>
              <TrendingUp size={32} style={{ color: currentTheme.error, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: currentTheme.textSecondary }}>
              <TrendingDown size={16} style={{ marginRight: '0.25rem', color: currentTheme.error }} />
              -3% este mês
            </div>
          </div>
        </a>

        <a href="/clients" style={{ textDecoration: 'none' }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            padding: '1rem',
            boxShadow: currentTheme.shadow,
            borderLeft: `4px solid ${currentTheme.primary}`,
            cursor: 'pointer',
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: 'translateX(0)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderLeftWidth = '8px';
            e.currentTarget.style.transform = 'translateX(2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderLeftWidth = '4px';
            e.currentTarget.style.transform = 'translateX(0)';
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>Clientes</h3>
                <p style={{ fontSize: '1.5rem', fontWeight: '700', color: currentTheme.primary, margin: 0 }}>{stats.clients}</p>
              </div>
              <DollarSign size={32} style={{ color: currentTheme.primary, opacity: 0.7 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem', fontSize: '0.8rem', color: currentTheme.textSecondary }}>
              <TrendingUp size={16} style={{ marginRight: '0.25rem', color: currentTheme.success }} />
              +15% este mês
            </div>
          </div>
        </a>

        
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderRadius: '0.5rem',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: currentTheme.shadow,
        border: `1px solid ${currentTheme.border}`
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: currentTheme.textPrimary,
          margin: '0 0 1.5rem 0'
        }}>
          Ações Rápidas
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <button 
            onClick={() => navigate('/devices?add=1')}
            style={{
            padding: '1rem',
            backgroundColor: currentTheme.buttonPrimary,
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}>
            Adicionar Dispositivo
          </button>
          <button 
            onClick={() => navigate('/panels?add=1')}
            style={{
            padding: '1rem',
            backgroundColor: currentTheme.success,
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}>
            Criar Painel
          </button>
          <button 
            onClick={() => navigate('/medias?add=1')}
            style={{
            padding: '1rem',
            backgroundColor: currentTheme.warning,
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}>
            Upload de Mídia
          </button>
          <button 
            onClick={() => navigate('/campaigns?add=1')}
            style={{
            padding: '1rem',
            backgroundColor: currentTheme.buttonDanger,
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}>
            Nova Campanha
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderRadius: '0.5rem',
        padding: '2rem',
        marginBottom: '2rem',
        boxShadow: currentTheme.shadow,
        border: `1px solid ${currentTheme.border}`
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          color: currentTheme.textPrimary,
          margin: '0 0 1.5rem 0'
        }}>
          Atividade Recente
        </h2>
        <div style={{ color: currentTheme.textSecondary }}>
          <p>• Dispositivo "TV Recepção" conectado há 2 horas</p>
          <p>• Nova mídia "Promoção Verão" adicionada</p>
          <p>• Campanha "Black Friday" iniciada</p>
          <p>• Painel "Lobby Principal" atualizado</p>
        </div>
      </div>

      {/* Gráficos e Analytics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Gráfico de Dispositivos Online/Offline */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: currentTheme.shadow,
          border: `1px solid ${currentTheme.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Monitor size={24} style={{ color: currentTheme.primary, marginRight: '0.5rem' }} />
            <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '1.25rem', fontWeight: '600' }}>
              Status dos Dispositivos
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={deviceStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Valores Financeiros */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <DollarSign size={24} style={{ color: '#ef4444', marginRight: '0.5rem' }} />
            <h3 style={{ margin: 0, color: '#1f2937', fontSize: '1.25rem', fontWeight: '600' }}>
              Valores Financeiros
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={financialData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`R$ ${value}`, '']} />
              <Legend />
              <Bar dataKey="paid" fill={currentTheme.success} name="Pagos" />
              <Bar dataKey="open" fill={currentTheme.warning} name="Em Aberto" />
              <Bar dataKey="overdue" fill={currentTheme.error} name="Atrasados" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Tipos de Mídia */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: currentTheme.shadow,
          border: `1px solid ${currentTheme.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Image size={24} style={{ color: currentTheme.warning, marginRight: '0.5rem' }} />
            <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '1.25rem', fontWeight: '600' }}>
              Tipos de Mídia
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={mediaTypes}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
              >
                {mediaTypes.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Mini Cards com Mídias Recentes */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: currentTheme.shadow,
          border: `1px solid ${currentTheme.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Video size={24} style={{ color: currentTheme.primary, marginRight: '0.5rem' }} />
            <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '1.25rem', fontWeight: '600' }}>
              Mídias Recentes
            </h3>
          </div>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {recentMedias.map((media) => (
              <div key={media.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: currentTheme.secondary,
                borderRadius: '0.375rem',
                border: `1px solid ${currentTheme.border}`
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '0.375rem',
                  backgroundColor: currentTheme.secondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {media.type === 'image' && <Image size={20} color={currentTheme.textSecondary} />}
                  {media.type === 'video' && <Video size={20} color={currentTheme.textSecondary} />}
                  {media.type === 'document' && <FileText size={20} color={currentTheme.textSecondary} />}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: '500', color: currentTheme.textPrimary, fontSize: '0.9rem' }}>
                    {media.name}
                  </p>
                  <p style={{ margin: 0, color: currentTheme.textSecondary, fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    {media.type === 'image' ? 'Imagem' : media.type === 'video' ? 'Vídeo' : 'Documento'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Mídias Globais */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.5rem',
          padding: '2rem',
          boxShadow: currentTheme.shadow,
          border: `1px solid ${currentTheme.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <i className="bi bi-globe2" style={{ color: currentTheme.error, fontSize: 20, marginRight: '0.5rem' }}></i>
            <h3 style={{ margin: 0, color: currentTheme.textPrimary, fontSize: '1.25rem', fontWeight: '600' }}>
              Mídias Globais
            </h3>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={loadGlobalMedias} style={{
                background: currentTheme.cardBackground,
                color: currentTheme.textPrimary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                cursor: 'pointer'
              }}>Recarregar</button>
            </div>
          </div>

          {globalError && (
            <div style={{ backgroundColor: `${currentTheme.error}20`, color: currentTheme.error, padding: '0.75rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, marginBottom: '1rem' }}>
              {globalError}
            </div>
          )}

          {globalLoading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              <div style={{ width: 32, height: 32, border: `4px solid ${currentTheme.border}`, borderTop: `4px solid ${currentTheme.buttonDanger}` , borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }}></div>
              Carregando mídias globais...
            </div>
          ) : globalMedias.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: currentTheme.textSecondary }}>
              Nenhuma mídia global cadastrada.
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {globalMedias.map((m) => (
                <div key={m.id} style={{
                  backgroundColor: currentTheme.cardBackground,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: 160,
                    backgroundColor: currentTheme.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {m.type?.toLowerCase().includes('image') ? (
                      <img src={m.url} alt={m.title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                    ) : m.type?.toLowerCase().includes('video') ? (
                      <video src={m.url} style={{ maxHeight: '100%', maxWidth: '100%' }} muted />
                    ) : (
                      <i className={`bi ${getDashMediaIcon(m.type)}`} style={{ fontSize: '2rem', color: '#6b7280' }}></i>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      backgroundColor: currentTheme.error,
                      color: 'white',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>Global</div>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: currentTheme.textPrimary,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{m.title || 'Sem título'}</div>
                      <div style={{ fontSize: '0.8rem', color: currentTheme.textSecondary }}>{m.duration ? `${m.duration}s` : ''}</div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
                      {m.type} • {m.category || 'sem categoria'}
                    </div>
                    {m.dateExpire && (
                      <div style={{ fontSize: '0.8rem', color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
                        Expira em {new Date(m.dateExpire).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar Dispositivo */}
      {showDeviceModal && (
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
            borderRadius: '8px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, color: currentTheme.textPrimary }}>Novo Dispositivo</h2>
              <button
                onClick={() => {
                  setShowDeviceModal(false);
                  resetDeviceForm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary
                }}
              >
                ×
              </button>
            </div>

            {modalError && (
              <div style={{
                backgroundColor: `${currentTheme.error}20`,
                color: currentTheme.error,
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateDevice}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Chave do Dispositivo
                </label>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {deviceFormData.deviceKey.map((digit, index) => (
                    <input
                      key={index}
                      type="text"
                      data-index={index}
                      value={digit}
                      onChange={(e) => handleDeviceKeyChange(index, e.target.value)}
                      style={{
                        width: '3rem',
                        height: '3rem',
                        textAlign: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        border: `2px solid ${currentTheme.border}`,
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                      maxLength={1}
                    />
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nome do Dispositivo *
                </label>
                <input
                  type="text"
                  value={deviceFormData.name}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="Digite o nome do dispositivo"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Formato
                </label>
                <select
                  value={deviceFormData.format}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, format: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="HORIZONTAL">Horizontal</option>
                  <option value="VERTICAL">Vertical</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Painel *
                </label>
                <select
                  value={deviceFormData.panelId}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, panelId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  required
                >
                  <option value="">Selecione um painel</option>
                  {panels.map(panel => (
                    <option key={panel.id} value={panel.id}>
                      {panel.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Localização Geográfica
                </label>
                <input
                  type="text"
                  value={deviceFormData.geoLocation}
                  onChange={(e) => setDeviceFormData({ ...deviceFormData, geoLocation: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="Ex: São Paulo, SP"
                />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeviceModal(false);
                    resetDeviceForm();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: isSubmitting ? currentTheme.textMuted : currentTheme.buttonPrimary,
                    color: 'white',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {isSubmitting ? 'Criando...' : 'Criar Dispositivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Painel */}
      {showPanelModal && (
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
            borderRadius: '8px',
            padding: '2rem',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, color: currentTheme.textPrimary }}>Novo Painel</h2>
              <button
                onClick={() => {
                  setShowPanelModal(false);
                  resetPanelForm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: currentTheme.textSecondary
                }}
              >
                ×
              </button>
            </div>

            {modalError && (
              <div style={{
                backgroundColor: `${currentTheme.error}20`,
                color: currentTheme.error,
                padding: '0.75rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreatePanel}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Nome do Painel *
                </label>
                <input
                  type="text"
                  value={panelFormData.name}
                  onChange={(e) => setPanelFormData({ ...panelFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  placeholder="Digite o nome do painel"
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Descrição
                </label>
                <textarea
                  value={panelFormData.description}
                  onChange={(e) => setPanelFormData({ ...panelFormData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Descrição do painel (opcional)"
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  Tipo de Painel
                </label>
                <select
                  value={panelFormData.type}
                  onChange={(e) => setPanelFormData({ ...panelFormData, type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="FULL_SCREEN">Tela Cheia</option>
                  <option value="DIVIDED">Dividido</option>
                </select>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '2rem'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPanelModal(false);
                    resetPanelForm();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '4px',
                    backgroundColor: currentTheme.cardBackground,
                    color: currentTheme.textPrimary,
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: isSubmitting ? currentTheme.textMuted : currentTheme.buttonPrimary,
                    color: 'white',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {isSubmitting ? 'Criando...' : 'Criar Painel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dash;