import { usePWAInstall } from '../hooks/usePWAInstall'

export default function InstallButton() {
  const { isInstallable, install } = usePWAInstall()

  if (!isInstallable) return null

  return (
    <button
      onClick={install}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        padding: '12px 20px',
        background: '#0A58CA',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontWeight: 600,
        cursor: 'pointer',
        zIndex: 9999,
      }}
    >
      Instalar VixPlay
    </button>
  )
}
