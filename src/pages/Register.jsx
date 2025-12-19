import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiService } from '../services/api';
import Logo1 from '../assets/img/vixplay1.png';
import Logo2 from '../assets/img/vixplay2.png';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    cpfCnpj: '',
    cellphone: '',
    zipCode: '',
    city: '',
    state: '',
    street: '',
    number: '',
    complement: '',
    whereFind: '',
    zone: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [lastCepLookup, setLastCepLookup] = useState('');

  const { currentTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sanitizeCep = (cep) => (cep || '').replace(/\D/g, '');

  const lookupCep = async (rawCep) => {
    const cep = sanitizeCep(rawCep);
    if (cep.length !== 8 || cep === lastCepLookup) return;
    setIsFetchingCep(true);
    setError('');
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`);
      if (!res.ok) throw new Error('CEP não encontrado');
      const data = await res.json();
      setFormData(prev => ({
        ...prev,
        zipCode: prev.zipCode, // mantém o escrito
        city: data.city || prev.city,
        state: data.state || prev.state,
        street: data.street || prev.street,
        zone: data.neighborhood || prev.zone
      }));
      setLastCepLookup(cep);
    } catch (err) {
      // Não bloqueia fluxo, apenas informa erro se necessário
      // Opcionalmente: setError('Não foi possível localizar o endereço pelo CEP');
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleZipChange = (e) => {
    handleChange(e);
    const digits = sanitizeCep(e.target.value);
    if (digits.length === 8) {
      lookupCep(digits);
    }
  };

  const handleZipBlur = (e) => {
    const digits = sanitizeCep(e.target.value);
    if (digits.length === 8) {
      lookupCep(digits);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validações básicas
    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      // Preparar dados para envio (remover confirmPassword)
      const { confirmPassword, ...dataToSend } = formData;

      const response = await apiService.register(dataToSend);

      if (response.data.success || response.status === 201) {
        setSuccess('Cadastro realizado com sucesso! Redirecionando para login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.message || 'Erro ao realizar cadastro');
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setError(err.response?.data?.message || 'Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: currentTheme.background,
    color: currentTheme.textPrimary,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: '0.375rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
    marginBottom: '1rem'
  };

  const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: currentTheme.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    opacity: isLoading ? 0.7 : 1,
    transition: 'all 0.2s'
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: currentTheme.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
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
            Criar Conta
          </h1>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: '0.9rem',
            margin: 0
          }}>
            Preencha os dados para criar sua conta
          </p>
        </div>

        {/* Mensagens */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {success}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Nome Completo *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Senha *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Confirmar Senha *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="Confirme sua senha"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                CPF/CNPJ *
              </label>
              <input
                type="text"
                name="cpfCnpj"
                value={formData.cpfCnpj}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Whatsapp *
              </label>
              <input
                type="tel"
                name="cellphone"
                value={formData.cellphone}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                CEP
              </label>
              <input
                type="text"
                name="zipCode"
                value={formData.zipCode}
                onChange={handleZipChange}
                onBlur={handleZipBlur}
                style={inputStyle}
                placeholder="00000-000"
              />
              {isFetchingCep && (
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem', marginTop: '-0.75rem', marginBottom: '0.75rem' }}>
                  Buscando endereço pelo CEP...
                </div>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Cidade
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Sua cidade"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Estado
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                style={inputStyle}
                placeholder="UF"
                maxLength="2"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Rua
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Nome da rua"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Número
              </label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                style={inputStyle}
                placeholder="123"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
                Bairro
              </label>
              <input
                type="text"
                name="zone"
                value={formData.zone}
                onChange={handleChange}
                style={inputStyle}
                placeholder="Bairro"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
              Complemento
            </label>
            <input
              type="text"
              name="complement"
              value={formData.complement}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Apartamento, bloco, etc."
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: currentTheme.textPrimary,
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
            >
              Onde nos encontrou?
            </label>
            <select
              name="whereFind"
              value={formData.whereFind}
              onChange={handleChange}
              required
              style={{
                ...inputStyle,
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">Selecione uma opção</option>
              <option value="Google">Google</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="Linkedin">Linkedin</option>
              <option value="Youtube">Youtube</option>
              <option value="Indicação">Indicação</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={buttonStyle}
          >
            {isLoading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        {/* Link para login */}
        <div style={{
          textAlign: 'center',
          marginTop: '1.5rem'
        }}>
          <p style={{
            color: currentTheme.textSecondary,
            fontSize: '0.9rem',
            margin: 0
          }}>
            Já tem uma conta?{' '}
            <Link
              to="/login"
              style={{
                color: currentTheme.primary,
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
