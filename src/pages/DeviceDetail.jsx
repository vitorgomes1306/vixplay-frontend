import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';


// Adicionar estilos CSS para animações
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

// Injetar estilos no head se ainda não existirem
if (!document.querySelector('#device-detail-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'device-detail-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('detalhes');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [paymentLink, setPaymentLink] = useState(() => {
    // Recuperar link de pagamento do localStorage se existir
    const savedLink = localStorage.getItem(`paymentLink_${id}`);
    return savedLink || null;
  });
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [calculatedValue, setCalculatedValue] = useState(null);
  const [userData, setUserData] = useState(null);
  const [systemConfig, setSystemConfig] = useState(null);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });

  // Funções de formatação para dados técnicos
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatTimeUp = (timeUpString) => {
    if (!timeUpString) return 'N/A';
    try {
      const startTime = new Date(timeUpString);
      const now = new Date();
      const diffMs = now - startTime;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffHours}h ${diffMinutes}m`;
    } catch (error) {
      return 'N/A';
    }
  };

  const formatMemory = (memoryValue) => {
    if (!memoryValue) return 'N/A';
    return `${memoryValue.toFixed(1)}GB`;
  };

  const formatTemperature = (temp) => {
    if (!temp) return 'N/A';
    return `${temp.toFixed(1)}°C`;
  };

  const getTemperatureStatus = (temp) => {
    if (!temp) return { text: 'N/A', color: '#6b7280' };
    if (temp < 50) return { text: 'Normal', color: '#10b981' };
    if (temp < 70) return { text: 'Atenção', color: '#f59e0b' };
    return { text: 'Crítico', color: '#ef4444' };
  };

  // Função para mostrar alertas Bootstrap
  const showAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    setTimeout(() => {
      setAlert({ show: false, message: '', type: 'info' });
    }, 5000);
  };

  useEffect(() => {
    fetchDevice();
    fetchUserData();
    fetchSystemConfig();
  }, [id]);

  // Função para buscar dados do usuário
  const fetchUserData = async () => {
    try {
      const response = await apiService.getProfile();
      setUserData(response.data || response);
    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
    }
  };

  // Função para buscar configuração do sistema
  const fetchSystemConfig = async () => {
    try {
      const response = await apiService.getSystemConfig();
      setSystemConfig(response.data || response);
    } catch (error) {
      console.error('Erro ao buscar configuração do sistema:', error);
    }
  };

  const fetchDevice = async () => {
    try {
      if (loading) {
        // Só mostrar loading na primeira carga
        setLoading(true);
      }

      // Se não conseguir carregar da API, usar dados de teste
      try {
        const response = await apiService.getDevice(id);
        console.log('🔍 Resposta da API getDevice:', response.data || response);
        setDevice(response.data || response);
        setError('');
      } catch (apiError) {
        console.warn('API não disponível, usando dados de teste:', apiError);

        // Dados de teste para desenvolvimento
        const testDevice = {
          id: parseInt(id),
          name: `Dispositivo Teste ${id}`,
          description: 'Dispositivo para teste de funcionalidades',
          location: 'Sala de Testes',
          type: 'display',
          ativo: id % 2 === 0 ? 'Ativo' : 'Inativo', // Alterna entre ativo/inativo baseado no ID
          status: id % 2 === 0 ? 'Ativo' : 'Inativo',
          lastSeen: new Date().toISOString(),
          midiaInReproduction: 'https://via.placeholder.com/800x600/0066cc/ffffff?text=Teste+Video',
          // Dados adicionais para o componente
          cpu: Math.floor(Math.random() * 100),
          memoria: Math.floor(Math.random() * 100),
          armazenamento: Math.floor(Math.random() * 100),
          temperatura: Math.floor(Math.random() * 40) + 20,
          uptime: '2 dias, 5 horas',
          versaoSistema: '1.0.0',
          resolucao: '1920x1080',
          ip: '192.168.1.' + (100 + parseInt(id)),
          mac: '00:11:22:33:44:' + id.toString().padStart(2, '0'),
          // Adicionando campo price para teste
          price: 50.00, // Valor de teste para a licença
          licenceActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias no futuro
          lastLicenseCheck: new Date().toISOString()
        };

        setDevice(testDevice);
        setError('');
      }
    } catch (err) {
      console.error('Erro ao carregar dispositivo:', err);
      setError('Erro ao carregar dispositivo. Tente novamente.');
    } finally {
      if (loading) {
        setLoading(false);
      }
    }
  };

  // Função para alternar status do dispositivo
  const toggleDeviceStatus = async () => {
    try {
      setActionLoading(true);

      // Determinar o novo status baseado no status atual
      const currentStatus = device.ativo || device.status;
      const newStatus = currentStatus === 'Ativo' ? 'Inativo' : 'Ativo';

      console.log('Status atual do dispositivo:', currentStatus);
      console.log('Novo status que será enviado:', newStatus);

      // Criar objeto atualizado seguindo o mesmo padrão da função saveDeviceEdit
      const updatedDevice = {
        ...device,
        ativo: newStatus,
        status: newStatus
      };

      // Atualizar estado local imediatamente para melhor UX
      setDevice(updatedDevice);

      try {
        // Enviar o objeto completo como na função saveDeviceEdit
        console.log('Enviando dispositivo completo:', updatedDevice);
        const response = await apiService.updateDevice(id, updatedDevice);
        console.log('Sucesso na API:', response);
        setActionMessage(`Dispositivo ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`);
      } catch (apiError) {
        console.error('Erro na API:', apiError);
        // Manter a atualização local mesmo se a API falhar
        setActionMessage(`Dispositivo ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} localmente (API indisponível)`);
      }

      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      setActionMessage(`Erro ao alterar status do dispositivo: ${err.message}`);
      setTimeout(() => setActionMessage(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Ativação de licença em modo DEBUG, disponível apenas para usuários com avaliationPeriod TRUE
  const activateLicenseDebug = async () => {
    try {
      setActionLoading(true);
      console.log('🔧 [DEBUG] Ativando licença via /license-toggle para device', id);
      // Usar apiService.patch com Authorization e baseURL correta
      const response = await apiService.patch(`/private/devices/${id}/license-toggle`, { licenceActive: true });
      const data = response.data || response;
      console.log('✅ [DEBUG] Licença ativada com sucesso:', data);
      showAlert('✅ Licença ativada com sucesso (DEBUG)!', 'success');
      if (typeof refreshLicenseData === 'function') {
        refreshLicenseData();
      } else {
        fetchDevice();
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erro na ativação de licença:', error);
      const status = error?.response?.status;
      if (status === 401) {
        showAlert('❌ Sessão expirada. Faça login novamente.', 'danger');
      } else if (status === 403) {
        showAlert('❌ Sem permissão para alterar licença deste dispositivo.', 'danger');
      } else if (status === 404) {
        showAlert('❌ Dispositivo não encontrado.', 'danger');
      } else {
        showAlert('❌ Erro ao ativar licença (DEBUG).', 'danger');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Função para excluir dispositivo
  const deleteDevice = async () => {
    try {
      setActionLoading(true);
      await apiService.deleteDevice(id);
      setActionMessage('Dispositivo excluído com sucesso!');
      setTimeout(() => {
        navigate('/devices');
      }, 2000);
    } catch (err) {
      console.error('Erro ao excluir dispositivo:', err);
      setActionMessage('Erro ao excluir dispositivo.');
      setTimeout(() => setActionMessage(''), 3000);
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Função para salvar edições
  const saveDeviceEdit = async (updatedDevice) => {
    try {
      setActionLoading(true);
      await apiService.updateDevice(id, updatedDevice);
      setDevice(updatedDevice);
      setActionMessage('Dispositivo atualizado com sucesso!');
      setTimeout(() => setActionMessage(''), 3000);
      setShowEditModal(false);
    } catch (err) {
      console.error('Erro ao atualizar dispositivo:', err);
      setActionMessage('Erro ao atualizar dispositivo.');
      setTimeout(() => setActionMessage(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  // Função para calcular valor proporcional
  const calculateProportionalValue = (deviceValue, userDayOfPayment) => {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();

    console.log('🔍 DEBUG - Calculando valor proporcional:');
    console.log('🔍 DEBUG - Valor do dispositivo:', deviceValue);
    console.log('🔍 DEBUG - Dia atual:', currentDay);
    console.log('🔍 DEBUG - Dia de vencimento do usuário:', userDayOfPayment);
    console.log('🔍 DEBUG - Tipo de deviceValue:', typeof deviceValue);
    console.log('🔍 DEBUG - Tipo de userDayOfPayment:', typeof userDayOfPayment);

    // Validar se os parâmetros são válidos
    if (!deviceValue || deviceValue <= 0) {
      console.log('🔍 DEBUG - deviceValue inválido, usando valor padrão 50.00');
      deviceValue = 50.00;
    }

    if (!userDayOfPayment || userDayOfPayment <= 0 || userDayOfPayment > 31) {
      console.log('🔍 DEBUG - userDayOfPayment inválido, cobrando valor total');
      return deviceValue;
    }

    let proportionalValue;
    let daysUntilPayment;

    if (userDayOfPayment > currentDay) {
      // O dia de vencimento ainda não chegou neste mês
      daysUntilPayment = userDayOfPayment - currentDay;
      console.log('🔍 DEBUG - Dia de vencimento ainda não chegou neste mês');
    } else {
      // O dia de vencimento já passou neste mês, calcular para o próximo mês
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();

      // Criar data do próximo vencimento
      let nextPaymentDate = new Date(currentYear, currentMonth + 1, userDayOfPayment);

      // Se estamos no último mês do ano, vai para janeiro do próximo ano
      if (currentMonth === 11) {
        nextPaymentDate = new Date(currentYear + 1, 0, userDayOfPayment);
      }

      // Calcular diferença em dias
      const timeDiff = nextPaymentDate.getTime() - currentDate.getTime();
      daysUntilPayment = Math.ceil(timeDiff / (1000 * 3600 * 24));

      console.log('🔍 DEBUG - Dia de vencimento já passou, calculando para próximo mês');
      console.log('🔍 DEBUG - Próxima data de vencimento:', nextPaymentDate.toISOString());
    }

    // Calcular valor proporcional
    proportionalValue = (deviceValue / 30) * daysUntilPayment;

    console.log('🔍 DEBUG - Dias até vencimento:', daysUntilPayment);
    console.log('🔍 DEBUG - Cálculo proporcional:', `${deviceValue} / 30 * ${daysUntilPayment} = ${proportionalValue}`);

    // Garantir valor mínimo de R$ 1,00
    proportionalValue = Math.max(proportionalValue, 1.00);

    console.log('🔍 DEBUG - Valor proporcional final:', proportionalValue);
    console.log('🔍 DEBUG - Tipo do valor retornado:', typeof proportionalValue);

    return proportionalValue;
  };

  // Função para mostrar modal de confirmação antes de enviar para API
  const showLicenseConfirmation = async () => {
    try {
      console.log('🔍 DEBUG - userData completo:', userData);
      console.log('🔍 DEBUG - userData.dayOfPayment:', userData?.dayOfPayment);

      if (!userData || !userData.dayOfPayment) {
        showAlert('Erro: Dados do usuário não encontrados ou dia de pagamento não definido. Recarregue a página e tente novamente.', 'danger');
        return;
      }

      // Obter valor do dispositivo da configuração do sistema ou usar valor padrão
      // O valueDevice vem em centavos do banco, então dividimos por 100 para converter para reais
      const deviceValueInCents = systemConfig?.valueDevice ? parseFloat(systemConfig.valueDevice) : 5000; // Default 50.00 em centavos
      const deviceValue = deviceValueInCents / 100; // Converter de centavos para reais

      console.log('🔍 DEBUG - Valor do dispositivo em centavos:', deviceValueInCents);
      console.log('🔍 DEBUG - Valor do dispositivo em reais:', deviceValue);
      console.log('🔍 DEBUG - Configuração do sistema:', systemConfig);

      // Calcular valor proporcional
      const proportional = calculateProportionalValue(deviceValue, userData.dayOfPayment);

      console.log('🔍 DEBUG - Valor proporcional calculado:', proportional);
      console.log('🔍 DEBUG - Definindo calculatedValue para:', proportional);

      setCalculatedValue(proportional);
      setShowConfirmationModal(true);

      console.log('🔍 DEBUG - Modal deve aparecer agora com calculatedValue:', proportional);
    } catch (error) {
      console.error('Erro ao calcular valor:', error);
      showAlert('Erro ao calcular valor proporcional. Tente novamente.', 'danger');
    }
  };

  // Função para confirmar e enviar para API
  const confirmAndSendLicense = async () => {
    setShowConfirmationModal(false);
    await sendLytexLicense();
  };

  // Função para cancelar processo
  const cancelLicenseProcess = () => {
    setShowConfirmationModal(false);
    setCalculatedValue(null);
  };
  const sendLytexLicense = async () => {
    try {
      setActionLoading(true);
      setActionMessage('');

      // Enviar o valor proporcional calculado para o backend
      const payload = {
        proportionalValue: calculatedValue
      };

      console.log('🔍 DEBUG - Enviando valor proporcional para backend:', calculatedValue);
      console.log('🔍 DEBUG - Payload completo:', payload);

      const response = await apiService.sendLytexLicense(id, payload);

      console.log('🔍 DEBUG - Resposta completa da API:', response);
      console.log('🔍 DEBUG - response.data.success:', response.data?.success);
      console.log('🔍 DEBUG - response.data.data:', response.data?.data);

      if (response.data && response.data.success) {
        setActionMessage('Fatura criada com sucesso! Redirecionando para pagamento...');

        // Atualizar dados do dispositivo
        await fetchDevice();

        // Armazenar o link de pagamento para exibir na aba de licenciamento
        const invoiceId = response.data.data?._id || response.data.data?.id;
        if (invoiceId) {
          const paymentUrl = `/payment/${id}/${invoiceId}`;
          setPaymentLink(paymentUrl);
          // Salvar no localStorage para persistir entre navegações
          localStorage.setItem(`paymentLink_${id}`, paymentUrl);
        }

        // Navegar para a página de pagamento após 2 segundos
        setTimeout(() => {
          console.log('🔍 DEBUG - Tentando navegar...');
          console.log('🔍 DEBUG - response.data.data:', response.data.data);
          console.log('🔍 DEBUG - response.data.data._id:', response.data.data?._id);
          console.log('🔍 DEBUG - response.data.data.id:', response.data.data?.id);

          // Usar o _id correto da fatura para buscar na API
          const invoiceId = response.data.data?._id || response.data.data?.id;

          if (invoiceId) {
            const navigationUrl = `/payment/${id}/${invoiceId}`;
            console.log('🔍 DEBUG - URL de navegação:', navigationUrl);
            console.log('🔍 DEBUG - Invoice ID usado:', invoiceId);
            navigate(navigationUrl);
          } else {
            console.log('🔍 DEBUG - ID da fatura não encontrado, estrutura da resposta:', JSON.stringify(response.data.data, null, 2));
            setActionMessage('Fatura criada, mas ID da fatura não encontrado. Verifique manualmente.');
            setTimeout(() => setActionMessage(''), 3000);
          }
        }, 2000);
      } else {
        console.log('🔍 DEBUG - Resposta não foi sucesso:', response);
        setActionMessage(response.data?.message || 'Erro ao enviar dados para Lytex API');
        setTimeout(() => setActionMessage(''), 5000);
      }
    } catch (err) {
      console.error('❌ Erro ao enviar para Lytex API:', err);
      setActionMessage('Erro ao enviar dados para Lytex API. Verifique a configuração.');
      setTimeout(() => setActionMessage(''), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  // Função para atualizar dados de licenciamento
  const refreshLicenseData = async () => {
    try {
      setActionLoading(true);
      setActionMessage('');

      await fetchDevice();

      // Se o dispositivo foi licenciado com sucesso, limpar o link de pagamento
      const updatedDevice = await apiService.getDevice(id);
      if (updatedDevice.data?.licenceActive || updatedDevice?.licenceActive) {
        setPaymentLink(null);
        localStorage.removeItem(`paymentLink_${id}`);
        setActionMessage('Dispositivo licenciado com sucesso! Link de pagamento removido.');
      } else {
        setActionMessage('Dados de licenciamento atualizados!');
      }
    } catch (err) {
      console.error('Erro ao atualizar dados:', err);
      setActionMessage('Erro ao atualizar dados. Tente novamente.');
    } finally {
      setActionLoading(false);
      // Limpar mensagem após 3 segundos
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca conectado';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (active) => {
    return active ? '#10b981' : '#ef4444';
  };

  const getStatusText = (active) => {
    return active ? 'Ativo' : 'Inativo';
  };

  const getDeviceTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'tv':
        return 'bi-tv';
      case 'tablet':
        return 'bi-tablet';
      case 'smartphone':
        return 'bi-phone';
      case 'computer':
        return 'bi-laptop';
      default:
        return 'bi-display';
    }
  };

  // Componente separado para thumbnail (para usar hooks corretamente)
  const MediaThumbnail = ({ mediaUrl }) => {
    const [thumbnailSrc, setThumbnailSrc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isVideo, setIsVideo] = useState(false);
    const [lastMediaUrl, setLastMediaUrl] = useState(null);

    useEffect(() => {
      if (!mediaUrl) {
        setLoading(false);
        return;
      }

      // Função para gerar thumbnail
      const generateThumbnail = () => {
        // Detectar se é vídeo
        const videoExtensions = ['.mp4', '.avi', '.mov', '.webm', '.mkv', '.flv'];
        const isVideoFile = videoExtensions.some(ext => mediaUrl.toLowerCase().includes(ext));
        setIsVideo(isVideoFile);

        if (isVideoFile) {
          // Gerar thumbnail para vídeo
          const generateVideoThumbnail = () => {
            return new Promise((resolve, reject) => {
              const video = document.createElement('video');
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');

              video.crossOrigin = 'anonymous';
              video.muted = true;
              video.preload = 'metadata';

              video.onloadedmetadata = () => {
                canvas.width = 320;
                canvas.height = 180;
                video.currentTime = Math.min(1, video.duration * 0.1);
              };

              video.onseeked = () => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(thumbnailUrl);
              };

              video.onerror = () => reject(new Error('Erro ao carregar vídeo'));
              // Adicionar timestamp para forçar atualização
              const urlWithTimestamp = mediaUrl + (mediaUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
              video.src = urlWithTimestamp;
            });
          };

          generateVideoThumbnail()
            .then(thumbnail => {
              setThumbnailSrc(thumbnail);
              setLoading(false);
            })
            .catch(() => {
              setLoading(false);
            });
        } else {
          // Para imagens, usar diretamente com timestamp
          const urlWithTimestamp = mediaUrl + (mediaUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
          setThumbnailSrc(urlWithTimestamp);
          setLoading(false);
        }
      };

      // Verificar se a URL mudou
      if (mediaUrl !== lastMediaUrl) {
        setLastMediaUrl(mediaUrl);
        setLoading(true);
        generateThumbnail();
      }
    }, [mediaUrl, lastMediaUrl]);

    if (!mediaUrl) {
      return (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: currentTheme.borderLight,
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentTheme.textSecondary,
          fontSize: '2rem'
        }}>
          <i className="bi bi-image"></i>
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: currentTheme.borderLight,
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentTheme.textSecondary,
          fontSize: '0.875rem'
        }}>
          <div style={{ textAlign: 'center' }}>
            <i className="bi bi-arrow-clockwise" style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
              display: 'block',
              animation: 'spin 1s linear infinite'
            }}></i>
            {isVideo ? 'Atualizando prévia...' : 'Carregando prévia...'}
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        {thumbnailSrc ? (
          <>
            <img
              src={thumbnailSrc}
              alt={isVideo ? "Prévia do vídeo" : "Prévia da mídia"}
              style={{
                width: '100%',
                height: '120px',
                objectFit: 'cover',
                borderRadius: '0.5rem'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {isVideo && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: 'white',
                fontSize: '2rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none'
              }}>
                <i className="bi bi-play-circle-fill"></i>
              </div>
            )}
            {/* Indicador de atualização automática */}
            <div style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <i className="bi bi-arrow-clockwise" style={{
                animation: 'pulse 2s infinite'
              }}></i>
              Live
            </div>
          </>
        ) : null}

        {/* Fallback se a mídia não carregar */}
        <div style={{
          width: '100%',
          height: '120px',
          backgroundColor: currentTheme.borderLight,
          borderRadius: '0.5rem',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          color: currentTheme.textSecondary,
          fontSize: '2rem'
        }}>
          <i className="bi bi-image"></i>
        </div>
      </div>
    );
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
          display: 'inline-block',
          width: '40px',
          height: '40px',
          border: `4px solid ${currentTheme.border}`,
          borderTop: `4px solid ${currentTheme.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Carregando dispositivo...</p>
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

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: currentTheme.textPrimary,
        fontFamily: 'Poppins, sans-serif'
      }}>
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '2rem',
          color: '#dc2626',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem' }}></i>
          <p>{error}</p>
          <button
            onClick={() => navigate('/devices')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer'
            }}
          >
            Voltar para Dispositivos
          </button>
        </div>
      </div>
    );
  }

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
          <button
            onClick={() => navigate('/devices')}
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
            Voltar para Dispositivos
          </button>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: currentTheme.textPrimary,
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            <i className={getDeviceTypeIcon(device?.type)} style={{ marginRight: '0.5rem' }}></i>
            {device?.name || 'Dispositivo'}
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            margin: 0,
            fontSize: '1rem'
          }}>
            Detalhes e configurações do dispositivo
          </p>
        </div>

        {/* Botões de Ação */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Botão Editar */}
          <button
            onClick={() => setShowEditModal(true)}
            disabled={actionLoading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: actionLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <i className="bi bi-pencil"></i>
            Editar
          </button>

          {/* Botão Ativar/Desativar */}
          <button
            onClick={toggleDeviceStatus}
            disabled={actionLoading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: (device?.ativo || device?.status) === 'Ativo' ? '#f59e0b' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: actionLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <i className={(device?.ativo || device?.status) === 'Ativo' ? 'bi bi-pause-circle' : 'bi bi-play-circle'}></i>
            {(device?.ativo || device?.status) === 'Ativo' ? 'Desativar' : 'Ativar'}
          </button>

          {/* Botão Excluir */}
          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={actionLoading}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: actionLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              opacity: actionLoading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
          >
            <i className="bi bi-trash"></i>
            Excluir
          </button>
        </div>
      </div>

      {/* Mensagem de Feedback */}
      {actionMessage && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          backgroundColor: actionMessage.includes('Erro') ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${actionMessage.includes('Erro') ? '#fecaca' : '#bbf7d0'}`,
          borderRadius: '0.5rem',
          color: actionMessage.includes('Erro') ? '#dc2626' : '#16a34a',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <i className={`bi ${actionMessage.includes('Erro') ? 'bi-exclamation-triangle' : 'bi-check-circle'}`}></i>
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        border: `1px solid ${currentTheme.border}`,
        borderRadius: '0.75rem',
        overflow: 'hidden'
      }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${currentTheme.border}`,
          backgroundColor: currentTheme.borderLight
        }}>
          {[
            { id: 'detalhes', label: 'Detalhes', icon: 'bi-info-circle' },
            { id: 'tecnicas', label: 'Informações Técnicas', icon: 'bi-cpu' },
            { id: 'licenciamento', label: 'Licenciamento', icon: 'bi-key' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: activeTab === tab.id ? currentTheme.cardBackground : 'transparent',
                color: activeTab === tab.id ? currentTheme.primary : currentTheme.textSecondary,
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderBottom: activeTab === tab.id ? `2px solid ${currentTheme.primary}` : '2px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              <i className={tab.icon}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '2rem' }}>
          {/* Aba Detalhes */}
          {activeTab === 'detalhes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
              {/* Informações do Dispositivo */}
              <div>
                <h3 style={{
                  color: currentTheme.textPrimary,
                  marginBottom: '1.5rem',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Informações do Dispositivo
                </h3>

                <div style={{ display: 'grid', gap: '1rem' }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Nome
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '1rem'
                      }}>
                        {device?.name || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Chave
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '1rem',
                        fontFamily: 'monospace',
                        backgroundColor: currentTheme.borderLight,
                        padding: '0.5rem',
                        borderRadius: '0.25rem'
                      }}>
                        {device?.deviceKey || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Tipo
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '1rem',
                        textTransform: 'capitalize'
                      }}>
                        {device?.type || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Formato
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '1rem'
                      }}>
                        {device?.format || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Status de Ativação
                      </label>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: device?.status === 'Ativo' ? '#dcfce7' : '#fef2f2',
                        color: getStatusColor(device?.status === 'Ativo')
                      }}>
                        {getStatusText(device?.status === 'Ativo')}
                      </span>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Status do Dispositivo
                      </label>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: device?.statusDevice ? '#10b981' : '#ef4444'
                        }}></div>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {device?.statusDevice ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mapa de Localização */}
                {device?.geoLocation && (
                  <div style={{ marginTop: '2rem' }}>
                    <h4 style={{
                      color: currentTheme.textPrimary,
                      marginBottom: '1rem',
                      fontSize: '1.125rem',
                      fontWeight: '600'
                    }}>
                      Localização
                    </h4>
                    <div style={{
                      backgroundColor: currentTheme.borderLight,
                      borderRadius: '0.5rem',
                      padding: '2rem',
                      textAlign: 'center',
                      color: currentTheme.textSecondary
                    }}>
                      <i className="bi bi-geo-alt" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                      <p style={{ margin: 0 }}>
                        {device.geoLocation}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                        Mapa será implementado em breve
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Card de Transmissão ao Vivo */}
              <div>
                <h3 style={{
                  color: currentTheme.textPrimary,
                  marginBottom: '1.5rem',
                  fontSize: '1.25rem',
                  fontWeight: '600'
                }}>
                  Transmissão ao Vivo
                </h3>

                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  {device?.midiaInReproduction ? (
                    <div>
                      <div style={{ marginBottom: '1rem' }}>
                        <MediaThumbnail mediaUrl={device.midiaInReproduction} />
                        <div style={{
                          display: 'none',
                          width: '100%',
                          height: '120px',
                          backgroundColor: currentTheme.borderLight,
                          borderRadius: '0.5rem',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: currentTheme.textSecondary,
                          fontSize: '2rem'
                        }}>
                          <i className="bi bi-file-earmark-play"></i>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: '#ef4444',
                          borderRadius: '50%',
                          animation: 'pulse 2s infinite'
                        }}></div>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          AO VIVO
                        </span>
                      </div>
                      <p style={{
                        color: currentTheme.textSecondary,
                        margin: 0,
                        fontSize: '0.875rem',
                        wordBreak: 'break-all'
                      }}>
                        {device.midiaInReproduction}
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      <i className="bi bi-broadcast" style={{
                        fontSize: '3rem',
                        color: currentTheme.textSecondary,
                        marginBottom: '1rem'
                      }}></i>
                      <p style={{
                        color: currentTheme.textSecondary,
                        margin: 0,
                        fontSize: '0.875rem'
                      }}>
                        Nenhuma mídia em reprodução
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aba Informações Técnicas */}
          {activeTab === 'tecnicas' && (
            <div>
              <h3 style={{
                color: currentTheme.textPrimary,
                marginBottom: '1.5rem',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Informações Técnicas
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Sistema */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-cpu"></i>
                    Sistema
                  </h4>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        IP
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace'
                      }}>
                        {device?.ipAddress || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Versão Android
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem'
                      }}>
                        {device?.androidVersion || 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        MAC Address
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem',
                        fontFamily: 'monospace'
                      }}>
                        {device?.macAddress || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-speedometer2"></i>
                    Performance
                  </h4>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Tempo UP
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem'
                      }}>
                        {formatTimeUp(device?.timeUp)}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Memória RAM
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: currentTheme.border,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: device?.ramMemory ? `${Math.min((device.ramMemory / 8) * 100, 100)}%` : '0%',
                            height: '100%',
                            backgroundColor: '#10b981',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem'
                        }}>
                          {device?.ramMemory ? `${formatMemory(device.ramMemory)} / 8GB` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Armazenamento
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: currentTheme.border,
                          borderRadius: '4px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: device?.diskSpace ? `${Math.min((device.diskSpace / 32) * 100, 100)}%` : '0%',
                            height: '100%',
                            backgroundColor: '#f59e0b',
                            borderRadius: '4px'
                          }}></div>
                        </div>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem'
                        }}>
                          {device?.diskSpace ? `${formatMemory(device.diskSpace)} / 32GB` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-activity"></i>
                    Status
                  </h4>

                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Última Conexão
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem'
                      }}>
                        {formatDateTime(device?.lastConnection)}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.25rem'
                      }}>
                        Temperatura
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem'
                        }}>
                          {formatTemperature(device?.temperature)}
                        </span>
                        <span style={{
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontSize: '0.625rem',
                          fontWeight: '600',
                          backgroundColor: device?.temperature ? (getTemperatureStatus(device.temperature).text === 'Normal' ? '#dcfce7' : getTemperatureStatus(device.temperature).text === 'Atenção' ? '#fef3c7' : '#fee2e2') : '#f3f4f6',
                          color: device?.temperature ? getTemperatureStatus(device.temperature).color : '#6b7280'
                        }}>
                          {device?.temperature ? getTemperatureStatus(device.temperature).text : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aba Licenciamento */}
          {activeTab === 'licenciamento' && (
            <div>
              <h3 style={{
                color: currentTheme.textPrimary,
                marginBottom: '1.5rem',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Licenciamento do Dispositivo
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {/* Status da Licença */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-shield-check"></i>
                    Status da Licença
                  </h4>

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Status
                      </label>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: device?.licenceActive ? '#10b981' : '#ef4444'
                        }}></div>
                        <span style={{
                          color: currentTheme.textPrimary,
                          fontSize: '0.875rem',
                          fontWeight: '500'
                        }}>
                          {device?.licenceActive ? 'Licenciado' : 'Não Licenciado'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Última Verificação
                      </label>
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem'
                      }}>
                        {device?.lastLicenseCheck ? new Date(device.lastLicenseCheck).toLocaleString('pt-BR') : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        marginBottom: '0.5rem'
                      }}>
                        Data de Expiração
                      </label>
                      <p style={{
                        color: device?.expiresAt && new Date(device.expiresAt) < new Date() ? '#ef4444' : currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem',
                        fontWeight: device?.expiresAt && new Date(device.expiresAt) < new Date() ? '600' : 'normal'
                      }}>
                        {device?.expiresAt ? new Date(device.expiresAt).toLocaleDateString('pt-BR') : 'N/A'}
                        {device?.expiresAt && new Date(device.expiresAt) < new Date() && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                            (Expirada)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Informações de Preço */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-currency-dollar"></i>
                    Preço da Licença
                  </h4>


                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: currentTheme.textSecondary,
                      marginBottom: '0.5rem'
                    }}>
                      Valor
                    </label>
                    <p style={{
                      color: currentTheme.textPrimary,
                      margin: 0,
                      fontSize: '1.5rem',
                      fontWeight: '600'
                    }}>
                      R$ {systemConfig?.valueDevice
                        ? (parseFloat(systemConfig.valueDevice) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : '50,00'}

                    </p> <br />
                    <h4 style={{
                      color: currentTheme.textPrimary,
                      marginBottom: '1rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className="bi bi-calendar-date"></i>
                      Período da licença: 30 dias
                      <br />
                      <p style={{
                        color: currentTheme.textPrimary,
                        margin: 0,
                        fontSize: '0.875rem',
                        fontWeight: 'normal'
                      }}>
                        ({device?.expiresAt ? new Date(device.expiresAt).toLocaleDateString('pt-BR') : 'N/A'})<br />
                      </p>

                    </h4>
                  </div>
                </div>

                {/* Resumo da Licença */}
                <div style={{
                  backgroundColor: device?.licenceActive ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${device?.licenceActive ? '#bbf7d0' : '#fecaca'}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  gridColumn: 'span 2'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <i className={`bi ${device?.licenceActive ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`} style={{
                      fontSize: '1.5rem',
                      color: device?.licenceActive ? '#16a34a' : '#dc2626'
                    }}></i>
                    <h4 style={{
                      color: device?.licenceActive ? '#16a34a' : '#dc2626',
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: '600'
                    }}>
                      {device?.licenceActive ? 'Dispositivo Licenciado' : 'Dispositivo não Licenciado'}
                    </h4>
                  </div>

                  <p style={{
                    color: device?.licenceActive ? '#16a34a' : '#dc2626',
                    margin: 0,
                    fontSize: '0.875rem',
                    lineHeight: '1.5'
                  }}>
                    {device?.licenceActive
                      ? 'Este dispositivo possui uma licença válida e está autorizado a funcionar normalmente.'
                      : 'Este dispositivo não possui uma licença válida. Sua tela não irá exibir as midias até que a licença esteja ativa.'
                    }
                  </p>

                  {device?.expiresAt && (
                    <p style={{
                      color: device?.licenceActive ? '#16a34a' : '#dc2626',
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.75rem'
                    }}>
                      {device?.licenceActive && new Date(device.expiresAt) > new Date()
                        ? `Licença válida até ${new Date(device.expiresAt).toLocaleDateString('pt-BR')}`
                        : new Date(device.expiresAt) < new Date()
                          ? `Licença expirou em ${new Date(device.expiresAt).toLocaleDateString('pt-BR')}`
                          : ''
                      }
                    </p>
                  )}
                </div>

                {/* Ações de Licenciamento */}
                <div style={{
                  backgroundColor: currentTheme.borderLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  gridColumn: 'span 2'
                }}>
                  <h4 style={{
                    color: currentTheme.textPrimary,
                    marginBottom: '1rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-send"></i>
                    Ações de Licenciamento
                  </h4>

                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <button
                      onClick={showLicenseConfirmation}
                      disabled={actionLoading || (device?.lastLicenseCheck && device.lastLicenseCheck !== null)}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: (device?.lastLicenseCheck && device.lastLicenseCheck !== null) ? '#6b7280' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: (actionLoading || (device?.lastLicenseCheck && device.lastLicenseCheck !== null)) ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        opacity: (actionLoading || (device?.lastLicenseCheck && device.lastLicenseCheck !== null)) ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      {actionLoading ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-currency-dollar"></i>
                          Licenciar dispositivo
                        </>
                      )}
                    </button>

                    <button
                      onClick={refreshLicenseData}
                      disabled={actionLoading}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: currentTheme.border,
                        color: currentTheme.textPrimary,
                        border: 'none',
                        borderRadius: '0.5rem',
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        opacity: actionLoading ? 0.6 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                      Atualizar Dados
                    </button>

                    {/* Link para página de pagamento quando disponível */}
                    {paymentLink && (
                      <button
                        onClick={() => navigate(paymentLink)}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <i className="bi bi-qr-code"></i>
                        Ver QR Code de Pagamento
                      </button>
                    )}

                    {/* DEBUG: Verificar userData */}
                    {console.log('DEBUG userData completo:', userData)}
                    {console.log('DEBUG avaliationPeriod:', userData?.avaliationPeriod, 'tipo:', typeof userData?.avaliationPeriod)}
                    {console.log('DEBUG condição:', userData && userData.avaliationPeriod === true)}

                    {userData && userData.avaliationPeriod === true && (
                      <button
                        onClick={activateLicenseDebug}
                        disabled={actionLoading}
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: actionLoading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <i className="bi bi-calendar-date"></i>
                        [PERÍODO DE AVALIAÇÃO] Ativar Licença
                      </button>
                    )}
                  </div>

                  {/* Alerta quando lastLicenseCheck existe */}
                  {device?.lastLicenseCheck && device.lastLicenseCheck !== null && (
                    <div style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <i className="bi bi-info-circle" style={{ color: '#f59e0b', fontSize: '1.25rem' }}></i>
                      <div>
                        <p style={{
                          color: '#92400e',
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          marginBottom: '0.25rem'
                        }}>
                          Licença será gerada automaticamente
                        </p>
                        <p style={{
                          color: '#92400e',
                          margin: 0,
                          fontSize: '0.75rem',
                          lineHeight: '1.4'
                        }}>
                          A licença será gerada 10 dias antes do próximo vencimento e enviada ao cliente por email ou WhatsApp.
                        </p>
                      </div>
                    </div>
                  )}

                  <p style={{
                    color: currentTheme.textSecondary,
                    margin: 0,
                    fontSize: '0.75rem',
                    lineHeight: '1.4'
                  }}>
                    {device?.lastLicenseCheck && device.lastLicenseCheck !== null
                      ? 'O dispositivo já possui uma licença ativa. A renovação será automática.'
                      : `Clique em "Licenciar dispositivo" para gerar a cobrança. Após o pagamento, seu dispositivo será licenciado até a data do próximo vencimento. Se estiver no período de avaliação, clique no botão "Ativar Licença".`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>

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
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <i className="bi bi-exclamation-triangle" style={{
                fontSize: '3rem',
                color: '#ef4444',
                marginBottom: '1rem',
                display: 'block'
              }}></i>
              <h3 style={{
                color: currentTheme.textPrimary,
                marginBottom: '0.5rem',
                fontSize: '1.25rem',
                fontWeight: '600'
              }}>
                Confirmar Exclusão
              </h3>
              <p style={{
                color: currentTheme.textSecondary,
                margin: 0,
                fontSize: '0.875rem'
              }}>
                Tem certeza que deseja excluir o dispositivo "{device?.name}"? Esta ação não pode ser desfeita.
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: currentTheme.border,
                  color: currentTheme.textSecondary,
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: actionLoading ? 0.6 : 1
                }}
              >
                Cancelar
              </button>
              <button
                onClick={deleteDevice}
                disabled={actionLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  opacity: actionLoading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {actionLoading ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Excluindo...
                  </>
                ) : (
                  <>
                    <i className="bi bi-trash"></i>
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && (
        <EditDeviceModal
          device={device}
          currentTheme={currentTheme}
          onSave={saveDeviceEdit}
          onCancel={() => setShowEditModal(false)}
          loading={actionLoading}
        />
      )}

      {/* Modal de Confirmação de Licenciamento */}
      {showConfirmationModal && (
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
            backgroundColor: currentTheme.background,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{
              color: currentTheme.textPrimary,
              marginBottom: '1.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Confirmar Licenciamento
            </h3>

            <div style={{
              backgroundColor: currentTheme.borderLight,
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '0.5rem',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: currentTheme.textSecondary,
                marginBottom: '1rem',
                fontSize: '0.95rem'
              }}>
                Valores para este dispositivo:
              </p>

              {/* Valor Proporcional */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: currentTheme.background,
                borderRadius: '0.375rem',
                border: `1px solid ${currentTheme.border}`
              }}>
                <span style={{
                  color: currentTheme.textSecondary,
                  fontSize: '0.9rem'
                }}>
                  Valor Proporcional:
                </span>
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}>
                  R$ {calculatedValue
                    ? calculatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : '0,00'}
                </span>
              </div>

              

              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '0.85rem',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                Valor proporcional baseado no seu dia de vencimento
              </p>
            </div>

            <p style={{
              color: currentTheme.textSecondary,
              marginBottom: '2rem',
              textAlign: 'center',
              fontSize: '0.95rem'
            }}>
              Deseja prosseguir com o licenciamento por este valor?
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelLicenseProcess}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmAndSendLicense}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '500'
                }}
              >
                Confirmar e Prosseguir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Modal de Edição
const EditDeviceModal = ({ device, currentTheme, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: device?.name || '',
    description: device?.description || '',
    location: device?.location || '',
    type: device?.type || 'display'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...device, ...formData });
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
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
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <i className="bi bi-pencil" style={{
            fontSize: '2.5rem',
            color: currentTheme.primary,
            marginBottom: '0.5rem',
            display: 'block'
          }}></i>
          <h3 style={{
            color: currentTheme.textPrimary,
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600'
          }}>
            Editar Dispositivo
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Nome do Dispositivo
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '0.875rem',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Localização
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Tipo de Dispositivo
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            >
              <option value="display">Display</option>
              <option value="totem">Totem</option>
              <option value="tv">TV</option>
              <option value="projetor">Projetor</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: currentTheme.border,
                color: currentTheme.textSecondary,
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: currentTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check"></i>
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceDetail;