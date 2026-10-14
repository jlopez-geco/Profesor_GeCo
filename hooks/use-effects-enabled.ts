'use client'

import { useEffect, useState } from 'react'
import { useSettings } from '@/hooks/use-data'

/**
 * true solo si el usuario no desactivó "Efectos visuales" en Ajustes Y su sistema
 * no pide prefers-reduced-motion. Ningún efecto (tsParticles, Motion, confetti) debe
 * montarse si esto da false — la app debe verse y funcionar igual sin ellos (A10).
 */
export function useEffectsEnabled() {
  const settings = useSettings()
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!settings) return false
  return settings.efectosVisuales && !reducedMotion
}
