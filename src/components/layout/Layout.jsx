import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, updateUserAvatar } from '../../utils/avatarUtils';
import { apiService } from '../../services/api';
import LogoutModal from '../ui/LogoutModal';

const Layout = ({ children }) => {
  const { currentTheme, toggleTheme, isDark } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [checkedAvatar, setCheckedAvatar] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarHidden(true);
        setSidebarCollapsed(false);
      } else {
        setSidebarHidden(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Checa e atualiza a foto do usuário globalmente para todas as páginas
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!user || checkedAvatar) return;
      // Se já temos a foto, não precisa buscar
      if (user.picture && user.picture !== '0' && user.picture !== 'null') {
        setCheckedAvatar(true);
        return;
      }
      try {
        const res = await apiService.getProfile();
        const picturePath = res?.data?.picture;
        if (picturePath) {
          updateUserAvatar(updateUser, picturePath);
        }
      } catch (err) {
        // Silencia erros para não impactar navegação
        // console.warn('Falha ao obter foto do perfil:', err);
      } finally {
        setCheckedAvatar(true);
      }
    };
    fetchUserAvatar();
  }, [user, checkedAvatar, updateUser]);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  const toggleMobileSidebar = () => {
    setSidebarHidden(!sidebarHidden);
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    logout();
    navigate('/login');
    setShowLogoutModal(false);
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <div style={{ 
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: currentTheme.background
    }}>
      {/* Sidebar */}
      <Sidebar 
        onToggle={handleSidebarToggle} 
        isHidden={isMobile && sidebarHidden}
        isMobile={isMobile}
        onMobileClose={toggleMobileSidebar}
      />
      
      {/* Main Content Area */}
      <div 
        style={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? '70px' : '250px'),
          transition: 'margin-left 0.3s ease',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: isMobile ? '100%' : `calc(100vw - ${sidebarCollapsed ? '70px' : '250px'})`,
          position: 'relative'
        }}
      >
        {/* Top Header */}
        <header style={{
          backgroundColor: currentTheme.cardBackground,
          boxShadow: currentTheme.shadow,
          padding: '1rem 2rem',
          borderBottom: `1px solid ${currentTheme.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={toggleMobileSidebar}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    color: currentTheme.textPrimary,
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '0.375rem',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = currentTheme.borderLight;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  title="Menu"
                >
                  <i className="bi bi-list"></i>
                </button>
              )}
              
              <div>
                <h1 style={{ 
                  margin: 0,
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: currentTheme.textPrimary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Vix Play
                </h1>
                <p style={{
                  margin: '0.25rem 0 0 0',
                  fontSize: '0.875rem',
                  color: currentTheme.textSecondary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  Gerenciamento de mídias, dispovitivos, paineis, clientes e campanhas.
                </p>
              </div>
            </div>
            
            {/* User Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: currentTheme.borderLight,
                borderRadius: '0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => navigate('/profile')}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.border;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.borderLight;
              }}
              title="Acessar perfil do usuário"
              >
                {user?.picture ? (
                  <img 
                    src={getAvatarUrl(user.picture)} 
                    alt="Avatar do usuário"
                    style={{ 
                      width: '1.2rem', 
                      height: '1.2rem', 
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // Se a imagem falhar ao carregar, mostra o ícone padrão
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline';
                    }}
                  />
                ) : null}
                <i 
                  className="bi bi-person-circle" 
                  style={{ 
                    fontSize: '1.2rem', 
                    color: currentTheme.textPrimary,
                    display: user?.picture ? 'none' : 'inline'
                  }}
                ></i>
                <span style={{ 
                  fontSize: '0.875rem',
                  color: currentTheme.textPrimary,
                  fontFamily: 'Poppins, sans-serif'
                }}>
                  {user?.name || 'Usuário'}
                </span>
              </div>
              
              {/* Notifications Icon */}
              <button style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: currentTheme.textSecondary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = currentTheme.borderLight;
                e.target.style.color = currentTheme.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.textSecondary;
              }}
              onClick={() => navigate('/profile?tab=notificacoes')}
              title="Notificações"
              >
                <i className="bi bi-bell"></i>
                {/* Badge de notificação */}
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '8px',
                  height: '8px',
                  fontSize: '0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}></span>
              </button>
              
              {/* Admin Button - Only visible for admin users */}
              {(console.log('Layout - User data:', user) || console.log('Layout - user.isAdmin:', user?.isAdmin)) || user?.isAdmin && (
                <button style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  color: currentTheme.textSecondary,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '0.375rem',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = currentTheme.borderLight;
                  e.target.style.color = currentTheme.primary;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = currentTheme.textSecondary;
                }}
                onClick={() => navigate('/admin')}
                title="Administração"
                >
                  <i className="bi bi-gear-fill"></i>
                </button>
              )}
              
              {/* Theme Toggle Icon */}
              <button style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: currentTheme.textSecondary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = currentTheme.borderLight;
                e.target.style.color = currentTheme.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.textSecondary;
              }}
              onClick={toggleTheme}
              title={isDark ? "Alternar para tema claro" : "Alternar para tema escuro"}
              >
                <i className={isDark ? "bi bi-sun" : "bi bi-moon"}></i>
              </button>
              
              <button style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
              onClick={handleLogoutClick}
              >
                Sair
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main style={{
          flex: 1,
          padding: '2rem',
          overflow: 'auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{
          backgroundColor: currentTheme.cardBackground,
          borderTop: `1px solid ${currentTheme.border}`,
          padding: '1rem 2rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: currentTheme.textSecondary,
          fontFamily: 'Poppins, sans-serif'
        }}>
          <a 
            href="https://vixplay.altersoft.dev.br" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              color: 'inherit', 
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.target.style.color = currentTheme.primary || '#3b82f6'}
            onMouseLeave={(e) => e.target.style.color = 'inherit'}
          >
            © 2025 Vix Play - Sistema de Gerenciamento de Mídia indoor e Tv corporativa
          </a>
        </footer>
      </div>

      {/* Mobile Overlay */}
      {isMobile && !sidebarHidden && (
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
          onClick={() => setSidebarHidden(true)}
        />
      )}

      {/* Logout Modal */}
      <LogoutModal 
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

export default Layout;