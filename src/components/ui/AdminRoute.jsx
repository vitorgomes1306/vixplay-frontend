import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, isLoading } = useContext(AuthContext);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#6b7280'
      }}>
        Carregando...
      </div>
    );
  }

  // Se não está logado, redireciona para login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se não é admin, redireciona para dashboard
  if (!user.isAdmin) {
    console.log('AdminRoute - Usuário não é admin:', user);
    console.log('AdminRoute - user.isAdmin:', user.isAdmin);
    console.log('AdminRoute - Redirecionando para /dash');
    return <Navigate to="/dash" replace />;
  }

  console.log('AdminRoute - Usuário é admin, permitindo acesso:', user);

  // Se é admin, renderiza o componente
  return children;
};

export default AdminRoute;