import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import QRCode from 'qrcode';

const LytexPayment = () => {
  const { deviceId, invoiceId } = useParams();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  const [invoiceData, setInvoiceData] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  
  // Estados para o timer de 5 minutos
  const [timeRemaining, setTimeRemaining] = useState(5 * 60); // 5 minutos em segundos
  const [timerExpired, setTimerExpired] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [paymentCheckInterval, setPaymentCheckInterval] = useState(null);
  const [paymentCheckCount, setPaymentCheckCount] = useState(0);
  
  // Estado para alertas Bootstrap
  const [alert, setAlert] = useState(null);
  
  // Função para mostrar alertas Bootstrap
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };
  
  // Constantes para controle de polling (similar ao admin.html)
  const MAX_PAYMENT_CHECKS = 30; // Máximo 30 verificações (5 minutos)
  const PAYMENT_CHECK_INTERVAL = 10000; // 10 segundos

  // Carregar dados da fatura
  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await apiService.getLytexInvoice(deviceId, invoiceId);
      
      if (response.data.success) {
        setInvoiceData(response.data.data);
        
        // LOGS DETALHADOS PARA MAPEAR A ESTRUTURA DA API
        console.log('📋 RESPOSTA COMPLETA DA API:', JSON.stringify(response.data, null, 2));
        console.log('📋 DADOS DA FATURA:', JSON.stringify(response.data.data, null, 2));
        
        // Verificar todas as possíveis estruturas do QR code
        console.log('🔍 MAPEANDO ESTRUTURAS DO QR CODE:');
        console.log('- response.data.data.paymentMethods:', response.data.data.paymentMethods);
        console.log('- response.data.data.paymentMethods?.pix:', response.data.data.paymentMethods?.pix);
        console.log('- response.data.data.pix:', response.data.data.pix);
        console.log('- response.data.data.qrcode:', response.data.data.qrcode);
        console.log('- response.data.data.qrCode:', response.data.data.qrCode);
        console.log('- response.data.data.pixQrCode:', response.data.data.pixQrCode);
        
        // Buscar por qualquer propriedade que contenha "qr" no nome
        const searchForQR = (obj, path = '') => {
          if (typeof obj !== 'object' || obj === null) return;
          
          Object.keys(obj).forEach(key => {
            const currentPath = path ? `${path}.${key}` : key;
            if (key.toLowerCase().includes('qr')) {
              console.log(`🎯 ENCONTRADO QR em ${currentPath}:`, obj[key]);
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              searchForQR(obj[key], currentPath);
            }
          });
        };
        
        searchForQR(response.data.data);
        
        // Tentar múltiplas estruturas para o QR code
        let qrCodeText = null;
        
        // Estrutura CORRETA: transactions.0.pix.qrcode (baseado nos logs)
        if (response.data.data.transactions?.[0]?.pix?.qrcode) {
          qrCodeText = response.data.data.transactions[0].pix.qrcode;
          console.log('✅ QR Code PIX encontrado em transactions.0.pix.qrcode:', qrCodeText);
        }
        // Estrutura alternativa: transactions.0.boleto.qrCode.emv
        else if (response.data.data.transactions?.[0]?.boleto?.qrCode?.emv) {
          qrCodeText = response.data.data.transactions[0].boleto.qrCode.emv;
          console.log('✅ QR Code BOLETO encontrado em transactions.0.boleto.qrCode.emv:', qrCodeText);
        }
        // Fallback: paymentMethods.pix.qrCode
        else if (response.data.data.paymentMethods?.pix?.qrCode) {
          qrCodeText = response.data.data.paymentMethods.pix.qrCode;
          console.log('✅ QR Code encontrado em paymentMethods.pix.qrCode:', qrCodeText);
        }
        // Fallback: paymentMethods.pix.qrCodeText
        else if (response.data.data.paymentMethods?.pix?.qrCodeText) {
          qrCodeText = response.data.data.paymentMethods.pix.qrCodeText;
          console.log('✅ QR Code encontrado em paymentMethods.pix.qrCodeText:', qrCodeText);
        }
        else {
          console.log('❌ Nenhum QR Code encontrado em nenhuma estrutura conhecida');
        }
        
        // Gerar QR Code se encontrado
        if (qrCodeText) {
          try {
            const qrDataUrl = await QRCode.toDataURL(qrCodeText, {
              width: 200,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
            setQrCodeDataUrl(qrDataUrl);
            console.log('🔲 QR Code gerado com sucesso');
          } catch (qrError) {
            console.error('❌ Erro ao gerar QR Code:', qrError);
          }
        }
      } else {
        setError('Erro ao carregar dados da fatura');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar fatura:', err);
      setError('Erro ao carregar dados da fatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar status do pagamento
  const checkPaymentStatus = async (isAutoCheck = false) => {
    try {
      setCheckingPayment(true);
      
      if (!isAutoCheck) {
        console.log('🔍 Verificação manual do status do pagamento...');
      } else {
        console.log(`🔍 Verificação automática ${paymentCheckCount + 1}/${MAX_PAYMENT_CHECKS}`);
      }
      
      console.log('📋 Device ID:', deviceId);
      console.log('📋 Invoice ID (_id):', invoiceId);
      console.log('⏰ Tempo restante no timer:', timeRemaining, 'segundos');
      
      // Obter configurações do sistema e token Lytex
      console.log('🔑 Obtendo configurações do sistema...');
      const systemConfig = await getSystemConfig();
      
      console.log('🔑 Obtendo token Lytex...');
      const lytexToken = await obtainLytexToken(systemConfig);
      
      // Fazer chamada direta à API Lytex para verificar status
      console.log('📤 Verificando status diretamente na API Lytex...');
      
      const statusResponse = await fetch(`https://api-pay.lytex.com.br/v2/invoices/${invoiceId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${lytexToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        console.error('❌ Erro ao verificar status na API Lytex:', statusResponse.status, errorData);
        throw new Error(`Erro ao verificar status: ${errorData.message || 'Erro desconhecido'}`);
      }
      
      const statusData = await statusResponse.json();
      console.log('📥 Resposta da API Lytex:', statusData);
      
      const status = statusData.status;
      console.log('✅ Status obtido:', status);
      
      setPaymentStatus({ status, data: statusData });
      
      // Verificar se o pagamento foi aprovado (status "paid")
      if (status === 'paid') {
        console.log('🎉 Pagamento aprovado! Finalizando processo e ativando dispositivo...');
        
        // Parar todos os intervalos
        stopAllIntervals();
        
        // Limpar dados do localStorage conforme solicitado
        localStorage.removeItem('lytex_integration_data');
        localStorage.removeItem('lytex_device_id');
        localStorage.removeItem('lytex_invoice_id');
        localStorage.removeItem(`paymentLink_${deviceId}`);
        
        // Ativar licença automaticamente usando a mesma lógica do botão de debug
        console.log('🔧 Ativando licença automaticamente após pagamento confirmado...');
        try {
          const response = await fetch(`/private/devices/${deviceId}/license-toggle`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('vixplay_token')}`
            },
            body: JSON.stringify({
              licenceActive: true
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Licença ativada automaticamente com sucesso:', data);
            showAlert('✅ Pagamento confirmado e licença ativada com sucesso!', 'success');
            navigate(`/device/${deviceId}`);
          } else {
            console.error('❌ Erro ao ativar licença automaticamente:', response.status);
            showAlert('✅ Pagamento confirmado, mas houve erro ao ativar a licença. Use o botão de debug.', 'warning');
          }
        } catch (error) {
          console.error('❌ Erro na ativação automática da licença:', error);
          showAlert('✅ Pagamento confirmado, mas houve erro ao ativar a licença. Use o botão de debug.', 'warning');
        }
        
        return true; // Pagamento concluído
      } else {
        // Se o status não for "paid", limpar storage para permitir retry
        console.log('⚠️ Status não é "paid", limpando storage para permitir nova tentativa...');
        localStorage.removeItem('lytex_integration_data');
        localStorage.removeItem('lytex_device_id');
        localStorage.removeItem('lytex_invoice_id');
        localStorage.removeItem(`paymentLink_${deviceId}`);
        
        // Continuar verificando se for verificação automática
        if (isAutoCheck) {
          console.log('🔄 Continuando verificação automática...');
          return false;
        }
      }
      
      return false; // Pagamento ainda pendente
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      // Se for erro 404, a fatura pode ter expirado ou não existir
      if (error.response?.status === 404) {
        console.log('🚫 Fatura não encontrada - pode ter expirado ou não existir');
        console.log('🚫 Dados disponíveis no erro:', error.response?.data);
        
        // Limpar storage em caso de erro 404
        localStorage.removeItem('lytex_integration_data');
        localStorage.removeItem('lytex_device_id');
        localStorage.removeItem('lytex_invoice_id');
        localStorage.removeItem(`paymentLink_${deviceId}`);
        
        if (!isAutoCheck) {
          // Mostrar alerta específico para fatura expirada apenas em verificação manual
          showAlert('⚠️ A fatura de pagamento não foi encontrada ou pode ter expirado. Os dados foram limpos para permitir uma nova tentativa.', 'warning');
          handleTimerExpiration();
        }
      } else {
        // Para outros erros, também limpar storage
        localStorage.removeItem('lytex_integration_data');
        localStorage.removeItem('lytex_device_id');
        localStorage.removeItem('lytex_invoice_id');
        localStorage.removeItem(`paymentLink_${deviceId}`);
      }
      
      return false; // Erro na verificação
    } finally {
      setCheckingPayment(false);
    }
  };

  // Copiar código PIX para área de transferência
  const copyPixCode = () => {
    if (invoiceData?.pix?.qrCode) {
      navigator.clipboard.writeText(invoiceData.pix.qrCode);
      showAlert('📋 Código PIX copiado para a área de transferência!', 'success');
    }
  };

  // Função para parar todos os intervalos
  const stopAllIntervals = () => {
    if (timerInterval) {
      console.log('⏰ Parando timer...');
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    if (paymentCheckInterval) {
      console.log('⏹️ Parando verificação automática de pagamento');
      clearInterval(paymentCheckInterval);
      setPaymentCheckInterval(null);
      setPaymentCheckCount(0);
    }
  };

  // Função para iniciar verificação automática de pagamento
  const startPaymentPolling = () => {
    console.log('🔄 Iniciando verificação automática de pagamento...');
    
    // Limpar qualquer polling anterior
    if (paymentCheckInterval) {
      clearInterval(paymentCheckInterval);
    }
    
    setPaymentCheckCount(0);
    
    const interval = setInterval(async () => {
      setPaymentCheckCount(prevCount => {
        const newCount = prevCount + 1;
        console.log(`🔍 Verificação automática ${newCount}/${MAX_PAYMENT_CHECKS}`);
        
        // Verificar se atingiu o limite máximo
        if (newCount >= MAX_PAYMENT_CHECKS) {
          console.log('⏰ Tempo limite de verificação atingido');
          clearInterval(interval);
          setPaymentCheckInterval(null);
          setPaymentCheckCount(0);
          return newCount;
        }
        
        // Executar verificação
        checkPaymentStatus(true).then(paymentCompleted => {
          if (paymentCompleted) {
            console.log('✅ Pagamento concluído, parando polling');
            clearInterval(interval);
            setPaymentCheckInterval(null);
            setPaymentCheckCount(0);
          }
        });
        
        return newCount;
      });
    }, PAYMENT_CHECK_INTERVAL);
    
    setPaymentCheckInterval(interval);
  };
  const registerLicense = async () => {
    try {
      console.log('📝 Ativando licença para o dispositivo...');
      
      // Usar diretamente o endpoint que funciona (/license-toggle)
      const response = await fetch(`/private/devices/${deviceId}/license-toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vixplay_token')}`
        },
        body: JSON.stringify({
          licenceActive: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Licença ativada com sucesso:', data);
        showAlert('✅ Licença ativada com sucesso!', 'success');
        navigate(`/device/${deviceId}`);
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao ativar licença:', errorData);
        showAlert(`❌ Erro ao ativar licença: ${errorData.message || 'Erro desconhecido'}`, 'danger');
      }
    } catch (error) {
      console.error('❌ Erro ao ativar licença:', error);
      showAlert(`❌ Erro ao ativar licença: ${error.message}`, 'danger');
    }
  };

  // Função para iniciar o timer de 5 minutos
  const startPaymentTimer = () => {
    console.log('⏰ Iniciando timer de 5 minutos (300 segundos)');
    
    const interval = setInterval(() => {
      setTimeRemaining((prevTime) => {
        console.log(`⏰ Tempo restante: ${prevTime} segundos`);
        
        if (prevTime <= 1) {
          // Timer expirou
          console.log('⏰ Timer de 5 minutos expirado!');
          clearInterval(interval);
          setTimerExpired(true);
          handleTimerExpiration();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000); // Executa a cada 1 segundo
    
    setTimerInterval(interval);
  };

  // Função para lidar com a expiração do timer
  const handleTimerExpiration = () => {
    // Limpar dados de integração do localStorage
    localStorage.removeItem('lytex_integration_data');
    localStorage.removeItem('lytex_device_id');
    localStorage.removeItem('lytex_invoice_id');
    
    // Limpar também o link de pagamento específico do dispositivo
    localStorage.removeItem(`paymentLink_${deviceId}`);
    
    // Limpar qualquer cache relacionado ao Lytex
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('lytex') || key.includes('payment') || key.includes('invoice'))) {
        localStorage.removeItem(key);
      }
    }
    
    // Mostrar alerta ao usuário
    showAlert('⏰ Tempo para pagamento expirado! Você será redirecionado para gerar uma nova integração.', 'warning');
    
    // Redirecionar para a página de dispositivos
    navigate('/devices');
  };

  // Função para formatar o tempo restante
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Carregar dados quando o componente montar
  useEffect(() => {
    if (deviceId && invoiceId) {
      loadInvoiceData();
      startPaymentTimer(); // Iniciar o timer quando carregar os dados
    }
  }, [deviceId, invoiceId]);

  // Limpar intervalos quando o componente for desmontado ou quando o pagamento for pago
  useEffect(() => {
    return () => {
      stopAllIntervals();
      localStorage.removeItem('lytex_integration_data');
      localStorage.removeItem('lytex_device_id');
      localStorage.removeItem('lytex_invoice_id');
      localStorage.removeItem(`paymentLink_${deviceId}`);
    }
  }, [paymentStatus, deviceId]);

  // Parar o timer e polling se o pagamento for aprovado
  useEffect(() => {
    if (paymentStatus?.status === 'paid') {
      console.log('✅ Pagamento aprovado, parando todos os intervalos');
      stopAllIntervals();
      
      // Limpar dados de integração quando o pagamento for aprovado
      localStorage.removeItem('lytex_integration_data');
      localStorage.removeItem('lytex_device_id');
      localStorage.removeItem('lytex_invoice_id');
      localStorage.removeItem(`paymentLink_${deviceId}`);
    }
  }, [paymentStatus]);
  useEffect(() => {
    if (invoiceData && paymentStatus?.status !== 'paid') {
      console.log('📊 Dados da fatura carregados, iniciando polling automático...');
      startPaymentPolling();
    }
    
    return () => {
      if (paymentCheckInterval) {
        clearInterval(paymentCheckInterval);
      }
    };
  }, [invoiceData, paymentStatus]);

  // Função para ativar licença automaticamente após pagamento confirmado
  const activateLicenseAutomatically = async () => {
    try {
      console.log('🔄 Ativando licença automaticamente após pagamento confirmado...');
      
      const token = localStorage.getItem('vixplay_token');
      const response = await fetch(`/private/devices/${deviceId}/license-toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenceActive: true
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Licença ativada automaticamente:', result);
        
        // Mostrar mensagem de sucesso
        showAlert('🎉 Pagamento confirmado! Licença ativada automaticamente com sucesso. Você será redirecionado.', 'success');
        
        // Redirecionar para a página do dispositivo
        setTimeout(() => navigate(`/device/${deviceId}`), 2000);
        return true;
      } else {
        const errorData = await response.json();
        console.error('❌ Erro ao ativar licença automaticamente:', errorData);
        showAlert(`❌ Erro ao ativar licença automaticamente: ${errorData.message || 'Erro desconhecido'}`, 'danger');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao ativar licença automaticamente:', error);
      showAlert(`❌ Erro ao ativar licença automaticamente: ${error.message}`, 'danger');
      return false;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: currentTheme.background
      }}>
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          padding: '2rem',
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          boxShadow: currentTheme.shadow,
          textAlign: 'center'
        }}>
          <i className="bi bi-arrow-clockwise" style={{ 
            fontSize: '2rem', 
            color: currentTheme.primary,
            marginBottom: '1rem',
            display: 'block',
            animation: 'spin 1s linear infinite'
          }}></i>
          <p style={{ color: currentTheme.textSecondary }}>Carregando dados da fatura...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: currentTheme.background,
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.error}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: currentTheme.shadow
        }}>
          <i className="bi bi-exclamation-triangle" style={{
            fontSize: '3rem',
            color: currentTheme.error,
            marginBottom: '1rem',
            display: 'block'
          }}></i>
          <h2 style={{
            color: currentTheme.textPrimary,
            marginBottom: '1rem',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Erro</h2>
          <p style={{
            color: currentTheme.textSecondary,
            marginBottom: '2rem'
          }}>{error}</p>
          <button 
            onClick={() => navigate(`/device/${deviceId}`)}
            style={{
              padding: '0.75rem 1.5rem',
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
              e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = currentTheme.primary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <i className="bi bi-arrow-left" style={{ marginRight: '0.5rem' }}></i>
            Voltar ao Dispositivos
          </button>
        </div>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        backgroundColor: currentTheme.background,
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.warning}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          textAlign: 'center',
          maxWidth: '600px',
          boxShadow: currentTheme.shadow
        }}>
          <i className="bi bi-file-earmark-x" style={{
            fontSize: '3rem',
            color: currentTheme.warning,
            marginBottom: '1rem',
            display: 'block'
          }}></i>
          <h2 style={{
            color: currentTheme.textPrimary,
            marginBottom: '1rem',
            fontFamily: 'Poppins, sans-serif',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>Fatura não encontrada</h2>
          <p style={{
            color: currentTheme.textSecondary,
            marginBottom: '2rem'
          }}>Não foi possível encontrar os dados da fatura.</p>
          <button 
            onClick={() => navigate(`/device/${deviceId}`)}
            style={{
              padding: '0.75rem 1.5rem',
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
              e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = currentTheme.primary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <i className="bi bi-arrow-left" style={{ marginRight: '0.5rem' }}></i>
            Voltar ao Dispositivos
          </button>
        </div>
      </div>
    );
  }

  // Função de teste manual (DEBUG)
  const testManualLicense = async () => {
    try {
      console.log('🔧 [DEBUG] Testando ativação manual da licença...');
      
      const response = await fetch(`/private/devices/${deviceId}/license-toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vixplay_token')}`
        },
        body: JSON.stringify({
          licenceActive: true
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DEBUG] Licença ativada com sucesso:', data);
        showAlert('✅ [DEBUG] Licença ativada com sucesso!', 'success');
        setTimeout(() => navigate(`/device/${deviceId}`), 2000);
      } else {
        console.error('❌ [DEBUG] Erro ao ativar licença:', response.status);
        showAlert('❌ [DEBUG] Erro ao ativar licença', 'danger');
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erro na requisição:', error);
      showAlert('❌ [DEBUG] Erro na requisição', 'danger');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: currentTheme.background,
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Alert Bootstrap */}
        {alert && (
          <div className={`alert alert-${alert.type} alert-dismissible fade show`} role="alert" style={{
            marginBottom: '2rem',
            fontFamily: 'Poppins, sans-serif'
          }}>
            {alert.message}
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => setAlert(null)}
              aria-label="Close"
            ></button>
          </div>
        )}
        
        {/* Header */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: currentTheme.shadow
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h1 style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif',
                marginBottom: '0.5rem'
              }}>Pagamento da Licença</h1>
              <p style={{
                color: currentTheme.textSecondary,
                fontSize: '1rem'
              }}>Fatura #{invoiceData.id || invoiceId}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                marginBottom: '0.25rem'
              }}>Valor</p>
              <p style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: currentTheme.success,
                fontFamily: 'Poppins, sans-serif'
              }}>
                R$ {((invoiceData.totalValue || invoiceData.amount || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Status do Pagamento */}
        {paymentStatus && (
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: currentTheme.shadow
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: currentTheme.textPrimary,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '1rem'
            }}>Status do Pagamento</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '1rem',
                height: '1rem',
                borderRadius: '50%',
                backgroundColor: paymentStatus.status === 'paid' ? currentTheme.success : 
                                paymentStatus.status === 'pending' ? currentTheme.warning : currentTheme.error
              }}></div>
              <span style={{
                fontWeight: '500',
                color: currentTheme.textPrimary,
                fontSize: '1rem'
              }}>
                {paymentStatus.status === 'paid' ? '✅ Pago' : 
                 paymentStatus.status === 'pending' ? '⏳ Pendente' : '❌ Não Pago'}
              </span>
            </div>
          </div>
        )}

        {/* Timer de Pagamento */}
        {!timerExpired && paymentStatus?.status !== 'paid' && (
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            border: `2px solid ${timeRemaining <= 60 ? currentTheme.error : currentTheme.warning}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: currentTheme.shadow,
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <i className="bi bi-clock" style={{
                fontSize: '1.5rem',
                color: timeRemaining <= 60 ? currentTheme.error : currentTheme.warning
              }}></i>
              <h3 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                color: currentTheme.textPrimary,
                fontFamily: 'Poppins, sans-serif',
                margin: 0
              }}>Tempo para Pagamento</h3>
            </div>
            <div style={{
              fontSize: '3rem',
              fontWeight: 'bold',
              color: timeRemaining <= 60 ? currentTheme.error : currentTheme.primary,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '0.5rem'
            }}>
              {formatTime(timeRemaining)}
            </div>
            <p style={{
              color: currentTheme.textSecondary,
              fontSize: '0.875rem',
              margin: 0
            }}>
              {timeRemaining <= 60 ? 
                '⚠️ Tempo quase esgotado! Complete o pagamento rapidamente.' : 
                'Complete o pagamento PIX antes que o tempo expire.'
              }
            </p>
          </div>
        )}

        {/* Aviso de Timer Expirado */}
        {timerExpired && (
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            border: `2px solid ${currentTheme.error}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            marginBottom: '2rem',
            boxShadow: currentTheme.shadow,
            textAlign: 'center'
          }}>
            <i className="bi bi-exclamation-triangle" style={{
              fontSize: '3rem',
              color: currentTheme.error,
              marginBottom: '1rem',
              display: 'block'
            }}></i>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: currentTheme.error,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '1rem'
            }}>Tempo Expirado</h3>
            <p style={{
              color: currentTheme.textSecondary,
              marginBottom: '2rem'
            }}>O tempo para pagamento expirou. Você será redirecionado para gerar uma nova integração.</p>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          {/* PIX */}
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: currentTheme.shadow
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: currentTheme.textPrimary,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <i className="bi bi-qr-code-scan" style={{
                fontSize: '1.5rem',
                marginRight: '0.5rem',
                color: currentTheme.primary
              }}></i>
              Pagamento via PIX
            </h2>
            
            {/* Código PIX */}
            {(invoiceData.transactions?.[0]?.pix?.qrcode || invoiceData.paymentMethods?.pix?.qrCode) && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textSecondary
                  }}>Código PIX (Copia e Cola):</label>
                  <button 
                    onClick={() => {
                      const pixCode = invoiceData.transactions?.[0]?.pix?.qrcode || invoiceData.paymentMethods?.pix?.qrCode;
                      navigator.clipboard.writeText(pixCode);
                      showAlert('📋 Código PIX copiado para a área de transferência!', 'success');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = currentTheme.primary;
                    }}
                  >
                    <i className="bi bi-clipboard"></i>
                    Copiar
                  </button>
                </div>
                <div style={{
                  backgroundColor: currentTheme.cardBackground,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: currentTheme.textPrimary,
                  wordBreak: 'break-all',
                  lineHeight: '1.4'
                }}>  
                  {invoiceData.transactions?.[0]?.pix?.qrcode || invoiceData.paymentMethods?.pix?.qrCode}
                </div>
              </div>
            )}

            {/* QR Code */}
            {qrCodeDataUrl && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                textAlign: 'center',
                marginBottom: '1.5rem'
              }}>
                <p style={{
                  color: currentTheme.textSecondary,
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>Escaneie o QR Code com seu app bancário:</p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code PIX" 
                    style={{
                      maxWidth: '200px',
                      height: 'auto',
                      border: `2px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      backgroundColor: 'white',
                      padding: '0.5rem'
                    }}
                  />
                  
                </div>
                {/* Instruções PIX */}
            <div style={{
              backgroundColor: currentTheme.primaryLight,
              border: `1px solid ${currentTheme.primary}20`,
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                color: currentTheme.textPrimary,
                marginBottom: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}>
                <i className="bi bi-info-circle" style={{
                  marginRight: '0.5rem',
                  color: currentTheme.primary
                }}></i>
                Como pagar via PIX:
              </h4>
              <ol style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem',
                marginBottom: '0.75rem',
                lineHeight: '1.5',
                paddingLeft: '0',
                margin: 0,
                textAlign: 'left'
              }}>
                <li>1. Abra o app do seu banco</li>
                <li>2. Escaneie o QR Code ou copie o código</li>
                <li>3. Confirme o pagamento</li>
                <li>4. A licença será ativada automaticamente</li>
              </ol>
            </div>
              </div>
              
            )}
          </div>

          {/* Boleto */}
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.75rem',
            padding: '2rem',
            boxShadow: currentTheme.shadow
          }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: currentTheme.textPrimary,
              fontFamily: 'Poppins, sans-serif',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center'
            }}>
              <i className="bi bi-file-earmark-text" style={{
                fontSize: '1.5rem',
                marginRight: '0.5rem',
                color: currentTheme.primary
              }}></i>
              Pagamento via Boleto
            </h2>

            {/* Link do Boleto */}
            {(invoiceData.linkBoleto || invoiceData.paymentMethods?.boleto?.url) && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <p style={{
                  color: currentTheme.textSecondary,
                  marginBottom: '1rem',
                  fontSize: '0.875rem'
                }}>Clique no botão abaixo para visualizar e imprimir o boleto:</p>
                <a 
                  href={invoiceData.linkBoleto || invoiceData.paymentMethods.boleto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.primary;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="bi bi-download"></i>
                  Visualizar Boleto
                </a>
              </div>
            )}

            {/* Código de Barras */}
            {invoiceData.paymentMethods?.boleto?.barcode && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <label style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textSecondary
                  }}>Código de Barras:</label>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(invoiceData.paymentMethods.boleto.barcode);
                      showAlert('📋 Código de barras copiado!', 'success');
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: currentTheme.primary,
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = currentTheme.primary;
                    }}
                  >
                    <i className="bi bi-clipboard"></i>
                    Copiar
                  </button>
                </div>
                <div style={{
                  backgroundColor: currentTheme.cardBackground,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  color: currentTheme.textPrimary,
                  wordBreak: 'break-all',
                  lineHeight: '1.4'
                }}>
                  {invoiceData.paymentMethods.boleto.barcode}
                </div>
              </div>
            )}

            {/* Data de Vencimento */}
            {invoiceData.dueDate && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <label style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textSecondary,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}>Data de Vencimento:</label>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  {new Date(invoiceData.dueDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}

            {/* Link de Checkout Externo */}
            {invoiceData.linkCheckout && (
              <div style={{
                backgroundColor: currentTheme.borderLight,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <a 
                  href={invoiceData.linkCheckout}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.5rem',
                    backgroundColor: currentTheme.primary,
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = currentTheme.primary;
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  <i className="bi bi-box-arrow-up-right"></i>
                  Abrir Página Externa da Fatura
                </a>
              </div>
            )}

            {/* Instruções Boleto */}
            <div style={{
              backgroundColor: currentTheme.primaryLight,
              border: `1px solid ${currentTheme.primary}20`,
              borderRadius: '0.5rem',
              padding: '1rem'
            }}>
              <h4 style={{
                color: currentTheme.textPrimary,
                marginBottom: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center'
              }}>
                <i className="bi bi-info-circle" style={{
                  marginRight: '0.5rem',
                  color: currentTheme.primary
                }}></i>
                Como pagar via Boleto:
              </h4>
              <ol style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem',
                lineHeight: '1.5',
                paddingLeft: '1.25rem',
                margin: 0
              }}>
                <li>1. Clique em "Visualizar Boleto"</li>
                <li>2. Imprima ou salve o boleto</li>
                <li>3. Pague em qualquer banco ou lotérica</li>
                <li>4. A licença será ativada em até 2 dias úteis</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: currentTheme.shadow
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            justifyContent: 'center'
          }}>
            <button 
              onClick={() => navigate('/devices')}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: currentTheme.textSecondary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = currentTheme.borderLight;
                e.target.style.color = currentTheme.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.textSecondary;
              }}
            >
              <i className="bi bi-arrow-left"></i>
              Voltar para Dispositivos
            </button>
            
            <button 
              onClick={() => checkPaymentStatus(false)}
              disabled={checkingPayment}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: checkingPayment ? '#6c757d' : currentTheme.primary,
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: checkingPayment ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: checkingPayment ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!checkingPayment) {
                  e.target.style.backgroundColor = currentTheme.buttonPrimaryHover;
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!checkingPayment) {
                  e.target.style.backgroundColor = currentTheme.primary;
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <i className={checkingPayment ? "bi bi-arrow-clockwise" : "bi bi-arrow-clockwise"} style={{animation: checkingPayment ? 'spin 1s linear infinite' : 'none'}}></i>
              {checkingPayment ? 'Verificando...' : 'Verificar Status'}
            </button>
            
            <button 
              onClick={loadInvoiceData}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: currentTheme.primary,
                border: `1px solid ${currentTheme.primary}`,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = currentTheme.primary;
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.primary;
              }}
            >
              <i className="bi bi-arrow-repeat"></i>
              Atualizar Dados
            </button>
            
            {/* Botão de Debug */}
            <button 
              onClick={testManualLicense}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#c82333';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#dc3545';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <i className="bi bi-bug"></i>
              [DEBUG] Ativar Licença
            </button>
          </div>
        </div>

        {/* Important Information */}
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.warning}`,
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow: currentTheme.shadow
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: currentTheme.textPrimary,
            fontFamily: 'Poppins, sans-serif',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center'
          }}>
            <i className="bi bi-info-circle-fill" style={{
              fontSize: '1.5rem',
              marginRight: '0.5rem',
              color: currentTheme.warning
            }}></i>
            Informações Importantes
          </h3>
          <div style={{
            color: currentTheme.textSecondary,
            fontSize: '0.875rem',
            lineHeight: '1.6'
          }}>
            <ul style={{
              paddingLeft: '1.25rem',
              margin: 0,
              listStyle: 'disc'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>PIX:</strong> O pagamento via PIX é processado instantaneamente. Após a confirmação, a licença será ativada automaticamente.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Boleto:</strong> O pagamento via boleto pode levar até 3 dias úteis para ser processado pelos bancos.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Ativação:</strong> Assim que o pagamento for confirmado, você receberá um e-mail de confirmação e a licença será ativada no dispositivo.
              </li>
              <li>
                <strong>Suporte:</strong> Em caso de dúvidas ou problemas com o pagamento, entre em contato com nosso suporte técnico:{' '}
                <a href="https://wa.me/5585994454472" target="_blank" rel="noopener noreferrer" style={{ color: currentTheme.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <i className="bi bi-whatsapp" style={{ fontSize: '1rem' }}></i>
                  (85) 99445.4472
                </a>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LytexPayment;


// Função para obter configurações do sistema
const getSystemConfig = async () => {
  try {
    const response = await apiService.getSystemConfig();
    return response.data;
  } catch (error) {
    console.error('❌ Erro ao obter configurações do sistema:', error);
    throw error;
  }
};

// Função para obter token Lytex
const obtainLytexToken = async (systemConfig) => {
  try {
    console.log('🔑 Obtendo token da API Lytex...');
    
    const tokenResponse = await fetch('https://api-pay.lytex.com.br/v2/auth/obtain_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        grantType: "clientCredentials",
        clientId: systemConfig.clientId,
        clientSecret: systemConfig.clientSecret
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Erro ao obter token:', tokenResponse.status, errorData);
      throw new Error(`Erro ao obter token: ${errorData.message || 'Erro desconhecido'}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log('✅ Token obtido com sucesso');
    
    return tokenData.accessToken;
    
  } catch (error) {
    console.error('❌ Erro ao obter token Lytex:', error);
    throw error;
  }
};

// Função para ativar licença automaticamente após pagamento confirmado
const activateLicenseAutomatically = async () => {
  try {
    console.log('🔄 Ativando licença automaticamente após pagamento confirmado...');
    
    const token = localStorage.getItem('vixplay_token');
    const response = await fetch(`/private/devices/${deviceId}/license-toggle`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        licenceActive: true
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Licença ativada automaticamente:', result);
      
      // Mostrar mensagem de sucesso
      showAlert('🎉 Pagamento confirmado! Licença ativada automaticamente com sucesso. Você será redirecionado.', 'success');
      
      // Redirecionar para a página do dispositivo
      setTimeout(() => navigate(`/device/${deviceId}`), 2000);
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Erro ao ativar licença automaticamente:', errorData);
      showAlert(`❌ Erro ao ativar licença automaticamente: ${errorData.message || 'Erro desconhecido'}`, 'danger');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao ativar licença automaticamente:', error);
    showAlert(`❌ Erro ao ativar licença automaticamente: ${error.message}`, 'danger');
    return false;
  }
};
