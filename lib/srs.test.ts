import { describe, expect, it } from 'vitest'
import { applyRating, emptySrs, isMastered, previewIntervals } from '@/lib/srs'
import type { Card } from '@/lib/types'

function card(): Card {
  const now = new Date(2026, 0, 1)
  return {
    id: 'c1',
    tipo: 'concepto',
    categoria: 'General',
    etiquetas: [],
    pregunta: '¿Qué es FSRS?',
    respuesta: 'Un algoritmo de repetición espaciada.',
    dificultad: 'basica',
    origen: 'manual',
    estado: 'revisada',
    creada: now.toISOString(),
    srs: emptySrs(now),
  }
}

describe('emptySrs', () => {
  it('crea una tarjeta en estado "nueva"', () => {
    const srs = emptySrs(new Date(2026, 0, 1))
    expect(srs.state).toBe('nueva')
    expect(srs.reps).toBe(0)
    expect(srs.lapses).toBe(0)
  })
})

describe('applyRating', () => {
  it('"Otra vez" (1) no avanza a estado de repaso maduro', () => {
    const c = card()
    const next = applyRating(c, 1, new Date(2026, 0, 1))
    expect(next.state).not.toBe('repaso')
    expect(next.lapses + next.reps).toBeGreaterThan(0)
  })

  it('calificar repetidamente con "Fácil" (4) hace crecer la estabilidad', () => {
    let c = card()
    let now = new Date(2026, 0, 1)
    for (let i = 0; i < 4; i++) {
      const srs = applyRating(c, 4, now)
      c = { ...c, srs }
      now = new Date(srs.due)
    }
    expect(c.srs.state === 'repaso' || c.srs.state === 'aprendiendo').toBe(true)
    expect(c.srs.stability).toBeGreaterThan(0)
  })

  it('el due queda siempre en el futuro respecto al momento de la calificación', () => {
    const c = card()
    const now = new Date(2026, 0, 1)
    const next = applyRating(c, 3, now)
    expect(new Date(next.due).getTime()).toBeGreaterThanOrEqual(now.getTime())
  })
})

describe('previewIntervals', () => {
  it('devuelve una vista previa para las 4 calificaciones', () => {
    const c = card()
    const preview = previewIntervals(c, new Date(2026, 0, 1))
    expect(Object.keys(preview).sort()).toEqual(['1', '2', '3', '4'])
  })
})

describe('isMastered', () => {
  it('una tarjeta nueva no está dominada', () => {
    expect(isMastered(card())).toBe(false)
  })

  it('una tarjeta en repaso con estabilidad >= 21 días está dominada', () => {
    const c = card()
    c.srs = { ...c.srs, state: 'repaso', stability: 25 }
    expect(isMastered(c)).toBe(true)
  })
})
