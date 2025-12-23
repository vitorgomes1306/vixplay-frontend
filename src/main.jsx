import { StrictMode } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

import { registerSW } from 'virtual:pwa-register'

registerSW({
  immediate: true, // ← IMPORTANTE EM PRODUÇÃO
  onOfflineReady() {
    console.log('PWA pronto para uso offline')
  },
  onNeedRefresh() {
    console.log('Nova versão disponível')
  },
})

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || (window.APP_CONFIG?.GOOGLE_CLIENT_ID ?? '');

createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <StrictMode>
      <App />
    </StrictMode>
  </GoogleOAuthProvider>
)
