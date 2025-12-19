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
  const [theme, setTheme] = useState(() => {
    // Verifica se há um tema salvo no localStorage
    const savedTheme = localStorage.getItem('vixplay-theme');
    return savedTheme || 'light';
  });

  // Salva o tema no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('vixplay-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // Cores do tema
  const themes = {
    light: {
      // Background colors
      background: '#f9fafb',
      cardBackground: '#ffffff',
      sidebarBackground: '#ffffff',
      
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
    theme,
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