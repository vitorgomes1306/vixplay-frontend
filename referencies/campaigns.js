// ===== VARIÁVEIS GLOBAIS =====
console.log('=== CARREGANDO CAMPAIGNS.JS ===');
const token = localStorage.getItem('token');
const userName = localStorage.getItem('usuarioName');
let campaignsContainer;
let valuesContainer;
let alertContainer;
let clients = [];

// ===== VERIFICAÇÃO DE AUTENTICAÇÃO =====
console.log('Token encontrado:', !!token);
if (!token) {
    console.log('Redirecionando para login - token não encontrado');
    window.location.href = "/";
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function () {
    // Verificar autenticação
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Inicializar elementos DOM
    campaignsContainer = document.getElementById('campaignsContainer');
    valuesContainer = document.getElementById('valuesContainer');
    alertContainer = document.getElementById('alertContainer');
    
    console.log('Elementos DOM inicializados:', {
        campaignsContainer: !!campaignsContainer,
        valuesContainer: !!valuesContainer,
        alertContainer: !!alertContainer
    });

    // Carregar nome do usuário
    console.log('userName do localStorage:', userName);
    const userNameElement = document.getElementById('userName');
    console.log('Elemento userName encontrado:', userNameElement);
    if (userName && userNameElement) {
        userNameElement.textContent = userName;
        console.log('Nome do usuário definido:', userName);
    } else {
        console.log('userName não encontrado no localStorage ou elemento não existe');
    }

    // Definir link ativo na sidebar
    setActiveSidebarLink();

    // Anexar evento de logout
    document.getElementById('logoutBtnSidebar').addEventListener('click', handleLogout);

    // Inicializar tema escuro se necessário
    initDarkMode();
    
    // Inicializar totalPaidValues para evitar NaN
    const totalPaidElement = document.getElementById('totalPaidValues');
    if (totalPaidElement) {
        totalPaidElement.textContent = 'R$ 0,00';
        console.log('totalPaidValues inicializado no DOM: R$ 0,00');
    }
    
    // A inicialização da sidebar agora é feita pelo modern-dashboard.js

    // Carregar dados com delay para garantir que DOM esteja pronto
    setTimeout(async () => {
        console.log('Iniciando carregamento sequencial dos dados...');
        await carregarClientes();
        console.log('Clientes carregados, agora carregando campanhas...');
        await carregarCampanhas();
        console.log('Campanhas carregadas, agora carregando estatísticas...');
        await carregarEstatisticas();
        console.log('Todos os dados carregados!');
    }, 100);

    // Configurar eventos dos botões
    configurarEventosBotoes();
    
    // Configurar filtros
    configurarFiltros();
});

// ===== FUNÇÕES DE INICIALIZAÇÃO =====

// Função para inicializar o tema escuro
function initDarkMode() {
    const themeToggle = document.getElementById('themeToggleModal');
    
    if (!themeToggle) return; // Sair se o elemento não existir
    
    // Verificar preferência salva
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
    
    // Adicionar evento de alteração
    themeToggle.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
        }
    });
}

// Função initMobileSidebar removida - agora é gerenciada pelo modern-dashboard.js

// Função para definir o link ativo na sidebar
function setActiveSidebarLink() {
    const currentPage = window.location.pathname.split('/').pop();
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    
    sidebarLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Função para lidar com o logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuarioName');
    window.location.href = 'login.html';
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Função para fechar modal de forma robusta
function fecharModalRobustamente(modalId) {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
        console.warn(`Modal ${modalId} não encontrado`);
        return;
    }
    
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (!modal) {
        modal = new bootstrap.Modal(modalElement);
    }
    modal.hide();
    
    // Remover backdrop e classes do body após um delay
    setTimeout(() => {
        // Remover todos os backdrops que possam ter ficado
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Limpar classes e estilos do body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // Garantir que o modal está completamente oculto
        modalElement.style.display = 'none';
        modalElement.classList.remove('show');
        modalElement.setAttribute('aria-hidden', 'true');
        modalElement.removeAttribute('aria-modal');
    }, 300);
}

// ===== FUNÇÕES DE CARREGAMENTO DE DADOS =====

// Função para carregar clientes
async function carregarClientes() {
    try {
        console.log('Fazendo requisição para:', buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS));
        
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Resposta da API:', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', errorText);
            
            // Se for erro de autenticação (401) ou token inválido
            if (response.status === 401 || errorText.includes('invalid signature') || errorText.includes('Token inválido')) {
                console.log('Token inválido detectado, redirecionando para login');
                localStorage.removeItem('token');
                localStorage.removeItem('usuarioName');
                mostrarAlerta('Sessão expirada. Redirecionando para login...', 'warning');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
                return;
            }
            
            throw new Error(`Erro ao carregar clientes: ${response.status} - ${errorText}`);
        }

        const clientes = await response.json();
        console.log('Dados recebidos da API:', clientes);
        console.log('Tipo dos dados:', typeof clientes, 'É array:', Array.isArray(clientes));

        // Verificar se há clientes
        if (!Array.isArray(clientes) || clientes.length === 0) {
            console.log('Nenhum cliente encontrado');
            clients = [];
        } else {
            clients = clientes;
            console.log('Clientes carregados:', clients.length);
            if (clients.length > 0) {
                console.log('Primeiro cliente:', clients[0]);
                console.log('Propriedades do primeiro cliente:', Object.keys(clients[0]));
            }
        }
        
        // Preencher selects de clientes
        preencherSelectClientes();
        
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        console.error('Stack trace:', error.stack);
        
        let errorMessage = 'Erro desconhecido';
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Erro de conexão com o servidor. Verifique se o servidor está rodando.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        mostrarAlerta('Erro ao carregar clientes: ' + errorMessage, 'danger');
        clients = [];
    }
}

// Função para preencher selects de clientes
function preencherSelectClientes() {
    console.log('Preenchendo selects de clientes...');
    console.log('Número de clientes disponíveis:', clients.length);
    
    const selectCampaign = document.getElementById('campaignClient');
    const selectEdit = document.getElementById('editCampaignClient');
    
    console.log('Select campaignClient encontrado:', !!selectCampaign);
    console.log('Select editCampaignClient encontrado:', !!selectEdit);
    
    if (selectCampaign) {
        selectCampaign.innerHTML = '<option value="">Selecione um cliente</option>';
        
        if (clients && clients.length > 0) {
            clients.forEach((client, index) => {
                console.log(`Cliente ${index}:`, client);
                const clientName = client.name || client.nome || client.razao_social || client.email || `Cliente ${client.id}`;
                const clientId = client.id || client.cliente_id;
                const option = `<option value="${clientId}">${clientName}</option>`;
                console.log(`Adicionando opção: ${option}`);
                selectCampaign.innerHTML += option;
            });
            console.log('Select campaignClient preenchido com sucesso');
        } else {
            console.log('Nenhum cliente disponível para preencher o select');
        }
    }
    
    if (selectEdit) {
        selectEdit.innerHTML = '<option value="">Selecione um cliente</option>';
        
        if (clients && clients.length > 0) {
            clients.forEach(client => {
                const clientName = client.name || client.nome || client.razao_social || client.email || `Cliente ${client.id}`;
                const clientId = client.id || client.cliente_id;
                selectEdit.innerHTML += `<option value="${clientId}">${clientName}</option>`;
            });
        }
    }
}

// Função para formatar moeda
function formatarMoeda(valor) {
    console.log('formatarMoeda chamada com valor:', valor, 'tipo:', typeof valor);
    
    // Validar se o valor é um número válido
    if (valor === null || valor === undefined || isNaN(valor)) {
        console.log('Valor inválido detectado, usando 0');
        valor = 0;
    }
    
    // Converter para número se for string
    if (typeof valor === 'string') {
        valor = parseFloat(valor) || 0;
        console.log('Valor convertido de string:', valor);
    }
    
    // Garantia final contra NaN
    if (isNaN(valor)) {
        console.warn('Valor ainda é NaN após validações, forçando para 0');
        valor = 0;
    }
    
    const resultado = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
    
    console.log('Resultado formatado:', resultado);
    return resultado;
}

// Função para carregar estatísticas
async function carregarEstatisticas() {
    try {
        // Forçar valor inicial para evitar NaN
        const totalPaidElement = document.getElementById('totalPaidValues');
        if (totalPaidElement) {
            totalPaidElement.textContent = 'R$ 0,00';
            console.log('Valor inicial forçado para totalPaidValues: R$ 0,00');
        }
        
        // Carregar todas as campanhas para calcular estatísticas
        const campanhas = await obterTodasCampanhas();
        
        // Total de campanhas
        document.getElementById('totalCampaigns').textContent = campanhas.length || 0;
        
        // Campanhas ativas
        const agora = new Date();
        const campanhasAtivas = campanhas.filter(campanha => {
            const inicio = new Date(campanha.startDate);
            const fim = new Date(campanha.endDate);
            return campanha.active && inicio <= agora && agora <= fim;
        });
        document.getElementById('activeCampaigns').textContent = campanhasAtivas.length || 0;
        
        // Campanhas agendadas (futuras)
        const campanhasAgendadas = campanhas.filter(campanha => {
            const inicio = new Date(campanha.startDate);
            return campanha.active && inicio > agora;
        });
        document.getElementById('scheduledCampaigns').textContent = campanhasAgendadas.length || 0;
        
        // Calcular valores pagos (campanhas com status PAGO)
        let valoresPagos = 0;
        console.log('=== DEBUG VALORES PAGOS ===');
        console.log('Total de campanhas:', campanhas.length);
        
        for (const campanha of campanhas) {
            console.log('Verificando campanha:', campanha.id, 'Status pagamento:', campanha.paymentStatus, 'Valor:', campanha.value);
            if (campanha.paymentStatus === 'PAGO' && campanha.value) {
                const valorCampanha = parseFloat(campanha.value);
                console.log('Valor parseado:', valorCampanha, 'É NaN?', isNaN(valorCampanha));
                if (!isNaN(valorCampanha)) {
                    valoresPagos += valorCampanha;
                    console.log('Valor adicionado. Total atual:', valoresPagos);
                } else {
                    console.warn('Valor inválido na campanha:', campanha.id, 'valor:', campanha.value);
                }
            }
        }
        
        console.log('Valores pagos antes da verificação:', valoresPagos);
        // Garantir que valoresPagos seja sempre um número válido
        if (isNaN(valoresPagos) || valoresPagos === null || valoresPagos === undefined) {
            console.warn('valoresPagos era inválido, definindo como 0');
            valoresPagos = 0;
        }
        
        console.log('Valores pagos final:', valoresPagos);
        const valorFormatado = formatarMoeda(valoresPagos);
        console.log('Valor formatado:', valorFormatado);
        
        // Verificação final contra NaN no valor formatado
        if (valorFormatado && !valorFormatado.includes('NaN')) {
            document.getElementById('totalPaidValues').textContent = valorFormatado;
            console.log('Valor definido com sucesso:', valorFormatado);
        } else {
            document.getElementById('totalPaidValues').textContent = 'R$ 0,00';
            console.warn('Valor formatado continha NaN, usando R$ 0,00');
        }
        console.log('=== FIM DEBUG VALORES PAGOS ===');
        
    } catch (error) {
        console.error('=== ERRO NA FUNÇÃO carregarEstatisticas ===');
        console.error('Erro ao carregar estatísticas:', error);
        console.error('Stack trace:', error.stack);
        // Definir valores padrão em caso de erro
        document.getElementById('totalCampaigns').textContent = '0';
        document.getElementById('activeCampaigns').textContent = '0';
        document.getElementById('scheduledCampaigns').textContent = '0';
        
        // Garantir que totalPaidValues nunca seja NaN, mesmo em erro
        const totalPaidElement = document.getElementById('totalPaidValues');
        if (totalPaidElement) {
            totalPaidElement.textContent = 'R$ 0,00';
            console.log('totalPaidValues forçado para R$ 0,00 no catch');
        }
        console.log('Valores padrão definidos devido ao erro');
    }
}

// Função auxiliar para obter todas as campanhas
async function obterTodasCampanhas() {
    console.log('=== FUNÇÃO obterTodasCampanhas CHAMADA ===');
    console.log('Número de clientes disponíveis:', clients.length);
    console.log('Clientes:', clients);
    
    const campanhas = [];
    
    if (clients.length === 0) {
        console.warn('Nenhum cliente disponível para buscar campanhas!');
        return campanhas;
    }
    
    for (const client of clients) {
        try {
            const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/client/${client.id}`, {
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
            
            if (response.ok) {
                const clientCampaigns = await response.json();
                campanhas.push(...clientCampaigns);
            }
        } catch (error) {
            console.error('Erro ao carregar campanhas do cliente', client.id, error);
        }
    }
    
    return campanhas;
}

// Função para carregar campanhas
async function carregarCampanhas() {
    console.log('=== FUNÇÃO carregarCampanhas CHAMADA ===');
    console.log('Token disponível:', !!token);
    console.log('campaignsContainer disponível:', !!campaignsContainer);
    try {
        console.log('Iniciando carregamento de campanhas...');
        // Exibir loading
        campaignsContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 text-muted">Carregando campanhas...</p>
                </td>
            </tr>
        `;

        const campanhas = await obterTodasCampanhas();
        console.log('Campanhas carregadas:', campanhas);

        // Verificar se há campanhas
        if (!Array.isArray(campanhas) || campanhas.length === 0) {
            campaignsContainer.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <p class="text-muted">Nenhuma campanha encontrada.</p>
                </td>
            </tr>
        `;
            return;
        }

        // Renderizar campanhas
        const campanhasHtml = await Promise.all(campanhas.map(async (campanha) => {
            const cliente = clients.find(c => c.id === campanha.clientId);
            const status = obterStatusCampanha(campanha);
            
            // Calcular receita da campanha usando a nova fórmula: Valor da campanha + entradas - saídas
            let receita = 0;
            try {
                const valores = await obterValoresCampanha(campanha.id);
                const entradas = valores.filter(v => v.type === 'ENTRADA').reduce((sum, v) => sum + parseFloat(v.value), 0);
                const saidas = valores.filter(v => v.type === 'SAIDA').reduce((sum, v) => sum + parseFloat(v.value), 0);
                const valorCampanha = parseFloat(campanha.value) || 0;
                receita = valorCampanha + entradas - saidas;
            } catch (error) {
                console.error('Erro ao calcular receita:', error);
            }
            
            // Função para obter classe CSS do status de pagamento
            const getPaymentStatusClass = (status) => {
                switch(status) {
                    case 'PAGO': return 'text-success';
                    case 'VENCIDO': return 'text-danger';
                    case 'ABERTO': return 'text-warning';
                    default: return 'text-muted';
                }
            };
            
            // Função para obter texto do status de pagamento
            const getPaymentStatusText = (status) => {
                switch(status) {
                    case 'PAGO': return 'Pago';
                    case 'VENCIDO': return 'Vencido';
                    case 'ABERTO': return 'Aberto';
                    default: return 'N/A';
                }
            };
            
            return `
                <tr data-campaign-id="${campanha.id}" data-status="${status.class}">
                    <td>${campanha.name}</td>
                    <td>${cliente ? cliente.name : 'Cliente não encontrado'}</td>
                    <td>
                        <small class="text-muted">
                            ${formatarData(campanha.startDate)} - ${formatarData(campanha.endDate)}
                        </small>
                    </td>
                    <td>
                        <span class="campaign-status ${status.class}">${status.text}</span>
                    </td>
                    <td><strong>${formatarMoeda(campanha.value || 0)}</strong></td>
                    <td>
                        <span class="badge bg-secondary">${campanha.paymentMethod || 'N/A'}</span>
                    </td>
                    <td>
                        <small class="text-muted">
                            ${campanha.dueDate ? formatarData(campanha.dueDate) : 'N/A'}
                        </small>
                    </td>
                    <td>
                        <span class="badge ${getPaymentStatusClass(campanha.paymentStatus)}">
                            ${getPaymentStatusText(campanha.paymentStatus)}
                        </span>
                    </td>
                    <td>${formatarMoeda(receita)}</td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-info" onclick="abrirModalDetalhesCampanha(${campanha.id})" title="Ver Detalhes">
                                <i class="bi bi-info-circle"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="abrirModalValores(${campanha.id}, '${campanha.name}')" title="Gerenciar Valores">
                                <i class="bi bi-currency-dollar"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-info" onclick="abrirModalRenovarCampanha(${campanha.id})" title="Renovar Campanha">
                                <i class="bi bi-arrow-clockwise"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-success" onclick="abrirModalGerenciarMidias(${campanha.id}, '${campanha.name}')" title="Gerenciar Mídias">
                                <i class="bi bi-collection-play"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEdicaoCampanha(${campanha.id})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusaoCampanha(${campanha.id}, '${campanha.name}')" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }));
        
        campaignsContainer.innerHTML = campanhasHtml.join('');

    } catch (error) {
        console.error('Erro ao carregar campanhas:', error);
        console.error('Stack trace:', error.stack);
        
        let errorMessage = 'Erro desconhecido';
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Erro de conexão com o servidor. Verifique se o servidor está rodando.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        mostrarAlerta('Erro ao carregar campanhas: ' + errorMessage, 'danger');
        campaignsContainer.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-4">
                    <div class="alert alert-danger" role="alert">
                        <i class="bi bi-exclamation-triangle"></i>
                        ${errorMessage}
                        <br><small class="text-muted">Verifique o console para mais detalhes</small>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

// Função para obter status da campanha
function obterStatusCampanha(campanha) {
    const agora = new Date();
    const inicio = new Date(campanha.startDate);
    const fim = new Date(campanha.endDate);
    
    if (!campanha.active) {
        return { class: 'inactive', text: 'Inativa' };
    }
    
    if (inicio > agora) {
        return { class: 'scheduled', text: 'Agendada' };
    }
    
    if (inicio <= agora && agora <= fim) {
        return { class: 'active', text: 'Ativa' };
    }
    
    return { class: 'inactive', text: 'Expirada' };
}

// Função para formatar data
function formatarData(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Função para mostrar alertas
function mostrarAlerta(mensagem, tipo = 'success') {
    const alertClass = tipo === 'success' ? 'alert-success' : 
                      tipo === 'warning' ? 'alert-warning' : 'alert-danger';
    const icon = tipo === 'success' ? 'bi-check-circle' : 
                tipo === 'warning' ? 'bi-exclamation-triangle' : 'bi-exclamation-triangle';

    const alertHtml = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <i class="bi ${icon} me-2"></i>
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Verificar se algum modal está aberto e direcionar o alerta para o container correto
    const addCampaignModal = document.getElementById('addCampaignModal');
    const editCampaignModal = document.getElementById('editCampaignModal');
    const addCampaignModalAlertContainer = document.getElementById('addCampaignModalAlertContainer');
    const editCampaignModalAlertContainer = document.getElementById('editCampaignModalAlertContainer');
    
    if (addCampaignModal && addCampaignModal.classList.contains('show') && addCampaignModalAlertContainer) {
        // Exibir alerta dentro do modal de adicionar campanha
        addCampaignModalAlertContainer.innerHTML = alertHtml;
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alert = addCampaignModalAlertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    } else if (editCampaignModal && editCampaignModal.classList.contains('show') && editCampaignModalAlertContainer) {
        // Exibir alerta dentro do modal de editar campanha
        editCampaignModalAlertContainer.innerHTML = alertHtml;
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alert = editCampaignModalAlertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    } else {
        // Exibir alerta na página principal
        alertContainer.innerHTML = alertHtml;

        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// ===== FUNÇÕES DE CONFIGURAÇÃO =====

// Função para configurar eventos dos botões
function configurarEventosBotoes() {
    console.log('=== CONFIGURANDO EVENTOS DOS BOTÕES ===');
    
    // Verificar se os elementos existem
    const saveCampaignBtn = document.getElementById('saveCampaignBtn');
    console.log('Botão saveCampaignBtn encontrado:', saveCampaignBtn ? 'SIM' : 'NÃO');
    
    // Botão Nova Campanha
    const newCampaignBtn = document.getElementById('newCampaignBtn');
    if (newCampaignBtn) {
        newCampaignBtn.addEventListener('click', function() {
            limparFormularioCampanha();
            const modal = new bootstrap.Modal(document.getElementById('addCampaignModal'));
            modal.show();
        });
    }

    // Botão Salvar Campanha - usando onclick no HTML
    console.log('Botão salvar configurado via onclick no HTML');

    // Botão Atualizar Campanha - usando onclick no HTML
    console.log('Botão atualizar configurado via onclick no HTML');

    // Botão Confirmar Exclusão - usando onclick no HTML
    console.log('Botão excluir configurado via onclick no HTML');

    // Botão Adicionar Valor
    document.getElementById('addValueBtn').addEventListener('click', function() {
        limparFormularioValor();
        document.getElementById('addValueForm').style.display = 'block';
    });

    // Botão Salvar Valor
    document.getElementById('btnSalvarValor').addEventListener('click', salvarValor);

    // Botão Cancelar Valor
    document.getElementById('btnCancelarValor').addEventListener('click', function() {
        document.getElementById('addValueForm').style.display = 'none';
        limparFormularioValor();
    });
}

// Função para configurar filtros
function configurarFiltros() {
    // Filtro de pesquisa
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filtrarCampanhas(searchTerm);
        });
    }

    // Filtro de status (comentado pois o elemento não existe)
    // const statusFilter = document.getElementById('statusFilter');
    // if (statusFilter) {
    //     statusFilter.addEventListener('change', function() {
    //         const statusFilter = this.value;
    //         filtrarCampanhasPorStatus(statusFilter);
    //     });
    // }
}

// ===== FUNÇÕES DE FILTRO =====

// Função para filtrar campanhas por texto
function filtrarCampanhas(searchTerm) {
    const rows = campaignsContainer.querySelectorAll('tr');
    
    rows.forEach(row => {
        const campaignName = row.cells[0]?.textContent.toLowerCase() || '';
        const clientName = row.cells[1]?.textContent.toLowerCase() || '';
        
        if (campaignName.includes(searchTerm) || clientName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Função para filtrar campanhas por status
function filtrarCampanhasPorStatus(statusFilter) {
    const rows = campaignsContainer.querySelectorAll('tr');
    
    rows.forEach(row => {
        const status = row.getAttribute('data-status');
        
        if (!statusFilter || status === statusFilter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ===== FUNÇÕES DE CAMPANHA =====

// Função para limpar formulário de campanha
function limparFormularioCampanha() {
    document.getElementById('campaignName').value = '';
    document.getElementById('campaignClient').value = '';
    document.getElementById('campaignDescription').value = '';
    document.getElementById('campaignStartDate').value = '';
    document.getElementById('campaignEndDate').value = '';
    document.getElementById('campaignActive').checked = true;
    document.getElementById('campaignValue').value = '';
    document.getElementById('campaignPaymentMethod').value = '';
    document.getElementById('campaignDueDate').value = '';
    document.getElementById('campaignPaymentStatus').value = 'ABERTO';
}

// Função para salvar campanha
async function salvarCampanha() {
    console.log('=== INICIANDO SALVAMENTO DE CAMPANHA ===');
    try {
        const name = document.getElementById('campaignName').value.trim();
        const clientId = document.getElementById('campaignClient').value;
        const description = document.getElementById('campaignDescription').value.trim();
        const startDate = document.getElementById('campaignStartDate').value;
        const endDate = document.getElementById('campaignEndDate').value;
        const active = document.getElementById('campaignActive').checked;
        const value = parseFloat(document.getElementById('campaignValue').value);
        const paymentMethod = document.getElementById('campaignPaymentMethod').value;
        const dueDate = document.getElementById('campaignDueDate').value;
        const paymentStatus = document.getElementById('campaignPaymentStatus').value;
        
        console.log('Valores coletados do formulário:', {
            name, clientId, description, startDate, endDate, active, value, paymentMethod, dueDate, paymentStatus
        });

        // Validações
        console.log('Iniciando validações...');
        if (!name) {
            console.log('Erro: Nome da campanha é obrigatório');
            mostrarAlerta('Nome da campanha é obrigatório', 'danger');
            return;
        }

        if (!clientId) {
            console.log('Erro: Cliente é obrigatório');
            mostrarAlerta('Cliente é obrigatório', 'danger');
            return;
        }

        if (!startDate || !endDate) {
            console.log('Erro: Datas de início e fim são obrigatórias');
            mostrarAlerta('Datas de início e fim são obrigatórias', 'danger');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            console.log('Erro: Data de início deve ser anterior à data de fim');
            mostrarAlerta('Data de início deve ser anterior à data de fim', 'danger');
            return;
        }

        // Verificar se é campanha recorrente antes de validar o valor
        const isRecurring = document.getElementById('campaignRecurring').checked;
        
        if (!isRecurring && (!value || value <= 0)) {
            console.log('Erro: Valor da campanha é obrigatório e deve ser maior que zero');
            mostrarAlerta('Valor da campanha é obrigatório e deve ser maior que zero', 'danger');
            return;
        }

        if (!paymentMethod) {
            console.log('Erro: Forma de pagamento é obrigatória');
            mostrarAlerta('Forma de pagamento é obrigatória', 'danger');
            return;
        }

        // Data de vencimento só é obrigatória para campanhas não recorrentes
        if (!isRecurring && !dueDate) {
            console.log('Erro: Data de vencimento é obrigatória');
            mostrarAlerta('Data de vencimento é obrigatória', 'danger');
            return;
        }

        if (!paymentStatus) {
            console.log('Erro: Status do pagamento é obrigatório');
            mostrarAlerta('Status do pagamento é obrigatório', 'danger');
            return;
        }
        
        console.log('Todas as validações passaram!');

        // Usar a variável isRecurring já declarada anteriormente
        let monthlyValue = null;
        let billingDay = null;
        let autoGenerate = false;
        
        if (isRecurring) {
            monthlyValue = parseFloat(document.getElementById('monthlyValue').value);
            billingDay = parseInt(document.getElementById('billingDay').value);
            autoGenerate = document.getElementById('autoGenerate').checked;
            
            if (!monthlyValue || monthlyValue <= 0) {
                console.log('Erro: Valor mensal é obrigatório para campanhas recorrentes');
                mostrarAlerta('Valor mensal é obrigatório para campanhas recorrentes', 'danger');
                return;
            }
        }

        const campaignData = {
            name,
            clientId: parseInt(clientId),
            description,
            startDate,
            endDate,
            active,
            value: isRecurring ? monthlyValue : value,
            paymentMethod,
            dueDate,
            paymentStatus,
            isRecurring,
            recurringCampaign: isRecurring ? {
                monthlyValue,
                billingDay,
                autoGenerate
            } : null
        };

        console.log('Enviando dados da campanha:', campaignData);
        console.log('Token usado:', token ? 'Token presente' : 'Token ausente');

        console.log('Fazendo requisição para API...');
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(campaignData)
        });

        console.log('Resposta recebida:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.log('Erro na resposta:', errorData);
            throw new Error(errorData.message || 'Erro ao salvar campanha');
        }

        const result = await response.json();
        console.log('Campanha salva com sucesso:', result);

        // Fechar modal de forma robusta
        fecharModalRobustamente('addCampaignModal');

        // Recarregar dados
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Campanha criada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar campanha:', error);
        mostrarAlerta('Erro ao salvar campanha: ' + error.message, 'danger');
    }
}

// Função para abrir modal de edição
async function abrirModalEdicaoCampanha(campaignId) {
    console.log('Função abrirModalEdicaoCampanha chamada com ID:', campaignId);
    try {
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar dados da campanha');
        }

        const campanha = await response.json();
        console.log('Dados da campanha recebidos:', campanha);

        // Preencher formulário
        document.getElementById('editCampaignId').value = campanha.id;
        document.getElementById('editCampaignName').value = campanha.name;
        document.getElementById('editCampaignClient').value = campanha.clientId;
        document.getElementById('editCampaignDescription').value = campanha.description || '';
        
        // Processar datas com logs para datetime-local
        const startDate = campanha.startDate ? campanha.startDate.substring(0, 16) : '';
        const endDate = campanha.endDate ? campanha.endDate.substring(0, 16) : '';
        console.log('Data início processada:', startDate);
        console.log('Data fim processada:', endDate);
        
        document.getElementById('editCampaignStartDate').value = startDate;
        document.getElementById('editCampaignEndDate').value = endDate;
        document.getElementById('editCampaignActive').checked = campanha.active;
        
        // Preencher novos campos de valor e pagamento
        document.getElementById('editCampaignValue').value = campanha.value || 0;
        document.getElementById('editCampaignPaymentMethod').value = campanha.paymentMethod || '';
        
        // Processar data de vencimento
        const dueDate = campanha.dueDate ? campanha.dueDate.substring(0, 10) : '';
        console.log('Data vencimento processada:', dueDate);
        document.getElementById('editCampaignDueDate').value = dueDate;
        
        document.getElementById('editCampaignPaymentStatus').value = campanha.paymentStatus || 'ABERTO';
        
        console.log('Novos campos preenchidos:', {
            value: campanha.value,
            paymentMethod: campanha.paymentMethod,
            dueDate: dueDate,
            paymentStatus: campanha.paymentStatus
        });

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editCampaignModal'));
        modal.show();

    } catch (error) {
        console.error('Erro ao carregar campanha:', error);
        mostrarAlerta('Erro ao carregar dados da campanha: ' + error.message, 'danger');
    }
}

// Função para atualizar campanha
async function atualizarCampanha() {
    console.log('Função atualizarCampanha chamada');
    try {
        const id = document.getElementById('editCampaignId').value;
        const name = document.getElementById('editCampaignName').value.trim();
        const clientId = document.getElementById('editCampaignClient').value;
        const description = document.getElementById('editCampaignDescription').value.trim();
        const startDate = document.getElementById('editCampaignStartDate').value;
        const endDate = document.getElementById('editCampaignEndDate').value;
        const active = document.getElementById('editCampaignActive').checked;
        const value = parseFloat(document.getElementById('editCampaignValue').value);
        const paymentMethod = document.getElementById('editCampaignPaymentMethod').value;
        const dueDate = document.getElementById('editCampaignDueDate').value;
        const paymentStatus = document.getElementById('editCampaignPaymentStatus').value;

        // Validações
        if (!name) {
            mostrarAlerta('Nome da campanha é obrigatório', 'danger');
            return;
        }

        if (!clientId) {
            mostrarAlerta('Cliente é obrigatório', 'danger');
            return;
        }

        if (!startDate || !endDate) {
            mostrarAlerta('Datas de início e fim são obrigatórias', 'danger');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            mostrarAlerta('Data de início deve ser anterior à data de fim', 'danger');
            return;
        }

        // Verificar se é campanha recorrente antes de validar o valor
        const isRecurring = document.getElementById('campaignRecurring').checked;
        
        if (!isRecurring && (!value || value <= 0)) {
            mostrarAlerta('Valor da campanha é obrigatório e deve ser maior que zero', 'danger');
            return;
        }

        if (!paymentMethod) {
            mostrarAlerta('Forma de pagamento é obrigatória', 'danger');
            return;
        }

        // Data de vencimento só é obrigatória para campanhas não recorrentes
        if (!isRecurring && !dueDate) {
            mostrarAlerta('Data de vencimento é obrigatória', 'danger');
            return;
        }

        if (!paymentStatus) {
            mostrarAlerta('Status do pagamento é obrigatório', 'danger');
            return;
        }

        const campaignData = {
            name,
            clientId: parseInt(clientId),
            description,
            startDate,
            endDate,
            active,
            value,
            paymentMethod,
            dueDate,
            paymentStatus
        };

        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(campaignData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao atualizar campanha');
        }

        // Fechar modal de forma robusta
        fecharModalRobustamente('editCampaignModal');

        // Recarregar dados
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Campanha atualizada com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar campanha:', error);
        mostrarAlerta('Erro ao atualizar campanha: ' + error.message, 'danger');
    }
}

// Função para abrir modal de exclusão
function abrirModalExclusaoCampanha(campaignId, campaignName) {
    console.log('Função abrirModalExclusaoCampanha chamada com ID:', campaignId, 'Nome:', campaignName);
    document.getElementById('deleteCampaignId').value = campaignId;
    document.getElementById('deleteCampaignName').textContent = campaignName;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteCampaignModal'));
    modal.show();
}

// Função para excluir campanha
async function excluirCampanha() {
    console.log('Função excluirCampanha chamada');
    try {
        const id = document.getElementById('deleteCampaignId').value;
        console.log('ID da campanha a ser excluída:', id);
        
        if (!id) {
            throw new Error('ID da campanha não encontrado');
        }

        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        console.log('Resposta da API de exclusão:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na API de exclusão:', errorData);
            throw new Error(errorData.message || 'Erro ao excluir campanha');
        }
        
        console.log('Campanha excluída com sucesso na API');

        // Fechar modal de forma robusta
        fecharModalRobustamente('deleteCampaignModal');

        // Recarregar dados
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Campanha excluída com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao excluir campanha:', error);
        mostrarAlerta('Erro ao excluir campanha: ' + error.message, 'danger');
    }
}

// ===== FUNÇÕES DE VALORES DE CAMPANHA =====

// Função para obter valores de uma campanha
async function obterValoresCampanha(campaignId) {
    try {
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGN_VALUES)}/campaign/${campaignId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar valores da campanha');
        }

        return await response.json();
    } catch (error) {
        console.error('Erro ao obter valores da campanha:', error);
        return [];
    }
}

// Função para abrir modal de valores
async function abrirModalValores(campaignId, campaignName) {
    try {
        // Obter dados completos da campanha
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) {
            throw new Error('Erro ao carregar dados da campanha');
        }
        const campanha = await response.json();
        console.log('=== DADOS DA CAMPANHA OBTIDOS ===');
        console.log('Campanha completa:', campanha);
        console.log('Valor da campanha (raw):', campanha.value);
        
        // Definir dados da campanha no modal
        document.getElementById('currentCampaignId').value = campaignId;
        document.getElementById('campaignNameInModal').textContent = campaignName;
        
        // Armazenar valor da campanha para uso no cálculo
        const valorCampanhaRaw = campanha.value;
        window.currentCampaignValue = parseFloat(valorCampanhaRaw) || 0;
        
        // Validar se o valor é um número válido
        if (isNaN(window.currentCampaignValue)) {
            console.warn('Valor da campanha inválido:', valorCampanhaRaw, 'definindo como 0');
            window.currentCampaignValue = 0;
        }
        
        console.log('Valor da campanha armazenado:', window.currentCampaignValue);
        
        // Carregar valores
        await carregarValoresCampanha(campaignId);
        
        // Esconder formulário de adicionar valor
        document.getElementById('addValueForm').style.display = 'none';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('manageValuesModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao abrir modal de valores:', error);
        mostrarAlerta('Erro ao carregar valores da campanha: ' + error.message, 'danger');
    }
}

// Função para carregar valores da campanha
async function carregarValoresCampanha(campaignId) {
    try {
        console.log('=== CARREGANDO VALORES DA CAMPANHA ===');
        console.log('Campaign ID:', campaignId);
        
        const valores = await obterValoresCampanha(campaignId);
        console.log('Valores obtidos:', valores);
        console.log('Número de valores:', valores.length);
        
        // Calcular totais
        let totalEntradas = 0;
        let totalSaidas = 0;
        
        // Renderizar valores
        const valoresHtml = valores.map(valor => {
            // Validar e converter valor
            let valorNumerico = parseFloat(valor.value);
            if (isNaN(valorNumerico)) {
                console.warn('Valor inválido encontrado:', valor.value, 'para valor ID:', valor.id);
                valorNumerico = 0;
            }
            
            if (valor.type === 'ENTRADA') {
                totalEntradas += valorNumerico;
            } else {
                totalSaidas += valorNumerico;
            }
            
            return `
                <tr>
                    <td>${valor.description}</td>
                    <td>
                        <span class="value-type ${valor.type.toLowerCase()}">
                            ${valor.type === 'ENTRADA' ? 'Entrada' : 'Saída'}
                        </span>
                    </td>
                    <td class="${valor.type === 'ENTRADA' ? 'text-success' : 'text-danger'}">
                        ${valor.type === 'ENTRADA' ? '+' : '-'} ${formatarMoeda(valorNumerico)}
                    </td>
                    <td>
                        <div class="btn-group">
                            <button class="btn btn-sm btn-outline-primary" onclick="editarValor(${valor.id})" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="excluirValor(${valor.id})" title="Excluir">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
        
        // Atualizar container de valores
        valuesContainer.innerHTML = valoresHtml || `
            <tr>
                <td colspan="4" class="text-center py-3 text-muted">
                    Nenhum valor cadastrado para esta campanha.
                </td>
            </tr>
        `;
        
        // Validar totais calculados
        totalEntradas = isNaN(totalEntradas) ? 0 : totalEntradas;
        totalSaidas = isNaN(totalSaidas) ? 0 : totalSaidas;
        
        // Obter valor da campanha
        const valorCampanha = window.currentCampaignValue || 0;
        console.log('=== VALORES PARA CÁLCULO ===');
        console.log('Valor da campanha:', valorCampanha);
        console.log('Total entradas:', totalEntradas);
        console.log('Total saídas:', totalSaidas);
        
        // Calcular lucro: Valor da campanha + entradas - saídas
        const lucro = valorCampanha + totalEntradas - totalSaidas;
        console.log('Lucro calculado:', lucro);
        
        // Atualizar totais
        document.getElementById('totalEntradas').textContent = formatarMoeda(totalEntradas);
        document.getElementById('totalSaidas').textContent = formatarMoeda(totalSaidas);
        document.getElementById('saldoTotal').textContent = formatarMoeda(lucro);
        document.getElementById('saldoTotal').className = lucro >= 0 ? 'text-white fw-bold' : 'text-danger fw-bold';
        
        // Gerar relatório financeiro detalhado
        gerarRelatorioFinanceiro(valores, totalEntradas, totalSaidas, lucro, valorCampanha);
        
    } catch (error) {
        console.error('Erro ao carregar valores:', error);
        valuesContainer.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-3">
                    <div class="alert alert-danger" role="alert">
                        Erro ao carregar valores: ${error.message}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Função para gerar relatório financeiro detalhado
function gerarRelatorioFinanceiro(valores, totalEntradas, totalSaidas, lucro, valorCampanha) {
    try {
        // Validar todos os valores de entrada
        totalEntradas = isNaN(totalEntradas) ? 0 : totalEntradas;
        totalSaidas = isNaN(totalSaidas) ? 0 : totalSaidas;
        lucro = isNaN(lucro) ? 0 : lucro;
        valorCampanha = isNaN(valorCampanha) ? 0 : valorCampanha;
        
        console.log('=== VALORES VALIDADOS PARA RELATÓRIO ===');
        console.log('Total Entradas:', totalEntradas);
        console.log('Total Saídas:', totalSaidas);
        console.log('Lucro:', lucro);
        console.log('Valor Campanha:', valorCampanha);
        
        // Calcular ROI baseado no investimento total (valor da campanha + saídas)
        const investimentoTotal = valorCampanha + totalSaidas;
        const roi = investimentoTotal > 0 ? ((lucro / investimentoTotal) * 100) : 0;
        
        // Atualizar resumo financeiro - verificar se elementos existem
        const reportValorCampanha = document.getElementById('reportValorCampanha');
        const reportTotalEntradas = document.getElementById('reportTotalEntradas');
        const reportTotalSaidas = document.getElementById('reportTotalSaidas');
        const reportLucroLiquido = document.getElementById('reportLucroLiquido');
        const reportROI = document.getElementById('reportROI');
        
        if (reportValorCampanha) reportValorCampanha.textContent = formatarMoeda(valorCampanha);
        if (reportTotalEntradas) reportTotalEntradas.textContent = formatarMoeda(totalEntradas);
        if (reportTotalSaidas) reportTotalSaidas.textContent = formatarMoeda(totalSaidas);
        if (reportLucroLiquido) {
            reportLucroLiquido.textContent = formatarMoeda(lucro);
            reportLucroLiquido.className = lucro >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
        }
        if (reportROI) {
            reportROI.textContent = roi.toFixed(2) + '%';
            reportROI.className = roi >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold';
        }
        
        // Análise de performance
        let statusPerformance = '';
        let corStatus = '';
        if (roi >= 50) {
            statusPerformance = 'Excelente';
            corStatus = 'text-success';
        } else if (roi >= 20) {
            statusPerformance = 'Boa';
            corStatus = 'text-info';
        } else if (roi >= 0) {
            statusPerformance = 'Regular';
            corStatus = 'text-warning';
        } else {
            statusPerformance = 'Ruim';
            corStatus = 'text-danger';
        }
        
        const reportStatusFinanceiro = document.getElementById('reportStatusFinanceiro');
        if (reportStatusFinanceiro) {
            reportStatusFinanceiro.textContent = statusPerformance;
            reportStatusFinanceiro.className = 'badge ' + corStatus;
        }
        
        // Resumo executivo
        let resumoTexto = '';
        if (lucro > 0) {
            resumoTexto = `Esta campanha apresenta resultado positivo com lucro líquido de ${formatarMoeda(lucro)}. `;
            resumoTexto += `Investimento inicial: ${formatarMoeda(valorCampanha)}, Entradas adicionais: ${formatarMoeda(totalEntradas)}, Saídas: ${formatarMoeda(totalSaidas)}. `;
            if (roi >= 30) {
                resumoTexto += 'O ROI está excelente, indicando alta eficiência do investimento.';
            } else if (roi >= 10) {
                resumoTexto += 'O ROI está em nível satisfatório.';
            } else {
                resumoTexto += 'O ROI está baixo, considere otimizar os custos.';
            }
        } else {
            resumoTexto = `Esta campanha apresenta prejuízo de ${formatarMoeda(Math.abs(lucro))}. `;
            resumoTexto += `Investimento inicial: ${formatarMoeda(valorCampanha)}, Entradas: ${formatarMoeda(totalEntradas)}, Saídas: ${formatarMoeda(totalSaidas)}. `;
            resumoTexto += 'É necessário revisar a estratégia e reduzir custos para torná-la lucrativa.';
        }
        
        const reportResumo = document.getElementById('reportResumo');
        if (reportResumo) {
            reportResumo.textContent = resumoTexto;
        } else {
            console.warn('Elemento reportResumo não encontrado');
        }
        
        // Estatísticas adicionais
        const totalTransacoes = valores.length;
        const entradas = valores.filter(v => v.type === 'ENTRADA');
        const saidas = valores.filter(v => v.type === 'SAIDA');
        
        const reportTotalTransacoes = document.getElementById('reportTotalTransacoes');
        const reportNumEntradas = document.getElementById('reportNumEntradas');
        const reportNumSaidas = document.getElementById('reportNumSaidas');
        
        if (reportTotalTransacoes) reportTotalTransacoes.textContent = totalTransacoes;
        if (reportNumEntradas) reportNumEntradas.textContent = entradas.length;
        if (reportNumSaidas) reportNumSaidas.textContent = saidas.length;
        
        // Ticket médio
        const ticketMedioEntrada = entradas.length > 0 ? totalEntradas / entradas.length : 0;
        const ticketMedioSaida = saidas.length > 0 ? totalSaidas / saidas.length : 0;
        
        const reportTicketMedioEntrada = document.getElementById('reportTicketMedioEntrada');
        const reportTicketMedioSaida = document.getElementById('reportTicketMedioSaida');
        
        if (reportTicketMedioEntrada) reportTicketMedioEntrada.textContent = formatarMoeda(ticketMedioEntrada);
        if (reportTicketMedioSaida) reportTicketMedioSaida.textContent = formatarMoeda(ticketMedioSaida);
        
        // Maior entrada e maior saída
        const maiorEntrada = entradas.length > 0 ? Math.max(...entradas.map(v => parseFloat(v.value) || 0)) : 0;
        const maiorSaida = saidas.length > 0 ? Math.max(...saidas.map(v => parseFloat(v.value) || 0)) : 0;
        
        const reportMaiorEntrada = document.getElementById('reportMaiorEntrada');
        const reportMaiorSaida = document.getElementById('reportMaiorSaida');
        
        if (reportMaiorEntrada) reportMaiorEntrada.textContent = formatarMoeda(maiorEntrada);
        if (reportMaiorSaida) reportMaiorSaida.textContent = formatarMoeda(maiorSaida);
        
    } catch (error) {
        console.error('Erro ao gerar relatório financeiro:', error);
    }
}

// Função para exportar relatório
function exportarRelatorio() {
    try {
        const campaignName = document.getElementById('campaignNameInModal').textContent;
        const dataAtual = new Date().toLocaleDateString('pt-BR');
        
        // Obter dados do relatório
        const valorCampanha = document.getElementById('reportValorCampanha').textContent;
        const totalEntradas = document.getElementById('reportTotalEntradas').textContent;
        const totalSaidas = document.getElementById('reportTotalSaidas').textContent;
        const lucroLiquido = document.getElementById('reportLucroLiquido').textContent;
        const roi = document.getElementById('reportROI').textContent;
        const performance = document.getElementById('reportStatusFinanceiro').textContent;
        const resumo = document.getElementById('reportResumo').textContent;
        const totalTransacoes = document.getElementById('reportTotalTransacoes').textContent;
        const numEntradas = document.getElementById('reportNumEntradas').textContent;
        const numSaidas = document.getElementById('reportNumSaidas').textContent;
        const ticketMedioEntrada = document.getElementById('reportTicketMedioEntrada').textContent;
        const ticketMedioSaida = document.getElementById('reportTicketMedioSaida').textContent;
        
        // Criar conteúdo do relatório
        const conteudoRelatorio = `
RELATÓRIO FINANCEIRO - ${campaignName}
Data: ${dataAtual}

=== RESUMO FINANCEIRO ===
Valor da Campanha: ${valorCampanha}
Total de Entradas: ${totalEntradas}
Total de Saídas: ${totalSaidas}
Lucro Líquido: ${lucroLiquido}
ROI: ${roi}
Performance: ${performance}

Fórmula do Lucro: Valor da Campanha + Entradas - Saídas

=== ESTATÍSTICAS ===
Total de Transações: ${totalTransacoes}
Número de Entradas: ${numEntradas}
Número de Saídas: ${numSaidas}
Ticket Médio - Entradas: ${ticketMedioEntrada}
Ticket Médio - Saídas: ${ticketMedioSaida}

=== ANÁLISE EXECUTIVA ===
${resumo}

=== DETALHAMENTO ===
`;
        
        // Adicionar detalhes das transações
        const valuesTable = document.querySelector('#valuesContainer');
        const rows = valuesTable.querySelectorAll('tr');
        let detalhes = '';
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
                const descricao = cells[0].textContent.trim();
                const tipo = cells[1].textContent.trim();
                const valor = cells[2].textContent.trim();
                detalhes += `${descricao} | ${tipo} | ${valor}\n`;
            }
        });
        
        const relatorioCompleto = conteudoRelatorio + detalhes;
        
        // Criar e baixar arquivo
        const blob = new Blob([relatorioCompleto], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${campaignName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        mostrarAlerta('Relatório exportado com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        mostrarAlerta('Erro ao exportar relatório: ' + error.message, 'danger');
    }
}

// Função para limpar formulário de valor
function limparFormularioValor() {
    document.getElementById('valueDescription').value = '';
    document.getElementById('valueAmount').value = '';
    document.getElementById('valueType').value = 'ENTRADA';
    document.getElementById('editValueId').value = '';
    
    // Resetar botões
    document.getElementById('btnSalvarValor').style.display = 'inline-block';
    document.getElementById('btnAtualizarValor').style.display = 'none';
}

// Função para salvar valor
async function salvarValor() {
    try {
        const campaignId = document.getElementById('currentCampaignId').value;
        const description = document.getElementById('valueDescription').value.trim();
        const value = document.getElementById('valueAmount').value;
        const type = document.getElementById('valueType').value;

        // Validações
        if (!description) {
            mostrarAlerta('Descrição é obrigatória', 'danger');
            return;
        }

        if (!value || parseFloat(value) <= 0) {
            mostrarAlerta('Valor deve ser maior que zero', 'danger');
            return;
        }

        const valueData = {
            description,
            value: parseFloat(value),
            type,
            campaignId: parseInt(campaignId)
        };

        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGN_VALUES), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(valueData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao salvar valor');
        }

        // Esconder formulário e limpar
        document.getElementById('addValueForm').style.display = 'none';
        limparFormularioValor();

        // Recarregar valores
        await carregarValoresCampanha(campaignId);
        
        // Recarregar campanhas e estatísticas
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Valor adicionado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao salvar valor:', error);
        mostrarAlerta('Erro ao salvar valor: ' + error.message, 'danger');
    }
}

// Função para editar valor
async function editarValor(valueId) {
    try {
        // Primeiro, obter todos os valores da campanha atual
        const campaignId = document.getElementById('currentCampaignId').value;
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGN_VALUES)}/campaign/${campaignId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar valores da campanha');
        }
        
        const valores = await response.json();
        const valor = valores.find(v => v.id == valueId);
        
        if (!valor) {
            throw new Error('Valor não encontrado');
        }

        // Preencher formulário
        document.getElementById('editValueId').value = valor.id;
        document.getElementById('valueDescription').value = valor.description;
        document.getElementById('valueAmount').value = valor.value;
        document.getElementById('valueType').value = valor.type;

        // Mostrar formulário em modo edição
        document.getElementById('addValueForm').style.display = 'block';
        document.getElementById('btnSalvarValor').style.display = 'none';
        document.getElementById('btnAtualizarValor').style.display = 'inline-block';

        // Adicionar evento ao botão atualizar se não existir
        const btnAtualizar = document.getElementById('btnAtualizarValor');
        if (!btnAtualizar.hasAttribute('data-event-added')) {
            btnAtualizar.addEventListener('click', atualizarValor);
            btnAtualizar.setAttribute('data-event-added', 'true');
        }

    } catch (error) {
        console.error('Erro ao carregar valor:', error);
        mostrarAlerta('Erro ao carregar dados do valor: ' + error.message, 'danger');
    }
}

// Função para atualizar valor
async function atualizarValor() {
    try {
        const id = document.getElementById('editValueId').value;
        const description = document.getElementById('valueDescription').value.trim();
        const value = document.getElementById('valueAmount').value;
        const type = document.getElementById('valueType').value;

        // Validações
        if (!description) {
            mostrarAlerta('Descrição é obrigatória', 'danger');
            return;
        }

        if (!value || parseFloat(value) <= 0) {
            mostrarAlerta('Valor deve ser maior que zero', 'danger');
            return;
        }

        const valueData = {
            description,
            value: parseFloat(value),
            type
        };

        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGN_VALUES)}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(valueData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao atualizar valor');
        }

        // Esconder formulário e limpar
        document.getElementById('addValueForm').style.display = 'none';
        limparFormularioValor();

        // Recarregar valores
        const campaignId = document.getElementById('currentCampaignId').value;
        await carregarValoresCampanha(campaignId);
        
        // Recarregar campanhas e estatísticas
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Valor atualizado com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao atualizar valor:', error);
        mostrarAlerta('Erro ao atualizar valor: ' + error.message, 'danger');
    }
}

// Função para excluir valor
async function excluirValor(valueId) {
    if (!confirm('Tem certeza que deseja excluir este valor?')) {
        return;
    }

    try {
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGN_VALUES)}/${valueId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao excluir valor');
        }

        // Recarregar valores
        const campaignId = document.getElementById('currentCampaignId').value;
        await carregarValoresCampanha(campaignId);
        
        // Recarregar campanhas e estatísticas
        await carregarCampanhas();
        await carregarEstatisticas();

        mostrarAlerta('Valor excluído com sucesso!', 'success');

    } catch (error) {
        console.error('Erro ao excluir valor:', error);
        mostrarAlerta('Erro ao excluir valor: ' + error.message, 'error');
    }
}

// ===== FUNÇÕES DE RENOVAÇÃO =====
function abrirModalRenovarCampanha(id) {
    // Buscar dados da campanha
    fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS + '/' + id), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao buscar dados da campanha');
        }
        return response.json();
    })
    .then(campanha => {
        // Preencher o modal com os dados da campanha
        preencherModalRenovacao(campanha);
        
        // Abrir o modal
        const modal = new bootstrap.Modal(document.getElementById('renewCampaignModal'));
        modal.show();
    })
    .catch(error => {
        console.error('Erro ao carregar campanha:', error);
        alert('Erro ao carregar dados da campanha para renovação.');
    });
}

function preencherModalRenovacao(campanha) {
    // Dados básicos (readonly)
    document.getElementById('renewCampaignId').value = campanha.id;
    document.getElementById('renewCampaignName').value = campanha.name + ' - Renovada';
    document.getElementById('renewCampaignDescription').value = campanha.description || '';
    
    // Cliente - carregar lista e selecionar o cliente atual
    const clientSelect = document.getElementById('renewCampaignClient');
    clientSelect.innerHTML = '<option value="">Carregando...</option>';
    clientSelect.disabled = false; // Permitir seleção do cliente
    
    // Carregar clientes e selecionar o atual
    carregarClientesParaRenovacao(campanha.clientId);
    
    // Datas - calcular nova data de início (1 dia após o fim da campanha atual) e fim (+30 dias da nova data de início)
    const dataFimAtual = new Date(campanha.endDate);
    const novaDataInicio = new Date(dataFimAtual);
    novaDataInicio.setDate(novaDataInicio.getDate() + 1); // 1 dia após o fim da campanha atual
    
    const novaDataFim = new Date(novaDataInicio);
    novaDataFim.setDate(novaDataFim.getDate() + 30); // 30 dias após a nova data de início
    
    document.getElementById('renewCampaignStartDate').value = formatarDataParaInput(novaDataInicio);
    document.getElementById('renewCampaignEndDate').value = formatarDataParaInput(novaDataFim);
    
    // Valores e pagamento (editáveis)
    document.getElementById('renewCampaignValue').value = campanha.value || '';
    document.getElementById('renewCampaignPaymentMethod').value = campanha.paymentMethod || '';
    document.getElementById('renewCampaignPaymentStatus').value = 'ABERTO'; // Sempre aberto para renovação
    
    // Data de vencimento (30 dias a partir da nova data de início)
    const novaDataVencimento = new Date(novaDataInicio);
    novaDataVencimento.setDate(novaDataVencimento.getDate() + 30);
    document.getElementById('renewCampaignDueDate').value = formatarDataParaInputDate(novaDataVencimento);
    
    // Status ativo
    document.getElementById('renewCampaignActive').checked = true;
}

function carregarClientesParaRenovacao(clienteAtualId) {
    fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS), {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token'),
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar clientes');
        }
        return response.json();
    })
    .then(clientes => {
        const select = document.getElementById('renewCampaignClient');
        
        if (select) {
            select.innerHTML = '<option value="">Selecione um cliente</option>';
            
            clientes.forEach(cliente => {
                const option = document.createElement('option');
                option.value = cliente.id;
                option.textContent = cliente.name;
                if (cliente.id == clienteAtualId) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    })
    .catch(error => {
        console.error('Erro ao carregar clientes:', error);
        const select = document.getElementById('renewCampaignClient');
        if (select) {
            select.innerHTML = '<option value="">Erro ao carregar clientes</option>';
        }
    });
}

function formatarDataParaInput(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${ano}-${mes}-${dia}T${horas}:${minutos}`;
}

function formatarDataParaInputDate(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

async function salvarCampanhaRenovada() {
    const originalCampaignId = document.getElementById('renewCampaignId').value;
    const formData = {
        name: document.getElementById('renewCampaignName').value,
        clientId: document.getElementById('renewCampaignClient').value,
        description: document.getElementById('renewCampaignDescription').value,
        startDate: document.getElementById('renewCampaignStartDate').value,
        endDate: document.getElementById('renewCampaignEndDate').value,
        value: parseFloat(document.getElementById('renewCampaignValue').value),
        paymentMethod: document.getElementById('renewCampaignPaymentMethod').value,
        paymentStatus: document.getElementById('renewCampaignPaymentStatus').value,
        dueDate: document.getElementById('renewCampaignDueDate').value,
        active: document.getElementById('renewCampaignActive').checked
    };

    // Validação básica
    if (!formData.name || !formData.clientId || !formData.startDate || !formData.endDate || 
        !formData.value || !formData.paymentMethod || !formData.paymentStatus || !formData.dueDate) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    try {
        // 1. Criar a nova campanha
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            throw new Error('Erro ao criar nova campanha');
        }

        const novaCampanha = await response.json();
        console.log('Nova campanha criada:', novaCampanha);

        // 2. Buscar mídias da campanha original
        const mediasResponse = await fetch(buildApiUrl(`/private/campaigns/${originalCampaignId}/medias`), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });

        if (mediasResponse.ok) {
            const mediasOriginais = await mediasResponse.json();
            console.log('Mídias da campanha original:', mediasOriginais);

            // 3. Associar cada mídia à nova campanha e reativá-las
            for (const media of mediasOriginais) {
                try {
                    // Associar mídia à nova campanha
                    await fetch(buildApiUrl('/private/campaigns/associate-media'), {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('token'),
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            campaignId: novaCampanha.id,
                            mediaId: media.id
                        })
                    });

                    // Reativar a mídia se estiver inativa
                    if (!media.active) {
                        await fetch(buildApiUrl(`/private/midias/${media.id}/reativar`), {
                            method: 'PUT',
                            headers: {
                                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                                'Content-Type': 'application/json'
                            }
                        });
                        console.log(`Mídia ${media.id} reativada`);
                    }
                } catch (error) {
                    console.error(`Erro ao processar mídia ${media.id}:`, error);
                }
            }
        }

        // Fechar modal
        fecharModalRobustamente('renewCampaignModal');
        
        // Recarregar campanhas e estatísticas
        carregarCampanhas();
        carregarEstatisticas();
        
        // Mostrar mensagem de sucesso
        alert('Campanha renovada com sucesso! Todas as mídias associadas foram reativadas.');
    } catch (error) {
        console.error('Erro ao renovar campanha:', error);
        alert('Erro ao renovar campanha. Tente novamente.');
    }
}

// ===== FUNÇÕES DE GERENCIAMENTO DE MÍDIAS =====

function abrirModalGerenciarMidias(campaignId, campaignName) {
    document.getElementById('currentCampaignIdForMedia').value = campaignId;
    document.getElementById('campaignNameInMediaModal').textContent = campaignName;
    
    // Carregar mídias disponíveis e associadas
    carregarMidiasDisponiveis();
    carregarMidiasAssociadas(campaignId);
    
    const modal = new bootstrap.Modal(document.getElementById('manageMediasModal'));
    modal.show();
}

async function carregarMidiasDisponiveis() {
    try {
        const response = await fetch(buildApiUrl('/private/medias'), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar mídias');
        }
        
        const medias = await response.json();
        const container = document.getElementById('availableMediasList');
        
        if (medias.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted text-center">Nenhuma mídia disponível.</p></div>';
            return;
        }
        
        const mediasHtml = medias.map(media => {
            const mediaTypeIcon = getMediaTypeIcon(media.type);
            const mediaTypeText = getMediaTypeText(media.type);
            const backgroundStyle = getMediaBackgroundStyle(media);
            
            return `
                <div class="col-md-6 mb-3">
                    <div class="card h-100 media-preview-card" style="${backgroundStyle}">
                        <div class="card-overlay">
                            <div class="card-body">
                                <div class="d-flex align-items-center mb-2">
                                    <i class="${mediaTypeIcon} me-2 text-white"></i>
                                    <h6 class="card-title mb-0 text-white">${media.title || 'Sem título'}</h6>
                                </div>
                                <p class="card-text small text-white-50">
                                    <strong>Tipo:</strong> ${mediaTypeText}<br>
                                    <strong>URL:</strong> ${media.url.length > 50 ? media.url.substring(0, 50) + '...' : media.url}
                                    ${media.duration ? `<br><strong>Duração:</strong> ${media.duration}s` : ''}
                                </p>
                                <button class="btn btn-sm btn-primary" onclick="associarMidiaACampanha(${media.id})">
                                    <i class="bi bi-plus-circle me-1"></i>Associar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = mediasHtml;
        
    } catch (error) {
        console.error('Erro ao carregar mídias:', error);
        document.getElementById('availableMediasList').innerHTML = 
            '<div class="col-12"><p class="text-danger text-center">Erro ao carregar mídias.</p></div>';
    }
}

async function carregarMidiasAssociadas(campaignId) {
    try {
        const response = await fetch(buildApiUrl(`/private/campaigns/${campaignId}/medias`), {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar mídias associadas');
        }
        
        const medias = await response.json();
        const container = document.getElementById('associatedMediasList');
        
        if (medias.length === 0) {
            container.innerHTML = '<div class="col-12"><p class="text-muted text-center">Nenhuma mídia associada a esta campanha.</p></div>';
            return;
        }
        
        const mediasHtml = medias.map(media => {
            const mediaTypeIcon = getMediaTypeIcon(media.type);
            const mediaTypeText = getMediaTypeText(media.type);
            const backgroundStyle = getMediaBackgroundStyle(media);
            const statusBadge = media.active ? 
                '<span class="badge bg-success">Ativa</span>' : 
                '<span class="badge bg-danger">Inativa</span>';
            
            return `
                <div class="col-md-6 mb-3">
                    <div class="card h-100 media-preview-card" style="${backgroundStyle}">
                        <div class="card-overlay">
                            <div class="card-body">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <div class="d-flex align-items-center">
                                        <i class="${mediaTypeIcon} me-2 text-white"></i>
                                        <h6 class="card-title mb-0 text-white">${media.title || 'Sem título'}</h6>
                                    </div>
                                    ${statusBadge}
                                </div>
                                <p class="card-text small text-white-50">
                                    <strong>Tipo:</strong> ${mediaTypeText}<br>
                                    <strong>URL:</strong> ${media.url.length > 50 ? media.url.substring(0, 50) + '...' : media.url}
                                    ${media.duration ? `<br><strong>Duração:</strong> ${media.duration}s` : ''}
                                </p>
                                <button class="btn btn-sm btn-outline-light" onclick="desassociarMidiaDaCampanha(${media.id})" title="Remover associação">
                                    <i class="bi bi-x-circle me-1"></i>Remover
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = mediasHtml;
        
    } catch (error) {
        console.error('Erro ao carregar mídias associadas:', error);
        document.getElementById('associatedMediasList').innerHTML = 
            '<div class="col-12"><p class="text-danger text-center">Erro ao carregar mídias associadas.</p></div>';
    }
}

async function associarMidiaACampanha(mediaId) {
    const campaignId = document.getElementById('currentCampaignIdForMedia').value;
    
    try {
        const response = await fetch(buildApiUrl('/private/campaigns/associate-media'), {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaignId: parseInt(campaignId),
                mediaId: parseInt(mediaId)
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao associar mídia');
        }
        
        // Recarregar listas
        carregarMidiasAssociadas(campaignId);
        mostrarAlerta('Mídia associada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao associar mídia:', error);
        alert('Erro ao associar mídia: ' + error.message);
    }
}

async function desassociarMidiaDaCampanha(mediaId) {
    const campaignId = document.getElementById('currentCampaignIdForMedia').value;
    
    if (!confirm('Tem certeza que deseja remover esta mídia da campanha?')) {
        return;
    }
    
    try {
        const response = await fetch(buildApiUrl('/private/campaigns/disassociate-media'), {
            method: 'DELETE',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaignId: parseInt(campaignId),
                mediaId: parseInt(mediaId)
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Erro ao desassociar mídia');
        }
        
        // Recarregar listas
        carregarMidiasAssociadas(campaignId);
        mostrarAlerta('Mídia removida da campanha com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao desassociar mídia:', error);
        alert('Erro ao remover mídia: ' + error.message);
    }
}

function getMediaTypeIcon(type) {
    switch (type) {
        case 'PHOTO': return 'bi bi-image';
        case 'VIDEO': return 'bi bi-play-circle';
        case 'RSS': return 'bi bi-rss';
        case 'WEATHER': return 'bi bi-cloud-sun';
        case 'CUSTOM_SCREEN': return 'bi bi-display';
        default: return 'bi bi-file';
    }
}

function getMediaTypeText(type) {
    switch (type) {
        case 'PHOTO': return 'Imagem';
        case 'VIDEO': return 'Vídeo';
        case 'RSS': return 'RSS';
        case 'WEATHER': return 'Clima';
        case 'CUSTOM_SCREEN': return 'Tela Customizada';
        default: return 'Desconhecido';
    }
}

function getMediaBackgroundStyle(media) {
    const baseStyle = 'position: relative; overflow: hidden; min-height: 200px;';
    
    switch (media.type) {
        case 'PHOTO':
            return `${baseStyle} background-image: url('${media.url}'); background-size: cover; background-position: center; background-repeat: no-repeat;`;
        case 'VIDEO':
            // Para vídeos, usar uma cor de fundo com gradiente
            return `${baseStyle} background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);`;
        case 'RSS':
            return `${baseStyle} background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);`;
        case 'WEATHER':
            return `${baseStyle} background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);`;
        case 'CLOCK':
            return `${baseStyle} background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);`;
        case 'CUSTOM_SCREEN':
            return `${baseStyle} background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);`;
        default:
            return `${baseStyle} background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);`;
    }
}

// Função para verificar campanhas expiradas manualmente
async function verificarCampanhasExpiradas() {
    const btn = document.getElementById('checkExpiredCampaignsBtn');
    const originalText = btn.innerHTML;
    
    try {
        // Mostrar loading no botão
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Verificando...';
        
        const response = await fetch('/private/campaigns/check-expired', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            mostrarAlerta(result.message, 'success');
            
            // Recarregar as campanhas para refletir as mudanças
            await carregarCampanhas();
            
            // Se estiver no modal de mídias, recarregar as mídias também
            const currentCampaignId = document.getElementById('currentCampaignIdForMedia')?.value;
            if (currentCampaignId) {
                await carregarMidiasDetalhes(currentCampaignId);
            }
        } else {
            mostrarAlerta(result.message || 'Erro ao verificar campanhas expiradas', 'danger');
        }
    } catch (error) {
        console.error('Erro ao verificar campanhas expiradas:', error);
        mostrarAlerta('Erro ao verificar campanhas expiradas', 'danger');
    } finally {
        // Restaurar botão
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// Função para mostrar/ocultar campos de campanha recorrente
function toggleRecurringFields() {
    const isRecurring = document.getElementById('campaignRecurring').checked;
    const recurringFields = document.getElementById('recurringFields');
    const campaignValueField = document.getElementById('campaignValue');
    const campaignValueLabel = document.querySelector('label[for="campaignValue"]');
    const campaignDueDateField = document.getElementById('campaignDueDate');
    const campaignDueDateLabel = document.querySelector('label[for="campaignDueDate"]');
    const campaignPaymentStatusField = document.getElementById('campaignPaymentStatus');
    const campaignPaymentStatusLabel = document.querySelector('label[for="campaignPaymentStatus"]');
    
    if (isRecurring) {
        recurringFields.classList.remove('d-none');
        
        // Desabilitar campos que serão controlados pela recorrência
        campaignValueField.disabled = true;
        campaignValueField.value = '';
        campaignValueLabel.innerHTML = 'Valor Total <small class="text-muted">(será calculado automaticamente)</small>';
        
        campaignDueDateField.disabled = true;
        campaignDueDateField.value = '';
        campaignDueDateField.removeAttribute('required');
        campaignDueDateLabel.innerHTML = 'Data de Vencimento <small class="text-muted">(controlado pela recorrência)</small>';
        
        campaignPaymentStatusField.disabled = true;
        campaignPaymentStatusField.value = 'ABERTO';
        campaignPaymentStatusLabel.innerHTML = 'Status do Pagamento <small class="text-muted">(controlado pela recorrência)</small>';
    } else {
        recurringFields.classList.add('d-none');
        
        // Reabilitar campos normais
        campaignValueField.disabled = false;
        campaignValueLabel.innerHTML = 'Valor da Campanha <span class="text-danger">*</span>';
        
        campaignDueDateField.disabled = false;
        campaignDueDateField.setAttribute('required', 'required');
        campaignDueDateLabel.innerHTML = 'Data de Vencimento <span class="text-danger">*</span>';
        
        campaignPaymentStatusField.disabled = false;
        campaignPaymentStatusLabel.innerHTML = 'Status do Pagamento <span class="text-danger">*</span>';
        
        // Limpar campos de campanha recorrente
        document.getElementById('monthlyValue').value = '';
        document.getElementById('billingDay').value = '1';
        document.getElementById('autoGenerate').checked = true;
    }
}

// ===== FUNÇÕES DO MODAL DE DETALHES =====

// Função para abrir modal de detalhes da campanha
async function abrirModalDetalhesCampanha(campaignId) {
    try {
        // Buscar dados da campanha
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar dados da campanha');
        }
        
        const campanha = await response.json();
        const cliente = clients.find(c => c.id === campanha.clientId);
        const status = obterStatusCampanha(campanha);
        
        // Preencher dados gerais
        document.getElementById('currentCampaignDetailsId').value = campaignId;
        document.getElementById('detailCampaignName').textContent = campanha.name;
        document.getElementById('detailCampaignClient').textContent = cliente ? cliente.name : 'Cliente não encontrado';
        document.getElementById('detailCampaignDescription').textContent = campanha.description || 'Sem descrição';
        document.getElementById('detailCampaignStatus').innerHTML = `<span class="campaign-status ${status.class}">${status.text}</span>`;
        document.getElementById('detailCampaignType').textContent = campanha.isRecurring ? 'Campanha Recorrente' : 'Campanha Única';
        document.getElementById('detailCampaignStartDate').textContent = formatarData(campanha.startDate);
        document.getElementById('detailCampaignEndDate').textContent = formatarData(campanha.endDate);
        document.getElementById('detailCampaignValue').textContent = formatarMoeda(campanha.value || 0);
        document.getElementById('detailCampaignPaymentMethod').textContent = campanha.paymentMethod || 'N/A';
        document.getElementById('detailCampaignPaymentStatus').innerHTML = `<span class="badge ${getPaymentStatusClass(campanha.paymentStatus)}">${getPaymentStatusText(campanha.paymentStatus)}</span>`;
        
        // Mostrar/ocultar aba financeira para campanhas recorrentes
        const financialTabItem = document.getElementById('financial-tab-item');
        if (campanha.isRecurring) {
            financialTabItem.style.display = 'block';
            await carregarParcelasMensais(campaignId);
        } else {
            financialTabItem.style.display = 'none';
        }
        
        // Carregar mídias associadas
        await carregarMidiasDetalhes(campaignId);
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('campaignDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Erro ao abrir modal de detalhes:', error);
        mostrarAlerta('Erro ao carregar detalhes da campanha: ' + error.message, 'danger');
    }
}

// Função para carregar parcelas mensais
async function carregarParcelasMensais(campaignId) {
    try {
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}/monthly-payments`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar parcelas mensais');
        }
        
        const data = await response.json();
        const parcelas = data.monthlyPayments || [];
        
        // Calcular estatísticas
        const totalParcelas = parcelas.length;
        const parcelasPagas = parcelas.filter(p => p.status === 'PAID').length;
        const parcelasPendentes = parcelas.filter(p => p.status === 'PENDING').length;
        const parcelasVencidas = parcelas.filter(p => {
            const hoje = new Date();
            const vencimento = new Date(p.dueDate);
            return p.status === 'PENDING' && vencimento < hoje;
        }).length;
        
        // Atualizar resumo financeiro
        document.getElementById('totalPayments').textContent = totalParcelas;
        document.getElementById('paidPayments').textContent = parcelasPagas;
        document.getElementById('pendingPayments').textContent = parcelasPendentes;
        document.getElementById('overduePayments').textContent = parcelasVencidas;
        
        // Renderizar lista de parcelas
        const tbody = document.getElementById('monthlyPaymentsList');
        
        if (parcelas.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="text-muted">
                            <i class="bi bi-calendar-x fs-1"></i>
                            <p class="mt-2">Nenhuma parcela encontrada.</p>
                            <button class="btn btn-sm btn-primary" onclick="gerarParcelas()">
                                <i class="bi bi-plus-circle me-1"></i>Gerar Parcelas
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('generatePaymentsBtn').style.display = 'block';
            return;
        }
        
        const parcelasHtml = parcelas.map(parcela => {
            const vencimento = new Date(parcela.dueDate);
            const hoje = new Date();
            const isVencida = parcela.status === 'PENDING' && vencimento < hoje;
            
            let statusBadge = '';
            let acoesBtns = '';
            
            switch (parcela.status) {
                case 'PAID':
                    statusBadge = '<span class="badge bg-success">Pago</span>';
                    acoesBtns = `
                        <button class="btn btn-sm btn-outline-danger" onclick="abrirModalEstorno(${parcela.id})" title="Estornar">
                            <i class="bi bi-arrow-counterclockwise"></i>
                        </button>
                    `;
                    break;
                case 'PENDING':
                    if (isVencida) {
                        statusBadge = '<span class="badge bg-danger">Vencida</span>';
                    } else {
                        statusBadge = '<span class="badge bg-warning">Pendente</span>';
                    }
                    acoesBtns = `
                        <button class="btn btn-sm btn-outline-success" onclick="abrirModalPagamento(${parcela.id})" title="Registrar Pagamento">
                            <i class="bi bi-cash-coin"></i>
                        </button>
                    `;
                    break;
                case 'REVERSED':
                    statusBadge = '<span class="badge bg-secondary">Estornado</span>';
                    break;
            }
            
            const metodoPagamento = parcela.paymentMethod ? `<small class="text-muted">${parcela.paymentMethod}</small>` : '-';
            
            return `
                <tr>
                    <td>${parcela.referenceMonth}/${parcela.referenceYear}</td>
                    <td><strong>${formatarMoeda(parcela.value)}</strong></td>
                    <td>${formatarData(parcela.dueDate)}</td>
                    <td>${statusBadge}</td>
                    <td>${metodoPagamento}</td>
                    <td>${acoesBtns}</td>
                </tr>
            `;
        }).join('');
        
        tbody.innerHTML = parcelasHtml;
        document.getElementById('generatePaymentsBtn').style.display = 'none';
        
    } catch (error) {
        console.error('Erro ao carregar parcelas mensais:', error);
        document.getElementById('monthlyPaymentsList').innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="alert alert-danger" role="alert">
                        Erro ao carregar parcelas: ${error.message}
                    </div>
                </td>
            </tr>
        `;
    }
}

// Função para carregar mídias na aba de detalhes
async function carregarMidiasDetalhes(campaignId) {
    try {
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}/medias`, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar mídias');
        }
        
        const midias = await response.json();
        const container = document.getElementById('detailCampaignMedias');
        
        if (midias.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-collection-play" style="font-size: 3rem; color: #6c757d;"></i>
                    <p class="mt-2 text-muted">Nenhuma mídia associada a esta campanha.</p>
                </div>
            `;
            return;
        }
        
        const midiasHtml = midias.map(media => `
            <div class="card mb-2">
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${media.name}</h6>
                            <small class="text-muted">${media.type} • ${media.duration || 'N/A'}</small>
                        </div>
                        <span class="badge ${media.active ? 'bg-success' : 'bg-secondary'}">
                            ${media.active ? 'Ativa' : 'Inativa'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = midiasHtml;
        
    } catch (error) {
        console.error('Erro ao carregar mídias:', error);
        document.getElementById('detailCampaignMedias').innerHTML = `
            <div class="alert alert-danger" role="alert">
                Erro ao carregar mídias: ${error.message}
            </div>
        `;
    }
}

// Função para gerar parcelas mensais
async function gerarParcelas() {
    try {
        const campaignId = document.getElementById('currentCampaignDetailsId').value;
        
        const response = await fetch(`/public/monthly-payments/${campaignId}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao gerar parcelas');
        }
        
        mostrarAlerta('Parcelas geradas com sucesso!', 'success');
        await carregarParcelasMensais(campaignId);
        
    } catch (error) {
        console.error('Erro ao gerar parcelas:', error);
        mostrarAlerta('Erro ao gerar parcelas: ' + error.message, 'danger');
    }
}

// Função para abrir modal de pagamento
function abrirModalPagamento(paymentId) {
    document.getElementById('paymentId').value = paymentId;
    document.getElementById('paidDate').value = new Date().toISOString().split('T')[0];
    
    const modal = new bootstrap.Modal(document.getElementById('paymentModal'));
    modal.show();
}

// Função para registrar pagamento
async function registrarPagamento() {
    try {
        const paymentId = document.getElementById('paymentId').value;
        const paymentMethod = document.getElementById('paymentMethodSelect').value;
        const paidDate = document.getElementById('paidDate').value;
        const notes = document.getElementById('paymentNotes').value;
        
        if (!paymentMethod || !paidDate) {
            mostrarAlerta('Por favor, preencha todos os campos obrigatórios.', 'warning');
            return;
        }
        
        const response = await fetch(`/public/monthly-payments/${paymentId}/pay`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                paymentMethod,
                paidDate,
                notes
            })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao registrar pagamento');
        }
        
        mostrarAlerta('Pagamento registrado com sucesso!', 'success');
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal'));
        modal.hide();
        
        // Recarregar parcelas
        const campaignId = document.getElementById('currentCampaignDetailsId').value;
        await carregarParcelasMensais(campaignId);
        
        // Limpar formulário
        document.getElementById('paymentMethodSelect').value = '';
        document.getElementById('paymentNotes').value = '';
        
    } catch (error) {
        console.error('Erro ao registrar pagamento:', error);
        mostrarAlerta('Erro ao registrar pagamento: ' + error.message, 'danger');
    }
}

// Função para abrir modal de estorno
function abrirModalEstorno(paymentId) {
    document.getElementById('reversePaymentId').value = paymentId;
    
    const modal = new bootstrap.Modal(document.getElementById('reverseModal'));
    modal.show();
}

// Função para estornar pagamento
async function estornarPagamento() {
    try {
        const paymentId = document.getElementById('reversePaymentId').value;
        const reason = document.getElementById('reverseReason').value;
        
        if (!reason.trim()) {
            mostrarAlerta('Por favor, informe o motivo do estorno.', 'warning');
            return;
        }
        
        const response = await fetch(`/public/monthly-payments/${paymentId}/reverse`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) {
            throw new Error('Erro ao estornar pagamento');
        }
        
        mostrarAlerta('Pagamento estornado com sucesso!', 'success');
        
        // Fechar modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('reverseModal'));
        modal.hide();
        
        // Recarregar parcelas
        const campaignId = document.getElementById('currentCampaignDetailsId').value;
        await carregarParcelasMensais(campaignId);
        
        // Limpar formulário
        document.getElementById('reverseReason').value = '';
        
    } catch (error) {
        console.error('Erro ao estornar pagamento:', error);
        mostrarAlerta('Erro ao estornar pagamento: ' + error.message, 'danger');
    }
}

// Event listeners para garantir limpeza dos alertas dos modais
const addCampaignModal = document.getElementById('addCampaignModal');
if (addCampaignModal) {
    addCampaignModal.addEventListener('hidden.bs.modal', function() {
        const alertContainer = document.getElementById('addCampaignModalAlertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    });
}

const editCampaignModal = document.getElementById('editCampaignModal');
if (editCampaignModal) {
    editCampaignModal.addEventListener('hidden.bs.modal', function() {
        const alertContainer = document.getElementById('editCampaignModalAlertContainer');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    });
}

// Funções auxiliares para status de pagamento
function getPaymentStatusClass(status) {
    switch(status) {
        case 'PAGO': return 'bg-success';
        case 'VENCIDO': return 'bg-danger';
        case 'ABERTO': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function getPaymentStatusText(status) {
    switch(status) {
        case 'PAGO': return 'Pago';
        case 'VENCIDO': return 'Vencido';
        case 'ABERTO': return 'Aberto';
        default: return 'N/A';
    }
}

// Adicionar event listener para o botão de verificação manual
document.addEventListener('DOMContentLoaded', function() {
    const checkExpiredBtn = document.getElementById('checkExpiredCampaignsBtn');
    if (checkExpiredBtn) {
        checkExpiredBtn.addEventListener('click', verificarCampanhasExpiradas);
    }
});