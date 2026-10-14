'use client'

import dynamic from 'next/dynamic'
import { EffectBoundary } from '@/components/effects/effect-boundary'

/** Carga diferida: tsParticles no debe penalizar el primer render (A10). */
const Particles = dynamic(() => import('./particles-background').then((m) => m.ParticlesBackground), {
  ssr: false,
})

export function LazyParticlesBackground(props: { className?: string }) {
  return (
    <EffectBoundary>
      <Particles {...props} />
    </EffectBoundary>
  )
}
