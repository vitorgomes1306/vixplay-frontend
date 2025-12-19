import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Modo do tema: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState(() => {
    // Migração: aceitar chave antiga 'vixplay-theme' como fallback
    const savedMode = localStorage.getItem('vixplay-theme-mode') || localStorage.getItem('vixplay-theme');
    return savedMode || 'light';
  });

  // Tema efetivo aplicado, derivado do mode e preferência do sistema
  const [theme, setTheme] = useState(() => {
    const initialMode = localStorage.getItem('vixplay-theme-mode') || localStorage.getItem('vixplay-theme') || 'light';
    if (initialMode === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    }
    return initialMode;
  });

  // Persistir modo e resolver tema efetivo quando modo mudar
  useEffect(() => {
    try {
      localStorage.setItem('vixplay-theme-mode', themeMode);
    } catch {}
    if (themeMode === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(themeMode);
    }
  }, [themeMode]);

  // Ouvir mudanças do sistema quando em modo 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (themeMode === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    if (mql.addEventListener) mql.addEventListener('change', handler);
    else if (mql.addListener) mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handler);
      else if (mql.removeListener) mql.removeListener(handler);
    };
  }, [themeMode]);

  // Alternar apenas entre claro/escuro; se estiver em 'system', alterna para oposto do efetivo
  const toggleTheme = () => {
    if (themeMode === 'system') {
      setThemeMode(theme === 'dark' ? 'light' : 'dark');
    } else {
      setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    }
  };

  // Cores do tema
  const themes = {
    light: {
      // Background colors
      background: '#f9fafb',
      cardBackground: '#ffffff',
      sidebarBackground: '#ffffff',
      // Inputs
      inputBackground: '#ffffff',
      inputText: '#1f2937',
      inputBorder: '#e5e7eb',
      inputPlaceholder: '#9ca3af',
      
      // Text colors
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      
      // Border colors
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      
      // Button colors
      buttonPrimary: '#3b82f6',
      buttonPrimaryHover: '#2563eb',
      buttonDanger: '#ef4444',
      buttonDangerHover: '#dc2626',
      // Secondary surfaces/buttons
      secondary: '#f3f4f6',
      hoverBackground: '#e5e7eb',
      
      // Primary colors
      primary: '#3b82f6',
      primaryLight: '#dbeafe',
      
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      // Shadow
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
    },
    dark: {
      // Background colors
      background: '#111827',
      cardBackground: '#1f2937',
      sidebarBackground: '#1f2937',
      // Inputs
      inputBackground: '#111827',
      inputText: '#f9fafb',
      inputBorder: '#374151',
      inputPlaceholder: '#9ca3af',
      
      // Text colors
      textPrimary: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      
      // Border colors
      border: '#374151',
      borderLight: '#4b5563',
      
      // Button colors
      buttonPrimary: '#3b82f6',
      buttonPrimaryHover: '#2563eb',
      buttonDanger: '#ef4444',
      buttonDangerHover: '#dc2626',
      // Secondary surfaces/buttons
      secondary: '#374151',
      hoverBackground: '#4b5563',
      
      // Primary colors
      primary: '#60a5fa',
      primaryLight: '#1e40af20',
      
      // Status colors
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      
      // Shadow
      shadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
    }
  };

  const currentTheme = themes[theme];

  const value = {
    theme, // efetivo aplicado
    themeMode, // modo selecionado pelo usuário
    setThemeMode,
    currentTheme,
    toggleTheme,
    isDark: theme === 'dark'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};