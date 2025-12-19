/**
 * Utilitários para manipulação de avatares
 */

/**
 * Constrói a URL completa do avatar baseada no ambiente
 * @param {string} picturePath - Caminho da imagem do usuário
 * @returns {string|null} - URL completa do avatar ou null se não houver imagem
 */
export const getAvatarUrl = (picturePath) => {
  if (!picturePath) return null;
  
  // Se já é uma URL completa, retorna como está
  if (picturePath.startsWith('http')) {
    return picturePath;
  }
  
  // Determina a URL base baseada no ambiente
  let apiBaseUrl;
  
  // Verifica se está em produção
  if (window.location.hostname === 'vixplay.altersoft.dev.br' || 
      window.location.hostname.includes('altersoft.dev.br')) {
    apiBaseUrl = 'https://vixplay.altersoft.dev.br';
  } else {
    // Ambiente de desenvolvimento
    apiBaseUrl = window.APP_CONFIG?.API_BASE_URL || 'http://10.0.10.17:4000';
  }
  
  // Adiciona timestamp para evitar cache da imagem
  const timestamp = new Date().getTime();
  return `${apiBaseUrl}${picturePath}?t=${timestamp}`;
};

/**
 * Atualiza o contexto de autenticação com a nova URL do avatar
 * @param {Function} updateUser - Função do contexto para atualizar usuário
 * @param {string} picturePath - Novo caminho da imagem
 */
export const updateUserAvatar = (updateUser, picturePath) => {
  if (updateUser && picturePath) {
    // Salva apenas o caminho relativo no contexto, não a URL completa
    // A URL completa será construída sempre que necessário pela getAvatarUrl
    updateUser({ picture: picturePath });
  }
};