import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se há token salvo no localStorage ao inicializar
  useEffect(() => {
    const savedToken = localStorage.getItem('vixplay_token');
    const savedUser = localStorage.getItem('vixplay_user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        const userData = JSON.parse(savedUser);
        console.log('AuthContext - Dados do usuário carregados do localStorage:', userData);
        console.log('AuthContext - userData.isAdmin do localStorage:', userData.isAdmin);
        console.log('AuthContext - Tipo de userData.isAdmin:', typeof userData.isAdmin);
        setUser(userData);
      } catch (error) {
        console.error('Erro ao recuperar dados de autenticação:', error);
        localStorage.removeItem('vixplay_token');
        localStorage.removeItem('vixplay_user');
      }
    }
    
    setIsLoading(false);
  }, []);

  // Função para fazer login
  const login = (userData, authToken) => {
    console.log('AuthContext - Login chamado com userData:', userData);
    console.log('AuthContext - userData.isAdmin:', userData.isAdmin);
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('vixplay_token', authToken);
    localStorage.setItem('vixplay_user', JSON.stringify(userData));
    console.log('AuthContext - Dados salvos no localStorage');
  };

  // Função para atualizar dados do usuário
  const updateUser = (updatedUserData) => {
    const newUserData = { ...user, ...updatedUserData };
    setUser(newUserData);
    localStorage.setItem('vixplay_user', JSON.stringify(newUserData));
    console.log('AuthContext - Dados do usuário atualizados:', newUserData);
  };

  // Função para fazer logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('vixplay_token');
    localStorage.removeItem('vixplay_user');
  };

  // Verificar se o usuário está autenticado
  const isAuthenticated = () => {
    return !!(user && token);
  };

  const value = {
    user,
    token,
    isLoading,
    login,
    logout,
    updateUser,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};