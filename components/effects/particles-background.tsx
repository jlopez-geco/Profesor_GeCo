'use client'

import { useEffect, useRef } from 'react'
import Particles, { ParticlesProvider, useParticlesProvider } from '@tsparticles/react'
import type { Container } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'

const OPTIONS = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  pauseOnBlur: true,
  pauseOnOutsideViewport: true,
  particles: {
    number: { value: 14, density: { enable: true, width: 900, height: 900 } },
    color: { value: ['#022EBA', '#94A3B8'] },
    opacity: { value: 0.22 },
    size: { value: { min: 1, max: 3 } },
    links: { enable: false },
    move: {
      enable: true,
      speed: 0.35,
      direction: 'none' as const,
      random: true,
      outModes: { default: 'out' as const },
    },
  },
}

function Particulas({ className }: { className?: string }) {
  const { loaded } = useParticlesProvider()
  const containerRef = useRef<Container | undefined>(undefined)

  // tsParticles no pausa solo al cambiar de pestaña; lo hacemos manualmente (A10).
  useEffect(() => {
    function onVisibility() {
      const c = containerRef.current
      if (!c) return
      if (document.hidden) c.pause()
      else c.play()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!loaded) return null

  return (
    <Particles
      id="tsparticles-bg"
      className={className}
      options={OPTIONS}
      particlesLoaded={async (container) => {
        containerRef.current = container
      }}
    />
  )
}

/**
 * Fondo de partículas de muy baja densidad, derivado de la paleta de la app.
 * Solo se monta en Hoy y en el resultado de sesión (A10), nunca sobre contenido
 * que se necesite leer con precisión (Sesión de estudio, Biblioteca).
 */
export function ParticlesBackground({ className }: { className?: string }) {
  return (
    <ParticlesProvider init={async (engine) => { await loadSlim(engine) }}>
      <Particulas className={className} />
    </ParticlesProvider>
  )
}
