import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import LogoVixPlay1 from '../assets/img/vixplay1.png'
import LogoVixPlay2 from '../assets/img/vixplay2.png'

const ChangePassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, currentTheme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const search = new URLSearchParams(location.search);
  const token = search.get('token');
  const email = search.get('email');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!token && !email) {
      setError('Link inválido: faltando token ou email.');
      return;
    }
    if (!password || !confirmPassword) {
      setError('Preencha a nova senha e a confirmação.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (token) {
        await apiService.confirmPasswordResetByToken({ token, password });
      } else if (email) {
        await apiService.confirmPasswordResetByEmail({ email, newPassword: password });
      }
      setMessage('Senha alterada com sucesso. Você pode fazer login.');
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg = err?.response?.data?.message;
      const isNetwork = !err?.response;
      let friendly = apiMsg
        || (status ? `Falha ao alterar a senha (HTTP ${status}).` : 'Falha ao alterar a senha. Verifique sua conexão com o servidor.');
      // Mensagem específica quando rota por token não existe no backend (404)
      if (status === 404 && token) {
        friendly = 'Fluxo de alteração por token não disponível no backend atual. Abra o link com ?email=seuemail ou gere um novo email.';
      }
      setError(friendly);
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoSrc = isDark ? LogoVixPlay1 : LogoVixPlay2;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: currentTheme.background,
        color: currentTheme.textPrimary,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: currentTheme.cardBackground,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '12px',
          padding: '24px',
          boxShadow: currentTheme.shadow,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img
            src={logoSrc}
            alt="Vix Play"
            style={{ width: '200px', height: 'auto' }}
          />
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Alterar senha</h1>
        <p style={{ fontSize: '14px', marginBottom: '16px', color: currentTheme.textMuted }}>
          Defina sua nova senha para acessar sua conta.
        </p>

        {(!token && !email) && (
          <div
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.textPrimary,
              border: `1px solid ${currentTheme.warning}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            Link inválido. Solicite um novo email de recuperação.
          </div>
        )}

        {message && (
          <div
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.textPrimary,
              border: `1px solid ${currentTheme.success}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: 'transparent',
              color: currentTheme.textPrimary,
              border: `1px solid ${currentTheme.error}`,
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '6px' }}>
              Nova senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                type={showNew ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a nova senha"
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.inputBorder}`,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.inputText,
                }}
              />
              <button
                type="button"
                aria-label={showNew ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentTheme.inputText,
                  fontSize: '1rem'
                }}
                title={showNew ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '6px' }}>
              Confirmar senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${currentTheme.inputBorder}`,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.inputText,
                }}
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: currentTheme.inputText,
                  fontSize: '1rem'
                }}
                title={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!token && !email)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: currentTheme.buttonPrimary,
              color: '#ffffff',
              cursor: (isSubmitting || (!token && !email)) ? 'not-allowed' : 'pointer',
              opacity: (isSubmitting || (!token && !email)) ? 0.7 : 1,
              fontWeight: 600,
            }}
          >
            {isSubmitting ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: currentTheme.primary,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;