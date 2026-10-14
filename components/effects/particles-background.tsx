'use client'

import { useEffect, useRef } from 'react'
import Particles, { ParticlesProvider, useParticlesProvider } from '@tsparticles/react'
import type { Container, Engine } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import { loadPerlinNoisePath, perlinNoisePathName } from '@tsparticles/path-perlin-noise'

async function initEngine(engine: Engine) {
  await loadSlim(engine)
  await loadPerlinNoisePath(engine)
}

const OPTIONS = {
  fullScreen: { enable: false },
  background: { color: { value: 'transparent' } },
  fpsLimit: 60,
  detectRetina: true,
  pauseOnBlur: true,
  pauseOnOutsideViewport: true,
  particles: {
    number: { value: 10, density: { enable: true, width: 1100, height: 1100 } },
    shape: { type: 'emoji', options: { emoji: { value: ['🎓', '📖', '✏️'] } } },
    opacity: { value: 0.3 },
    size: { value: { min: 14, max: 22 } },
    links: { enable: false },
    rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 2 } },
    move: {
      enable: true,
      speed: 0.6,
      direction: 'none' as const,
      random: false,
      straight: false,
      outModes: { default: 'out' as const },
      path: {
        enable: true,
        generator: perlinNoisePathName,
        options: { sampleFactor: 2, increment: 0.001 },
      },
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
 * Fondo de gorros de graduación, libros y lápices flotando (movimiento orgánico vía
 * Perlin noise), con baja densidad y opacidad. Vive en AppShell (A10): visible en toda
 * la app excepto en modo foco (Sesión de estudio), nunca interfiere con el contenido
 * (pointer-events-none, detrás de las tarjetas opacas).
 */
export function ParticlesBackground({ className }: { className?: string }) {
  return (
    <ParticlesProvider init={initEngine}>
      <Particulas className={className} />
    </ParticlesProvider>
  )
}
