import axios from 'axios';

// Função para obter configuração dinamicamente
const getConfig = () => {
  return window.APP_CONFIG || {
    API_BASE_URL: 'http://10.0.10.17:4000',
    
    API_ENDPOINTS: {
      LOGIN: '/public/login',
      GOOGLE_LOGIN: '/public/login/google',
      REGISTER: '/public/cadastro',
      DEVICES: '/private/devices',
      DEVICE: '/private/device',
      PANELS: '/private/paineis',
      PANEL: '/private/panel',
      PANEL_CREATE: '/private/painel',
      PANEL_UPDATE: '/private/painel',
      PANEL_CONFIG: '/private/painel',
      PANEL_DELETE: '/private/painel',
      MEDIAS: '/private/medias',
      MEDIA: '/private/midia',
      UPLOAD_MEDIA: '/private/uploadmidia',
      ADD_MEDIA: '/private/addmidia',
      UPLOAD_AVATAR: '/private/upload-avatar',
      UPDATE_PROFILE: '/private/profile',
      CLIENTS: '/private/client',
      CAMPAIGNS: '/private/campaigns',
      CAMPAIGN_VALUES: '/private/campaign-value',
      ASSOCIATE_MEDIA_CAMPAIGN: '/private/campaigns/associate-media',
      DISASSOCIATE_MEDIA_CAMPAIGN: '/private/campaigns/disassociate-media',
      PROFILE: '/private/profile',
      USERS: '/private/admin/users',
      ADMIN_STATS: '/private/admin/stats',
      TEST_BLOCK_OVERDUE_USERS: '/private/admin/test-block-overdue-users',
      DELETE_MEDIA: '/private/midia',
      REACTIVATE_MEDIA: '/private/midias',
      DEACTIVATE_MEDIA: '/private/midias',
      CREATE_FINANCIAL_TITLE: '/private/admin/users',
      MANUAL_PAYMENT: '/private/admin/users',
      UPDATE_USER: '/private/admin/users',
      FINANCIAL_TITLES: '/private/admin/users',
      GENERATE_PIX: '/private/admin/financial-titles',
      DELETE_FINANCIAL_TITLE: '/private/admin/financial-titles',
      BULK_FINANCIAL_TITLES: '/private/admin/users',
      SYSTEM_CONFIG: '/private/system-config',
      // Ajuste para rotas de licenciamento em lote sob /private/admin
      BATCH_LICENSES: '/private/admin/batch-licenses',
      BATCH_LICENSE: '/private/admin/batch-license',
      BATCH_LICENSE_GENERATE_PIX: '/private/admin/batch-license/:id/generate-pix',
      BATCH_LICENSE_PAYMENT_STATUS: '/private/admin/batch-license/:id/payment-status',
      BATCH_LICENSE_PAYMENT: '/private/admin/batch-license/:id/payment',
      USER_DEVICES: '/private/admin/users/:id/devices',
      CONTACT: '/public/contact',
      CHANGE_PASSWORD: '/public/change-password',
      PASSWORD_RESET: '/public/password-reset',
      
      // Global Medias (Admin & Associations)
      GLOBAL_MEDIAS: '/private/global-medias',
      AVAILABLE_GLOBAL_MEDIAS: '/private/available-global-medias',
      ASSOCIATE_GLOBAL_MEDIA_TO_PANEL: '/private/panels/:panelId/associate-global-media',
      DISASSOCIATE_GLOBAL_MEDIA_FROM_PANEL: '/private/panels/:panelId/disassociate-global-media/:globalMediaId',
      LIST_PANEL_GLOBAL_MEDIAS: '/private/panels/:panelId/global-medias',
      LIST_PANELS_FOR_GLOBAL_MEDIA: '/private/global-medias/:globalMediaId/panels'
    }
  };
};

// Detectar ambiente e resolver baseURL para evitar CORS em desenvolvimento
const isDev = import.meta.env?.DEV;
// Em desenvolvimento, usamos caminho relativo para aproveitar o proxy do Vite
// Em produção, preferimos VITE_API_URL e, se não houver, APP_CONFIG.API_BASE_URL
const resolvedBaseURL = isDev
  ? (import.meta.env.VITE_API_URL || 'http://localhost:4000')
  : (import.meta.env.VITE_API_URL || (window.APP_CONFIG?.API_BASE_URL ?? ''));

// Criar instância do axios
const api = axios.create({
  baseURL: resolvedBaseURL,
  timeout: 10000,
  // Remover Content-Type padrão; axios define automaticamente conforme o payload
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('vixplay_token');
    try {
      // Determinar caminho da URL para decidir se é rota pública
      const base = resolvedBaseURL || window.location.origin;
      const fullUrl = new URL(config.url, base);
      const path = fullUrl.pathname || '';
      const isPublic = path.startsWith('/public') || path.startsWith('/reset-password') || path.startsWith('/change-password');
      if (token && !isPublic) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Evitar redirecionar para login em rotas públicas
      try {
        const base = resolvedBaseURL || window.location.origin;
        const fullUrl = new URL(error?.config?.url || '', base);
        const path = fullUrl.pathname || '';
        const isPublic = path.startsWith('/public') || path.startsWith('/reset-password') || path.startsWith('/change-password');
        if (!isPublic) {
          localStorage.removeItem('vixplay_token');
          localStorage.removeItem('vixplay_user');
          window.location.href = '/login';
        }
      } catch (_) {
        localStorage.removeItem('vixplay_token');
        localStorage.removeItem('vixplay_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Funções de API baseadas nos endpoints do config.js
export const apiService = {
  // Generic HTTP methods
  get: (url, config = {}) => api.get(url, config),
  post: (url, data, config = {}) => api.post(url, data, config),
  put: (url, data, config = {}) => api.put(url, data, config),
  delete: (url, config = {}) => api.delete(url, config),
  patch: (url, data, config = {}) => api.patch(url, data, config),
  
  // Autenticação
  login: (credentials) => api.post(getConfig().API_ENDPOINTS.LOGIN, credentials),
  loginWithGoogle: (payload) => api.post((getConfig().API_ENDPOINTS.GOOGLE_LOGIN || '/public/login/google'), payload),
  register: (userData) => api.post(getConfig().API_ENDPOINTS.REGISTER, userData),
  
  // Devices
  getDevices: () => api.get(getConfig().API_ENDPOINTS.DEVICES),
  getDevice: (id) => api.get(`${getConfig().API_ENDPOINTS.DEVICE}/${id}`),
  createDevice: (data) => api.post(getConfig().API_ENDPOINTS.DEVICE, data),
  updateDevice: (id, data) => api.put(`${getConfig().API_ENDPOINTS.DEVICE}/${id}`, data),
  deleteDevice: (id) => api.delete(`${getConfig().API_ENDPOINTS.DEVICE}/${id}`),
  // NEW: Devices por usuário (admin)
  getUserDevices: (userId) => api.get(getConfig().API_ENDPOINTS.USER_DEVICES.replace(':id', userId)),
  
  // Panels
  getPanels: () => api.get(getConfig().API_ENDPOINTS.PANELS),
  getPanel: (id) => api.get(`${getConfig().API_ENDPOINTS.PANEL}/${id}`),
  createPanel: (data) => api.post(getConfig().API_ENDPOINTS.PANEL_CREATE, data),
  updatePanel: (id, data) => api.put(`${getConfig().API_ENDPOINTS.PANEL_UPDATE}/${id}`, data),
  updatePanelConfig: (id, data) => api.put(`${getConfig().API_ENDPOINTS.PANEL_CONFIG}/${id}/config`, data),
  deletePanel: (id) => api.delete(`${getConfig().API_ENDPOINTS.PANEL_DELETE}/${id}`),
  getPanelMedias: (panelId) => api.get(`${getConfig().API_ENDPOINTS.PANEL}/${panelId}/midias`),
  
  // Panel Media CRUD
  createPanelMedia: (panelId, data) => api.post(`${getConfig().API_ENDPOINTS.PANEL}/${panelId}/midias`, data),
  updatePanelMedia: (panelId, mediaId, data) => api.put(`${getConfig().API_ENDPOINTS.MEDIA}/${mediaId}`, data),
  deletePanelMedia: (panelId, mediaId) => api.delete(`${getConfig().API_ENDPOINTS.DELETE_MEDIA}/${mediaId}`),
  reactivatePanelMedia: (mediaId) => api.put(`${getConfig().API_ENDPOINTS.REACTIVATE_MEDIA}/${mediaId}/reativar`),

  deactivatePanelMedia: (mediaId) => api.put(`${getConfig().API_ENDPOINTS.DEACTIVATE_MEDIA}/${mediaId}/desativar`),
  
  // Medias
  getMedias: () => api.get(getConfig().API_ENDPOINTS.MEDIAS || '/private/medias'),
  getMedia: (id) => api.get(`${getConfig().API_ENDPOINTS.MEDIA}/${id}`),
  createMedia: (data) => api.post(getConfig().API_ENDPOINTS.MEDIA, data),
  updateMedia: (id, data) => api.put(`${getConfig().API_ENDPOINTS.MEDIA}/${id}`, data),
  deleteMedia: (id) => api.delete(`${getConfig().API_ENDPOINTS.DELETE_MEDIA}/${id}`),
  uploadMedia: (formData, config = {}) => {
    const token = localStorage.getItem('vixplay_token');
    const headers = { 'Content-Type': 'multipart/form-data' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return api.post(getConfig().API_ENDPOINTS.UPLOAD_MEDIA, formData, { headers, ...config });
  },

  addMedia: (data) => api.post(getConfig().API_ENDPOINTS.ADD_MEDIA, data),
  
  // Global Medias (Admin)
  getGlobalMedias: () => api.get(getConfig().API_ENDPOINTS.GLOBAL_MEDIAS || '/private/global-medias'),
  getGlobalMediaById: (id) => api.get((getConfig().API_ENDPOINTS.GLOBAL_MEDIAS || '/private/global-medias') + `/${id}`),
  createGlobalMedia: (data) => api.post(getConfig().API_ENDPOINTS.GLOBAL_MEDIAS || '/private/global-medias', data),
  updateGlobalMedia: (id, data) => api.put((getConfig().API_ENDPOINTS.GLOBAL_MEDIAS || '/private/global-medias') + `/${id}`, data),
  deleteGlobalMedia: (id) => api.delete((getConfig().API_ENDPOINTS.GLOBAL_MEDIAS || '/private/global-medias') + `/${id}`),

  uploadGlobalMedia: (formData) => api.post((getConfig().API_ENDPOINTS.UPLOAD_GLOBAL_MEDIA || '/private/upload-global-media'), formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Global Medias (User Associations)
  getAvailableGlobalMedias: () => api.get(getConfig().API_ENDPOINTS.AVAILABLE_GLOBAL_MEDIAS || '/private/available-global-medias'),
  associateGlobalMediaToPanel: (panelId, globalMediaId) => api.post((getConfig().API_ENDPOINTS.ASSOCIATE_GLOBAL_MEDIA_TO_PANEL || '/private/panels/:panelId/associate-global-media').replace(':panelId', String(panelId)), { globalMediaId: Number(globalMediaId) }),
  disassociateGlobalMediaFromPanel: (panelId, globalMediaId) => api.delete((getConfig().API_ENDPOINTS.DISASSOCIATE_GLOBAL_MEDIA_FROM_PANEL || '/private/panels/:panelId/disassociate-global-media/:globalMediaId').replace(':panelId', panelId).replace(':globalMediaId', globalMediaId)),
  getPanelGlobalMedias: (panelId) => api.get((getConfig().API_ENDPOINTS.LIST_PANEL_GLOBAL_MEDIAS || '/private/panels/:panelId/global-medias').replace(':panelId', panelId)),
  getPanelsForGlobalMedia: (globalMediaId) => api.get((getConfig().API_ENDPOINTS.LIST_PANELS_FOR_GLOBAL_MEDIA || '/private/global-medias/:globalMediaId/panels').replace(':globalMediaId', globalMediaId)),
  
  // Clients
  getClients: () => api.get(getConfig().API_ENDPOINTS.CLIENTS),
  getClient: (id) => api.get(`${getConfig().API_ENDPOINTS.CLIENTS}/${id}`),
  createClient: (data) => api.post(getConfig().API_ENDPOINTS.CLIENTS, data),
  updateClient: (id, data) => api.put(`${getConfig().API_ENDPOINTS.CLIENTS}/${id}`, data),
  deleteClient: (id) => api.delete(`${getConfig().API_ENDPOINTS.CLIENTS}/${id}`),

  // Works (Empresas)
  getWorks: () => api.get('/private/works'),
  getWork: (id) => api.get(`/private/works/${id}`),
  createWork: (formData) => api.post('/private/works', formData),
  updateWork: (id, formData) => api.put(`/private/works/${id}`, formData),
  deleteWork: (id) => api.delete(`/private/works/${id}`),
  
  // Campaigns
  getCampaigns: () => api.get(getConfig().API_ENDPOINTS.CAMPAIGNS),
  getCampaign: (id) => api.get(`${getConfig().API_ENDPOINTS.CAMPAIGNS}/${id}`),
  createCampaign: (data) => api.post(getConfig().API_ENDPOINTS.CAMPAIGNS, data),
  updateCampaign: (id, data) => api.put(`${getConfig().API_ENDPOINTS.CAMPAIGNS}/${id}`, data),
  deleteCampaign: (id) => api.delete(`${getConfig().API_ENDPOINTS.CAMPAIGNS}/${id}`),
  associateMediaToCampaign: (data) => api.post(getConfig().API_ENDPOINTS.ASSOCIATE_MEDIA_CAMPAIGN, data),
  disassociateMediaFromCampaign: (data) => api.request({ url: getConfig().API_ENDPOINTS.DISASSOCIATE_MEDIA_CAMPAIGN, method: 'DELETE', data }),

  // Recurring Campaigns - Monthly Payments
  getMonthlyPayments: (campaignId) => api.get(`${getConfig().API_ENDPOINTS.CAMPAIGNS}/${campaignId}/monthly-payments`),
  generateMonthlyPayments: (campaignId) => api.post(`${getConfig().API_ENDPOINTS.CAMPAIGNS}/${campaignId}/generate-payments`),
  payMonthlyPayment: (paymentId, data) => api.put(`/private/monthly-payments/${paymentId}/pay`, data),
  reverseMonthlyPayment: (paymentId, data) => api.put(`/private/monthly-payments/${paymentId}/reverse`, data),
  
  // Campaign Values
  getCampaignValues: () => api.get(getConfig().API_ENDPOINTS.CAMPAIGN_VALUES),
  createCampaignValue: (data) => api.post(getConfig().API_ENDPOINTS.CAMPAIGN_VALUES, data),
  updateCampaignValue: (id, data) => api.put(`${getConfig().API_ENDPOINTS.CAMPAIGN_VALUES}/${id}`, data),
  deleteCampaignValue: (id) => api.delete(`${getConfig().API_ENDPOINTS.CAMPAIGN_VALUES}/${id}`),
  
  // Perfil
  getProfile: () => api.get(getConfig().API_ENDPOINTS.PROFILE),
  updateProfile: (data) => api.put(getConfig().API_ENDPOINTS.PROFILE, data),
  updateTextWelcome: () => api.put('/private/profile/text-welcome'),
  
  // Avatar Upload
  uploadAvatar: (formData) => {
    return api.post(getConfig().API_ENDPOINTS.UPLOAD_AVATAR, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Admin - Users
  getUsers: () => api.get(getConfig().API_ENDPOINTS.USERS),
  getUser: (id) => api.get(`${getConfig().API_ENDPOINTS.USERS}/${id}`),
  // Admin - User Medias (tentativa com plural EN/PT)
  getUserMedias: async (userId) => {
    try {
      return await api.get(`/private/admin/users/${userId}/medias`);
    } catch (err) {
      if (err?.response?.status === 404) {
        return await api.get(`/private/admin/users/${userId}/midias`);
      }
      throw err;
    }
  },
  createUser: (data) => api.post(getConfig().API_ENDPOINTS.USERS, data),
  updateUser: (id, data) => api.put(`${getConfig().API_ENDPOINTS.UPDATE_USER}/${id}`, data),
  deleteUser: (id) => api.delete(`${getConfig().API_ENDPOINTS.USERS}/${id}`),
  
  // Admin - Stats
  getAdminStats: () => api.get(getConfig().API_ENDPOINTS.ADMIN_STATS),
  testBlockOverdueUsers: () => api.post(getConfig().API_ENDPOINTS.TEST_BLOCK_OVERDUE_USERS),
  
  // Financial
  createFinancialTitle: (data) => api.post(getConfig().API_ENDPOINTS.CREATE_FINANCIAL_TITLE, data),
  manualPayment: (data) => api.post(getConfig().API_ENDPOINTS.MANUAL_PAYMENT, data),
  getFinancialTitles: (userId) => api.get(`${getConfig().API_ENDPOINTS.FINANCIAL_TITLES}/${userId}/financial-titles`),
  generatePix: (titleId, data) => api.post(`${getConfig().API_ENDPOINTS.GENERATE_PIX}/${titleId}/generate-pix`, data),
  deleteFinancialTitle: (titleId) => api.delete(`${getConfig().API_ENDPOINTS.DELETE_FINANCIAL_TITLE}/${titleId}`),
  bulkFinancialTitles: (userId, data) => api.post(`${getConfig().API_ENDPOINTS.BULK_FINANCIAL_TITLES}/${userId}/financial-titles/bulk`, data),
  createFinancialTitle: (userId, data) => api.post(`${getConfig().API_ENDPOINTS.CREATE_FINANCIAL_TITLE}/${userId}/financial-titles`, data),
  manualPayment: (userId, titleId, data) => api.post(`${getConfig().API_ENDPOINTS.MANUAL_PAYMENT}/${userId}/financial-titles/${titleId}/manual-payment`, data),
  
  // Contact
  sendContact: (data) => api.post(getConfig().API_ENDPOINTS.CONTACT, data),

  // Password Reset
  requestPasswordChange: (data) => api.post(getConfig().API_ENDPOINTS.PASSWORD_RESET || '/public/password-reset', data),
  confirmPasswordReset: (data) => api.post(getConfig().API_ENDPOINTS.CHANGE_PASSWORD || '/public/change-password', data),
  // Confirmação por email com fallback para prefixo /public
  confirmPasswordResetByEmail: async (data) => {
    try {
      return await api.post('/reset-password/confirm-by-email', data);
    } catch (err) {
      if (err?.response?.status === 404) {
        // Backend alternativo usando prefixo /public
        return await api.post('/public/reset-password/confirm-by-email', data);
      }
      throw err;
    }
  },
  // Confirmação por token com fallback sem prefixo /public
  confirmPasswordResetByToken: async (data) => {
    try {
      return await api.post('/public/change-password', data);
    } catch (err) {
      if (err?.response?.status === 404) {
        return await api.post('/change-password', data);
      }
      throw err;
    }
  },
  
  // System Config
  getSystemConfig: () => api.get(getConfig().API_ENDPOINTS.SYSTEM_CONFIG || '/private/system-config'),
  
  // Lytex Integration
  sendLytexLicense: (deviceId, payload) => api.post(`/private/devices/${deviceId}/lytex-license`, payload),
  getLytexInvoice: (deviceId, invoiceId) => api.get(`/private/devices/${deviceId}/lytex-invoice/${invoiceId}`),
  checkLytexPaymentStatus: (deviceId, invoiceId) => api.get(`/private/devices/${deviceId}/lytex-status/${invoiceId}`),
  registerLicense: (deviceId, data) => api.post(`/private/devices/${deviceId}/register-license`, data),
  
  // Batch Licensing
  createBatchLicense: (data) => api.post(getConfig().API_ENDPOINTS.BATCH_LICENSE || '/private/admin/batch-license', data),
  getBatchLicenses: () => api.get(getConfig().API_ENDPOINTS.BATCH_LICENSES || '/private/admin/batch-licenses'),
  getBatchLicense: (id) => api.get(`${getConfig().API_ENDPOINTS.BATCH_LICENSE || '/private/admin/batch-license'}/${id}`),
  updateBatchLicensePayment: (id, data) => api.put((getConfig().API_ENDPOINTS.BATCH_LICENSE_PAYMENT || '/private/admin/batch-license/:id/payment').replace(':id', id), data),
  checkBatchPaymentStatus: (id) => api.get((getConfig().API_ENDPOINTS.BATCH_LICENSE_PAYMENT_STATUS || '/private/admin/batch-license/:id/payment-status').replace(':id', id)),
  generateBatchPix: (id, data) => api.post((getConfig().API_ENDPOINTS.BATCH_LICENSE_GENERATE_PIX || '/private/admin/batch-license/:id/generate-pix').replace(':id', id), data),
  
  // Lytex Batch Integration
  generateBatchPixLytex: (id, data) => api.post(`/private/batch-license/${id}/generate-pix-lytex`, data),
  checkBatchPaymentStatusLytex: (id) => api.get(`/private/batch-license/${id}/payment-status-lytex`),
  cancelBatchInvoiceLytex: (id) => api.delete(`/private/batch-license/${id}/cancel-invoice-lytex`),

  // Visible medias (user + global)
  listVisibleMedias: () => api.get('/private/medias/visible'),
  // Panels for a media (medias model)
  getPanelsForMedia: (mediaId) => api.get(`/private/medias/${mediaId}/panels`),
};
export default api;
