import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';

const UtilsQrCode = () => {
  const { currentTheme } = useTheme();
  const [text, setText] = useState('');
  const [pngDataUrl, setPngDataUrl] = useState('');
  const [svgDataUrl, setSvgDataUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [size, setSize] = useState(256);
  const [margin, setMargin] = useState(2);
  const [errorLevel, setErrorLevel] = useState('M'); // L | M | Q | H
  const [darkColor, setDarkColor] = useState('#000000');
  const [lightColor, setLightColor] = useState('#ffffff');

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

  const handleGenerate = async () => {
    setError('');
    setPngDataUrl('');
    setSvgDataUrl('');
    const value = (text || '').trim();
    if (!value) {
      setError('Informe um texto ou URL para gerar o QR Code.');
      return;
    }
    setLoading(true);
    try {
      const pngUrl = await QRCode.toDataURL(value, {
        width: size,
        margin,
        errorCorrectionLevel: errorLevel,
        color: { dark: darkColor, light: lightColor }
      });
      setPngDataUrl(pngUrl);

      const svgString = await QRCode.toString(value, {
        type: 'svg',
        margin,
        errorCorrectionLevel: errorLevel,
        color: { dark: darkColor, light: lightColor }
      });
      const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      setSvgDataUrl(svgUrl);
    } catch (e) {
      setError('Falha ao gerar QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch {}
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <QrCode size={24} color={currentTheme.textPrimary} />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: currentTheme.textPrimary,
            margin: 0
          }}>Gerador de QR Code</h1>
        </div>
        <p style={{ color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
          Crie QR Codes a partir de textos ou URLs e faça o download em PNG ou SVG.
        </p>
      </div>

      <div style={cardStyle}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
          Texto ou URL
        </label>
        <input
          type="text"
          placeholder="https://exemplo.com ou texto livre"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', color: currentTheme.textSecondary, marginBottom: '0.25rem' }}>Tamanho (px)</label>
            <input type="range" min="128" max="512" value={size} onChange={(e) => setSize(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ color: currentTheme.textSecondary, fontSize: '0.85rem' }}>{size}px</div>
          </div>
          <div>
            <label style={{ display: 'block', color: currentTheme.textSecondary, marginBottom: '0.25rem' }}>Margem</label>
            <input type="range" min="0" max="8" value={margin} onChange={(e) => setMargin(Number(e.target.value))} style={{ width: '100%' }} />
            <div style={{ color: currentTheme.textSecondary, fontSize: '0.85rem' }}>{margin}</div>
          </div>
          <div>
            <label style={{ display: 'block', color: currentTheme.textSecondary, marginBottom: '0.25rem' }}>Correção de erro</label>
            <select value={errorLevel} onChange={(e) => setErrorLevel(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.background, color: currentTheme.textPrimary }}>
              <option value="L">Baixa (L)</option>
              <option value="M">Média (M)</option>
              <option value="Q">Alta (Q)</option>
              <option value="H">Máxima (H)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: currentTheme.textSecondary, marginBottom: '0.25rem' }}>Cor escura</label>
              <input type="color" value={darkColor} onChange={(e) => setDarkColor(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: currentTheme.textSecondary, marginBottom: '0.25rem' }}>Cor clara</label>
              <input type="color" value={lightColor} onChange={(e) => setLightColor(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading} style={buttonStyle}>
          {loading ? 'Gerando...' : 'Gerar QR Code'}
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

        {(pngDataUrl || svgDataUrl) && (
          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
            {pngDataUrl && (
              <div style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: currentTheme.background }}>
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem', marginBottom: '0.5rem' }}>Prévia (PNG)</div>
                <img src={pngDataUrl} alt="QR Code" style={{ width: size, height: size }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <a href={pngDataUrl} download={`qrcode-${Date.now()}.png`} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary }}>Baixar PNG</a>
                  <button onClick={() => copy(pngDataUrl)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary, cursor: 'pointer' }}>Copiar PNG (DataURL)</button>
                </div>
              </div>
            )}

            {svgDataUrl && (
              <div style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: currentTheme.background }}>
                <div style={{ color: currentTheme.textSecondary, fontSize: '0.8rem', marginBottom: '0.5rem' }}>SVG</div>
                <img src={svgDataUrl} alt="QR Code SVG" style={{ width: size, height: size }} />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <a href={svgDataUrl} download={`qrcode-${Date.now()}.svg`} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary }}>Baixar SVG</a>
                  <button onClick={() => copy(svgDataUrl)} style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.cardBackground, color: currentTheme.textSecondary, cursor: 'pointer' }}>Copiar SVG (DataURL)</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilsQrCode;