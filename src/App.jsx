import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import AdminRoute from './components/ui/AdminRoute';
import Integrations from './pages/Integrations';
import Dash from './pages/Dash';
import Login from './pages/Login';
import Register from './pages/Register';
import Panels from './pages/Panels';
import PanelDetail from './pages/PanelDetail';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import Medias from './pages/Medias';
import Content from './pages/Content';
import Clients from './pages/Clients';
import Campaigns from './pages/Campaigns.jsx'; // Pagina de campanhas
import UserProfile from './pages/UserProfile'; // Página de perfil do usuário
import Admin from './pages/Admin'; // Página de administração
import GlobalMediasAdmin from './pages/GlobalMediasAdmin'; // CRUD de mídias globais (Admin)
import BatchLicense from './pages/BatchLicense'; // Página de licenciamento em lote
import LytexPayment from './pages/LytexPayment'; // Página de pagamento Lytex
import Erro404 from '../src/assets/img/404.webp'; // Imagem de erro 404

import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
        <div className="app">
          <Routes>
            {/* Rota principal redireciona para dashboard */}
            <Route path="/" element={<Navigate to="/dash" replace />} />
            
            {/* Rotas públicas (sem sidebar) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Rotas internas (com sidebar) - Protegidas */}
            <Route path="/dash" element={
              <ProtectedRoute>
                <Layout><Dash /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/panels" element={
              <ProtectedRoute>
                <Layout><Panels /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/panel/:id" element={
              <ProtectedRoute>
                <Layout><PanelDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/devices" element={
              <ProtectedRoute>
                <Layout><Devices /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/device/:id" element={
              <ProtectedRoute>
                <Layout><DeviceDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/medias" element={
              <ProtectedRoute>
                <Layout><Medias /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/content" element={
              <ProtectedRoute>
                <Layout><Content /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/clients" element={
              <ProtectedRoute>
                <Layout><Clients /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <Layout><Campaigns /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout><UserProfile /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout><Admin /></Layout>
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/admin/global-medias" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout><GlobalMediasAdmin /></Layout>
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/batch-license" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout><BatchLicense /></Layout>
                </AdminRoute>
              </ProtectedRoute>
            } />
            <Route path="/payment/:deviceId/:invoiceId" element={
              <ProtectedRoute>
                <Layout><LytexPayment /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <Layout><Integrations /></Layout>
              </ProtectedRoute>
            } />
          
          {/* Rota 404 */}
          <Route path="*" element={
            
            <div style={{ 
              display: 'flex', 
              color: '#1f2937',
              fontSize: '50px',
              fontFamily: 'Inter, sans-serif',
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100vh',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <img src={Erro404} alt="" />
              </div>
              404 - Tem essa página aqui não, óh!
              <a href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'underline' }}>
                Voltar ao Dashboard
              </a>
            </div>
          } />
        </Routes>
        </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
