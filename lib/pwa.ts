export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production') return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Sin service worker la app sigue funcionando normalmente, solo sin soporte offline.
  })
}
