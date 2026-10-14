import { describe, expect, it } from 'vitest'
import { buildQueue, interleave, isStudyable, newSeenToday } from '@/lib/queue'
import { emptySrs } from '@/lib/srs'
import type { AppSettings, Card, Review } from '@/lib/types'

let n = 0
function card(overrides: Partial<Card> = {}): Card {
  n++
  return {
    id: `c${n}`,
    tipo: 'concepto',
    categoria: 'General',
    etiquetas: [],
    pregunta: `Pregunta ${n}`,
    respuesta: `Respuesta ${n}`,
    dificultad: 'basica',
    origen: 'manual',
    estado: 'revisada',
    creada: new Date(2026, 0, n).toISOString(),
    srs: emptySrs(new Date(2026, 0, n)),
    ...overrides,
  }
}

const settings: AppSettings = { limiteNuevas: 10, objetivoMinutos: 5, categorias: [] }

describe('isStudyable', () => {
  it('excluye borradores', () => {
    expect(isStudyable(card({ estado: 'borrador' }))).toBe(false)
  })
  it('excluye archivadas', () => {
    expect(isStudyable(card({ archivada: true }))).toBe(false)
  })
  it('incluye tarjetas revisadas y no archivadas', () => {
    expect(isStudyable(card())).toBe(true)
  })
})

describe('interleave', () => {
  it('evita dos tarjetas seguidas de la misma categoría cuando es posible', () => {
    const cards = [
      card({ categoria: 'A' }),
      card({ categoria: 'A' }),
      card({ categoria: 'B' }),
      card({ categoria: 'B' }),
    ]
    const out = interleave(cards)
    expect(out).toHaveLength(4)
    for (let i = 1; i < out.length; i++) {
      if (out[i].categoria === out[i - 1].categoria) {
        // Solo aceptable si ya no quedan otras categorías disponibles.
        const remaining = out.slice(i).map((c) => c.categoria)
        expect(new Set(remaining).size).toBe(1)
      }
    }
  })
})

describe('buildQueue', () => {
  it('excluye tarjetas en borrador de la cola', () => {
    const cards = [card({ estado: 'borrador' }), card()]
    const queue = buildQueue(cards, [], settings)
    expect(queue).toEqual([cards[1].id])
  })

  it('prioriza vencidas antes que nuevas y respeta el cupo diario', () => {
    const now = new Date(2026, 5, 10)
    const vencida = card({ srs: { ...emptySrs(now), state: 'repaso', due: new Date(2026, 5, 9).toISOString() } })
    const nuevas = Array.from({ length: 15 }, () => card({ srs: emptySrs(now) }))
    const queue = buildQueue([vencida, ...nuevas], [], { ...settings, limiteNuevas: 5 }, {}, now)
    expect(queue[0]).toBe(vencida.id)
    // 1 vencida + hasta 5 nuevas (cupo diario)
    expect(queue.length).toBeLessThanOrEqual(6)
  })

  it('respeta las nuevas ya vistas hoy al calcular el cupo', () => {
    const now = new Date(2026, 5, 10)
    const nuevas = Array.from({ length: 5 }, () => card({ srs: emptySrs(now) }))
    const reviews: Review[] = [
      { cardId: 'visto-1', rating: 3, fecha: now.toISOString(), duracionMs: 1000, eraNueva: true, estadoPrevio: 'nueva', categoria: 'General' },
      { cardId: 'visto-2', rating: 3, fecha: now.toISOString(), duracionMs: 1000, eraNueva: true, estadoPrevio: 'nueva', categoria: 'General' },
    ]
    const queue = buildQueue(nuevas, reviews, { ...settings, limiteNuevas: 3 }, {}, now)
    expect(queue.length).toBe(1) // cupo 3 - 2 vistas = 1
  })

  it('inyecta un desafío de código a mitad de la cola si no hay ninguno entre las vencidas/nuevas elegidas', () => {
    const now = new Date(2026, 5, 10)
    // Vencidas (no dependen del cupo de nuevas):
    const vencidas = Array.from({ length: 4 }, () =>
      card({ srs: { ...emptySrs(now), state: 'repaso', due: new Date(2026, 5, 9).toISOString() } }),
    )
    // Desafío de código "nueva": con cupo 0 queda fuera de la selección normal.
    const challenge = card({ tipo: 'desafio_codigo', srs: emptySrs(now) })
    const queue = buildQueue([...vencidas, challenge], [], { ...settings, limiteNuevas: 0 }, {}, now)
    expect(queue).toContain(challenge.id)
    const pos = queue.indexOf(challenge.id)
    expect(pos).toBeGreaterThan(0)
  })
})

describe('buildQueue con filtro', () => {
  it('options.filter restringe la cola a un subconjunto (ej. idioma/dominio)', () => {
    const now = new Date(2026, 5, 10)
    const ingles = card({ idioma: { lengua: 'en', dominio: 'software', nivel: 'B1', registro: 'neutro', falsos_amigos: [], audio: true }, srs: emptySrs(now) })
    const frances = card({ idioma: { lengua: 'fr', dominio: 'conversacional', nivel: 'A1', registro: 'neutro', falsos_amigos: [], audio: true }, srs: emptySrs(now) })
    const tecnica = card({ srs: emptySrs(now) })
    const queue = buildQueue([ingles, frances, tecnica], [], settings, { filter: (c) => c.idioma?.lengua === 'fr' }, now)
    expect(queue).toEqual([frances.id])
  })

  it('options.extraNew permite adelantar nuevas por sobre el cupo diario', () => {
    const now = new Date(2026, 5, 10)
    const nuevas = Array.from({ length: 5 }, () => card({ srs: emptySrs(now) }))
    const sinExtra = buildQueue(nuevas, [], { ...settings, limiteNuevas: 2 }, {}, now)
    const conExtra = buildQueue(nuevas, [], { ...settings, limiteNuevas: 2 }, { extraNew: 3 }, now)
    expect(sinExtra.length).toBe(2)
    expect(conExtra.length).toBe(5)
  })
})

describe('newSeenToday', () => {
  it('cuenta solo repasos de tarjetas nuevas del día de hoy', () => {
    const now = new Date(2026, 5, 10, 10)
    const reviews: Review[] = [
      { cardId: 'a', rating: 3, fecha: now.toISOString(), duracionMs: 1, eraNueva: true, estadoPrevio: 'nueva', categoria: 'x' },
      { cardId: 'b', rating: 3, fecha: new Date(2026, 5, 9).toISOString(), duracionMs: 1, eraNueva: true, estadoPrevio: 'nueva', categoria: 'x' },
      { cardId: 'c', rating: 3, fecha: now.toISOString(), duracionMs: 1, eraNueva: false, estadoPrevio: 'repaso', categoria: 'x' },
    ]
    expect(newSeenToday(reviews, now)).toBe(1)
  })
})
