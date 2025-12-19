import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Link2 } from 'lucide-react';

const UtilsShortener = () => {
  const { currentTheme } = useTheme();
  const [inputUrl, setInputUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [originalUrl, setOriginalUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    padding: '0.6rem 1rem',
    backgroundColor: currentTheme.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    transition: 'all 0.2s'
  };

  const cardStyle = {
    backgroundColor: currentTheme.cardBackground,
    border: `1px solid ${currentTheme.border}`,
    borderRadius: '0.75rem',
    padding: '1rem',
    boxShadow: currentTheme.shadow,
  };

  const normalizeUrl = (u) => {
    let s = (u || '').trim();
    if (!s) return '';
    if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
    try {
      // Validação de URL
      const parsed = new URL(s);
      return parsed.toString();
    } catch {
      return '';
    }
  };

  const generateId = (u) => {
    const random = Math.random().toString(36).slice(2, 8);
    const time = Date.now().toString(36).slice(-4);
    return `${random}${time}`.toLowerCase();
  };

  const handleShorten = async () => {
    setError('');
    setShortUrl('');
    setOriginalUrl('');
    const normalized = normalizeUrl(inputUrl);
    if (!normalized) {
      setError('Informe uma URL válida (ex.: https://exemplo.com/minha-pagina).');
      return;
    }
    setLoading(true);
    try {
      // Geração local do ID do link curto
      const id = generateId(normalized);
      const short = `https://vixplay.altersoft.dev.br/link-${id}`;
      setOriginalUrl(normalized);
      setShortUrl(short);
      // Opcional: copiar automaticamente
      try { await navigator.clipboard.writeText(short); } catch {}
    } catch (e) {
      setError('Falha ao gerar link curto.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleShorten();
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link2 size={24} color={currentTheme.textPrimary} />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: currentTheme.textPrimary,
            margin: 0
          }}>Encurtador de Link</h1>
        </div>
        <p style={{ color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
          Gere um link curto no formato {`https://vixplay.altersoft.dev.br/link-ID`} para compartilhar com seus clientes.
        </p>
      </div>

      <div style={cardStyle}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
          URL completa
        </label>
        <input
          type="url"
          placeholder="https://exemplo.com/pagina"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />
        <button onClick={handleShorten} disabled={loading} style={buttonStyle}>
          {loading ? 'Gerando...' : 'Encurtar'}
        </button>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginTop: '1rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        {(shortUrl || originalUrl) && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
            {originalUrl && (
              <div style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: currentTheme.background }}>
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem' }}>Original</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a href={originalUrl} target="_blank" rel="noopener noreferrer" style={{ color: currentTheme.primary, wordBreak: 'break-all' }}>{originalUrl}</a>
                  <button onClick={() => copy(originalUrl)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary, cursor: 'pointer' }}>Copiar</button>
                </div>
              </div>
            )}
            {shortUrl && (
              <div style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: currentTheme.background }}>
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem' }}>Link curto</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a href={shortUrl} target="_blank" rel="noopener noreferrer" style={{ color: currentTheme.primary, wordBreak: 'break-all' }}>{shortUrl}</a>
                  <button onClick={() => copy(shortUrl)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary, cursor: 'pointer' }}>Copiar</button>
                </div>
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  O redirecionamento deste link depende do suporte no backend.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilsShortener;