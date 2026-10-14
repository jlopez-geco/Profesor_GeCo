import { describe, expect, it } from 'vitest'
import { forecast, masteryBreakdown, retention, retentionByCategory, streak, timeStudied, todayReviews } from '@/lib/stats'
import { emptySrs } from '@/lib/srs'
import type { Card, Review } from '@/lib/types'

let n = 0
function card(overrides: Partial<Card> = {}): Card {
  n++
  return {
    id: `c${n}`,
    tipo: 'concepto',
    categoria: 'General',
    etiquetas: [],
    pregunta: `P${n}`,
    respuesta: `R${n}`,
    dificultad: 'basica',
    origen: 'manual',
    estado: 'revisada',
    creada: new Date(2026, 0, n).toISOString(),
    srs: emptySrs(new Date(2026, 0, n)),
    ...overrides,
  }
}

function review(overrides: Partial<Review> = {}): Review {
  return {
    cardId: 'c1',
    rating: 3,
    fecha: new Date(2026, 5, 10).toISOString(),
    duracionMs: 5000,
    eraNueva: false,
    estadoPrevio: 'repaso',
    categoria: 'General',
    ...overrides,
  }
}

describe('streak', () => {
  it('cuenta días consecutivos hacia atrás, incluyendo hoy si ya se estudió', () => {
    const now = new Date(2026, 5, 10)
    const reviews = [
      review({ fecha: new Date(2026, 5, 10).toISOString() }),
      review({ fecha: new Date(2026, 5, 9).toISOString() }),
      review({ fecha: new Date(2026, 5, 8).toISOString() }),
    ]
    const s = streak(reviews, now)
    expect(s.count).toBe(3)
    expect(s.studiedToday).toBe(true)
  })

  it('si todavía no se estudia hoy, la racha sigue contando desde ayer', () => {
    const now = new Date(2026, 5, 10)
    const reviews = [review({ fecha: new Date(2026, 5, 9).toISOString() })]
    const s = streak(reviews, now)
    expect(s.count).toBe(1)
    expect(s.studiedToday).toBe(false)
  })

  it('un hueco de un día corta la racha', () => {
    const now = new Date(2026, 5, 10)
    const reviews = [review({ fecha: new Date(2026, 5, 10).toISOString() }), review({ fecha: new Date(2026, 5, 7).toISOString() })]
    expect(streak(reviews, now).count).toBe(1)
  })
})

describe('retention', () => {
  it('ignora las primeras vistas (eraNueva) y solo mide repasos', () => {
    const reviews = [review({ eraNueva: true, rating: 1 }), review({ eraNueva: false, rating: 3 }), review({ eraNueva: false, rating: 1 })]
    expect(retention(reviews)).toBe(50)
  })

  it('devuelve null si no hay repasos relevantes', () => {
    expect(retention([review({ eraNueva: true })])).toBeNull()
  })
})

describe('retentionByCategory', () => {
  it('agrupa por categoría y ordena por cantidad de repasos', () => {
    const reviews = [
      review({ categoria: 'A' }),
      review({ categoria: 'B' }),
      review({ categoria: 'B' }),
    ]
    const out = retentionByCategory(reviews)
    expect(out[0].categoria).toBe('B')
    expect(out[0].repasos).toBe(2)
  })
})

describe('masteryBreakdown', () => {
  it('clasifica nuevas, en aprendizaje, dominadas y borradores; ignora archivadas', () => {
    const now = new Date(2026, 5, 10)
    const cards = [
      card({ srs: emptySrs(now) }), // nueva
      card({ estado: 'borrador' }), // borrador
      card({ srs: { ...emptySrs(now), state: 'repaso', stability: 25 } }), // dominada
      card({ srs: { ...emptySrs(now), state: 'repaso', stability: 2 } }), // en aprendizaje
      card({ archivada: true }), // ignorada
    ]
    const m = masteryBreakdown(cards)
    expect(m).toEqual({ dominadas: 1, aprendiendo: 1, nuevas: 1, borradores: 1, total: 4 })
  })
})

describe('forecast', () => {
  it('cuenta las tarjetas estudiables (no nuevas) que vencen cada día', () => {
    const now = new Date(2026, 5, 10)
    const cards = [
      card({ srs: { ...emptySrs(now), state: 'repaso', due: new Date(2026, 5, 10, 23).toISOString() } }),
      card({ srs: { ...emptySrs(now), state: 'repaso', due: new Date(2026, 5, 12).toISOString() } }),
      card({ srs: emptySrs(now) }), // nueva: no cuenta en el forecast
    ]
    const f = forecast(cards, 7, now)
    expect(f).toHaveLength(7)
    expect(f[0].dia).toBe('Hoy')
    expect(f[0].repasos).toBe(1)
    expect(f[2].repasos).toBe(1)
  })
})

describe('timeStudied', () => {
  it('suma los minutos repasados por día', () => {
    const now = new Date(2026, 5, 10)
    const reviews = [review({ fecha: now.toISOString(), duracionMs: 60000 }), review({ fecha: now.toISOString(), duracionMs: 30000 })]
    const t = timeStudied(reviews, 7, now)
    expect(t.at(-1)?.dia).toBe('Hoy')
    expect(t.at(-1)?.minutos).toBe(1.5)
  })
})

describe('todayReviews', () => {
  it('filtra solo los repasos del día indicado', () => {
    const now = new Date(2026, 5, 10, 15)
    const reviews = [review({ fecha: now.toISOString() }), review({ fecha: new Date(2026, 5, 9).toISOString() })]
    expect(todayReviews(reviews, now)).toHaveLength(1)
  })
})
