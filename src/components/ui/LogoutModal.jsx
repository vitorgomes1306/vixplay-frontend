import { useTheme } from '../../contexts/ThemeContext';
import ExitImg from '../../assets/img/exit.png';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  const { currentTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1050,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div 
          style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            width: '90%',
            maxWidth: '400px',
            border: `1px solid ${currentTheme.border}`,
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: `1px solid ${currentTheme.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h5 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: currentTheme.textPrimary,
              fontFamily: 'Poppins, sans-serif'
            }}>
              Confirmar Logout
            </h5>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                color: currentTheme.textSecondary,
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>

          {/* Modal Body */}
          <div style={{
            padding: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              color: '#f59e0b',
              marginBottom: '1rem'
            }}>
              <img src={ExitImg} alt="Exit" style={{ width: '8rem', height: '8rem' }} />
            </div>
            <p style={{
              margin: 0,
              fontSize: '1rem',
              color: currentTheme.textPrimary,
              fontFamily: 'Poppins, sans-serif',
              lineHeight: '1.5'
            }}>
              Tem certeza que deseja sair do sistema?
            </p>
          </div>

          {/* Modal Footer */}
          <div style={{
            padding: '1rem 1.5rem',
            borderTop: `1px solid ${currentTheme.border}`,
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'transparent',
                color: currentTheme.textSecondary,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = currentTheme.borderLight;
                e.target.style.color = currentTheme.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = currentTheme.textSecondary;
              }}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: 'Poppins, sans-serif',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#dc2626'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#ef4444'}
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </>
  );
};

export default LogoutModal;