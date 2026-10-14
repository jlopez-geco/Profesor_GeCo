import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { endSession, isSessionPending, recordReview, skipTo, startSession } from '@/lib/session'
import { emptySrs } from '@/lib/srs'
import { dayKey } from '@/lib/dates'
import type { Card } from '@/lib/types'

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

beforeEach(async () => {
  await db.cards.clear()
  await db.reviews.clear()
  await db.sessions.clear()
  await db.settings.clear()
})

describe('startSession / isSessionPending', () => {
  it('arma una sesión con las tarjetas elegibles y queda pendiente', async () => {
    await db.cards.bulkAdd([card(), card(), card({ estado: 'borrador' })])
    const n = await startSession()
    expect(n).toBe(2)
    const session = await db.sessions.get('actual')
    expect(session?.cola).toHaveLength(2)
    expect(isSessionPending(session)).toBe(true)
  })

  it('una sesión de otro día no se considera pendiente', async () => {
    await db.cards.bulkAdd([card()])
    await startSession()
    const session = await db.sessions.get('actual')
    const ayer = { ...session!, dia: dayKey(new Date(Date.now() - 86400000)) }
    expect(isSessionPending(ayer)).toBe(false)
  })

  it('una sesión ya completada (indice === cola.length) no queda pendiente', async () => {
    await db.cards.bulkAdd([card()])
    await startSession()
    const session = await db.sessions.get('actual')
    const terminada = { ...session!, indice: session!.cola.length }
    expect(isSessionPending(terminada)).toBe(false)
  })
})

describe('recordReview', () => {
  it('guarda el repaso, actualiza el SRS de la tarjeta y avanza el índice', async () => {
    const c = card()
    await db.cards.add(c)
    await startSession()

    await recordReview(c, 3, 5000, 0)

    const updated = await db.cards.get(c.id)
    expect(updated?.srs.state).not.toBe('nueva')
    expect(updated?.srs.reps).toBeGreaterThan(0)

    const reviews = await db.reviews.toArray()
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ cardId: c.id, rating: 3, eraNueva: true })

    const session = await db.sessions.get('actual')
    expect(session?.indice).toBe(1)
  })

  it('recalifica la tarjeta en la misma sesión si vuelve a vencer pronto', async () => {
    const c = card()
    await db.cards.add(c)
    await startSession()

    await recordReview(c, 1, 1000, 0) // "Otra vez": vuelve a quedar due casi de inmediato

    const session = await db.sessions.get('actual')
    expect(session?.cola.length).toBeGreaterThan(1)
    expect(session?.cola.at(-1)).toBe(c.id)
  })
})

describe('skipTo / endSession', () => {
  it('skipTo mueve el índice de la sesión en curso', async () => {
    await db.cards.bulkAdd([card(), card(), card()])
    await startSession()
    await skipTo(2)
    const session = await db.sessions.get('actual')
    expect(session?.indice).toBe(2)
  })

  it('endSession borra la sesión en curso', async () => {
    await db.cards.bulkAdd([card()])
    await startSession()
    await endSession()
    expect(await db.sessions.get('actual')).toBeUndefined()
  })
})
