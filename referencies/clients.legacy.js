// ===== VARIÁVEIS GLOBAIS =====
const token = localStorage.getItem('token');
const userName = localStorage.getItem('usuarioName');
let clientesContainer;
let alertContainer;

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
    clientesContainer = document.getElementById('clientesContainer');
    alertContainer = document.getElementById('alertContainer');
    
    console.log('Elementos DOM inicializados:', {
        clientesContainer: !!clientesContainer,
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
    
    // A inicialização da sidebar agora é feita pelo modern-dashboard.js

    // Carregar dados
    carregarClientes();
    carregarEstatisticas();

    // Configurar eventos dos botões
    configurarEventosBotoes();
});

// ===== FUNÇÕES DE INICIALIZAÇÃO =====

// Função para inicializar o tema escuro
function initDarkMode() {
    const themeToggle = document.getElementById('themeToggle');
    
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

// ===== FUNÇÕES DE CARREGAMENTO DE DADOS =====

// Função para carregar estatísticas
async function carregarEstatisticas() {
    try {
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS), {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar clientes');
        }

        const clientes = await response.json();
        
        // Total de clientes
        document.getElementById('totalClientes').textContent = clientes.length || 0;
        
        // Clientes ativos (campo active = true)
        const clientesAtivos = clientes.filter(cliente => cliente.active === true);
        document.getElementById('clientesAtivos').textContent = clientesAtivos.length || 0;
        
        // Novos clientes (cadastrados nos últimos 3 dias)
        const tresDiasAtras = new Date();
        tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
        
        const novosClientes = clientes.filter(cliente => {
            const dataCadastro = new Date(cliente.createdAt);
            return dataCadastro >= tresDiasAtras;
        });
        document.getElementById('novosClientes').textContent = novosClientes.length || 0;
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Definir valores padrão em caso de erro
        document.getElementById('totalClientes').textContent = '0';
        document.getElementById('clientesAtivos').textContent = '0';
        document.getElementById('novosClientes').textContent = '0';
    }
}

// Função para carregar clientes
async function carregarClientes() {
    try {
        console.log('Iniciando carregamento de clientes...');
        // Exibir loading
        clientesContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-2 text-muted">Carregando clientes...</p>
                </td>
            </tr>
        `;

        // Fazer requisição para a API
        console.log('Fazendo requisição para:', buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS));
        
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
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
            throw new Error(`Erro ao carregar clientes: ${response.status} - ${errorText}`);
        }

        const clientes = await response.json();
        console.log('Dados recebidos da API:', clientes);
        console.log('Tipo dos dados:', typeof clientes, 'É array:', Array.isArray(clientes));

        // Verificar se há clientes
        if (!Array.isArray(clientes) || clientes.length === 0) {
            clientesContainer.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <p class="text-muted">Nenhum cliente encontrado.</p>
                    </td>
                </tr>
            `;
            return;
        }

        // Renderizar clientes
        clientesContainer.innerHTML = clientes.map(cliente => `
            <tr>
                <td>${cliente.name}</td>
                <td>${cliente.cpfCNPJ}</td>
                <td>${cliente.email}</td>
                <td>${cliente.adress}</td>
                <td>${cliente.phone}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirModalEdicao(${cliente.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="abrirModalExclusao(${cliente.id}, '${cliente.name}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Atualizar estatísticas
        document.getElementById('totalClientes').textContent = clientes.length;

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
        clientesContainer.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
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

// ===== FUNÇÕES DE MANIPULAÇÃO DE CLIENTES =====

// Função para configurar eventos dos botões
function configurarEventosBotoes() {
    // Botão de salvar cliente
    document.getElementById('saveClientBtn').addEventListener('click', salvarCliente);
    
    // Botão de atualizar cliente
    document.getElementById('updateClientBtn').addEventListener('click', atualizarCliente);
    
    // Botão de confirmar exclusão
    document.getElementById('confirmDeleteBtn').addEventListener('click', excluirCliente);
}

// Função para salvar um novo cliente
async function salvarCliente() {
    try {
        // Obter dados do formulário
        const name = document.getElementById('clientName').value;
        const cpfCNPJ = document.getElementById('clientCpfCnpj').value;
        const email = document.getElementById('clientEmail').value;
        const adress = document.getElementById('clientAddress').value;
        const phone = document.getElementById('clientPhone').value;
        const password = document.getElementById('clientPassword').value;

        // Validar campos obrigatórios
        if (!name || !cpfCNPJ || !email || !adress || !phone || !password) {
            mostrarAlerta('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        // Criar objeto com dados do cliente
        const clienteData = {
            name,
            cpfCNPJ,
            email,
            adress, // Nota: o campo no banco está como 'adress' (com um 'd')
            phone,
            password
        };

        console.log('Enviando dados do cliente:', clienteData);

        // Enviar requisição para a API
        const response = await fetch(buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            },
            body: JSON.stringify(clienteData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao cadastrar cliente');
        }

        const result = await response.json();

        // Fechar modal de forma robusta
        const modalElement = document.getElementById('addClientModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.hide();
        
        // Remover backdrop manualmente se ainda estiver presente
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        mostrarAlerta(result.message || 'Cliente cadastrado com sucesso!', 'success');

        // Limpar formulário
        document.getElementById('addClientForm').reset();

        // Recarregar lista de clientes
        carregarClientes();

    } catch (error) {
        console.error('Erro ao cadastrar cliente:', error);
        mostrarAlerta('Erro ao cadastrar cliente: ' + error.message, 'danger');
    }
}

// Função para abrir o modal de edição
async function abrirModalEdicao(id) {
    try {
        console.log('Abrindo modal de edição para cliente ID:', id);
        
        // Fazer requisição para obter dados do cliente
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            }
        });

        console.log('Resposta da API (obter cliente):', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Erro ao obter dados do cliente: ${response.status}`);
        }

        const cliente = await response.json();
        console.log('Dados do cliente recebidos:', cliente);

        // Preencher formulário com dados do cliente
        document.getElementById('editClientId').value = cliente.id;
        document.getElementById('editClientName').value = cliente.name;
        document.getElementById('editClientCpfCnpj').value = cliente.cpfCNPJ;
        document.getElementById('editClientEmail').value = cliente.email;
        document.getElementById('editClientAddress').value = cliente.adress;
        document.getElementById('editClientPhone').value = cliente.phone;
        document.getElementById('editClientPassword').value = ''; // Não preencher senha por segurança

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editClientModal'));
        modal.show();

    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        mostrarAlerta('Erro ao carregar dados do cliente: ' + error.message, 'danger');
    }
}

// Função para atualizar um cliente
async function atualizarCliente() {
    try {
        // Obter dados do formulário
        const id = document.getElementById('editClientId').value;
        const name = document.getElementById('editClientName').value;
        const cpfCNPJ = document.getElementById('editClientCpfCnpj').value;
        const email = document.getElementById('editClientEmail').value;
        const adress = document.getElementById('editClientAddress').value;
        const phone = document.getElementById('editClientPhone').value;
        const password = document.getElementById('editClientPassword').value;

        // Validar campos obrigatórios
        if (!name || !cpfCNPJ || !email || !adress || !phone) {
            mostrarAlerta('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        // Criar objeto com dados do cliente
        const clienteData = {
            name,
            cpfCNPJ,
            email,
            adress, // Nota: o campo no banco está como 'adress' (com um 'd')
            phone
        };

        // Adicionar senha apenas se foi preenchida
        if (password) {
            clienteData.password = password;
        }
        
        console.log('Atualizando cliente:', id, clienteData);

        // Enviar requisição para a API
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            },
            body: JSON.stringify(clienteData)
        });
        
        console.log('Resposta da atualização:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar cliente');
        }

        const result = await response.json();

        // Fechar modal de forma robusta
        const modalElement = document.getElementById('editClientModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.hide();
        
        // Remover backdrop manualmente se ainda estiver presente
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        mostrarAlerta(result.message || 'Cliente atualizado com sucesso!', 'success');

        // Recarregar lista de clientes
        carregarClientes();

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        mostrarAlerta('Erro ao atualizar cliente: ' + error.message, 'danger');
    }
}

// Função para abrir o modal de exclusão
function abrirModalExclusao(id, nome) {
    // Preencher dados no modal
    document.getElementById('deleteClientId').value = id;
    document.getElementById('deleteClientName').textContent = nome;

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('deleteClientModal'));
    modal.show();
}

// Função para excluir um cliente
async function excluirCliente() {
    try {
        // Obter ID do cliente
        const id = document.getElementById('deleteClientId').value;
        
        console.log('Excluindo cliente com ID:', id);

        // Enviar requisição para a API
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            }
        });
        
        console.log('Resposta da exclusão:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir cliente');
        }

        const result = await response.json();

        // Fechar modal de forma robusta
        const modalElement = document.getElementById('deleteClientModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.hide();
        
        // Remover backdrop manualmente se ainda estiver presente
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        mostrarAlerta(result.message || 'Cliente excluído com sucesso!', 'success');

        // Recarregar lista de clientes
        carregarClientes();

    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        mostrarAlerta('Erro ao excluir cliente: ' + error.message, 'danger');
    }
}

// ===== FUNÇÕES PARA GERENCIAR CAMPANHAS DO CLIENTE =====

// Função para carregar campanhas do cliente
async function carregarCampanhasCliente(clientId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/client/${clientId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const campaigns = await response.json();
      exibirCampanhasCliente(campaigns);
    } else {
      console.error('Erro ao carregar campanhas:', response.statusText);
      document.getElementById('campaignsList').innerHTML = `
        <div class="alert alert-warning" role="alert">
          <i class="bi bi-exclamation-triangle me-2"></i>Erro ao carregar campanhas do cliente.
        </div>
      `;
    }
  } catch (error) {
    console.error('Erro ao carregar campanhas:', error);
    document.getElementById('campaignsList').innerHTML = `
      <div class="alert alert-danger" role="alert">
        <i class="bi bi-x-circle me-2"></i>Erro de conexão ao carregar campanhas.
      </div>
    `;
  }
}

// Função para exibir campanhas do cliente
function exibirCampanhasCliente(campaigns) {
  const campaignsList = document.getElementById('campaignsList');
  
  if (campaigns.length === 0) {
    campaignsList.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-megaphone" style="font-size: 3rem; color: #6c757d;"></i>
        <p class="mt-2 text-muted">Nenhuma campanha encontrada para este cliente.</p>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';
  campaigns.forEach(campaign => {
    const startDate = new Date(campaign.startDate).toLocaleDateString('pt-BR');
    const endDate = new Date(campaign.endDate).toLocaleDateString('pt-BR');
    const statusBadge = campaign.active ? 
      '<span class="badge bg-success">Ativa</span>' : 
      '<span class="badge bg-secondary">Inativa</span>';
    
    html += `
      <div class="col-md-6 mb-3">
        <div class="card h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="card-title mb-0">${campaign.name}</h6>
              ${statusBadge}
            </div>
            <p class="card-text text-muted small">${campaign.description || 'Sem descrição'}</p>
            <div class="small text-muted mb-2">
              <i class="bi bi-calendar-range me-1"></i>
              ${startDate} - ${endDate}
            </div>
            <div class="btn-group btn-group-sm" role="group">
              <button type="button" class="btn btn-outline-primary" onclick="editarCampanhaCliente(${campaign.id})" title="Editar">
                <i class="bi bi-pencil"></i>
              </button>
              <button type="button" class="btn btn-outline-danger" onclick="excluirCampanhaCliente(${campaign.id}, '${campaign.name}')" title="Excluir">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  
  campaignsList.innerHTML = html;
}

// Função para abrir modal de nova campanha
function abrirModalNovaCampanha() {
  const clientId = document.getElementById('editClientId').value;
  document.getElementById('newCampaignClientId').value = clientId;
  
  // Limpar formulário
  document.getElementById('newCampaignForm').reset();
  document.getElementById('newCampaignActive').checked = true;
  
  const modal = new bootstrap.Modal(document.getElementById('newCampaignModal'));
  modal.show();
}

// Função para criar nova campanha
async function criarCampanha() {
  const clientId = document.getElementById('newCampaignClientId').value;
  const name = document.getElementById('newCampaignName').value;
  const description = document.getElementById('newCampaignDescription').value;
  const startDate = document.getElementById('newCampaignStartDate').value;
  const endDate = document.getElementById('newCampaignEndDate').value;
  const active = document.getElementById('newCampaignActive').checked;

  if (!name || !startDate || !endDate) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${APP_CONFIG.API_BASE_URL}/public/campaign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        startDate,
        endDate,
        active,
        clientId: parseInt(clientId)
      })
    });

    if (response.ok) {
      const result = await response.json();
      alert('Campanha criada com sucesso!');
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('newCampaignModal'));
      modal.hide();
      
      // Remover backdrop manualmente se ainda estiver presente
      setTimeout(() => {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        // Remover classes do body que podem ter ficado
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 300);
      
      // Recarregar campanhas
      carregarCampanhasCliente(clientId);
    } else {
      const error = await response.json();
      alert('Erro ao criar campanha: ' + (error.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    alert('Erro de conexão ao criar campanha.');
  }
}

// Função para editar campanha
async function editarCampanhaCliente(campaignId) {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const campaign = await response.json();
      
      // Preencher formulário
      document.getElementById('editCampaignClientId').value = campaign.id;
      document.getElementById('editCampaignClientName').value = campaign.name;
      document.getElementById('editCampaignClientDescription').value = campaign.description || '';
      document.getElementById('editCampaignClientStartDate').value = campaign.startDate.split('T')[0];
      document.getElementById('editCampaignClientEndDate').value = campaign.endDate.split('T')[0];
      document.getElementById('editCampaignClientActive').checked = campaign.active;
      
      const modal = new bootstrap.Modal(document.getElementById('editCampaignClientModal'));
      modal.show();
    } else {
      alert('Erro ao carregar dados da campanha.');
    }
  } catch (error) {
    console.error('Erro ao carregar campanha:', error);
    alert('Erro de conexão ao carregar campanha.');
  }
}

// Função para atualizar campanha
async function atualizarCampanhaCliente() {
  const campaignId = document.getElementById('editCampaignClientId').value;
  const name = document.getElementById('editCampaignClientName').value;
  const description = document.getElementById('editCampaignClientDescription').value;
  const startDate = document.getElementById('editCampaignClientStartDate').value;
  const endDate = document.getElementById('editCampaignClientEndDate').value;
  const active = document.getElementById('editCampaignClientActive').checked;

  if (!name || !startDate || !endDate) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        description,
        startDate,
        endDate,
        active
      })
    });

    if (response.ok) {
      alert('Campanha atualizada com sucesso!');
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('editCampaignClientModal'));
      modal.hide();
      
      // Recarregar campanhas
      const clientId = document.getElementById('editClientId').value;
      carregarCampanhasCliente(clientId);
    } else {
      const error = await response.json();
      alert('Erro ao atualizar campanha: ' + (error.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao atualizar campanha:', error);
    alert('Erro de conexão ao atualizar campanha.');
  }
}

// Função para excluir campanha
async function excluirCampanhaCliente(campaignId, campaignName) {
  if (!confirm(`Tem certeza que deseja excluir a campanha "${campaignName}"?\n\nEsta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CAMPAIGNS)}/${campaignId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      alert('Campanha excluída com sucesso!');
      
      // Recarregar campanhas
      const clientId = document.getElementById('editClientId').value;
      carregarCampanhasCliente(clientId);
    } else {
      const error = await response.json();
      alert('Erro ao excluir campanha: ' + (error.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao excluir campanha:', error);
    alert('Erro de conexão ao excluir campanha.');
  }
}

// Modificar a função abrirModalEdicao existente para carregar campanhas
async function abrirModalEdicao(id) {
    try {
        console.log('Abrindo modal de edição para cliente ID:', id);
        
        // Fazer requisição para obter dados do cliente
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            }
        });

        console.log('Resposta da API (obter cliente):', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Erro ao obter dados do cliente: ${response.status}`);
        }

        const cliente = await response.json();
        console.log('Dados do cliente recebidos:', cliente);

        // Preencher formulário com dados do cliente
        document.getElementById('editClientId').value = cliente.id;
        document.getElementById('editClientName').value = cliente.name;
        document.getElementById('editClientCpfCnpj').value = cliente.cpfCNPJ;
        document.getElementById('editClientEmail').value = cliente.email;
        document.getElementById('editClientAddress').value = cliente.adress;
        document.getElementById('editClientPhone').value = cliente.phone;
        document.getElementById('editClientPassword').value = ''; // Não preencher senha por segurança

        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('editClientModal'));
        modal.show();

    } catch (error) {
        console.error('Erro ao abrir modal de edição:', error);
        mostrarAlerta('Erro ao carregar dados do cliente: ' + error.message, 'danger');
    }
}

// Função para atualizar um cliente
async function atualizarCliente() {
    try {
        // Obter dados do formulário
        const id = document.getElementById('editClientId').value;
        const name = document.getElementById('editClientName').value;
        const cpfCNPJ = document.getElementById('editClientCpfCnpj').value;
        const email = document.getElementById('editClientEmail').value;
        const adress = document.getElementById('editClientAddress').value;
        const phone = document.getElementById('editClientPhone').value;
        const password = document.getElementById('editClientPassword').value;

        // Validar campos obrigatórios
        if (!name || !cpfCNPJ || !email || !adress || !phone) {
            mostrarAlerta('Preencha todos os campos obrigatórios.', 'warning');
            return;
        }

        // Criar objeto com dados do cliente
        const clienteData = {
            name,
            cpfCNPJ,
            email,
            adress, // Nota: o campo no banco está como 'adress' (com um 'd')
            phone
        };

        // Adicionar senha apenas se foi preenchida
        if (password) {
            clienteData.password = password;
        }
        
        console.log('Atualizando cliente:', id, clienteData);

        // Enviar requisição para a API
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            },
            body: JSON.stringify(clienteData)
        });
        
        console.log('Resposta da atualização:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar cliente');
        }

        const result = await response.json();

        // Fechar modal de forma robusta
        const modalElement = document.getElementById('editClientModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.hide();
        
        // Remover backdrop manualmente se ainda estiver presente
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        mostrarAlerta(result.message || 'Cliente atualizado com sucesso!', 'success');

        // Recarregar lista de clientes
        carregarClientes();

    } catch (error) {
        console.error('Erro ao atualizar cliente:', error);
        mostrarAlerta('Erro ao atualizar cliente: ' + error.message, 'danger');
    }
}

// Função para abrir o modal de exclusão
function abrirModalExclusao(id, nome) {
    // Preencher dados no modal
    document.getElementById('deleteClientId').value = id;
    document.getElementById('deleteClientName').textContent = nome;

    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('deleteClientModal'));
    modal.show();
}

// Função para excluir um cliente
async function excluirCliente() {
    try {
        // Obter ID do cliente
        const id = document.getElementById('deleteClientId').value;
        
        console.log('Excluindo cliente com ID:', id);

        // Enviar requisição para a API
        const response = await fetch(`${buildApiUrl(APP_CONFIG.API_ENDPOINTS.CLIENTS)}/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Adiciona o token de autenticação
            }
        });
        
        console.log('Resposta da exclusão:', response.status, response.statusText);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao excluir cliente');
        }

        const result = await response.json();

        // Fechar modal de forma robusta
        const modalElement = document.getElementById('deleteClientModal');
        let modal = bootstrap.Modal.getInstance(modalElement);
        if (!modal) {
            modal = new bootstrap.Modal(modalElement);
        }
        modal.hide();
        
        // Remover backdrop manualmente se ainda estiver presente
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
            }
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 300);
        mostrarAlerta(result.message || 'Cliente excluído com sucesso!', 'success');

        // Recarregar lista de clientes
        carregarClientes();

    } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        mostrarAlerta('Erro ao excluir cliente: ' + error.message, 'danger');
    }
}

// ===== FUNÇÕES UTILITÁRIAS =====

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

    // Verificar se o modal de nova campanha está aberto
    const newCampaignModal = document.getElementById('newCampaignModal');
    const modalAlertContainer = document.getElementById('modalAlertContainer');
    
    if (newCampaignModal && newCampaignModal.classList.contains('show') && modalAlertContainer) {
        // Exibir alerta dentro do modal
        modalAlertContainer.innerHTML = alertHtml;
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            const alert = modalAlertContainer.querySelector('.alert');
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

// Event listeners para os novos modais
document.addEventListener('DOMContentLoaded', function() {
  // Event listener para criar campanha
  const createCampaignBtn = document.getElementById('createCampaignBtn');
  if (createCampaignBtn) {
    createCampaignBtn.addEventListener('click', criarCampanha);
  }
  
  // Event listener para atualizar campanha
  const updateCampaignClientBtn = document.getElementById('updateCampaignClientBtn');
  if (updateCampaignClientBtn) {
    updateCampaignClientBtn.addEventListener('click', atualizarCampanhaCliente);
  }
  
  // Event listener para quando a aba de campanhas for ativada
  const campaignsTab = document.getElementById('campaigns-tab');
  if (campaignsTab) {
    campaignsTab.addEventListener('shown.bs.tab', function() {
      const clientId = document.getElementById('editClientId').value;
      if (clientId) {
        carregarCampanhasCliente(clientId);
      }
    });
  }
  
  // Event listener para garantir limpeza do modal de nova campanha
  const newCampaignModal = document.getElementById('newCampaignModal');
  if (newCampaignModal) {
    newCampaignModal.addEventListener('hidden.bs.modal', function() {
      // Remover backdrop manualmente se ainda estiver presente
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      // Remover classes do body que podem ter ficado
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      
      // Limpar alertas do modal
      const modalAlertContainer = document.getElementById('modalAlertContainer');
      if (modalAlertContainer) {
        modalAlertContainer.innerHTML = '';
      }
    });
  }
});