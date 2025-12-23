const APP_CONFIG = {
    GOOGLE_CLIENT_ID: '291186743494-ntdv1h0sj94bch80n9ut8rr8jblkofv3.apps.googleusercontent.com',
    // Determina automaticamente a URL base baseada no ambiente
    API_BASE_URL: (() => {
        // Verifica se está em produção
        if (window.location.hostname === 'app.vixplay.altersoft.dev.br' || 
            window.location.hostname.includes('altersoft.dev.br')) {
            return 'https://app.vixplay.altersoft.dev.br/api';
        } else {
            // Ambiente de desenvolvimento
            // Base da API no desenvolvimento
            return 'http://10.0.10.17:4000';
        }
    })(),
    API_ENDPOINTS: {
        LOGIN: '/public/login',
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
        BATCH_LICENSES: '/private/admin/batch-licenses',
        BATCH_LICENSE: '/private/admin/batch-license',
        BATCH_LICENSE_GENERATE_PIX: '/private/admin/batch-license/:id/generate-pix',
        BATCH_LICENSE_PAYMENT_STATUS: '/private/admin/batch-license/:id/payment-status',
        BATCH_LICENSE_PAYMENT: '/private/admin/batch-license/:id/payment',
        USER_DEVICES: '/private/admin/users/:id/devices',
        CONTACT: '/public/contact'
    }
};

// Função para construir URLs da API
function buildApiUrl(endpoint) {
    return `${APP_CONFIG.API_BASE_URL}${endpoint}`;
}

// Tornar disponível globalmente
window.APP_CONFIG = APP_CONFIG;
window.buildApiUrl = buildApiUrl;