import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { emptySrs } from '@/lib/srs'
import type { Card } from '@/lib/types'

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    tipo: 'concepto',
    categoria: 'General',
    etiquetas: [],
    pregunta: '¿Pregunta?',
    respuesta: 'Respuesta',
    dificultad: 'basica',
    origen: 'manual',
    estado: 'revisada',
    creada: '2026-01-01T00:00:00.000Z',
    srs: emptySrs(new Date('2026-01-01')),
    ...overrides,
  }
}

beforeEach(async () => {
  await db.cards.clear()
})

describe('TarjetasRepo', () => {
  it('get/upsert/delete funcionan sobre una tarjeta individual', async () => {
    const c = card()
    await tarjetasRepo.upsert(c)
    expect(await tarjetasRepo.get(c.id)).toEqual(c)

    await tarjetasRepo.upsert({ ...c, respuesta: 'Actualizada' })
    expect((await tarjetasRepo.get(c.id))?.respuesta).toBe('Actualizada')

    await tarjetasRepo.delete(c.id)
    expect(await tarjetasRepo.get(c.id)).toBeUndefined()
  })

  it('list() devuelve todas las tarjetas guardadas', async () => {
    await tarjetasRepo.upsert(card())
    await tarjetasRepo.upsert(card())
    expect(await tarjetasRepo.list()).toHaveLength(2)
  })

  it('round-trip exportAll/importAll recupera exactamente el mismo estado', async () => {
    const cards = [card(), card({ categoria: 'Inglés' }), card({ estado: 'borrador' })]
    for (const c of cards) await tarjetasRepo.upsert(c)

    const exported = await tarjetasRepo.exportAll()
    expect(exported).toHaveLength(3)

    await tarjetasRepo.importAll(exported)
    const after = await tarjetasRepo.list()
    expect(after).toHaveLength(3)
    expect([...after].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...cards].sort((a, b) => a.id.localeCompare(b.id)),
    )
  })

  it('importAll reemplaza la biblioteca completa (no acumula con lo previo)', async () => {
    await tarjetasRepo.upsert(card())
    await tarjetasRepo.importAll([card(), card()])
    expect(await tarjetasRepo.list()).toHaveLength(2)
  })
})
