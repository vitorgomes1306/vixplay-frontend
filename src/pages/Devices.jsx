import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';

const Devices = () => {
  const { currentTheme } = useTheme();
  const styles = getStyles(currentTheme);
  const navigate = useNavigate();
  const location = useLocation();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [panels, setPanels] = useState([]);
  const [editingDevice, setEditingDevice] = useState(null);

  // Estados para o mapa
  const [createMap, setCreateMap] = useState(null);
  const [createMarker, setCreateMarker] = useState(null);
  const [editMap, setEditMap] = useState(null);
  const [editMarker, setEditMarker] = useState(null);
  const [devicesMap, setDevicesMap] = useState(null);
  // Definir activeTab como 'map' por padrão
  const [activeTab, setActiveTab] = useState('map');
  const [addressSearch, setAddressSearch] = useState('');
  const [cepSearch, setCepSearch] = useState('');
  const [geoAlert, setGeoAlert] = useState({ show: false, message: '', type: 'info' });

  // Estados para autocomplete de endereço
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.address-search-container')) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Abrir modal automaticamente quando vier com parâmetro/estado
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const shouldOpen = params.get('add') === '1' || params.get('novo') === '1';
      const openState = !!(location.state && (location.state.openAdd || location.state.add));
      if (shouldOpen || openState) {
        setShowModal(true);
        // Limpar o state para não reabrir em navegações subsequentes
        if (openState) {
          navigate(location.pathname + location.search, { replace: true, state: {} });
        }
      }
    } catch {}
    // Reagir a mudanças na URL/estado
  }, [location, navigate]);

  const [formData, setFormData] = useState({
    deviceKey: ['', '', '', '', '', ''],
    name: '',
    format: 'VERTICAL',
    panelId: '',
    type: 'TV',
    geoLocation: '',
    sendNotification: false,
    showClientInfo: false,
    personalTextDevice: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDevices();
    fetchPanels();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDevices();
      console.log('=== DEBUG FETCH DEVICES ===');
      console.log('API Response:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First device sample:', response.data[0]);
      }
      setDevices(response.data);
      setError('');
    } catch (err) {
      console.error('Erro ao carregar dispositivos:', err);
      setError('Erro ao carregar dispositivos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPanels = async () => {
    try {
      const response = await apiService.getPanels();
      setPanels(response.data);
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
    }
  };

  // Funções do mapa
  const showGeoAlert = (message, type = 'info') => {
    setGeoAlert({ show: true, message, type });
    setTimeout(() => setGeoAlert({ show: false, message: '', type: 'info' }), 5000);
  };

  const searchAddressSuggestions = async (query) => {
    if (!query.trim() || query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      // Usando proxy para contornar CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&countrycodes=br`)}`;
      const response = await fetch(proxyUrl);
      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);

      if (data && data.length > 0) {
        const suggestions = data.map(item => ({
          id: item.place_id,
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        }));
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Erro na busca de sugestões:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
    setIsSearching(false);
  };

  const selectAddressSuggestion = (suggestion) => {
    const coordinates = `${suggestion.lat}, ${suggestion.lon}`;
    setFormData({ ...formData, geoLocation: coordinates });
    setAddressSearch(suggestion.display_name);
    setShowSuggestions(false);
    setAddressSuggestions([]);

    showGeoAlert(`Localização selecionada: ${suggestion.display_name}`, 'success');

    // Atualizar mapa se estiver ativo
    if (activeTab === 'map') {
      if (createMap) {
        createMap.setView([suggestion.lat, suggestion.lon], 15);
        if (createMarker) {
          createMap.removeLayer(createMarker);
        }
        const newMarker = L.marker([suggestion.lat, suggestion.lon]).addTo(createMap);
        setCreateMarker(newMarker);
      }

      if (editMap) {
        editMap.setView([suggestion.lat, suggestion.lon], 15);
        if (editMarker) {
          editMap.removeLayer(editMarker);
        }
        const newMarker = L.marker([suggestion.lat, suggestion.lon]).addTo(editMap);
        setEditMarker(newMarker);
      }
    }
  };

  const handleAddressInputChange = (value) => {
    setAddressSearch(value);

    // Debounce da busca
    clearTimeout(window.addressSearchTimeout);
    window.addressSearchTimeout = setTimeout(() => {
      searchAddressSuggestions(value);
    }, 300);
  };

  const searchByAddress = async (address) => {
    if (!address.trim()) {
      showGeoAlert('Por favor, digite um endereço para buscar.', 'warning');
      return;
    }

    try {
      // Usando proxy para contornar CORS
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)}`;
      const response = await fetch(proxyUrl);
      const proxyData = await response.json();
      const data = JSON.parse(proxyData.contents);

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const coordinates = `${lat}, ${lon}`;

        setFormData({ ...formData, geoLocation: coordinates });
        showGeoAlert(`Localização encontrada: ${display_name}`, 'success');

        if (createMap) {
          createMap.setView([lat, lon], 15);
          if (createMarker) {
            createMap.removeLayer(createMarker);
          }
          const newMarker = L.marker([lat, lon]).addTo(createMap);
          setCreateMarker(newMarker);
        }
      } else {
        showGeoAlert('Endereço não encontrado. Tente ser mais específico.', 'error');
      }
    } catch (error) {
      console.error('Erro na busca por endereço:', error);
      showGeoAlert('Erro ao buscar endereço. Tente novamente.', 'error');
    }
  };

  const searchByCep = async (cep) => {
    if (!cep.trim()) {
      showGeoAlert('Por favor, digite um CEP para buscar.', 'warning');
      return;
    }

    try {
      // Buscar endereço pelo CEP usando ViaCEP
      const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const cepData = await cepResponse.json();

      if (cepData.erro) {
        showGeoAlert('CEP não encontrado.', 'error');
        return;
      }

      // Buscar coordenadas usando Nominatim com proxy
      const fullAddress = `${cepData.logradouro}, ${cepData.bairro}, ${cepData.localidade}, ${cepData.uf}, Brasil`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`)}`;
      const nominatimResponse = await fetch(proxyUrl);
      const proxyData = await nominatimResponse.json();
      const nominatimData = JSON.parse(proxyData.contents);

      if (nominatimData && nominatimData.length > 0) {
        const { lat, lon } = nominatimData[0];
        const coordinates = `${lat}, ${lon}`;

        setFormData({ ...formData, geoLocation: coordinates });
        showGeoAlert(`Localização encontrada: ${fullAddress}`, 'success');

        if (createMap) {
          createMap.setView([lat, lon], 15);
          if (createMarker) {
            createMap.removeLayer(createMarker);
          }
          const newMarker = L.marker([lat, lon]).addTo(createMap);
          setCreateMarker(newMarker);
        }
      } else {
        showGeoAlert('Não foi possível encontrar as coordenadas para este CEP.', 'error');
      }
    } catch (error) {
      console.error('Erro na busca por CEP:', error);
      showGeoAlert('Erro ao buscar CEP. Tente novamente.', 'error');
    }
  };

  const initCreateMap = () => {
    setTimeout(() => {
      const mapElement = document.getElementById('createMap');
      if (mapElement && !createMap) {
        const map = L.map('createMap').setView([-23.5505, -46.6333], 10); // São Paulo como padrão

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          const coordinates = `${lat}, ${lng}`;

          setFormData({ ...formData, geoLocation: coordinates });
          showGeoAlert(`Coordenadas selecionadas: ${coordinates}`, 'success');

          if (createMarker) {
            map.removeLayer(createMarker);
          }
          const newMarker = L.marker([lat, lng]).addTo(map);
          setCreateMarker(newMarker);
        });

        setCreateMap(map);
      }
    }, 100);
  };

  const initEditMap = () => {
    setTimeout(() => {
      const mapElement = document.getElementById('editMap');
      if (mapElement && !editMap) {
        const map = L.map('editMap').setView([-23.5505, -46.6333], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Se há coordenadas existentes (do dispositivo sendo editado), centralizar o mapa nelas
        const geoLocation = formData.geoLocation || (editingDevice && editingDevice.geoLocation);
        if (geoLocation) {
          const coords = geoLocation.split(',').map(coord => parseFloat(coord.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            map.setView([coords[0], coords[1]], 15);
            const marker = L.marker([coords[0], coords[1]]).addTo(map);
            setEditMarker(marker);
          }
        }

        map.on('click', (e) => {
          const { lat, lng } = e.latlng;
          const coordinates = `${lat}, ${lng}`;

          setFormData({ ...formData, geoLocation: coordinates });
          showGeoAlert(`Coordenadas selecionadas: ${coordinates}`, 'success');

          if (editMarker) {
            map.removeLayer(editMarker);
          }
          const newMarker = L.marker([lat, lng]).addTo(map);
          setEditMarker(newMarker);
        });

        setEditMap(map);
      }
    }, 100);
  };

  const initDevicesMap = () => {
    setTimeout(() => {
      const mapElement = document.getElementById('devicesMap');
      if (mapElement && !devicesMap) {
        const map = L.map('devicesMap').setView([-23.5505, -46.6333], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Criar um grupo para os marcadores para calcular o bounds
        const markersGroup = L.featureGroup();
        let hasMarkers = false;

        // Adicionar marcadores para cada dispositivo
        devices.forEach(device => {
          if (device.geoLocation) {
            const [lat, lng] = device.geoLocation.split(',').map(coord => parseFloat(coord.trim()));
            if (!isNaN(lat) && !isNaN(lng)) {
              hasMarkers = true;

              // Determinar status do dispositivo (inativo, online ou offline)
              let deviceStatus, iconColor, statusText;

              if (device.status !== 'Ativo') {
                // Dispositivo inativo
                deviceStatus = 'inactive';
                iconColor = '#6b7280';
                statusText = 'Inativo';
              } else if (device.statusDevice) {
                // Dispositivo ativo e online
                deviceStatus = 'online';
                iconColor = '#28a745';
                statusText = 'Online';
              } else {
                // Dispositivo ativo mas offline
                deviceStatus = 'offline';
                iconColor = '#dc3545';
                statusText = 'Offline';
              }

              const customIcon = L.divIcon({
                html: `
                 <div style="
                  width: 30px;
                  height: 30px;
                  border-radius: 50%;
                  background-color: ${iconColor};
                  border: 3px solid #fff;
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 15px;
                  color: #fff;
                  ">
                  <i class="bi bi-tv"></i>
                  </div>
                  `,
                className: 'custom-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });


              const marker = L.marker([lat, lng], { icon: customIcon });

              marker.bindPopup(`
                <div style="font-family: 'Poppins', sans-serif;">
                  <h6 style="margin: 0 0 8px 0; font-weight: 600;">${device.name}</h6>
                  <p style="margin: 0 0 4px 0; font-size: 0.875rem;">
                    <strong>Status:</strong> 
                    <span style="color: ${iconColor};">${statusText}</span>
                  </p>
                  <p style="margin: 0 0 4px 0; font-size: 0.875rem;">
                    <strong>Tipo:</strong> ${device.type}
                  </p>
                  <p style="margin: 0; font-size: 0.875rem;">
                    <strong>Chave:</strong> ${device.deviceKey}
                  </p>
                </div>
              `);

              // Adicionar ao grupo e ao mapa
              markersGroup.addLayer(marker);
              marker.addTo(map);
            }
          }
        });

        // Se há marcadores, ajustar o zoom para mostrar todos
        if (hasMarkers) {
          map.fitBounds(markersGroup.getBounds().pad(0.1));
        }

        setDevicesMap(map);
      }
    }, 100);
  };

  const handleDeviceKeyChange = (index, value) => {
    if (value.length <= 1) {
      const newDeviceKey = [...formData.deviceKey];
      newDeviceKey[index] = value.toUpperCase();
      setFormData({ ...formData, deviceKey: newDeviceKey });

      // Auto-focus próximo campo
      if (value && index < 5) {
        const nextInput = document.querySelector(`input[data-index="${index + 1}"]`);
        if (nextInput) nextInput.focus();
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validar chave do dispositivo
    const deviceKeyString = formData.deviceKey.join('');
    if (deviceKeyString.length !== 6) {
      errors.deviceKey = 'A chave do dispositivo deve ter 6 dígitos';
    }

    if (!formData.name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

    if (!formData.panelId) {
      errors.panelId = 'Painel é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = (device) => {
    console.log('=== DEBUG HANDLE EDIT ===');
    console.log('Device object:', device);
    console.log('sendNotification raw:', device.sendNotification, typeof device.sendNotification);
    console.log('showClientInfo raw:', device.showClientInfo, typeof device.showClientInfo);
    console.log('personalTextDevice raw:', device.personalTextDevice, typeof device.personalTextDevice);

    setEditingDevice(device);
    const deviceKeyArray = device.deviceKey ? device.deviceKey.split('') : ['', '', '', '', '', ''];
    while (deviceKeyArray.length < 6) {
      deviceKeyArray.push('');
    }

    const formDataToSet = {
      deviceKey: deviceKeyArray,
      name: device.name || '',
      format: device.format || 'HORIZONTAL',
      panelId: device.panelId || '',
      type: device.type || 'TV',
      geoLocation: device.geoLocation || '',
      sendNotification: Boolean(device.sendNotification),
      showClientInfo: Boolean(device.showClientInfo),
      personalTextDevice: device.personalTextDevice || ''
    };

    console.log('FormData to set:', formDataToSet);
    setFormData(formDataToSet);
    setFormErrors({});
    setShowModal(true);
  };

  // Função para deletar dispositivo
  const handleDelete = (device) => {
    setDeviceToDelete(device);
    setShowDeleteModal(true);
  };

  // Função para confirmar exclusão
  const confirmDelete = async () => {
    if (!deviceToDelete) return;

    try {
      await apiService.deleteDevice(deviceToDelete.id);
      setDevices(devices.filter(d => d.id !== deviceToDelete.id));
      setShowDeleteModal(false);
      setDeviceToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar dispositivo:', error);
      setError('Erro ao deletar dispositivo');
    }
  };

  const resetForm = () => {
    setFormData({
      deviceKey: ['', '', '', '', '', ''],
      name: '',
      format: 'HORIZONTAL',
      panelId: '',
      type: 'TV',
      geoLocation: '',
      sendNotification: false,
      showClientInfo: false,
      personalTextDevice: ''
    });
    setFormErrors({});
    setEditingDevice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceData = {
        deviceKey: formData.deviceKey.join(''),
        name: formData.name,
        format: formData.format,
        panelId: parseInt(formData.panelId) || null,
        type: formData.type,
        geoLocation: formData.geoLocation || null,
        sendNotification: formData.sendNotification,
        showClientInfo: formData.showClientInfo,
        personalTextDevice: formData.personalTextDevice || null
      };

      if (editingDevice) {
        // Editar dispositivo existente
        await apiService.updateDevice(editingDevice.id, deviceData);
      } else {
        // Criar novo dispositivo
        await apiService.createDevice(deviceData);
      }

      resetForm();
      setShowModal(false);
      fetchDevices(); // Recarregar lista

    } catch (err) {
      console.error('Erro ao salvar dispositivo:', err);
      setError(`Erro ao ${editingDevice ? 'atualizar' : 'criar'} dispositivo. Tente novamente.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (device) => {
    // Verificar se o dispositivo está ativo primeiro
    const isActive = device?.status === 'Ativo';
    if (!isActive) {
      return '#6b7280'; // Cinza para inativo
    }

    // Se ativo, verificar se está online usando statusDevice
    const isOnline = device?.statusDevice === true;
    return isOnline ? '#10b981' : '#ef4444'; // Verde para online, vermelho para offline
  };

  const getStatusText = (device) => {
    // Verificar se o dispositivo está ativo primeiro
    const isActive = device?.status === 'Ativo';
    if (!isActive) {
      return 'Inativo';
    }

    // Se ativo, verificar se está online usando statusDevice
    const isOnline = device?.statusDevice === true;
    return isOnline ? 'Online' : 'Offline';
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
        <p style={{ marginTop: '1rem' }}>Carregando dispositivos...</p>
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
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: currentTheme.textPrimary,
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            <i className="bi bi-tv" style={{ marginRight: '0.5rem' }}></i>
            Dispositivos
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            margin: 0,
            fontSize: '1rem'
          }}>
            Gerencie seus dispositivos conectados
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setShowMapModal(true);
              setTimeout(initDevicesMap, 100);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTheme.secondary,
              color: currentTheme.textPrimary,
              border: `2px solid ${currentTheme.border}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = currentTheme.hoverBackground;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = currentTheme.secondary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <i className="bi bi-geo-alt"></i>
            Mapa
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
          >
            <i className="bi bi-plus-lg"></i>
            Novo Dispositivo
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <i className="bi bi-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.statsCard, borderLeft: `4px solid ${currentTheme.primary}` }}>
          <div style={{ ...styles.statsIcon, backgroundColor: `${currentTheme.primary}20`, color: currentTheme.primary }}>
            <i className="bi bi-hdd-network"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Total de Dispositivos</p>
            <p style={styles.statsValue}>{devices.length}</p>
          </div>
        </div>

        <div style={{ ...styles.statsCard, borderLeft: '4px solid #10b981' }}>
          <div style={{ ...styles.statsIcon, backgroundColor: '#10b98120', color: '#10b981' }}>
            <i className="bi bi-broadcast"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Dispositivos Online</p>
            <p style={styles.statsValue}>{devices.filter(device => device?.status === 'Ativo' && device?.statusDevice === true).length}</p>
          </div>
        </div>

        <div style={{ ...styles.statsCard, borderLeft: '4px solid #ef4444' }}>
          <div style={{ ...styles.statsIcon, backgroundColor: '#ef444420', color: '#ef4444' }}>
            <i className="bi bi-slash-circle"></i>
          </div>
          <div>
            <p style={styles.statsLabel}>Dispositivos Offline</p>
            <p style={styles.statsValue}>{devices.filter(device => device?.status !== 'Ativo' || device?.statusDevice !== true).length}</p>
          </div>
        </div>
      </div>

      {/* Devices List */}
      {devices.length === 0 ? (
        <div style={{
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '0.75rem',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '4rem',
            color: currentTheme.textSecondary,
            marginBottom: '1rem'
          }}>
            📱
          </div>
          <h3 style={{
            color: currentTheme.textPrimary,
            marginBottom: '0.5rem'
          }}>
            Nenhum dispositivo encontrado
          </h3>
          <p style={{
            color: currentTheme.textSecondary,
            marginBottom: '1.5rem'
          }}>
            Conecte seu primeiro dispositivo para começar a exibir conteúdo
          </p>
          <button style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentTheme.primary,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <i className="bi bi-plus-lg" style={{ marginRight: '0.5rem' }}></i>
            Conectar Primeiro Dispositivo
          </button>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>Lista de Dispositivos</h2>
          </div>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 150px 120px 180px 120px',
            gap: '1rem',
            padding: '1rem 1.5rem',
            backgroundColor: currentTheme.borderLight,
            borderBottom: `1px solid ${currentTheme.border}`,
            fontSize: '0.875rem',
            fontWeight: '600',
            color: currentTheme.textSecondary
          }}>
            <div>DISPOSITIVO</div>
            <div>STATUS</div>
            <div>TIPO</div>
            <div>LICENCIADO</div>
            <div>ÚLTIMA CONEXÃO</div>
            <div>AÇÕES</div>
          </div>

          {/* Table Body */}
          {devices.map((device, index) => (
            <div key={device.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 120px 150px 120px 180px 120px',
              gap: '1rem',
              padding: '1rem 1.5rem',
              borderBottom: index < devices.length - 1 ? `1px solid ${currentTheme.border}` : 'none',
              transition: 'background-color 0.2s'
            }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.borderLight}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                onClick={() => navigate(`/device/${device.id}`)}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: currentTheme.primary + '20',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: currentTheme.primary
                }}>
                  <i className={getDeviceTypeIcon(device.type)}></i>
                </div>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.25rem'
                  }}>
                    {device.name}
                  </div>
                  {device.description && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: currentTheme.textSecondary
                    }}>
                      {device.description}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className={(() => {
                  const isActive = device?.status === 'Ativo';
                  if (!isActive) return 'bi bi-circle-fill';
                  const isOnline = device?.statusDevice === true;
                  return isOnline ? 'bi bi-circle-fill' : 'bi bi-circle-fill';
                })()} style={{
                  color: getStatusColor(device),
                  fontSize: '0.875rem'
                }}></i>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: getStatusColor(device)
                }}>
                  {getStatusText(device)}
                </span>
              </div>

              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem',
                textTransform: 'capitalize'
              }}>
                {device.type || 'Não especificado'}
              </div>

              <div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: device.licenceActive ? '#dcfce7' : '#fef2f2',
                  color: device.licenceActive ? '#16a34a' : '#dc2626'
                }}>
                  {device.licenceActive ? 'Sim' : 'Não'}
                </span>
              </div>

              <div style={{
                color: currentTheme.textSecondary,
                fontSize: '0.875rem'
              }}>
                {device.lastConnection ? formatDate(device.lastConnection) : 'Nunca conectado'}
              </div>

              <div style={{
                display: 'flex',
                gap: '0.5rem'
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/device/${device.id}`);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.primary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.primary;
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.primary;
                  }}
                  title="Visualizar"
                >
                  <i className="bi bi-eye"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(device);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: '#f59e0b',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f59e0b';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#f59e0b';
                  }}
                  title="Editar"
                >
                  <i className="bi bi-pencil"></i>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(device);
                  }}
                  style={{
                    padding: '0.25rem 0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textSecondary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#ef4444';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }}
                  title="Excluir"
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação de Dispositivo */}
      {showModal && (
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header do Modal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: `1px solid ${currentTheme.border}`
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: currentTheme.textPrimary,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <i className={editingDevice ? "bi bi-pencil-square" : "bi bi-plus-circle"}></i>
                {editingDevice ? 'Editar Dispositivo' : 'Novo Dispositivo'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.border}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit}>
              {/* Chave do Dispositivo */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  marginBottom: '0.5rem'
                }}>
                  Chave do Dispositivo (6 dígitos) {!editingDevice && '*'}
                </label>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start',
                  marginBottom: '0.5rem'
                }}>
                  {/* Inputs da chave */}
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem'
                  }}>
                    {formData.deviceKey.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        data-index={index}
                        value={digit}
                        onChange={(e) => handleDeviceKeyChange(index, e.target.value)}
                        disabled={editingDevice}
                        style={{
                          width: '3rem',
                          height: '3rem',
                          textAlign: 'center',
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          border: `2px solid ${formErrors.deviceKey ? '#ef4444' : currentTheme.border}`,
                          borderRadius: '0.5rem',
                          backgroundColor: editingDevice ? currentTheme.border + '40' : currentTheme.inputBackground,
                          color: editingDevice ? currentTheme.textSecondary : currentTheme.textPrimary,
                          outline: 'none',
                          transition: 'all 0.2s',
                          cursor: editingDevice ? 'not-allowed' : 'text',
                          opacity: editingDevice ? 0.6 : 1
                        }}
                        onFocus={(e) => !editingDevice && (e.target.style.borderColor = currentTheme.primary)}
                        onBlur={(e) => !editingDevice && (e.target.style.borderColor = formErrors.deviceKey ? '#ef4444' : currentTheme.border)}
                        maxLength={1}
                      />
                    ))}
                  </div>

                  {/* Simulação de TV ligada - apenas no modo de criação */}
                  {!editingDevice && (
                    <div style={{
                      width: '120px',
                      height: '80px',
                      border: '3px solid #000',
                      borderRadius: '0px',
                      backgroundImage: 'url(/src/assets/img/add_device.jpeg)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '4px'
                    }}>
                      {/* Pixel verde simulando TV ligada */}
                      <div style={{
                        width: '4px',
                        height: '4px',
                        backgroundColor: '#22c55e',
                        borderRadius: '50%',
                        boxShadow: '0 0 4px #22c55e'
                      }}></div>
                    </div>
                  )}
                </div>

                {/* Alerta azul - apenas no modo de criação */}
                {!editingDevice && (
                  <div style={{
                    backgroundColor: '#dbeafe',
                    border: '1px solid #3b82f6',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-info-circle" style={{ color: '#3b82f6', fontSize: '1rem' }}></i>
                    <span style={{
                      color: '#1e40af',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      Esta chave está em sua TV no APP Vix Player | <a href="https://vixplay.altersoft.dev.br/public/apk" target='blank'>Baixar App </a>
                    </span>
                  </div>
                )}

                {/* Alerta para modo de edição */}
                {editingDevice && (
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #9ca3af',
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className="bi bi-lock" style={{ color: '#6b7280', fontSize: '1rem' }}></i>
                    <span style={{
                      color: '#6b7280',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      A chave do dispositivo não pode ser alterada após a criação. Em caso de perda do Dispositivo, entre em contato com o <a href="https://wa.me/5585994454472" target='blank'>suporte</a>.

                    </span>

                  </div>

                )}

                {formErrors.deviceKey && !editingDevice && (
                  <p style={{
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    margin: '0.5rem 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <i className="bi bi-exclamation-circle"></i>
                    {formErrors.deviceKey}
                  </p>
                )}
              </div>

              {/* Nome do Dispositivo */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  marginBottom: '0.5rem'
                }}>
                  Nome do Dispositivo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome do dispositivo"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${formErrors.name ? '#ef4444' : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
                  onBlur={(e) => e.target.style.borderColor = formErrors.name ? '#ef4444' : currentTheme.border}
                />
                {formErrors.name && (
                  <p style={{
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    margin: '0.25rem 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <i className="bi bi-exclamation-circle"></i>
                    {formErrors.name}
                  </p>
                )}
              </div>

              {/* Formato e Tipo */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem',
                marginBottom: '1.5rem'
              }}>
                {/* Formato */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.5rem'
                  }}>
                    Formato
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => handleInputChange('format', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `2px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary,
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="HORIZONTAL">Horizontal</option>
                    <option value="VERTICAL">Vertical</option>
                  </select>
                </div>

                {/* Tipo */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.5rem'
                  }}>
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `2px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary,
                      fontSize: '0.875rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="TV">TV</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Smartphone">Smartphone</option>
                    <option value="Computer">Computador</option>
                  </select>
                </div>
              </div>

              {/* Painel */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  marginBottom: '0.5rem'
                }}>
                  Painel *
                </label>
                <select
                  value={formData.panelId}
                  onChange={(e) => handleInputChange('panelId', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${formErrors.panelId ? '#ef4444' : currentTheme.border}`,
                    borderRadius: '0.5rem',
                    backgroundColor: currentTheme.inputBackground,
                    color: currentTheme.textPrimary,
                    fontSize: '0.875rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Selecione um painel</option>
                  {panels.map((panel) => (
                    <option key={panel.id} value={panel.id}>
                      {panel.name}
                    </option>
                  ))}
                </select>
                {formErrors.panelId && (
                  <p style={{
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    margin: '0.25rem 0 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <i className="bi bi-exclamation-circle"></i>
                    {formErrors.panelId}
                  </p>
                )}
              </div>

              {/* Geolocalização */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  marginBottom: '0.5rem'
                }}>
                  Localização do Dispositivo
                </label>

                {/* Tabs de navegação */}
                <div style={{
                  display: 'flex',
                  borderBottom: `1px solid ${currentTheme.border}`,
                  marginBottom: '1rem'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('map');
                      setTimeout(() => initCreateMap(), 100);
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      backgroundColor: activeTab === 'map' ? currentTheme.primary : 'transparent',
                      color: activeTab === 'map' ? '#fff' : currentTheme.textSecondary,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem 0.25rem 0 0'
                    }}
                  >
                    Mapa
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('address')}
                    style={{
                      padding: '0.5rem 1rem',
                      border: 'none',
                      backgroundColor: activeTab === 'address' ? currentTheme.primary : 'transparent',
                      color: activeTab === 'address' ? '#fff' : currentTheme.textSecondary,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      borderRadius: '0.25rem 0.25rem 0 0'
                    }}
                  >
                    Endereço
                  </button>
                </div>

                {/* Conteúdo das tabs */}
                {activeTab === 'address' && (
                  <div className="address-search-container" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Digite o endereço completo"
                      value={addressSearch}
                      onChange={(e) => handleAddressInputChange(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && searchByAddress(addressSearch)}
                      onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: currentTheme.inputBackground,
                        color: currentTheme.textPrimary,
                        fontSize: '0.875rem',
                        outline: 'none',
                        marginBottom: '0.5rem'
                      }}
                    />

                    {/* Dropdown de sugestões */}
                    {showSuggestions && addressSuggestions.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: currentTheme.cardBackground,
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto'
                      }}>
                        {addressSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            onClick={() => selectAddressSuggestion(suggestion)}
                            style={{
                              padding: '0.75rem',
                              cursor: 'pointer',
                              borderBottom: `1px solid ${currentTheme.border}`,
                              color: currentTheme.textPrimary,
                              fontSize: '0.875rem',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.hoverBackground}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            {suggestion.display_name}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Indicador de carregamento */}
                    {isSearching && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        right: '10px',
                        transform: 'translateY(-50%)',
                        color: currentTheme.textSecondary,
                        fontSize: '0.875rem'
                      }}>
                        Buscando...
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => searchByAddress(addressSearch)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: currentTheme.primary,
                        color: '#fff',
                        border: 'none',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Buscar
                    </button>
                  </div>
                )}

                {activeTab === 'map' && (
                  <div>
                    <div
                      id="createMap"
                      style={{
                        height: '300px',
                        width: '100%',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        marginBottom: '1rem'
                      }}
                    ></div>
                    <p style={{
                      fontSize: '0.875rem',
                      color: currentTheme.textSecondary,
                      marginBottom: '0.5rem'
                    }}>
                      Clique no mapa para selecionar a localização do dispositivo
                    </p>
                    <input
                      type="text"
                      placeholder="Coordenadas serão preenchidas automaticamente"
                      value={formData.location}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: currentTheme.inputBackground,
                        color: currentTheme.textPrimary,
                        fontSize: '0.875rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* Alerta de geolocalização - apenas quando há mensagem */}
                {geoAlert.show && (
                  <div style={{
                    backgroundColor: geoAlert.type === 'success' ? '#d1fae5' :
                      geoAlert.type === 'warning' ? '#fef3c7' : '#fee2e2',
                    border: `1px solid ${geoAlert.type === 'success' ? '#10b981' :
                      geoAlert.type === 'warning' ? '#f59e0b' : '#ef4444'}`,
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    marginTop: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <i className={`bi ${geoAlert.type === 'success' ? 'bi-check-circle' :
                      geoAlert.type === 'warning' ? 'bi-exclamation-triangle' : 'bi-exclamation-circle'}`}
                      style={{
                        color: geoAlert.type === 'success' ? '#10b981' :
                          geoAlert.type === 'warning' ? '#f59e0b' : '#ef4444', fontSize: '1rem'
                      }}></i>
                    <span style={{
                      color: geoAlert.type === 'success' ? '#065f46' :
                        geoAlert.type === 'warning' ? '#92400e' : '#991b1b',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}>
                      {geoAlert.message}
                    </span>
                  </div>
                )}
              </div>

              {/* Geolocalização - apenas no modo de criação (removido) */}
              {false && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: currentTheme.textPrimary,
                    marginBottom: '0.5rem'
                  }}>
                    Localização do Dispositivo
                  </label>

                  {/* Tabs de navegação */}
                  <div style={{
                    display: 'flex',
                    borderBottom: `1px solid ${currentTheme.border}`,
                    marginBottom: '1rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('map');
                        setTimeout(initEditMap, 100);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        backgroundColor: activeTab === 'map' ? currentTheme.primary : 'transparent',
                        color: activeTab === 'map' ? '#fff' : currentTheme.textSecondary,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem 0.25rem 0 0'
                      }}
                    >
                      Mapa
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('address')}
                      style={{
                        padding: '0.5rem 1rem',
                        border: 'none',
                        backgroundColor: activeTab === 'address' ? currentTheme.primary : 'transparent',
                        color: activeTab === 'address' ? '#fff' : currentTheme.textSecondary,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        borderRadius: '0.25rem 0.25rem 0 0'
                      }}
                    >
                      Endereço
                    </button>
                  </div>

                  {/* Conteúdo das tabs */}
                  {activeTab === 'address' && (
                    <div className="address-search-container" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <input
                          type="text"
                          value={addressSearch}
                          onChange={(e) => handleAddressInputChange(e.target.value)}
                          onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                          placeholder="Digite o endereço completo"
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            border: `2px solid ${currentTheme.border}`,
                            borderRadius: '0.5rem',
                            backgroundColor: currentTheme.inputBackground,
                            color: currentTheme.textPrimary,
                            fontSize: '0.875rem',
                            outline: 'none'
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && searchByAddress(addressSearch)}
                        />

                        {/* Dropdown de sugestões */}
                        {showSuggestions && addressSuggestions.length > 0 && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: '80px',
                            backgroundColor: currentTheme.cardBackground,
                            border: `1px solid ${currentTheme.border}`,
                            borderRadius: '0.5rem',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {addressSuggestions.map((suggestion) => (
                              <div
                                key={suggestion.id}
                                onClick={() => selectAddressSuggestion(suggestion)}
                                style={{
                                  padding: '0.75rem',
                                  cursor: 'pointer',
                                  borderBottom: `1px solid ${currentTheme.border}`,
                                  color: currentTheme.textPrimary,
                                  fontSize: '0.875rem',
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.hoverBackground}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                              >
                                {suggestion.display_name}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Indicador de carregamento */}
                        {isSearching && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            right: '90px',
                            transform: 'translateY(-50%)',
                            color: currentTheme.textSecondary,
                            fontSize: '0.875rem'
                          }}>
                            Buscando...
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => searchByAddress(addressSearch)}
                          style={{
                            padding: '0.75rem 1rem',
                            backgroundColor: currentTheme.primary,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                        >
                          <i className="bi bi-search"></i>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'map' && (
                    <div>
                      <div
                        id="editMap"
                        style={{
                          height: '300px',
                          border: `2px solid ${currentTheme.border}`,
                          borderRadius: '0.5rem',
                          marginBottom: '1rem'
                        }}
                      ></div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: currentTheme.textSecondary,
                        margin: 0
                      }}>
                        Clique no mapa para selecionar a localização do dispositivo
                      </p>
                    </div>
                  )}

                  {/* Campo de coordenadas */}
                  <input
                    type="text"
                    value={formData.geoLocation}
                    onChange={(e) => handleInputChange('geoLocation', e.target.value)}
                    placeholder="Coordenadas (lat, lng) ou deixe vazio"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `2px solid ${currentTheme.border}`,
                      borderRadius: '0.5rem',
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.textPrimary,
                      fontSize: '0.875rem',
                      outline: 'none',
                      marginTop: '1rem'
                    }}
                  />

                  {/* Alerta de geolocalização */}
                  {geoAlert.show && (
                    <div style={{
                      backgroundColor: geoAlert.type === 'success' ? '#dcfce7' :
                        geoAlert.type === 'warning' ? '#fef3c7' :
                          geoAlert.type === 'danger' ? '#fecaca' : '#dbeafe',
                      border: `1px solid ${geoAlert.type === 'success' ? '#22c55e' :
                        geoAlert.type === 'warning' ? '#f59e0b' :
                          geoAlert.type === 'danger' ? '#ef4444' : '#3b82f6'}`,
                      borderRadius: '0.375rem',
                      padding: '0.75rem',
                      marginTop: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <i className={`bi bi-${geoAlert.type === 'success' ? 'check-circle' :
                        geoAlert.type === 'warning' ? 'exclamation-triangle' :
                          geoAlert.type === 'danger' ? 'x-circle' : 'info-circle'}`}
                        style={{
                          color: geoAlert.type === 'success' ? '#16a34a' :
                            geoAlert.type === 'warning' ? '#d97706' :
                              geoAlert.type === 'danger' ? '#dc2626' : '#2563eb'
                        }}></i>
                      <span style={{
                        color: geoAlert.type === 'success' ? '#16a34a' :
                          geoAlert.type === 'warning' ? '#d97706' :
                            geoAlert.type === 'danger' ? '#dc2626' : '#2563eb',
                        fontSize: '0.875rem'
                      }}>
                        {geoAlert.message}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Texto Personalizado - apenas quando showClientInfo estiver marcado */}
              {/* Opções */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <input
                    type="checkbox"
                    id="sendNotification"
                    checked={formData.sendNotification}
                    onChange={(e) => handleInputChange('sendNotification', e.target.checked)}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      accentColor: currentTheme.primary
                    }}
                  />
                  <label
                    htmlFor="sendNotification"
                    style={{
                      fontSize: '0.875rem',
                      color: currentTheme.textPrimary,
                      cursor: 'pointer'
                    }}
                  >

                    Enviar notificações quando o dispositivo ficar offline
                  </label>
                </div>

                {/* Texto informativo para notificações */}
                <div style={{

                  fontSize: '0.75rem',
                  color: currentTheme.textSecondary,
                  marginBottom: '1rem',
                  marginLeft: '1.5rem',
                  fontStyle: 'italic'
                }}>

                  Se marcado, será notificado quando o dispositivo ficar offline
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <input
                    type="checkbox"
                    id="showClientInfo"
                    checked={formData.showClientInfo}
                    onChange={(e) => handleInputChange('showClientInfo', e.target.checked)}
                    style={{
                      width: '1rem',
                      height: '1rem',
                      accentColor: currentTheme.primary
                    }}
                  />
                  <label
                    htmlFor="showClientInfo"
                    style={{
                      fontSize: '0.875rem',
                      color: currentTheme.textPrimary,
                      cursor: 'pointer'
                    }}
                  >
                    Exibir informações do cliente na Tela
                  </label>
                </div>

                {/* Texto informativo para exibir informações */}
                <div style={{
                  fontSize: '0.75rem',
                  color: currentTheme.textSecondary,
                  marginBottom: '1rem',
                  marginLeft: '1.5rem',
                  fontStyle: 'italic'
                }}>
                  Se marcado, sua logo aparecerá no Dispositivo com o texto personalizado.
                </div>

                {/* Campo personalTextDevice condicionado */}
                {formData.showClientInfo && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: currentTheme.textPrimary,
                      marginBottom: '0.5rem'
                    }}>
                      Texto Personalizado
                    </label>
                    <textarea
                      value={formData.personalTextDevice}
                      onChange={(e) => handleInputChange('personalTextDevice', e.target.value)}
                      placeholder="Digite o texto personalizado que aparecerá no dispositivo"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: `2px solid ${currentTheme.border}`,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: currentTheme.background,
                        color: currentTheme.textPrimary,
                        resize: 'vertical',
                        minHeight: '80px',
                        fontFamily: 'inherit'
                      }}
                    />
                    <div style={{
                      fontSize: '0.75rem',
                      color: currentTheme.textSecondary,
                      marginTop: '0.25rem',
                      fontStyle: 'italic'
                    }}>
                      Este texto será exibido na barra inferior do dispositivo junto com sua logo
                    </div>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textSecondary,
                    border: `2px solid ${currentTheme.border}`,
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.border;
                    e.target.style.color = currentTheme.textPrimary;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: isSubmitting ? currentTheme.border : currentTheme.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: '1rem',
                        height: '1rem',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      {editingDevice ? 'Atualizando...' : 'Criando...'}
                    </>
                  ) : (
                    <>
                      <i className={editingDevice ? "bi bi-check-lg" : "bi bi-plus-lg"}></i>
                      {editingDevice ? 'Atualizar Dispositivo' : 'Criar Dispositivo'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '3rem',
                height: '3rem',
                backgroundColor: '#fef2f2',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="bi bi-exclamation-triangle" style={{
                  fontSize: '1.5rem',
                  color: '#ef4444'
                }}></i>
              </div>
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  margin: 0
                }}>
                  Confirmar Exclusão
                </h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: currentTheme.textSecondary,
                  margin: 0
                }}>
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            {/* Conteúdo */}
            <p style={{
              fontSize: '0.875rem',
              color: currentTheme.textPrimary,
              marginBottom: '2rem',
              lineHeight: '1.5'
            }}>
              Tem certeza que deseja excluir o dispositivo <strong>{deviceToDelete?.name}</strong>?
              Todos os dados relacionados a este dispositivo serão permanentemente removidos.
            </p>

            {/* Botões */}
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeviceToDelete(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `2px solid ${currentTheme.border}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.border;
                  e.target.style.color = currentTheme.textPrimary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = currentTheme.textSecondary;
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
              >
                <i className="bi bi-trash"></i>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Mapa dos Dispositivos */}
      {showMapModal && (
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
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.75rem',
            width: '95vw',
            height: '90vh',
            maxWidth: '1200px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Cabeçalho do Modal */}
            <div style={{
              padding: '1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary
                }}>
                  <i className="bi bi-geo-alt me-2"></i>
                  Mapa dos Dispositivos
                </h3>
                <p style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.875rem',
                  color: currentTheme.textSecondary
                }}>
                  Visualize a localização de todos os seus dispositivos
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: currentTheme.textSecondary,
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.hoverBackground}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Legenda */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: `1px solid ${currentTheme.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '2rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#28a745',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}></div>
                <span style={{ fontSize: '0.875rem', color: currentTheme.textPrimary }}>
                  Online
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  backgroundColor: '#dc3545',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}></div>
                <span style={{ fontSize: '0.875rem', color: currentTheme.textPrimary }}>
                  Offline
                </span>
              </div>
            </div>

            {/* Mapa */}
            <div style={{ flex: 1, padding: '1.5rem' }}>
              <div
                id="devicesMap"
                style={{
                  height: '100%',
                  borderRadius: '0.5rem',
                  border: `2px solid ${currentTheme.border}`
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Estilos alinhados com a página Clients
const getStyles = (currentTheme) => ({
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  statsCard: {
    padding: '1.5rem',
    backgroundColor: currentTheme.cardBackground,
    borderRadius: '0.75rem',
    border: `1px solid ${currentTheme.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'all 0.2s'
  },
  statsIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px'
  },
  statsValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: currentTheme.primary,
    margin: '0.25rem 0 0 0'
  },
  statsLabel: {
    margin: 0,
    fontSize: '0.875rem',
    color: currentTheme.textSecondary,
    fontWeight: '500'
  },
  tableCard: {
    backgroundColor: currentTheme.cardBackground,
    borderRadius: '0.75rem',
    border: `1px solid ${currentTheme.border}`,
    overflow: 'hidden'
  },
  tableHeader: {
    padding: '1.5rem',
    borderBottom: `1px solid ${currentTheme.border}`
  },
  tableTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: currentTheme.textPrimary,
    margin: 0
  }
});

export default Devices;
