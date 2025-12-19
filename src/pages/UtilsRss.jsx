import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Rss } from 'lucide-react';

const UtilsRss = () => {
  const { currentTheme } = useTheme();
  const [rssUrl, setRssUrl] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('json'); // 'json' | 'preview'

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

  const handleFetch = async () => {
    setError('');
    setResult(null);
    const url = rssUrl.trim();
    if (!url) {
      setError('Informe a URL do RSS.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://vixplay.altersoft.dev.br/api/public/rss?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error(`Falha ao buscar RSS (status ${res.status})`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Erro ao buscar RSS');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFetch();
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleString('pt-BR');
  };

  // Busca uma string XML dentro do objeto de resultado
  const extractXmlString = (data) => {
    if (!data) return null;
    const candidates = [
      typeof data === 'string' ? data : null,
      data.xml,
      data.rss,
      data.raw,
      data.content,
      data.feedXml,
      data.data?.xml,
      data.data?.rss,
      data.data?.raw,
      data.data?.content,
    ].filter(Boolean);
    for (const s of candidates) {
      if (typeof s === 'string' && /<rss|<feed/i.test(s)) return s;
    }
    // Busca profunda por uma string contendo RSS/Atom
    const visited = new Set();
    const stack = [data];
    let depth = 0;
    while (stack.length && depth < 6) {
      const node = stack.pop();
      if (!node || typeof node !== 'object' || visited.has(node)) continue;
      visited.add(node);
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (typeof val === 'string' && /<rss|<feed/i.test(val)) return val;
        if (val && typeof val === 'object') stack.push(val);
      }
      depth++;
    }
    return null;
  };

  // Parseia RSS/Atom XML em uma lista genérica de itens
  const parseItemsFromXml = (xmlString) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');
      // Tenta RSS (item) e Atom (entry)
      let nodes = Array.from(doc.querySelectorAll('rss > channel > item, channel > item, item'));
      if (!nodes.length) {
        nodes = Array.from(doc.querySelectorAll('feed > entry, entry'));
      }
      if (!nodes.length) return [];

      const items = nodes.map((node) => {
        const getText = (sel) => {
          const el = node.querySelector(sel);
          return el && el.textContent ? el.textContent.trim() : '';
        };
        const title = getText('title');
        let link = getText('link');
        // Atom: <link href="...">
        if (!link) {
          const aLink = node.querySelector('link[href]');
          if (aLink) link = aLink.getAttribute('href');
        }
        const pubDate = getText('pubDate') || getText('published') || getText('updated');
        const description = getText('description') || getText('content') || getText('content\\:encoded');

        // Imagem: enclosure, media:thumbnail, media:content, primeira <img> do conteúdo
        let image = null;
        const enclosure = node.querySelector('enclosure[url], enclosure');
        if (enclosure && enclosure.getAttribute('url')) {
          image = enclosure.getAttribute('url');
        }
        if (!image) {
          const mediaThumb = node.getElementsByTagName('media:thumbnail')[0];
          if (mediaThumb && mediaThumb.getAttribute('url')) image = mediaThumb.getAttribute('url');
        }
        if (!image) {
          const mediaContent = node.getElementsByTagName('media:content')[0];
          if (mediaContent && mediaContent.getAttribute('url')) image = mediaContent.getAttribute('url');
        }
        if (!image && description) {
          const match = description.match(/<img[^>]*src=["']([^"']+)["']/i);
          if (match && match[1]) image = match[1];
        }

        return { title, link, pubDate, description, image };
      });
      return items.filter(it => it.title || it.link || it.description);
    } catch (e) {
      return [];
    }
  };

  // Tenta resolver lista de itens do feed de forma genérica
  const getItems = () => {
    if (!result) return [];
    // Se o retorno já é um array de itens
    if (Array.isArray(result)) return result;
    const toArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      if (typeof val === 'object') return [val];
      return [];
    };

    const candidates = [
      result.items,
      result.entries,
      result.feed?.items,
      result.feed?.entries,
      result.feed?.entry,
      result.data?.items,
      result.data?.entries,
      result.data?.feed?.items,
      result.data?.feed?.entries,
      result.data?.feed?.entry,
      result.rss?.channel?.item,
      result.rss?.channel?.items,
      result.channel?.item,
      result.channel?.items,
      result.data?.rss?.channel?.item,
      result.data?.rss?.channel?.items,
      result.result?.items,
      result.result?.entries,
      result.list,
      result.articles,
      // Possíveis chaves em português
      result.dados,
      result.data?.dados,
      result.itens,
      result.data?.itens,
    ];
    for (const cand of candidates) {
      const arr = toArray(cand);
      if (arr.length) return arr;
    }

    // Fallback: busca profunda por primeira array de objetos com campos típicos
    // Fallback: busca profunda por primeira array de objetos com 'title' ou 'link'
    const visited = new Set();
    const stack = [result];
    let depth = 0;
    while (stack.length && depth < 5) {
      const node = stack.pop();
      if (!node || typeof node !== 'object' || visited.has(node)) continue;
      visited.add(node);
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (Array.isArray(val) && val.length && typeof val[0] === 'object') {
          const hasLikelyFields = (
            'title' in val[0] ||
            'link' in val[0] ||
            'pubDate' in val[0] ||
            'isoDate' in val[0]
          );
          if (hasLikelyFields) return val;
        } else if (val && typeof val === 'object') {
          stack.push(val);
        }
      }
      depth++;
    }
    return [];
  };

  const resolveImage = (item) => {
    // Campos comuns
    const direct = (
      item.imagem ||
      item.image ||
      item.thumbnail ||
      (item.enclosure && (item.enclosure.url || item.enclosure.link)) ||
      item.picture ||
      item.imageUrl ||
      item['media:thumbnail']?.url ||
      item['media:content']?.url ||
      null
    );
    if (direct) return direct;
    // Extrai primeira imagem do HTML da descrição/conteúdo
    const html = item.descricao || item.description || item.content || item['content:encoded'] || '';
    if (typeof html === 'string') {
      const match = html.match(/<img[^>]*src=["']([^"']+)["']/i);
      if (match && match[1]) return match[1];
    }
    return null;
  };

  // Normaliza um item para o formato esperado (português/inglês)
  const normalizeItem = (raw) => {
    const cleanStr = (s) => (typeof s === 'string' ? s.replace(/["`]/g, '').trim() : s);
    const title = cleanStr(raw.titulo || raw.title || raw.name || '');
    const link = cleanStr(raw.link || raw.url || raw.guid || '');
    const description = cleanStr(raw.descricao || raw.description || raw.summary || raw.content || raw['content:encoded'] || '');
    const date = cleanStr(raw.data || raw.pubDate || raw.date || raw.published || raw.updated || raw.updatedAt || raw.isoDate || null);
    const image = raw.imagem || resolveImage(raw);
    return { title, link, description, date, image };
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Rss size={24} color={currentTheme.textPrimary} />
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: currentTheme.textPrimary,
            margin: 0
          }}>Teste de RSS</h1>
        </div>
        <p style={{ color: currentTheme.textSecondary, marginTop: '0.25rem' }}>
          Cole abaixo a URL de um feed RSS. O resultado JSON retornado pela nossa API será exibido.
        </p>
      </div>

      <div style={cardStyle}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: currentTheme.textPrimary, fontSize: '0.9rem', fontWeight: '500' }}>
          URL do RSS
        </label>
        <input
          type="url"
          placeholder="https://exemplo.com/feed.xml"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          style={inputStyle}
        />
        <button onClick={handleFetch} disabled={loading} style={buttonStyle}>
          {loading ? 'Buscando...' : 'Buscar RSS'}
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

        {result && (
          <div style={{ marginTop: '1rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <button
                onClick={() => setActiveTab('json')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${currentTheme.border}`,
                  backgroundColor: activeTab === 'json' ? currentTheme.primaryLight : currentTheme.background,
                  color: activeTab === 'json' ? currentTheme.primary : currentTheme.textPrimary,
                  cursor: 'pointer'
                }}
              >
                JSON
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: `1px solid ${currentTheme.border}`,
                  backgroundColor: activeTab === 'preview' ? currentTheme.primaryLight : currentTheme.background,
                  color: activeTab === 'preview' ? currentTheme.primary : currentTheme.textPrimary,
                  cursor: 'pointer'
                }}
              >
                Visualização
              </button>
            </div>

            {activeTab === 'json' && (
              <pre style={{
                backgroundColor: currentTheme.background,
                color: currentTheme.textPrimary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                padding: '1rem',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}

            {activeTab === 'preview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                {/* Tenta itens do JSON; se falhar, tenta analisar XML bruto */}
                {(() => {
                  const jsonItems = getItems();
                  let itemsToRender = jsonItems;
                  if (!jsonItems.length) {
                    const xmlString = extractXmlString(result);
                    if (xmlString) itemsToRender = parseItemsFromXml(xmlString);
                  }

                  const normalized = itemsToRender.map(normalizeItem).filter(it => it.title || it.link || it.description);
                  if (!normalized.length) {
                    return (
                      <div style={{ color: currentTheme.textSecondary }}>Nenhum item encontrado no feed.</div>
                    );
                  }

                  // Estilo de página de notícias: destaque + lista
                  const featured = normalized[0];
                  const rest = normalized.slice(1);
                  const clamp3 = {
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  };
                  const to3Lines = (text) => {
                    const plain = String(text || '').replace(/<[^>]+>/g, '');
                    const lines = plain.split(/\r?\n/).filter(l => l.trim().length);
                    return lines.slice(0, 3).join('\n');
                  };

                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                      {/* Destaque principal */}
                      <div style={{ border: `1px solid ${currentTheme.border}`, borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: currentTheme.background }}>
                        {featured.image && (
                          <img src={featured.image} alt={featured.title} style={{ width: '100%', height: '260px', objectFit: 'cover' }} />
                        )}
                        <div style={{ padding: '0.75rem 1rem' }}>
                          <a href={featured.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ color: currentTheme.textPrimary, fontWeight: 700, fontSize: '1.15rem' }}>{featured.title || 'Sem título'}</div>
                          </a>
                          {featured.date && (
                            <div style={{ color: currentTheme.textSecondary, fontSize: '0.9rem', marginTop: '0.25rem' }}>{formatDate(featured.date)}</div>
                          )}
                          {featured.description && (
                            <div style={{ color: currentTheme.textSecondary, marginTop: '0.5rem', ...clamp3 }}>
                              {to3Lines(featured.description)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Lista de notícias */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                        {rest.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '0.75rem', border: `1px solid ${currentTheme.border}`, borderRadius: '0.5rem', padding: '0.75rem', backgroundColor: currentTheme.background }}>
                            {item.image && (
                              <img src={item.image} alt={item.title} style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '0.375rem' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            )}
                            <div style={{ flex: 1 }}>
                              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <div style={{ color: currentTheme.textPrimary, fontWeight: 600 }}>{item.title || 'Sem título'}</div>
                              </a>
                              {item.date && (
                                <div style={{ color: currentTheme.textSecondary, fontSize: '0.85rem', marginTop: '0.25rem' }}>{formatDate(item.date)}</div>
                              )}
                              {item.description && (
                                <div style={{ color: currentTheme.textSecondary, marginTop: '0.35rem', ...clamp3 }}>
                                  {to3Lines(item.description)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilsRss;