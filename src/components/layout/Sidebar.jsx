import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, Fragment } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import { apiService } from '../../services/api';
import Logo1 from '../../assets/img/vixplay1.png';
import Logo2 from '../../assets/img/vixplay2.png';
import LogoAltersoft1 from '../../assets/img/altersoft_logo_light.png';
import LogoAltersoft2 from '../../assets/img/altersoft_logo_dark.png';
import './Sidebar.css';

const Sidebar = ({ onToggle, isHidden, isMobile, onMobileClose }) => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [utilsOpen, setUtilsOpen] = useState(false);
  const { currentTheme, isDark } = useTheme();
  const { user } = useAuth();
  const normalizeFlag = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'sim';
    }
    if (typeof val === 'number') return val === 1;
    return !!val;
  };
  const [vipUnlocked, setVipUnlocked] = useState(false);
  const isVipClient = normalizeFlag(user?.vipClient) || vipUnlocked;
  const [companyLogo, setCompanyLogo] = useState(null);
  const restrictedPaths = new Set(['/clients', '/campaigns', '/integrations', '/utils']);

  // Buscar logo da empresa (Works) e priorizar no header do Sidebar
  useEffect(() => {
    let mounted = true;
    const fetchCompanyLogo = async () => {
      try {
        const response = await apiService.getWorks();
        const works = Array.isArray(response?.data) ? response.data : [];
        // Prioriza empresa com defaultLogo=true e logo definida; senão, usa a primeira com logo
        const preferred = works.find(w => !!w?.defaultLogo && !!w?.logo) || works.find(w => !!w?.logo);
        if (mounted) {
          setCompanyLogo(preferred?.logo || null);
        }
      } catch (err) {
        if (mounted) setCompanyLogo(null);
      }
    };
    const fetchVipFromProfile = async () => {
      try {
        const profileRes = await apiService.getProfile();
        const vip = normalizeFlag(profileRes?.data?.vipClient);
        if (mounted) setVipUnlocked(!!vip);
      } catch (_) {
        if (mounted) setVipUnlocked(false);
      }
    };
    fetchCompanyLogo();
    fetchVipFromProfile();
    const handleDefaultLogoUpdated = () => {
      fetchCompanyLogo();
    };
    window.addEventListener('works-default-logo-updated', handleDefaultLogoUpdated);
    return () => { mounted = false; };
  }, [user]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onToggle) {
      onToggle(newState);
    }
  };

  const handleMobileClose = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const menuItems = [
    {
      path: '/dash',
      name: 'Dashboard',
      icon: 'bi-speedometer2'
    },
    {
      path: '/panels',
      name: 'Painéis',
      icon: 'bi bi-pip'
    },
    {
      path: '/devices',
      name: 'Dispositivos',
      icon: 'bi bi-tv'
    },
    {
      path: '/medias',
      name: 'Mídias',
      icon: 'bi-play-circle'
    },
    {
      path: '/campaigns',
      name: 'Campanhas',
      icon: 'bi-megaphone'
    },
    {
      path: '/clients',
      name: 'Clientes',
      icon: 'bi-people'
    },
    {
      path: '/content',
      name: 'Conteúdo',
      icon: 'bi-file-earmark-text'
    },
    {
      path: '/reports',
      name: 'Relatórios',
      icon: 'bi-graph-up'
    },
    {
      path: '/utils',
      name: 'Utilidades',
      icon: 'bi bi-wrench-adjustable-circle'
    },
    {
      path: '/integrations',
      name: 'Integrações',
      icon: 'bi bi-box'
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && !isHidden && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
          onClick={handleMobileClose}
        />
      )}

      <div 
        className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
        style={{
          width: isCollapsed ? '70px' : '250px',
          height: '100vh',
          backgroundColor: currentTheme.sidebarBackground,
          color: currentTheme.textPrimary,
          position: 'fixed',
          left: isMobile ? (isHidden ? '-250px' : '0') : '0',
          top: 0,
          transition: 'all 0.3s ease',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Poppins, sans-serif',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {!isCollapsed && (
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.25rem',
              fontWeight: 'bold'
            }}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt="Logo da Empresa"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: '60px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              ) : (
                <img
                  src={isDark ? Logo1 : Logo2}
                  alt="Vix Play"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              )}
            </h2>
          )}
          <button
            onClick={handleToggle}
            style={{
              background: 'none',
              border: 'none',
              color: currentTheme.textPrimary,
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.25rem',
              display: window.innerWidth <= 768 ? 'none' : 'block',
              position: 'absolute',
              right: '0.75rem',
              top: '0.75rem'
            }}
          >
            <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {menuItems.map((item) => {
            const disabled = restrictedPaths.has(item.path) && !isVipClient;
            const commonStyles = {
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '0.75rem' : '0.75rem 1rem',
              color: isActive(item.path) ? currentTheme.primary : currentTheme.textSecondary,
              backgroundColor: isActive(item.path) ? currentTheme.primaryLight : 'transparent',
              textDecoration: 'none',
              borderLeft: isActive(item.path) ? `3px solid ${currentTheme.primary}` : '3px solid transparent',
              transition: 'all 0.2s ease',
              position: 'relative',
              opacity: disabled ? 0.5 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              pointerEvents: disabled ? 'none' : 'auto',
            };

            if (disabled) {
              return (
                <div
                  key={item.path}
                  style={commonStyles}
                  title={isCollapsed ? item.name : 'Disponível para clientes VIP'}
                >
                  <i className={`bi ${item.icon}`} style={{
                    fontSize: '1.2rem',
                    marginRight: isCollapsed ? 0 : '0.75rem',
                    minWidth: '20px'
                  }}></i>
                  {!isCollapsed && (
                    <span style={{
                      fontSize: '0.9rem',
                      fontFamily: 'Poppins, sans-serif',
                      fontWeight: '500'
                    }}>
                      {item.name}
                    </span>
                  )}
                  {/* Ícone VIP quando desabilitado */}
                  <i
                    className="bi bi-gem"
                    style={{
                      marginLeft: isCollapsed ? '0.5rem' : 'auto',
                      color: '#f59e0b',
                      fontSize: '1rem'
                    }}
                    aria-label="Recurso exclusivo para clientes VIP"
                  ></i>
                </div>
              );
            }

            // Custom rendering for Utils submenu
            if (item.path === '/utils') {
              const parentActive = location.pathname.startsWith('/utils');
              const parentStyles = {
                ...commonStyles,
                color: parentActive ? currentTheme.primary : currentTheme.textSecondary,
                backgroundColor: parentActive ? currentTheme.primaryLight : 'transparent',
                borderLeft: parentActive ? `3px solid ${currentTheme.primary}` : '3px solid transparent'
              };

              const subItemBase = {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                color: currentTheme.textSecondary,
                backgroundColor: 'transparent',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                fontSize: '0.85rem'
              };

              const SubLink = ({ to, label, icon }) => {
                const active = location.pathname === to;
                const styles = {
                  ...subItemBase,
                  color: active ? currentTheme.primary : currentTheme.textSecondary,
                  backgroundColor: active ? currentTheme.primaryLight : 'transparent',
                  borderLeft: active ? `3px solid ${currentTheme.primary}` : '3px solid transparent'
                };
                return (
                  <Link to={to} style={styles} key={to} onClick={handleMobileClose} title={label}>
                    <i className={`bi ${icon}`} style={{ fontSize: '1rem', marginRight: '0.5rem', minWidth: '16px' }}></i>
                    <span style={{ fontSize: '0.85rem', fontFamily: 'Poppins, sans-serif', fontWeight: 500 }}>{label}</span>
                  </Link>
                );
              };

              return (
                <Fragment key={item.path}>
                  <div
                    style={parentStyles}
                    onClick={() => !isCollapsed && setUtilsOpen((prev) => !prev)}
                    title={isCollapsed ? item.name : ''}
                    onMouseEnter={(e) => {
                      if (!parentActive) {
                        e.target.style.backgroundColor = currentTheme.borderLight;
                        e.target.style.color = currentTheme.textPrimary;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!parentActive) {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = currentTheme.textSecondary;
                      }
                    }}
                  >
                    <i className={`bi ${item.icon}`} style={{
                      fontSize: '1.2rem',
                      marginRight: isCollapsed ? 0 : '0.75rem',
                      minWidth: '20px'
                    }}></i>
                    {!isCollapsed && (
                      <span style={{
                        fontSize: '0.9rem',
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: '500'
                      }}>
                        Utilidades
                      </span>
                    )}
                    {!isCollapsed && (
                      <i className={`bi ${utilsOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} style={{ marginLeft: 'auto' }}></i>
                    )}
                  </div>
                  {!isCollapsed && utilsOpen && (
                    <div style={{}}>
                      <SubLink to="/utils/rss" label="Teste de RSS" icon="bi-rss" />
                      <SubLink to="/utils/shortener" label="Encurtador de Link" icon="bi-link-45deg" />
                      <SubLink to="/utils/qrcode" label="Gerador de QR Code" icon="bi-qr-code" />
                    </div>
                  )}
                </Fragment>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleMobileClose}
                style={commonStyles}
                onMouseEnter={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = currentTheme.borderLight;
                    e.target.style.color = currentTheme.textPrimary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path)) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = currentTheme.textSecondary;
                  }
                }}
                title={isCollapsed ? item.name : ''}
              >
                <i className={`bi ${item.icon}`} style={{
                  fontSize: '1.2rem',
                  marginRight: isCollapsed ? 0 : '0.75rem',
                  minWidth: '20px'
                }}></i>
                {!isCollapsed && (
                  <span style={{
                    fontSize: '0.9rem',
                    fontFamily: 'Poppins, sans-serif',
                    fontWeight: '500'
                  }}>
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: '1rem',
          borderTop: `1px solid ${currentTheme.border}`,
          fontSize: '0.75rem',
          color: currentTheme.textSecondary,
          textAlign: 'center',
          fontFamily: 'Poppins, sans-serif',
          fontWeight: '400'
        }}>
          <div>
          {window.innerWidth > 768 && !isCollapsed && (
            <a href="https://www.altersoft.dev.br" target="_blank" rel="noopener noreferrer">
              <img src={isDark ? LogoAltersoft2 : LogoAltersoft1} alt="Sistema desenvolvido por Altersoft" style={{ width: '100px', height: 'auto' }} />
            </a>
            
          )}
       
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;