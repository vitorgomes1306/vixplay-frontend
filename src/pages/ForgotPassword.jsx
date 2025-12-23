import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import LogoVixPlay1 from '../assets/img/vixplay1.png'
import LogoVixPlay2 from '../assets/img/vixplay2.png'


function ForgotPassword() {
  const { currentTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      await apiService.requestPasswordChange({ email });
      setSuccess('Um email foi enviado com instruções para recuperar sua senha.');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao solicitar recuperação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: currentTheme.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '1rem'
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
        {/* Logo Vix play  de acordo com o tema */}
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <img
            src={isDark ? LogoVixPlay1 : LogoVixPlay2}
            alt="Vix Play"
            style={{ width: '200px', height: 'auto' }}
          />
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: currentTheme.textPrimary,
          margin: '0 0 0.5rem 0',
          textAlign: 'center'
        }}>
          Recuperar senha
        </h1>
        <p style={{
          color: currentTheme.textSecondary,
          fontSize: '0.9rem',
          margin: 0,
          textAlign: 'center'
        }}>
          Informe seu email para receber o link de alteração.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '1.25rem' }}>
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
          {success && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              {success}
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

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: 'none',
              borderRadius: '0.5rem',
              backgroundColor: isSubmitting ? currentTheme.textMuted : currentTheme.buttonPrimary,
              color: 'white',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>

          <div style={{
            marginTop: '1rem',
            textAlign: 'center'
          }}>
            <a
              href="/login"
              style={{ color: currentTheme.primary, textDecoration: 'underline', fontSize: '0.9rem' }}
              onClick={(e) => { e.preventDefault(); navigate('/login'); }}
            >
              Voltar para login
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ForgotPassword;