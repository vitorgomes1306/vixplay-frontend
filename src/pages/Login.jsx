import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import Logo1 from '../assets/img/vixplay1.png';
import Logo2 from '../assets/img/vixplay2.png';
import fundoLogin from '../assets/img/fundo_login.png';
import fundoLogin2 from '../assets/img/fundo_login2.png';
import fundoLogin3 from '../assets/img/fundo_login3.png';
import fundoLogin4 from '../assets/img/fundo_login4.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : true);
  
  const { login } = useAuth();
  const { currentTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dash';

  // Fundo da coluna direita: imagens e transição suave
  const backgrounds = [fundoLogin, fundoLogin2, fundoLogin3, fundoLogin4];
  const [baseBgIndex, setBaseBgIndex] = React.useState(() => Math.floor(Math.random() * backgrounds.length));
  const [overlayBgIndex, setOverlayBgIndex] = React.useState(null);
  const [overlayOpacity, setOverlayOpacity] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      let next = Math.floor(Math.random() * backgrounds.length);
      if (backgrounds.length > 1 && next === baseBgIndex) {
        next = (baseBgIndex + 1) % backgrounds.length;
      }
      setOverlayBgIndex(next);
      setOverlayOpacity(0);
      setTimeout(() => {
        setOverlayOpacity(1);
      }, 50);
      setTimeout(() => {
        setBaseBgIndex(next);
        setOverlayBgIndex(null);
        setOverlayOpacity(0);
      }, 850);
    }, 10000);
    return () => clearInterval(interval);
  }, [baseBgIndex, backgrounds.length]);
  // Responsivo: controla esconder a imagem à direita em telas pequenas
  React.useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Normaliza diferentes formatos de isAdmin (boolean, string, number)
  const normalizeIsAdmin = (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      const s = val.trim().toLowerCase();
      return s === 'true' || s === '1' || s === 'yes' || s === 'sim';
    }
    if (typeof val === 'number') return val === 1;
    return !!val;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.login({ email, password });
      
      // Debug: verificar estrutura da resposta
      //console.log('Login - API response:', response.data);
      
      // Verificar se a resposta contém token (login bem-sucedido)
      if (response.data.token) {
        const { token } = response.data;
        
        // Garantir que o token esteja disponível para o interceptor antes de buscar o perfil
        try {
          localStorage.setItem('vixplay_token', token);
        } catch (storageErr) {
          //console.warn('Login - Falha ao salvar token no localStorage antes do perfil:', storageErr);
        }
        
        // Buscar perfil para garantir id, nome, email e isAdmin corretos
        let profile = {};
        try {
          const profileRes = await apiService.getProfile();
          profile = profileRes.data || {};
          //console.log('Login - Perfil obtido após login:', profile);
        } catch (pfErr) {
          //console.warn('Login - Falha ao obter perfil após login, usando dados da resposta de login como fallback');
          profile = {
            id: response.data?.id,
            name: response.data?.name,
            email: response.data?.email || email,
            isAdmin: response.data?.isAdmin,
            vipClient: response.data?.vipClient
          };
        }
        
        const user = {
          id: profile?.id ?? response.data?.id,
          name: profile?.name ?? response.data?.name,
          email: profile?.email ?? response.data?.email ?? email,
          isAdmin: normalizeIsAdmin(profile?.isAdmin ?? response.data?.isAdmin),
          vipClient: !!(profile?.vipClient ?? response.data?.vipClient),
        };
        
        // Debug: verificar dados do usuário
        //console.log('Login - User object final (normalizado):', user);
        
        login(user, token);
        navigate(from, { replace: true });
      } else {
        setError(response.data.message || 'Erro ao fazer login');
      }
    } catch (err) {
      //console.error('Erro no login:', err);
      setError(err.response?.data?.message || 'Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: currentTheme.background,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Coluna esquerda: formulário */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '1rem' : '2rem'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: currentTheme.cardBackground,
          borderRadius: '0.75rem',
          padding: '2rem',
          boxShadow: isDark 
            ? '0 10px 25px rgba(0, 0, 0, 0.3)' 
            : '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: `1px solid ${currentTheme.border}`
        }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <img 
            src={isDark ? Logo1 : Logo2} 
            alt="Vix Play" 
            style={{ 
              width: '200px', 
              height: 'auto',
              marginBottom: '1rem'
            }} 
          />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: currentTheme.textPrimary,
            margin: '0 0 0.5rem 0'
          }}>
            Bem-vindo de volta
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: '0.9rem',
            margin: 0
          }}>
            Faça login para acessar sua conta
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                fontSize: '1rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
              onBlur={(e) => e.target.style.borderColor = currentTheme.border}
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: currentTheme.textPrimary,
              marginBottom: '0.5rem'
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.5rem',
                fontSize: '1rem',
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => e.target.style.borderColor = currentTheme.primary}
              onBlur={(e) => e.target.style.borderColor = currentTheme.border}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isLoading ? currentTheme.textSecondary : currentTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = isDark ? '#60a5fa' : '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = currentTheme.primary;
              }
            }}
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{
            textAlign: 'center',
            fontSize: '0.875rem',
            color: currentTheme.textSecondary
          }}>
            Não tem uma conta?{' '}
            <a 
              href="/register" 
              style={{
                color: currentTheme.primary,
                textDecoration: 'none',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Cadastre-se
            </a>
          </div>
        </form>
        </div>
      </div>

      {/* Coluna direita: imagem full */}
      <div style={{
        flex: 1,
        display: isMobile ? 'none' : 'block',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${backgrounds[baseBgIndex]})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }} />
        {overlayBgIndex !== null && (
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${backgrounds[overlayBgIndex]})`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: overlayOpacity,
            transition: 'opacity 0.8s ease-in-out'
          }} />
        )}
      </div>
    </div>
  );
}

export default Login;
