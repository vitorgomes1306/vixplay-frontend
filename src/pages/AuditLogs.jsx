import React, { useState, useEffect } from 'react';
import { Search, Download, Eye, Filter, Calendar, User, Activity } from 'lucide-react';

const AuditLogs = () => {
  const { theme } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  
  // Paginação
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Modal para detalhes
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Carregar logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`/api/audit?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar logs de auditoria');
      }

      const data = await response.json();
      setLogs(data.data);
      setPagination(prev => ({ ...prev, ...data.pagination }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar estatísticas
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [pagination.page, filters]);

  // Aplicar filtros
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Limpar filtros
  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      userId: '',
      startDate: '',
      endDate: '',
      search: ''
    });
  };

  // Exportar CSV
  const exportCSV = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      );

      const response = await fetch(`/api/audit/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Erro ao exportar:', err);
    }
  };

  // Formatar data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Obter cor da ação
  const getActionColor = (action) => {
    const colors = {
      CREATE: 'text-green-600',
      UPDATE: 'text-blue-600',
      DELETE: 'text-red-600',
      LOGIN: 'text-purple-600',
      LOGOUT: 'text-gray-600'
    };
    return colors[action] || 'text-gray-600';
  };

  // Obter ícone da ação
  const getActionIcon = (action) => {
    const icons = {
      CREATE: 'bi-plus-circle',
      UPDATE: 'bi-pencil-square',
      DELETE: 'bi-trash',
      LOGIN: 'bi-box-arrow-in-right',
      LOGOUT: 'bi-box-arrow-left'
    };
    return icons[action] || 'bi-circle';
  };

  return (
    <div className={`min-h-screen p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Logs de Auditoria</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize e monitore todas as atividades do sistema
          </p>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <i className="bi bi-list-ul text-2xl text-blue-500 mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total de Logs</p>
                  <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <i className="bi bi-plus-circle text-2xl text-green-500 mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Criações</p>
                  <p className="text-2xl font-bold">
                    {stats.actionStats.find(s => s.action === 'CREATE')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <i className="bi bi-pencil-square text-2xl text-blue-500 mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Atualizações</p>
                  <p className="text-2xl font-bold">
                    {stats.actionStats.find(s => s.action === 'UPDATE')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
              <div className="flex items-center">
                <i className="bi bi-trash text-2xl text-red-500 mr-3"></i>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Exclusões</p>
                  <p className="text-2xl font-bold">
                    {stats.actionStats.find(s => s.action === 'DELETE')?.count || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className={`p-6 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm mb-6`}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Ação</label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Todas</option>
                <option value="CREATE">Criar</option>
                <option value="UPDATE">Atualizar</option>
                <option value="DELETE">Deletar</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Recurso</label>
              <select
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">Todos</option>
                <option value="panel">Painel</option>
                <option value="device">Dispositivo</option>
                <option value="media">Mídia</option>
                <option value="user">Usuário</option>
                <option value="auth">Autenticação</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Buscar</label>
              <input
                type="text"
                placeholder="IP, ação, recurso..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className={`w-full p-2 border rounded-md ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <i className="bi bi-download mr-2"></i>
                CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className={`rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-sm overflow-hidden`}>
          {loading ? (
            <div className="p-8 text-center">
              <i className="bi bi-arrow-clockwise animate-spin text-2xl mb-2"></i>
              <p>Carregando logs...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              <i className="bi bi-exclamation-triangle text-2xl mb-2"></i>
              <p>{error}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Recurso
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <i className={`${getActionIcon(log.action)} ${getActionColor(log.action)} mr-2`}></i>
                            <span className={`font-medium ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium">
                              {log.user?.name || 'Sistema'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.user?.email || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium">{log.resourceType}</div>
                            {log.resourceId && (
                              <div className="text-sm text-gray-500">ID: {log.resourceId}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {log.ipAddress || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(log.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => {
                              setSelectedLog(log);
                              setShowModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <i className="bi bi-eye mr-1"></i>
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                  {pagination.total} resultados
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <span className="px-3 py-1">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal de Detalhes */}
        {showModal && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`max-w-2xl w-full mx-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Detalhes do Log de Auditoria</h3>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">ID</label>
                    <p className="text-sm">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Ação</label>
                    <p className={`text-sm font-medium ${getActionColor(selectedLog.action)}`}>
                      {selectedLog.action}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Usuário</label>
                    <p className="text-sm">{selectedLog.user?.name || 'Sistema'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <p className="text-sm">{selectedLog.user?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo de Recurso</label>
                    <p className="text-sm">{selectedLog.resourceType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ID do Recurso</label>
                    <p className="text-sm">{selectedLog.resourceId || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">IP</label>
                    <p className="text-sm">{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data/Hora</label>
                    <p className="text-sm">{formatDate(selectedLog.createdAt)}</p>
                  </div>
                </div>

                {selectedLog.userAgent && (
                  <div>
                    <label className="block text-sm font-medium mb-1">User Agent</label>
                    <p className="text-sm break-all">{selectedLog.userAgent}</p>
                  </div>
                )}

                {selectedLog.oldValues && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Valores Anteriores</label>
                    <pre className={`text-xs p-3 rounded-md overflow-auto ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {JSON.stringify(selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.newValues && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Novos Valores</label>
                    <pre className={`text-xs p-3 rounded-md overflow-auto ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      {JSON.stringify(selectedLog.newValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;