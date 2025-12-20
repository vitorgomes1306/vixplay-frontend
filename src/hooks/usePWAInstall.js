useEffect(() => {
  console.log('usePWAInstall montado')

  const handler = (e) => {
    console.log('beforeinstallprompt DISPAROU')
    e.preventDefault()
    setDeferredPrompt(e)
    setIsInstallable(true)
  }

  window.addEventListener('beforeinstallprompt', handler)

  window.addEventListener('appinstalled', () => {
    console.log('App instalado')
    setIsInstallable(false)
    setDeferredPrompt(null)
  })

  return () => {
    window.removeEventListener('beforeinstallprompt', handler)
  }
}, [])
