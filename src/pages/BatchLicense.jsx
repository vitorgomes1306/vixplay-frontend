import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import './BatchLicense.css'

const BatchLicense = () => {
  const { user } = useAuth();
  const { currentTheme } = useTheme();
  
  // Estados principais
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDevices, setUserDevices] = useState([]);
  const [selectedDevices, setSelectedDevices] = useState([]);
  const [systemConfig, setSystemConfig] = useState(null);
  const [batchLicenses, setBatchLicenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados do formulário
  const [dayOfPayment, setDayOfPayment] = useState(5);
  const [customValue, setCustomValue] = useState('');
  const [useCustomValue, setUseCustomValue] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentPolling, setPaymentPolling] = useState({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmBatch, setConfirmBatch] = useState(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadUsers();
    loadSystemConfig();
    loadBatchLicenses();
  }, []);

  // Carregar usuários
  const loadUsers = async () => {
    try {
      const response = await apiService.getUsers();
      setUsers(response.data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setError('Erro ao carregar usuários');
    }
  };

  // Carregar configurações do sistema
  const loadSystemConfig = async () => {
    try {
      const response = await apiService.getSystemConfig();
      setSystemConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setError('Erro ao carregar configurações do sistema');
    }
  };

  // Carregar licenças em lote existentes
  const loadBatchLicenses = async () => {
    try {
      const response = await apiService.getBatchLicenses();
      setBatchLicenses(response.data?.data || []);
    } catch (error) {
      console.error('Erro ao carregar licenças em lote:', error);
      const status = error?.response?.status;
      if (status === 403) {
        setError('Acesso negado. Esta área é exclusiva para administradores. Faça login com um usuário admin.');
      } else if (status === 401) {
        setError('Sessão expirada ou não autenticada. Faça login novamente.');
      } else {
        setError('Erro ao carregar licenças em lote');
      }
    }
  };

  // Carregar dispositivos do usuário selecionado
  const loadUserDevices = async (userId) => {
    try {
      setLoading(true);
      const response = await apiService.getUserDevices(userId);
      setUserDevices(response.data || []);
      setSelectedDevices([]);
    } catch (error) {
      console.error('Erro ao carregar dispositivos:', error);
      setError('Erro ao carregar dispositivos do usuário');
    } finally {
      setLoading(false);
    }
  };

  // Selecionar usuário
  const handleUserSelect = (userId) => {
    const user = users.find(u => u.id === parseInt(userId));
    setSelectedUser(user);
    setDayOfPayment(user?.dayOfPayment || 5);
    if (userId) {
      loadUserDevices(userId);
    } else {
      setUserDevices([]);
      setSelectedDevices([]);
    }
  };

  // Selecionar/deselecionar dispositivo
  const handleDeviceToggle = (deviceId) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      } else {
        return [...prev, deviceId];
      }
    });
  };

  // Selecionar todos os dispositivos
  const handleSelectAll = () => {
    if (selectedDevices.length === userDevices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(userDevices.map(device => device.id));
    }
  };

  // Calcular valor total
  const calculateTotalValue = () => {
    const valuePerDevice = useCustomValue ? 
      parseFloat(customValue.replace(',', '.')) || 0 : 
      parseFloat(systemConfig?.valueDevice?.replace(',', '.')) || 0;
    
    return (selectedDevices.length * valuePerDevice).toFixed(2);
  };

  // Utilitário: calcular próxima data de vencimento pelo dayOfPayment
  const computeDueDate = (day) => {
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

    const today = now.getDate();
    if (day <= 0) day = 1;
    if (day > 31) day = 31;

    // Se o dia de pagamento já passou, usar próximo mês
    if (day <= today) {
      month += 1;
    }

    const dim = daysInMonth(year, month);
    const dueDay = Math.min(day, dim);
    const dueDate = new Date(year, month, dueDay);

    // Formatar YYYY-MM-DD
    const yyyy = dueDate.getFullYear();
    const mm = String(dueDate.getMonth() + 1).padStart(2, '0');
    const dd = String(dueDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDateBR = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  // Helper para exibir status amigável
  const renderStatus = (status) => {
    if (status === 'paid') return 'Confirmado';
    if (status === 'pending') return 'Pendente';
    if (status === 'pending_payment') return 'Pagamento pendente';
    return status || '—';
  };

  const openGenerateModal = () => {
    setIsModalOpen(true);
    setError('');
    setSuccess('');
  };

  const closeGenerateModal = () => {
    setIsModalOpen(false);
  };

  // Abrir/fechar modal de confirmação de pagamento
  const openConfirmModal = (batch) => {
    setConfirmBatch(batch);
    setIsConfirmModalOpen(true);
    setError('');
    setSuccess('');
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
    setConfirmBatch(null);
    setConfirmNotes('');
  };

  // Handler do botão da tabela
  const handleConfirmPayment = (batchId) => {
    const batch = (Array.isArray(batchLicenses) ? batchLicenses : []).find(b => b.id === batchId);
    if (batch) openConfirmModal(batch);
  };

  // Confirmar pagamento (ativa 30 dias, atualiza status)
  const confirmPayment = async () => {
    if (!confirmBatch?.id) return;
    try {
      setConfirming(true);
      const response = await apiService.updateBatchLicensePayment(confirmBatch.id, {
        paymentReceived: true,
        notes: confirmNotes || 'Pagamento confirmado'
      });
      if (response.data?.success) {
        setSuccess('Pagamento confirmado e licenças ativadas.');
        await loadBatchLicenses();
        closeConfirmModal();
      } else {
        setError(response.data?.message || 'Falha ao confirmar pagamento');
      }
    } catch (err) {
      console.error('Erro ao confirmar pagamento:', err);
      setError('Erro ao confirmar pagamento');
    } finally {
      setConfirming(false);
    }
  };

  const handleGenerateSingleBilling = async () => {
    if (!selectedUser || selectedDevices.length === 0) {
      setError('Selecione um usuário e pelo menos um dispositivo');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const valuePerDevice = useCustomValue ? 
        parseFloat(customValue.replace(',', '.')) : 
        parseFloat(systemConfig?.valueDevice?.replace(',', '.'));

      const payload = {
        userId: selectedUser.id,
        deviceIds: selectedDevices,
        paymentDay: dayOfPayment,
        valuePerDevice: valuePerDevice,
        totalValue: parseFloat(calculateTotalValue())
      };

      const response = await apiService.createBatchLicense(payload);
      
      if (response.data.success) {
        setSuccess(`Licenciamento em lote criado com sucesso! ${selectedDevices.length} dispositivos processados.`);
        loadBatchLicenses();
        setSelectedDevices([]);
        setSelectedUser(null);
        setUserDevices([]);
        setIsModalOpen(false);
      } else {
        setError(response.data.message || 'Erro ao criar licenciamento em lote');
      }
    } catch (error) {
      console.error('Erro ao criar licenciamento em lote:', error);
      setError('Erro ao processar licenciamento em lote');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (batchId) => {
    try {
      // Primeiro buscar dados do lote para obter o invoiceId do Lytex
      const batchResponse = await apiService.getBatchLicense(batchId);
      const batchData = batchResponse.data?.data;
      
      if (batchData.lytexInvoiceId) {
        // Verificar via Lytex se há invoiceId
        const response = await apiService.checkBatchPaymentStatusLytex(batchId, batchData.lytexInvoiceId);
        
        if (response.data.success) {
          const { paymentStatus, paidAt } = response.data.data;
          
          // Atualizar o status na lista local
          setBatchLicenses(prev => prev.map(batch => 
            batch.id === batchId 
              ? { 
                  ...batch, 
                  paymentStatus: paymentStatus,
                  paidAt: paidAt
                }
              : batch
          ));

          if (paymentStatus === 'paid') {
            setSuccess('Pagamento confirmado via Lytex! Licenças ativadas automaticamente.');
            
            // Parar verificação automática para este lote
            if (paymentPolling[batchId]) {
              clearInterval(paymentPolling[batchId]);
              setPaymentPolling(prev => {
                const newPolling = { ...prev };
                delete newPolling[batchId];
                return newPolling;
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status de pagamento via Lytex:', error);
    }
  };

  return (
    <div className="batch-license-page">
      {/* Header and primary action */}
      <div className="card mb-3">
        <div className="card-body d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Licenças em Lote</h4>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={openGenerateModal} disabled={loading}>
              Gerar licença em lote
            </button>
          </div>
        </div>
      </div>

      {/* Modal de geração de licenças em lote */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="modal-content" style={{ background: currentTheme.background, color: currentTheme.text, borderRadius: 8, width: '95%', maxWidth: 900 }}>
            <div className="modal-header">
              <h5 className="modal-title">Gerar licenças em lote</h5>
              <button type="button" className="btn btn-outline-secondary" onClick={closeGenerateModal} disabled={loading}>
                Fechar
              </button>
            </div>
            <div className="modal-body">
              {/* Controles dentro do modal */}
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Cliente</label>
                  <select className="form-select" value={selectedUser?.id || ''} onChange={(e) => handleUserSelect(e.target.value)}>
                    <option value="">Selecione</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Dia do pagamento</label>
                  <input className="form-control" type="number" min={1} max={31} value={dayOfPayment} onChange={(e) => setDayOfPayment(parseInt(e.target.value) || 1)} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Valor por dispositivo</label>
                  <div className="form-check">
                    <input className="form-check-input" id="useCustomValue" type="checkbox" checked={useCustomValue} onChange={(e) => setUseCustomValue(e.target.checked)} />
                    <label className="form-check-label" htmlFor="useCustomValue">Usar valor personalizado</label>
                  </div>
                  {useCustomValue ? (
                    <input className="form-control mt-2" type="text" placeholder="Ex: 49,90" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
                  ) : (
                    <span className="text-muted d-block mt-2">Configurado: {systemConfig?.valueDevice || 'N/A'}</span>
                  )}
                </div>
              </div>

              {/* Lista de dispositivos */}
              <div className="mt-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">Dispositivos</h6>
                  <button className="btn btn-outline-primary" onClick={handleSelectAll} disabled={!Array.isArray(userDevices) || userDevices.length === 0}>
                    {selectedDevices.length === userDevices.length ? 'Limpar seleção' : 'Selecionar todos'}
                  </button>
                </div>
                {!Array.isArray(userDevices) || userDevices.length === 0 ? (
                  <div className="alert alert-info mt-2">Nenhum dispositivo encontrado para o cliente selecionado.</div>
                ) : (
                  <ul className="list-group mt-2">
                    {userDevices.map((device) => (
                      <li className="list-group-item" key={device.id}>
                        <label className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedDevices.includes(device.id)}
                            onChange={() => handleDeviceToggle(device.id)}
                          />
                          <span className="ms-2">{device.name || `Dispositivo ${device.id}`}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Resumo */}
              <div className="row g-3 mt-3">
                <div className="col-md-4"><strong>Cliente:</strong> {selectedUser?.name} ({selectedUser?.email})</div>
                <div className="col-md-4"><strong>Vencimento:</strong> {formatDateBR(computeDueDate(dayOfPayment))}</div>
                <div className="col-md-4"><strong>Dispositivos selecionados:</strong> {selectedDevices.length}</div>
                <div className="col-md-4"><strong>Valor por dispositivo:</strong> R$ {(
                  (useCustomValue ? parseFloat((customValue || '0').replace(',', '.')) : parseFloat((systemConfig?.valueDevice || '0').replace(',', '.')))
                ).toFixed(2)}</div>
                <div className="col-md-4"><strong>Total:</strong> R$ {calculateTotalValue()}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={closeGenerateModal} disabled={loading}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleGenerateSingleBilling} disabled={loading}>Confirmar geração</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de pagamento */}
      {isConfirmModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="modal-content" style={{ background: currentTheme.background, color: currentTheme.text, borderRadius: 8, width: '95%', maxWidth: 640 }}>
            <div className="modal-header">
              <h5 className="modal-title">Confirmar pagamento</h5>
              <button type="button" className="btn btn-outline-secondary" onClick={closeConfirmModal} disabled={confirming}>Fechar</button>
            </div>
            <div className="modal-body">
              <p>Tem certeza que deseja confirmar o pagamento deste lote?</p>
              <div className="row g-3">
                <div className="col-md-6"><strong>Cliente:</strong> {confirmBatch?.user?.name || confirmBatch?.user?.workName || confirmBatch?.user?.email}</div>
                <div className="col-md-6"><strong>Dispositivos:</strong> {confirmBatch?.batchLicenseDevices?.length ?? confirmBatch?.deviceCount ?? 0}</div>
                <div className="col-md-6"><strong>Status atual:</strong> {renderStatus(confirmBatch?.paymentStatus)}</div>
                <div className="col-md-6"><strong>Vencimento:</strong> {/* se houver dueDate */}</div>
              </div>
              <div className="alert alert-info mt-3">
                Ao confirmar: dispositivos do usuário serão ativados por 30 dias, com expiresAt e lastLicenseCheck atualizados, e o status do lote será marcado como Confirmado.
              </div>
              <label className="form-label mt-2">Observações (opcional)</label>
              <textarea className="form-control" rows={2} value={confirmNotes} onChange={(e) => setConfirmNotes(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline-secondary" onClick={closeConfirmModal} disabled={confirming}>Cancelar</button>
              <button className="btn btn-success" onClick={confirmPayment} disabled={confirming}>
                {confirming ? 'Confirmando...' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback */}
      {error && (<div className="alert alert-danger">{error}</div>)}
      {success && (<div className="alert alert-success">{success}</div>)}

      {/* Lista de licenças em lote */}
      <div className="card mt-3">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data</th>
                  <th>Dispositivos</th>
                  <th>Status</th>
                  <th>Vencimento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(batchLicenses) ? batchLicenses : []).map((batch) => {
                  const dueText = batch.dueDate ? formatDateBR(batch.dueDate) : formatDateBR(computeDueDate(batch.dayOfPayment || dayOfPayment));
                  const deviceCount = batch.batchLicenseDevices?.length ?? batch.deviceCount ?? 0;
                  return (
                    <tr key={batch.id}>
                      <td>{batch.user?.name || batch.user?.workName || batch.user?.email}</td>
                      <td>{formatDateBR(batch.createdAt)}</td>
                      <td>{deviceCount}</td>
                      <td>{renderStatus(batch.paymentStatus)}</td>
                      <td>{dueText}</td>
                      <td>
                        {batch.paymentStatus === 'pending' && (
                          <button className="btn btn-outline-success btn-sm" onClick={() => handleConfirmPayment(batch.id)} disabled={loading}>Confirmar pagamento</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(!Array.isArray(batchLicenses) || batchLicenses.length === 0) && (
                  <tr>
                    <td colSpan={6} className="text-center">Nenhum lote encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchLicense;