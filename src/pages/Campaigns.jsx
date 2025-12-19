import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const Campaigns = () => {
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados principais
  const [campaigns, setCampaigns] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para alertas Bootstrap
  const [alert, setAlert] = useState(null);
  
  // Função para mostrar alertas Bootstrap
  const showAlert = (message, type = 'info') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 5000);
  };
  
  // Estados dos modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [activeTab, setActiveTab] = useState('detalhes'); // Nova aba ativa
  // Modal de pagamento manual
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);
  const [manualPaymentForm, setManualPaymentForm] = useState({ amount: '', method: 'MANUAL', date: new Date().toISOString().slice(0,10), notes: '' });
  const [selectedPaymentId, setSelectedPaymentId] = useState(null)
  
  // Estados para edição e exclusão
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    clientId: '',
    startDate: '',
    endDate: '',
    value: '',
    paymentMethod: '',
    dueDate: '',
    paymentStatus: 'ABERTO',
    active: true,
    isRecurring: false,
    monthlyValue: '',
    billingDay: '1',
    autoGenerate: true
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estados para filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  
  // Estados para mídias da campanha
  const [campaignMedias, setCampaignMedias] = useState([]);
  const [loadingMedias, setLoadingMedias] = useState(false);
  const [allUserMedias, setAllUserMedias] = useState([]);
  const [loadingAllMedias, setLoadingAllMedias] = useState(false);
  const [checkingExpired, setCheckingExpired] = useState(false);

  // Parcelas mensais (campanhas recorrentes)
  const [monthlyPayments, setMonthlyPayments] = useState([]);
  const [loadingMonthlyPayments, setLoadingMonthlyPayments] = useState(false);
  // Totais pagos por campanha
  const [paidTotalsByCampaign, setPaidTotalsByCampaign] = useState({});
  const [openTotalsByCampaign, setOpenTotalsByCampaign] = useState({});
  const [overdueTotalsByCampaign, setOverdueTotalsByCampaign] = useState({});
  const [loadingPaidTotals, setLoadingPaidTotals] = useState(false);

  // Parser do valor pago nas observações (PAID_AMOUNT:<valor>)
  const extractPaidAmountFromNotes = (notes) => {
    if (!notes) return null;
    const match = String(notes).match(/PAID_AMOUNT\s*:\s*([0-9]+(?:[.,][0-9]+)?)/i);
    if (!match) return null;
    const normalized = match[1].replace(',', '.');
    const amount = parseFloat(normalized);
    return isNaN(amount) ? null : amount;
  };

  // Carregar parcelas e calcular somatório dos pagos por campanha
  useEffect(() => {
    if (!campaigns || campaigns.length === 0) {
      setPaidTotalsByCampaign({});
      setOpenTotalsByCampaign({});
      setOverdueTotalsByCampaign({});
      return;
    }
    let cancelled = false;
    const normalize = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    const loadTotals = async () => {
      try {
        setLoadingPaidTotals(true);
        const paidTotals = {};
        const openTotals = {};
        const overdueTotals = {};
        const today = new Date();
        for (const c of campaigns) {
          try {
            const isRecurring = !!c.isRecurring || c.campaignType === 'recorrente';
            let sumPaid = 0, sumOpen = 0, sumOverdue = 0;
            if (isRecurring) {
              const { data } = await apiService.getMonthlyPayments(c.id);
              const payments = data?.monthlyPayments || [];
              payments.forEach((p) => {
                const val = parseFloat(p.value || 0);
                if (p.status === 'PAID') {
                  const noted = extractPaidAmountFromNotes(p.notes);
                  const base = noted != null ? noted : val;
                  sumPaid += isNaN(base) ? 0 : base;
                } else if (p.status === 'PENDING') {
                  const due = p.dueDate ? new Date(p.dueDate) : null;
                  if (due && normalize(due) < normalize(today)) {
                    sumOverdue += isNaN(val) ? 0 : val;
                  } else {
                    sumOpen += isNaN(val) ? 0 : val;
                  }
                }
              });
            } else {
              const val = parseFloat(c.value || 0);
              const d = c.dueDate ? new Date(c.dueDate) : null;
              if (c.paymentStatus === 'PAGO') {
                sumPaid += isNaN(val) ? 0 : val;
              } else if (c.paymentStatus === 'ABERTO' && d) {
                if (normalize(d) < normalize(today)) {
                  sumOverdue += isNaN(val) ? 0 : val;
                } else {
                  sumOpen += isNaN(val) ? 0 : val;
                }
              }
            }
            paidTotals[c.id] = (paidTotals[c.id] || 0) + sumPaid;
            openTotals[c.id] = (openTotals[c.id] || 0) + sumOpen;
            overdueTotals[c.id] = (overdueTotals[c.id] || 0) + sumOverdue;
          } catch (e) {
            paidTotals[c.id] = paidTotals[c.id] ?? 0;
            openTotals[c.id] = openTotals[c.id] ?? 0;
            overdueTotals[c.id] = overdueTotals[c.id] ?? 0;
            console.warn('Falha ao carregar parcelas da campanha', c.id, e);
          }
        }
        if (!cancelled) {
          setPaidTotalsByCampaign(paidTotals);
          setOpenTotalsByCampaign(openTotals);
          setOverdueTotalsByCampaign(overdueTotals);
        }
      } finally {
        if (!cancelled) setLoadingPaidTotals(false);
      }
    };
    loadTotals();
    return () => { cancelled = true; };
  }, [campaigns]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Abrir modal de criação ao chegar com parâmetro ou state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const addParam = params.get('add') || params.get('novo') || params.get('create');
    const shouldOpen = addParam === '1' || location.state?.openAdd === true;
    if (shouldOpen) {
      resetForm();
      setShowCreateModal(true);
    }
  }, [location.search, location.state]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchClients()
      ]);
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
      setError('Erro ao carregar dados iniciais');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await apiService.getCampaigns();
      setCampaigns(response.data || []);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar campanhas:', err);
      setError('Erro ao carregar campanhas');
      setCampaigns([]);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiService.getClients();
      setClients(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
      setClients([]);
    }
  };

  const fetchCampaignMedias = async (campaignId) => {
    try {
      setLoadingMedias(true);
      const token = localStorage.getItem('vixplay_token');
      const response = await fetch(
        `${window.APP_CONFIG.API_BASE_URL}/private/campaigns/${campaignId}/medias`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const medias = await response.json();
        setCampaignMedias(medias || []);
      } else {
        setCampaignMedias([]);
      }
    } catch (err) {
      console.error('Erro ao carregar mídias da campanha:', err);
      setCampaignMedias([]);
    } finally {
      setLoadingMedias(false);
    }
  };

  const fetchAllUserMedias = async () => {
    try {
      setLoadingAllMedias(true);
      const response = await apiService.getMedias();
      setAllUserMedias(response.data || []);
    } catch (err) {
      console.error('Erro ao carregar todas as mídias:', err);
      setAllUserMedias([]);
    } finally {
      setLoadingAllMedias(false);
    }
  };

  const associateMediaToCampaign = async (mediaId) => {
    try {
      const response = await apiService.associateMediaToCampaign({
        campaignId: selectedCampaign.id,
        mediaId: mediaId
      });

      if (response.status === 200 || response.status === 201) {
        showAlert('Mídia associada à campanha com sucesso!', 'success');
        await fetchCampaignMedias(selectedCampaign.id);
      } else {
        showAlert(response.data?.error || 'Erro ao associar mídia à campanha', 'danger');
      }
    } catch (err) {
      console.error('Erro ao associar mídia:', err);
      showAlert('Erro ao associar mídia à campanha', 'danger');
    }
  };

  const disassociateMediaFromCampaign = async (mediaId) => {
    try {
      if (!selectedCampaign?.id) {
        showAlert('Campanha não selecionada', 'danger');
        return;
      }
      const payload = {
        campaignId: Number(selectedCampaign.id),
        mediaId: Number(mediaId)
      };
      console.log('Desassociando mídia com payload:', payload);
      const response = await apiService.disassociateMediaFromCampaign(payload);
      if (response.status === 200) {
        showAlert('Mídia desassociada da campanha com sucesso!', 'success');
        await fetchCampaignMedias(selectedCampaign.id);
      } else {
        const msg = response.data?.error || 'Erro ao desassociar mídia da campanha';
        showAlert(msg, 'danger');
      }
    } catch (err) {
      console.error('Erro ao desassociar mídia:', err?.response?.data || err);
      const msg = err?.response?.data?.error || 'Erro ao desassociar mídia da campanha';
      showAlert(msg, 'danger');
    }
  };

  const checkExpiredCampaigns = async () => {
    try {
      setCheckingExpired(true);
      const token = localStorage.getItem('vixplay_token');
      const response = await fetch(
        `${window.APP_CONFIG.API_BASE_URL}/private/campaigns/check-expired`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        // Recarregar campanhas e mídias
        await fetchCampaigns();
        if (selectedCampaign) {
          await fetchCampaignMedias(selectedCampaign.id);
        }
        // Mostrar mensagem de sucesso
        console.log(result.message);
      } else {
        console.error(result.message || 'Erro ao verificar campanhas expiradas');
      }
    } catch (err) {
      console.error('Erro ao verificar campanhas expiradas:', err);
    } finally {
      setCheckingExpired(false);
    }
  };

  // Funções de validação
  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Nome da campanha é obrigatório';
    }

    if (!formData.clientId) {
      errors.clientId = 'Cliente é obrigatório';
    }

    if (!formData.startDate) {
      errors.startDate = 'Data de início é obrigatória';
    }

    if (!formData.endDate) {
      errors.endDate = 'Data de fim é obrigatória';
    }

    if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
      errors.endDate = 'Data de fim deve ser posterior à data de início';
    }

    const isRecurring = !!formData.isRecurring;

    if (!isRecurring) {
      if (!formData.value || parseFloat(formData.value) <= 0) {
        errors.value = 'Valor da campanha deve ser maior que zero';
      }
      if (!formData.dueDate) {
        errors.dueDate = 'Data de vencimento é obrigatória';
      }
    } else {
      if (!formData.monthlyValue || parseFloat(formData.monthlyValue) <= 0) {
        errors.monthlyValue = 'Valor mensal é obrigatório';
      }
    }

    if (!formData.paymentMethod) {
      errors.paymentMethod = 'Forma de pagamento é obrigatória';
    }

    if (!isRecurring && !formData.paymentStatus) {
      errors.paymentStatus = 'Status do pagamento é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Funções CRUD
  const handleCreateCampaign = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError('');

      const isRecurring = !!formData.isRecurring;
      const monthlyValueNumber = formData.monthlyValue ? parseFloat(formData.monthlyValue) : null;
      const valueNumber = formData.value ? parseFloat(formData.value) : null;

      const campaignData = {
        name: formData.name,
        clientId: parseInt(formData.clientId, 10),
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        active: !!formData.active,
        value: isRecurring ? monthlyValueNumber : valueNumber,
        paymentMethod: formData.paymentMethod,
        dueDate: formData.dueDate,
        paymentStatus: formData.paymentStatus,
        isRecurring,
        chargeType: formData.chargeType,
        recurringCampaign: isRecurring ? {
          monthlyValue: monthlyValueNumber,
          billingDay: parseInt(formData.billingDay || '1', 10),
          autoGenerate: !!formData.autoGenerate
        } : null
      };

      await apiService.createCampaign(campaignData);

      setShowCreateModal(false);
      resetForm();
      await fetchCampaigns();
      setSuccess('Campanha criada com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Erro ao criar campanha:', err);
      setError('Erro ao criar campanha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCampaign = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setError('');

      const campaignData = {
        name: formData.name,
        clientId: parseInt(formData.clientId, 10),
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate,
        active: !!formData.active,
        value: formData.value ? parseFloat(formData.value) : 0,
        paymentMethod: formData.paymentMethod,
        dueDate: formData.dueDate,
        paymentStatus: formData.paymentStatus,
        chargeType: formData.chargeType
      };

      await apiService.updateCampaign(editingCampaign.id, campaignData);

      setShowEditModal(false);
      resetForm();
      setEditingCampaign(null);
      await fetchCampaigns();
      setSuccess('Campanha atualizada com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Erro ao atualizar campanha:', err);
      setError('Erro ao atualizar campanha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCampaign = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      await apiService.deleteCampaign(deletingCampaign.id);
      
      setShowDeleteModal(false);
      setDeletingCampaign(null);
      await fetchCampaigns();
      setSuccess('Campanha excluída com sucesso!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Erro ao excluir campanha:', err);
      setError('Erro ao excluir campanha: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Funções auxiliares
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      clientId: '',
      startDate: '',
      endDate: '',
      value: '',
      paymentMethod: '',
      dueDate: '',
      paymentStatus: 'ABERTO',
      active: true,
      isRecurring: false,
      monthlyValue: '',
      billingDay: '1',
      autoGenerate: true,
      chargeType: 'PREPAGO'
    });
    setFormErrors({});
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const openEditModal = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name || '',
      description: campaign.description || '',
      clientId: campaign.clientId || '',
      startDate: campaign.startDate ? new Date(campaign.startDate).toISOString().slice(0, 16) : '',
      endDate: campaign.endDate ? new Date(campaign.endDate).toISOString().slice(0, 16) : '',
      value: campaign.value?.toString() || '',
      paymentMethod: campaign.paymentMethod || '',
      dueDate: campaign.dueDate ? new Date(campaign.dueDate).toISOString().slice(0, 10) : '',
      paymentStatus: campaign.paymentStatus || 'ABERTO',
      active: campaign.active !== undefined ? campaign.active : true,
      isRecurring: !!campaign.isRecurring || campaign.campaignType === 'recorrente',
      monthlyValue: campaign.recurringCampaign?.monthlyValue?.toString() || '',
      billingDay: (campaign.recurringCampaign?.billingDay?.toString()) || '1',
      autoGenerate: !!campaign.recurringCampaign?.autoGenerate,
      chargeType: campaign.chargeType || 'PREPAGO'
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (campaign) => {
    setDeletingCampaign(campaign);
    setShowDeleteModal(true);
  };

  const openDetailsModal = (campaign) => {
    setSelectedCampaign(campaign);
    setActiveTab('detalhes'); // Reset para aba de detalhes
    setShowDetailsModal(true);
    fetchCampaignMedias(campaign.id);
    if (campaign.isRecurring || campaign.campaignType === 'recorrente') {
      fetchMonthlyPayments(campaign.id);
    }
  };

  const openMediaModal = (campaign) => {
    setSelectedCampaign(campaign);
    setShowMediaModal(true);
    fetchCampaignMedias(campaign.id);
    fetchAllUserMedias();
  };

  // Funções de formatação
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusColor = (campaign) => {
    if (!campaign.active) return currentTheme.danger || '#dc3545';
    
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    
    if (now < startDate) return currentTheme.warning || '#ffc107';
    if (now > endDate) return currentTheme.danger || '#dc3545';
    return currentTheme.success || '#28a745';
  };

  // Mensalidades - helpers e carregamento
  const getPaymentStatusLabel = (status) => {
    switch (status) {
      case 'PAID': return 'Pago';
      case 'PENDING': return 'Pendente';
      case 'OVERDUE': return 'Vencido';
      case 'REVERSED': return 'Estornado';
      default: return status;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID': return { bg: `${currentTheme.success}20`, fg: currentTheme.success };
      case 'PENDING': return { bg: `${currentTheme.warning}20`, fg: currentTheme.warning };
      case 'OVERDUE': return { bg: `${currentTheme.danger}20`, fg: currentTheme.danger };
      case 'REVERSED': return { bg: `${currentTheme.info}20`, fg: currentTheme.info };
      default: return { bg: `${currentTheme.border}`, fg: currentTheme.textSecondary };
    }
  };

  const fetchMonthlyPayments = async (campaignId) => {
    try {
      setLoadingMonthlyPayments(true);
      const { data } = await apiService.getMonthlyPayments(campaignId);
      setMonthlyPayments(data?.monthlyPayments || []);
    } catch (err) {
      console.error('Erro ao carregar parcelas mensais:', err);
      setMonthlyPayments([]);
    } finally {
      setLoadingMonthlyPayments(false);
    }
  };

  const handleGenerateMonthlyPayments = async () => {
    if (!selectedCampaign) return;
    try {
      await apiService.generateMonthlyPayments(selectedCampaign.id);
      await fetchMonthlyPayments(selectedCampaign.id);
      showAlert('Parcelas mensais geradas com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar parcelas mensais:', err);
      showAlert('Erro ao gerar parcelas mensais', 'danger');
    }
  };

  // Modal: abrir, fechar e confirmar pagamento manual
  const openManualPaymentModal = (payment) => {
    setSelectedPaymentId(payment?.id ?? null);
    setManualPaymentForm({
      amount: payment?.value ?? '',
      method: 'MANUAL',
      date: new Date().toISOString().slice(0,10),
      notes: ''
    });
    setShowManualPaymentModal(true);
  };

  const closeManualPaymentModal = () => {
    setShowManualPaymentModal(false);
    setSelectedPaymentId(null);
  };

  const confirmManualPayment = async () => {
    if (!selectedPaymentId) return;
    try {
      const payload = {
        paymentMethod: manualPaymentForm.method || 'MANUAL',
        paidDate: manualPaymentForm.date || new Date().toISOString().slice(0,10),
        notes: manualPaymentForm.amount
          ? `PAID_AMOUNT:${manualPaymentForm.amount}` + (manualPaymentForm.notes ? `; ${manualPaymentForm.notes}` : '')
          : (manualPaymentForm.notes || '')
      };
      await apiService.payMonthlyPayment(selectedPaymentId, payload);
      await fetchMonthlyPayments(selectedCampaign.id);
      showAlert('Pagamento registrado com sucesso!', 'success');
      closeManualPaymentModal();
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      showAlert('Erro ao registrar pagamento', 'danger');
    }
  };

  const handlePayMonthlyPayment = async (paymentId) => {
    try {
      const payload = {
        paymentMethod: 'MANUAL',
        paidDate: new Date().toISOString().slice(0, 10)
      };
      await apiService.payMonthlyPayment(paymentId, payload);
      await fetchMonthlyPayments(selectedCampaign.id);
      showAlert('Pagamento registrado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao registrar pagamento:', err);
      showAlert('Erro ao registrar pagamento', 'danger');
    }
  };

  const handleReverseMonthlyPayment = async (paymentId) => {
    try {
      await apiService.reverseMonthlyPayment(paymentId, { reason: 'Estorno manual via UI' });
      await fetchMonthlyPayments(selectedCampaign.id);
      showAlert('Pagamento estornado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao estornar pagamento:', err);
      showAlert('Erro ao estornar pagamento', 'danger');
    }
  };

  const getStatusText = (campaign) => {
    if (!campaign.active) return 'Inativa';
    
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);
    
    if (now < startDate) return 'Agendada';
    if (now > endDate) return 'Expirada';
    return 'Ativa';
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Cliente não encontrado';
  };

  // Filtros
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getClientName(campaign.clientId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && campaign.active && new Date() >= new Date(campaign.startDate) && new Date() <= new Date(campaign.endDate)) ||
                         (statusFilter === 'inactive' && !campaign.active) ||
                         (statusFilter === 'scheduled' && campaign.active && new Date() < new Date(campaign.startDate)) ||
                         (statusFilter === 'expired' && campaign.active && new Date() > new Date(campaign.endDate));
    
    const matchesClient = clientFilter === 'all' || campaign.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesClient;
  });

  // Estatísticas
  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.active && new Date() >= new Date(c.startDate) && new Date() <= new Date(c.endDate)).length,
    scheduled: campaigns.filter(c => c.active && new Date() < new Date(c.startDate)).length,
    expired: campaigns.filter(c => c.active && new Date() > new Date(c.endDate)).length,
    totalValue: campaigns.reduce((sum, c) => {
      // Apenas somar valores de campanhas pagas (status 'paid' ou similar)
      if (c.status === 'paid' || c.status === 'pago' || c.isPaid) {
        return sum + (c.value || 0);
      }
      return sum;
    }, 0),
    // Novo: somatório real de valores pagos (parcelas com status PAID)
    totalValuePaid: Object.values(paidTotalsByCampaign).reduce((sum, v) => sum + (v || 0), 0),
    // Novo: somatório em aberto (parcelas com status PENDING)
    totalValueOpen: Object.values(openTotalsByCampaign).reduce((sum, v) => sum + (v || 0), 0),
    // Novo: somatório atrasado (pendente com vencimento passado)
    totalValueOverdue: Object.values(overdueTotalsByCampaign).reduce((sum, v) => sum + (v || 0), 0)
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
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }}></div>
        <p style={{ marginTop: '1rem' }}>Carregando campanhas...</p>
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
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Alerta Bootstrap */}
      {alert && (
        <div 
          className={`alert alert-${alert.type === 'danger' ? 'danger' : alert.type === 'warning' ? 'warning' : alert.type === 'success' ? 'success' : 'info'} alert-dismissible fade show`}
          role="alert"
          style={{
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <i className={`bi ${
            alert.type === 'success' ? 'bi-check-circle' : 
            alert.type === 'danger' ? 'bi-exclamation-triangle' : 
            alert.type === 'warning' ? 'bi-exclamation-triangle' : 
            'bi-info-circle'
          }`}></i>
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
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '700',
            color: currentTheme.textPrimary,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <i className="bi bi-megaphone" style={{ color: currentTheme.primary }}></i>
            Campanhas
          </h1>
          <p style={{
            margin: '0.5rem 0 0 0',
            color: currentTheme.textSecondary,
            fontSize: '1rem'
          }}>
            Gerencie suas campanhas publicitárias
          </p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.opacity = '0.9'}
          onMouseOut={(e) => e.target.style.opacity = '1'}
        >
          <i className="bi bi-plus-lg"></i>
          Nova Campanha
        </button>
      </div>

      {/* Alertas */}
      {error && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="bi bi-exclamation-triangle-fill"></i>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#d1edff',
          color: '#0c5460',
          border: '1px solid #b8daff',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="bi bi-check-circle-fill"></i>
          {success}
          <button
            onClick={() => setSuccess('')}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#0c5460',
              cursor: 'pointer',
              fontSize: '1.2rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.primary}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Total de Campanhas
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '2rem',
                fontWeight: '700',
                color: currentTheme.primary
              }}>
                {stats.total}
              </p>
            </div>
            <i className="bi bi-megaphone" style={{
              fontSize: '2rem',
              color: currentTheme.primary,
              opacity: 0.7
            }}></i>
          </div>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.success || '#28a745'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Campanhas Ativas
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '2rem',
                fontWeight: '700',
                color: currentTheme.success || '#28a745'
              }}>
                {stats.active}
              </p>
            </div>
            <i className="bi bi-play-circle" style={{
              fontSize: '2rem',
              color: currentTheme.success || '#28a745',
              opacity: 0.7
            }}></i>
          </div>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.warning || '#ffc107'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Campanhas Agendadas
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '2rem',
                fontWeight: '700',
                color: currentTheme.warning || '#ffc107'
              }}>
                {stats.scheduled}
              </p>
            </div>
            <i className="bi bi-clock" style={{
              fontSize: '2rem',
              color: currentTheme.warning || '#ffc107',
              opacity: 0.7
            }}></i>
          </div>
        </div>

        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.info || '#17a2b8'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Valores Pagos
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.info || '#17a2b8'
              }}>
                {formatCurrency(stats.totalValuePaid || stats.totalValue)}
              </p>
            </div>
            <i className="bi bi-currency-dollar" style={{
              fontSize: '2rem',
              color: currentTheme.info || '#17a2b8',
              opacity: 0.7
            }}></i>
          </div>
        </div>

        {/* Novo Card: Total em Aberto */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.warning || '#f59e0b'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Total em Aberto
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.warning || '#f59e0b'
              }}>
                {formatCurrency(stats.totalValueOpen || 0)}
              </p>
            </div>
            <i className="bi bi-hourglass-split" style={{
              fontSize: '2rem',
              color: currentTheme.warning || '#f59e0b',
              opacity: 0.7
            }}></i>
          </div>
        </div>

        {/* Novo Card: Total Atrasado */}
        <div style={{
          padding: '1.5rem',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          border: `1px solid ${currentTheme.border}`,
          borderLeft: `4px solid ${currentTheme.error || '#ef4444'}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                margin: 0,
                fontSize: '0.875rem',
                color: currentTheme.textSecondary,
                fontWeight: '500'
              }}>
                Total Atrasado
              </p>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.error || '#ef4444'
              }}>
                {formatCurrency(stats.totalValueOverdue || 0)}
              </p>
            </div>
            <i className="bi bi-exclamation-triangle-fill" style={{
              fontSize: '2rem',
              color: currentTheme.error || '#ef4444',
              opacity: 0.7
            }}></i>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: currentTheme.inputBackground,
              color: currentTheme.textPrimary
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '0.75rem',
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            backgroundColor: currentTheme.inputBackground,
            color: currentTheme.textPrimary,
            minWidth: '150px'
          }}
        >
          <option value="all" style={{ backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary }}>Todos os Status</option>
          <option value="active">Ativas</option>
          <option value="scheduled">Agendadas</option>
          <option value="expired">Expiradas</option>
          <option value="inactive">Inativas</option>
        </select>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          style={{
            padding: '0.75rem',
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            backgroundColor: currentTheme.inputBackground,
            color: currentTheme.textPrimary,
            minWidth: '150px'
          }}
        >
          <option value="all" style={{ backgroundColor: currentTheme.cardBackground, color: currentTheme.textPrimary }}>Todos os Clientes</option>
          {clients.map(client => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Campanhas */}
      <div style={{
        backgroundColor: currentTheme.cardBackground,
        borderRadius: '0.75rem',
        border: `1px solid ${currentTheme.border}`,
        overflow: 'hidden'
      }}>
        {filteredCampaigns.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: currentTheme.textSecondary
          }}>
            <i className="bi bi-megaphone" style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              opacity: 0.5
            }}></i>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>
              {campaigns.length === 0 ? 'Nenhuma campanha encontrada' : 'Nenhuma campanha corresponde aos filtros aplicados'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: currentTheme.headerBackground || currentTheme.border,
                  borderBottom: `1px solid ${currentTheme.border}`
                }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Campanha
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Tipo
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Cliente
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Período
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Valor
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Status
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem'
                  }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign, index) => (
                  <tr
                    key={campaign.id}
                    style={{
                      borderBottom: `1px solid ${currentTheme.border}`,
                      backgroundColor: index % 2 === 0 ? 'transparent' : `${currentTheme.border}20`,
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.borderLight || `${currentTheme.border}20`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : `${currentTheme.border}20`}
                  >
                    <td style={{
                      padding: '1rem',
                      color: currentTheme.textPrimary
                    }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          marginBottom: '0.25rem'
                        }}>
                          {campaign.name}
                        </div>
                        {campaign.description && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: currentTheme.textSecondary,
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {campaign.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{
                      padding: '1rem',
                      color: currentTheme.textPrimary
                    }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        backgroundColor: (campaign.campaignType === 'recorrente' || campaign.isRecurring) ? `${currentTheme.warning}20` : `${currentTheme.info}20`,
                        color: (campaign.campaignType === 'recorrente' || campaign.isRecurring) ? currentTheme.warning : currentTheme.info
                      }}>
                        {(campaign.campaignType === 'recorrente' || campaign.isRecurring) ? 'Recorrente' : 'Única'}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem',
                      color: currentTheme.textPrimary
                    }}>
                      {getClientName(campaign.clientId)}
                    </td>
                    <td style={{
                      padding: '1rem',
                      color: currentTheme.textPrimary,
                      fontSize: '0.875rem'
                    }}>
                      <div>
                        <div>{formatDate(campaign.startDate)}</div>
                        <div style={{ color: currentTheme.textSecondary }}>
                          até {formatDate(campaign.endDate)}
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '1rem',
                      color: currentTheme.textPrimary
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <span style={{
                          fontWeight: '600',
                          color: campaign.valueType === 'entrada' ? currentTheme.success : currentTheme.danger
                        }}>
                          {formatCurrency(campaign.value)}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          backgroundColor: campaign.valueType === 'entrada' ? `${currentTheme.success}20` : `${currentTheme.danger}20`,
                          color: campaign.valueType === 'entrada' ? currentTheme.success : currentTheme.danger
                        }}>
                          {campaign.valueType}
                        </span>
                      </div>
                    </td>
                    <td style={{
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: `${getStatusColor(campaign)}20`,
                        color: getStatusColor(campaign)
                      }}>
                        {getStatusText(campaign)}
                      </span>
                    </td>
                    <td style={{
                      padding: '1rem',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        justifyContent: 'center'
                      }}>
                        <button
                          onClick={() => openDetailsModal(campaign)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: currentTheme.info || '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Ver detalhes"
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          onClick={() => openMediaModal(campaign)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: currentTheme.secondary || '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Ver mídias"
                        >
                          <i className="bi bi-collection-play"></i>
                        </button>
                        <button
                          onClick={() => openEditModal(campaign)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: currentTheme.warning || '#ffc107',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Editar"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          onClick={() => openDeleteModal(campaign)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: currentTheme.danger || '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                          title="Excluir"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Criação */}
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
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
                Nova Campanha
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.name ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                  placeholder="Digite o nome da campanha"
                />
                {formErrors.name && (
                  <div style={{
                    color: currentTheme.danger,
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary,
                    resize: 'vertical'
                  }}
                  placeholder="Digite uma descrição para a campanha"
                />
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="campaignActive"
                      checked={!!formData.active}
                      onChange={(e) => handleInputChange('active', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="campaignActive">
                      Campanha ativa
                    </label>
                  </div>
                </div>
                <div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="campaignRecurring"
                      checked={!!formData.isRecurring}
                      onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="campaignRecurring">
                      <i className="bi bi-arrow-repeat me-1"></i>Campanha Recorrente
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Cliente *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.clientId ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {formErrors.clientId && (
                  <div style={{
                    color: currentTheme.danger,
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {formErrors.clientId}
                  </div>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Início *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.startDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.startDate && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.startDate}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Fim *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.endDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.endDate && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.endDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Valor único ou mensal conforme recorrência */}
              {formData.isRecurring ? (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Valor Mensal *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyValue}
                    onChange={(e) => handleInputChange('monthlyValue', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.monthlyValue ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                    placeholder="0.00"
                  />
                  {formErrors.monthlyValue && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.monthlyValue}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Valor da Campanha *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.value ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                    placeholder="0.00"
                  />
                  {formErrors.value && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.value}
                    </div>
                  )}
                </div>
              )}

              {/* Campos de pagamento */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.paymentMethod ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  >
                    <option value="">Selecione a forma de pagamento</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                  {formErrors.paymentMethod && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.paymentMethod}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Vencimento {formData.isRecurring ? <small style={{ color: currentTheme.textSecondary }}>(controlado pela recorrência)</small> : <span style={{ color: currentTheme.danger }}>*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    disabled={!!formData.isRecurring}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.dueDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.dueDate && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.dueDate}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Status do Pagamento {formData.isRecurring ? <small style={{ color: currentTheme.textSecondary }}>(controlado pela recorrência)</small> : <span style={{ color: currentTheme.danger }}>*</span>}
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                  disabled={!!formData.isRecurring}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.paymentStatus ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                >
                  <option value="">Selecione o status</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="PAGO">Pago</option>
                  <option value="VENCIDO">Vencido</option>
                </select>
                {formErrors.paymentStatus && (
                  <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {formErrors.paymentStatus}
                  </div>
                )}
              </div>

              {/* Campos específicos para recorrência */}
              {formData.isRecurring && (
                <div>
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: currentTheme.info + '20',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.75rem'
                  }}>
                    <strong>Campanha Recorrente:</strong> O valor será cobrado mensalmente durante o período da campanha.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textPrimary
                      }}>
                        Dia de cobrança
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={formData.billingDay}
                        onChange={(e) => handleInputChange('billingDay', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: currentTheme.inputBackground,
                          color: currentTheme.textPrimary
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="autoGenerate"
                          checked={!!formData.autoGenerate}
                          onChange={(e) => handleInputChange('autoGenerate', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="autoGenerate">
                          Gerar parcelas automaticamente
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: currentTheme.textPrimary
                    }}>
                      Modelo de Cobrança
                    </label>
                    <select
                      value={formData.chargeType || 'PREPAGO'}
                      onChange={(e) => handleInputChange('chargeType', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: currentTheme.inputBackground,
                        color: currentTheme.textPrimary
                      }}
                    >
                      <option value="PREPAGO">Pré-pago</option>
                      <option value="POSPAGO">Pós-pago</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCampaign}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Criando...' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && editingCampaign && (
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
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
                Editar Campanha
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCampaign(null);
                  resetForm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.name ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                  placeholder="Digite o nome da campanha"
                />
                {formErrors.name && (
                  <div style={{
                    color: currentTheme.danger,
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {formErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary,
                    resize: 'vertical'
                  }}
                  placeholder="Digite uma descrição para a campanha"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Cliente *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => handleInputChange('clientId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.clientId ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                {formErrors.clientId && (
                  <div style={{
                    color: currentTheme.danger,
                    fontSize: '0.75rem',
                    marginTop: '0.25rem'
                  }}>
                    {formErrors.clientId}
                  </div>
                )}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Início *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.startDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.startDate && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.startDate}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Fim *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => handleInputChange('endDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.endDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.endDate && (
                    <div style={{
                      color: currentTheme.danger,
                      fontSize: '0.75rem',
                      marginTop: '0.25rem'
                    }}>
                      {formErrors.endDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Controles de status e recorrência */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="editCampaignActive"
                    checked={!!formData.active}
                    onChange={(e) => handleInputChange('active', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="editCampaignActive">
                    Campanha Ativa
                  </label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="editCampaignRecurring"
                    checked={!!formData.isRecurring}
                    onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="editCampaignRecurring">
                    <i className="bi bi-arrow-repeat me-1"></i>Campanha Recorrente
                  </label>
                </div>
              </div>

              {/* Valor */}
              {formData.isRecurring ? (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Valor Mensal *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyValue}
                    onChange={(e) => handleInputChange('monthlyValue', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.monthlyValue ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                    placeholder="0.00"
                  />
                  {formErrors.monthlyValue && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.monthlyValue}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Valor *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.value ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                    placeholder="0.00"
                  />
                  {formErrors.value && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.value}
                    </div>
                  )}
                </div>
              )}

              {/* Campos de pagamento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Forma de Pagamento *
                  </label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.paymentMethod ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  >
                    <option value="">Selecione a forma de pagamento</option>
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                  {formErrors.paymentMethod && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.paymentMethod}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Data de Vencimento {formData.isRecurring ? <small style={{ color: currentTheme.textSecondary }}>(controlado pela recorrência)</small> : <span style={{ color: currentTheme.danger }}>*</span>}
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                    disabled={!!formData.isRecurring}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${formErrors.dueDate ? currentTheme.danger : currentTheme.border}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary
                    }}
                  />
                  {formErrors.dueDate && (
                    <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {formErrors.dueDate}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  Status do Pagamento {formData.isRecurring ? <small style={{ color: currentTheme.textSecondary }}>(controlado pela recorrência)</small> : <span style={{ color: currentTheme.danger }}>*</span>}
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                  disabled={!!formData.isRecurring}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${formErrors.paymentStatus ? currentTheme.danger : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                >
                  <option value="">Selecione o status</option>
                  <option value="ABERTO">Aberto</option>
                  <option value="PAGO">Pago</option>
                  <option value="VENCIDO">Vencido</option>
                </select>
                {formErrors.paymentStatus && (
                  <div style={{ color: currentTheme.danger, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {formErrors.paymentStatus}
                  </div>
                )}
              </div>

              {/* Campos específicos para recorrência */}
              {formData.isRecurring && (
                <div>
                  <div style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    backgroundColor: currentTheme.info + '20',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.75rem'
                  }}>
                    <strong>Campanha Recorrente:</strong> O valor será cobrado mensalmente durante o período da campanha.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: currentTheme.textPrimary
                      }}>
                        Dia de cobrança
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={formData.billingDay}
                        onChange={(e) => handleInputChange('billingDay', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          backgroundColor: currentTheme.inputBackground,
                          color: currentTheme.textPrimary
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="editAutoGenerate"
                          checked={!!formData.autoGenerate}
                          onChange={(e) => handleInputChange('autoGenerate', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="editAutoGenerate">
                          Gerar parcelas automaticamente
                        </label>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: currentTheme.textPrimary
                    }}>
                      Modelo de Cobrança
                    </label>
                    <select
                      value={formData.chargeType || 'PREPAGO'}
                      onChange={(e) => handleInputChange('chargeType', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: currentTheme.inputBackground,
                        color: currentTheme.textPrimary
                      }}
                    >
                      <option value="PREPAGO">Pré-pago</option>
                      <option value="POSPAGO">Pós-pago</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCampaign(null);
                  resetForm();
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCampaign}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {showDeleteModal && deletingCampaign && (
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
            maxWidth: '400px'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1.5rem'
            }}>
              <i className="bi bi-exclamation-triangle" style={{
                fontSize: '3rem',
                color: currentTheme.danger || '#dc3545',
                marginBottom: '1rem'
              }}></i>
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.textPrimary
              }}>
                Confirmar Exclusão
              </h2>
              <p style={{
                margin: 0,
                color: currentTheme.textSecondary,
                lineHeight: 1.5
              }}>
                Tem certeza que deseja excluir a campanha <strong>"{deletingCampaign.name}"</strong>?
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
                  setDeletingCampaign(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCampaign}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: currentTheme.danger || '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhes com Abas */}
      {showDetailsModal && selectedCampaign && (
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
            maxWidth: '800px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Header do Modal */}
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
                Detalhes da Campanha
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* Sistema de Abas */}
            <div style={{
              borderBottom: `1px solid ${currentTheme.border}`,
              marginBottom: '1.5rem'
            }}>
              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                {[
                  { id: 'detalhes', label: 'Detalhes' },
                  { id: 'midias', label: 'Mídias da campanha' },
                  { id: 'financeiro', label: 'Gestão Financeira' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: activeTab === tab.id ? currentTheme.primary : 'transparent',
                      color: activeTab === tab.id ? 'white' : currentTheme.textSecondary,
                      border: 'none',
                      borderRadius: '0.5rem 0.5rem 0 0',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Conteúdo das Abas */}
            <div style={{ minHeight: '400px' }}>
              {/* Aba Detalhes */}
              {activeTab === 'detalhes' && (
                <div style={{
                  display: 'grid',
                  gap: '1.5rem'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Nome da Campanha
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: currentTheme.textPrimary
                      }}>
                        {selectedCampaign.name}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Tipo de Campanha
                      </label>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: (selectedCampaign.isRecurring || selectedCampaign.campaignType === 'recorrente') ? `${currentTheme.warning}20` : `${currentTheme.info}20`,
                        color: (selectedCampaign.isRecurring || selectedCampaign.campaignType === 'recorrente') ? currentTheme.warning : currentTheme.info
                      }}>
                        {(selectedCampaign.isRecurring || selectedCampaign.campaignType === 'recorrente') ? 'Recorrente' : 'Única'}
                      </span>
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
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Status
                      </label>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: `${getStatusColor(selectedCampaign)}20`,
                        color: getStatusColor(selectedCampaign)
                      }}>
                        {getStatusText(selectedCampaign)}
                      </span>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Cliente
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textPrimary
                      }}>
                        {getClientName(selectedCampaign.clientId)}
                      </p>
                    </div>
                  </div>

                  {selectedCampaign.description && (
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Descrição
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textPrimary,
                        lineHeight: 1.5
                      }}>
                        {selectedCampaign.description}
                      </p>
                    </div>
                  )}

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Data de Início
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textPrimary
                      }}>
                        {formatDate(selectedCampaign.startDate)}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Data de Fim
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textPrimary
                      }}>
                        {formatDate(selectedCampaign.endDate)}
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
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Valor
                      </label>
                      <p style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: selectedCampaign.valueType === 'entrada' ? currentTheme.success : currentTheme.danger
                      }}>
                        {formatCurrency(selectedCampaign.value)}
                      </p>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: currentTheme.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.5rem'
                      }}>
                        Tipo de Valor
                      </label>
                      <span style={{
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '0.25rem',
                        backgroundColor: selectedCampaign.valueType === 'entrada' ? `${currentTheme.success}20` : `${currentTheme.danger}20`,
                        color: selectedCampaign.valueType === 'entrada' ? currentTheme.success : currentTheme.danger,
                        textTransform: 'capitalize'
                      }}>
                        {selectedCampaign.valueType}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Aba Mídias */}
              {activeTab === 'midias' && (
                <div>
                  {loadingMedias ? (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '200px'
                    }}>
                      <div style={{
                        color: currentTheme.textSecondary,
                        fontSize: '0.875rem'
                      }}>
                        Carregando mídias...
                      </div>
                    </div>
                  ) : campaignMedias.length > 0 ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem'
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: currentTheme.textPrimary
                        }}>
                          Mídias Associadas ({campaignMedias.length})
                        </h3>
                        <button
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: currentTheme.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          + Adicionar Mídia
                        </button>
                      </div>
                      <div style={{
                        display: 'grid',
                        gap: '1rem'
                      }}>
                        {campaignMedias.map((media, index) => (
                          <div
                            key={media.id || index}
                            style={{
                              padding: '1rem',
                              backgroundColor: currentTheme.cardBackground,
                              border: `1px solid ${currentTheme.border}`,
                              borderRadius: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem'
                            }}
                          >
                            <div style={{
                              width: '60px',
                              height: '60px',
                              backgroundColor: currentTheme.border,
                              borderRadius: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1.5rem'
                            }}>
                              {media.type === 'image' ? '🖼️' : media.type === 'video' ? '🎥' : '📄'}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontWeight: '600',
                                color: currentTheme.textPrimary,
                                marginBottom: '0.25rem'
                              }}>
                                {media.name || media.filename || 'Mídia sem nome'}
                              </div>
                              <div style={{
                                fontSize: '0.875rem',
                                color: currentTheme.textSecondary
                              }}>
                                Tipo: {media.type || 'Não especificado'} • 
                                Tamanho: {media.size ? `${(media.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                              </div>
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem'
                            }}>
                              <button
                                onClick={() => { if (media.url) window.open(media.url, '_blank'); }}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: 'transparent',
                                  border: `1px solid ${currentTheme.border}`,
                                  borderRadius: '0.25rem',
                                  color: currentTheme.textSecondary,
                                  cursor: 'pointer'
                                }}
                                title="Visualizar"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => disassociateMediaFromCampaign(media.id)}
                                style={{
                                  padding: '0.5rem',
                                  backgroundColor: 'transparent',
                                  border: `1px solid ${currentTheme.danger}`,
                                  borderRadius: '0.25rem',
                                  color: currentTheme.danger,
                                  cursor: 'pointer'
                                }}
                                title="Remover"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '300px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '3rem',
                        color: currentTheme.textSecondary,
                        marginBottom: '1rem'
                      }}>
                        📁
                      </div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: currentTheme.textPrimary,
                        marginBottom: '0.5rem'
                      }}>
                        Nenhuma Mídia Associada
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textSecondary,
                        marginBottom: '1.5rem'
                      }}>
                        Esta campanha ainda não possui mídias associadas.
                      </p>
                      <button
                        style={{
                          padding: '0.75rem 1.5rem',
                          backgroundColor: currentTheme.primary,
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        Adicionar Primeira Mídia
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Aba Gestão Financeira */}
              {activeTab === 'financeiro' && (
                <div>
                  {(selectedCampaign.isRecurring || selectedCampaign.campaignType === 'recorrente') ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1.5rem'
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: currentTheme.textPrimary
                        }}>
                          Cobranças Recorrentes
                        </h3>
                        <button
                          onClick={handleGenerateMonthlyPayments}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: currentTheme.success,
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Gerar Parcela avulça
                        </button>
                      </div>

                      {/* Lista de Cobranças (Mock) */}
                      <div style={{
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        overflow: 'hidden'
                      }}>
                        {monthlyPayments.map((p, index) => (
                          <div
                            key={p.id || index}
                            style={{
                              padding: '1rem',
                              borderBottom: index < monthlyPayments.length - 1 ? `1px solid ${currentTheme.border}` : 'none',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div>
                              <p style={{
                                margin: 0,
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: currentTheme.textPrimary,
                                marginBottom: '0.25rem'
                              }}>
                                Parcela {p.referenceMonth}/{p.referenceYear} - {formatCurrency(p.value || selectedCampaign.value)}
                              </p>
                              <p style={{
                                margin: 0,
                                fontSize: '0.75rem',
                                color: currentTheme.textSecondary
                              }}>
                                Vencimento: {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div style={{
                              display: 'flex',
                              gap: '0.5rem',
                              alignItems: 'center'
                            }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                backgroundColor: getPaymentStatusColor(p.status).bg,
                                color: getPaymentStatusColor(p.status).fg
                              }}>
                                {getPaymentStatusLabel(p.status)}
                              </span>
                              {p.status !== 'PAID' && (
                                <>
                                  <button
                                        onClick={() => openManualPaymentModal(p)}
                                    style={{
                                      padding: '0.25rem 0.75rem',
                                      backgroundColor: currentTheme.primary,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Pagar Manual
                                  </button>
                                  <button
                                        disabled
                                        title="Em breve"
                                    style={{
                                      padding: '0.25rem 0.75rem',
                                      backgroundColor: currentTheme.success,
                                      opacity: 0.7,
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '0.25rem',
                                      fontSize: '0.75rem',
                                      cursor: 'not-allowed'
                                    }}
                                  >
                                    Gerar PIX
                                  </button>
                                </>
                              )}
                              {p.status === 'PAID' && (
                                <button
                                  onClick={() => handleReverseMonthlyPayment(p.id)}
                                  style={{
                                    padding: '0.25rem 0.75rem',
                                    backgroundColor: currentTheme.danger || '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Estornar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '300px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '3rem',
                        color: currentTheme.textSecondary,
                        marginBottom: '1rem'
                      }}>
                        💰
                      </div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: currentTheme.textPrimary,
                        marginBottom: '0.5rem'
                      }}>
                        Gestão Financeira
                      </h3>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: currentTheme.textSecondary
                      }}>
                        Esta funcionalidade está disponível apenas para campanhas recorrentes.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCampaign(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  openEditModal(selectedCampaign);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: currentTheme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Editar Campanha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mídias */}
      {showMediaModal && selectedCampaign && (
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
            width: '95%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflowY: 'auto'
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
                Gerenciar Mídias: {selectedCampaign.name}
              </h2>
              <button
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedCampaign(null);
                  setCampaignMedias([]);
                  setAllUserMedias([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              minHeight: '400px'
            }}>
              {/* Seção: Todas as Mídias do Usuário */}
              <div style={{
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Todas as Mídias
                  </h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: currentTheme.textSecondary,
                    backgroundColor: currentTheme.border,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem'
                  }}>
                    {allUserMedias.length} mídias
                  </span>
                </div>

                {loadingAllMedias ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: currentTheme.textSecondary
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: `4px solid ${currentTheme.border}`,
                      borderTop: `4px solid ${currentTheme.primary}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }}></div>
                    Carregando mídias...
                  </div>
                ) : allUserMedias.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: currentTheme.textSecondary
                  }}>
                    <i className="bi bi-collection" style={{
                      fontSize: '2rem',
                      marginBottom: '1rem',
                      opacity: 0.5
                    }}></i>
                    <p style={{ margin: 0 }}>
                      Nenhuma mídia encontrada
                    </p>
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'grid',
                    gap: '0.75rem'
                  }}>
                    {allUserMedias.map((media, index) => {
                      const isAssociated = campaignMedias.some(cm => cm.id === media.id);
                      return (
                        <div
                          key={media.id || index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '0.375rem',
                            backgroundColor: isAssociated ? `${currentTheme.success}20` : currentTheme.background
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div style={{
                              width: '60px',
                              height: '60px',
                              borderRadius: '0.25rem',
                              overflow: 'hidden',
                              backgroundColor: currentTheme.border,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '0.75rem'
                            }}>
                              { (media.type?.toLowerCase().includes('image') || media.type?.toLowerCase() === 'photo') && media.url ? (
                                <img
                                  src={media.url}
                                  alt={media.title || 'Mídia'}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              ) : (media.type?.toLowerCase().includes('video')) && media.url ? (
                                <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
                                  <video
                                    src={media.url}
                                    muted
                                    preload="metadata"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>▶</div>
                                </div>
                              ) : (
                                <i className="bi bi-file-earmark" style={{ color: currentTheme.textSecondary }}></i>
                              ) }
                            </div>
                            <div>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: currentTheme.textPrimary,
                                marginBottom: '0.25rem'
                              }}>
                                {media.title || 'Mídia sem nome'}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: currentTheme.textSecondary
                              }}>
                                {media.type || 'Tipo desconhecido'}
                              </div>
                            </div>
                          </div>
                          {!isAssociated && (
                            <button
                              onClick={() => associateMediaToCampaign(media.id)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                backgroundColor: currentTheme.primary,
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Associar
                            </button>
                          )}
                          {isAssociated && (
                            <button
                              onClick={() => disassociateMediaFromCampaign(media.id)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                backgroundColor: currentTheme.danger || '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              Desassociar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Seção: Mídias Associadas à Campanha */}
              <div style={{
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                padding: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary
                  }}>
                    Mídias da Campanha
                  </h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: currentTheme.textSecondary,
                    backgroundColor: currentTheme.border,
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem'
                  }}>
                    {campaignMedias.length} associadas
                  </span>
                </div>

                {loadingMedias ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: currentTheme.textSecondary
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: `4px solid ${currentTheme.border}`,
                      borderTop: `4px solid ${currentTheme.primary}`,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 1rem'
                    }}></div>
                    Carregando mídias...
                  </div>
                ) : campaignMedias.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: currentTheme.textSecondary
                  }}>
                    <i className="bi bi-collection-play" style={{
                      fontSize: '2rem',
                      marginBottom: '1rem',
                      opacity: 0.5
                    }}></i>
                    <p style={{ margin: 0 }}>
                      Nenhuma mídia associada a esta campanha
                    </p>
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    display: 'grid',
                    gap: '0.75rem'
                  }}>
                    {campaignMedias.map((media, index) => (
                      <div
                        key={media.id || index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0.75rem',
                          border: `1px solid ${currentTheme.border}`,
                          borderRadius: '0.375rem',
                          backgroundColor: currentTheme.background
                        }}
                      >
                        <div style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '0.25rem',
                          overflow: 'hidden',
                          backgroundColor: currentTheme.border,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '0.75rem'
                        }}>
                          { (media.type?.toLowerCase().includes('image') || media.type?.toLowerCase() === 'photo') && media.url ? (
                            <img
                              src={media.url}
                              alt={media.title || 'Mídia'}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          ) : (media.type?.toLowerCase().includes('video')) && media.url ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000' }}>
                              <video
                                src={media.url}
                                muted
                                preload="metadata"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem' }}>▶</div>
                            </div>
                          ) : (
                            <i className="bi bi-file-earmark" style={{ color: currentTheme.textSecondary }}></i>
                          ) }
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: currentTheme.textPrimary,
                            marginBottom: '0.25rem'
                          }}>
                            {media.title || 'Mídia sem nome'}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: currentTheme.textSecondary
                          }}>
                            {media.type || 'Tipo desconhecido'} • {media.active ? 'Ativa' : 'Inativa'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => { if (media.url) window.open(media.url, '_blank'); }}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: 'transparent',
                              border: `1px solid ${currentTheme.border}`,
                              borderRadius: '0.25rem',
                              color: currentTheme.textSecondary,
                              cursor: 'pointer'
                            }}
                            title="Visualizar"
                          >
                            Visualizar
                          </button>
                          <button
                            onClick={() => disassociateMediaFromCampaign(media.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              backgroundColor: currentTheme.danger || '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.25rem',
                              fontSize: '0.75rem',
                              cursor: 'pointer'
                            }}
                          >
                            Desassociar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botão Verificar Campanhas Expiradas */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '1rem',
                  borderTop: `1px solid ${currentTheme.border}`
                }}>
                  <button
                    onClick={checkExpiredCampaigns}
                    disabled={checkingExpired}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: checkingExpired ? currentTheme.border : '#ffc107',
                      color: checkingExpired ? currentTheme.textSecondary : '#000',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: checkingExpired ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {checkingExpired ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid currentColor',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Verificando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-clock-history"></i>
                        Verificar Campanhas Expiradas
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '2rem'
            }}>
              <button
                onClick={() => {
                  setShowMediaModal(false);
                  setSelectedCampaign(null);
                  setCampaignMedias([]);
                  setAllUserMedias([]);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento Manual */}
      {showManualPaymentModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={closeManualPaymentModal}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem', padding: '2rem', width: '90%',
            maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: currentTheme.textPrimary }}>
                Registrar Pagamento Manual
              </h2>
              <button
                onClick={closeManualPaymentModal}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: currentTheme.textSecondary, cursor: 'pointer' }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: currentTheme.textPrimary }}>
                  Valor pago (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualPaymentForm.amount}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, amount: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem', border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                  placeholder="0.00"
                />
                <small style={{ color: currentTheme.textSecondary }}>
                  O valor pago será registrado em Observações.
                </small>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: currentTheme.textPrimary }}>
                  Forma de pagamento *
                </label>
                <select
                  value={manualPaymentForm.method}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, method: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem', border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                >
                  <option value="">Selecione a forma de pagamento</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="BOLETO">Boleto</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: currentTheme.textPrimary }}>
                  Data do pagamento *
                </label>
                <input
                  type="date"
                  value={manualPaymentForm.date}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, date: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem', border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: currentTheme.textPrimary }}>
                  Observações
                </label>
                <textarea
                  rows={3}
                  value={manualPaymentForm.notes}
                  onChange={(e) => setManualPaymentForm({ ...manualPaymentForm, notes: e.target.value })}
                  style={{
                    width: '100%', padding: '0.75rem', border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem', fontSize: '0.875rem', backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary, resize: 'vertical'
                  }}
                  placeholder="Observações sobre o pagamento (opcional)"
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.75rem' }}>
              <button
                onClick={closeManualPaymentModal}
                style={{
                  padding: '0.75rem 1.5rem', backgroundColor: 'transparent', color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmManualPayment}
                disabled={!manualPaymentForm.method || !manualPaymentForm.date}
                style={{
                  padding: '0.75rem 1.5rem', backgroundColor: (!manualPaymentForm.method || !manualPaymentForm.date) ? currentTheme.border : currentTheme.success,
                  color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: (!manualPaymentForm.method || !manualPaymentForm.date) ? 'not-allowed' : 'pointer'
                }}
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

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
};

export default Campaigns;
