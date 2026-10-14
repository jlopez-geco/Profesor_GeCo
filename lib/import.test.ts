import { describe, expect, it } from 'vitest'
import { findDuplicate, mergeReplace, parseCards } from '@/lib/import'
import { emptySrs } from '@/lib/srs'
import type { Card } from '@/lib/types'

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: 'existente',
    tipo: 'concepto',
    categoria: 'Supabase',
    etiquetas: [],
    pregunta: '¿Qué es Row Level Security (RLS) en Supabase?',
    respuesta: 'Filtra filas por usuario.',
    dificultad: 'intermedia',
    origen: 'manual',
    estado: 'revisada',
    creada: '2026-01-01T00:00:00.000Z',
    srs: emptySrs(new Date('2026-01-01')),
    ...overrides,
  }
}

describe('parseCards', () => {
  it('valida un JSON de tarjetas bien formado', () => {
    const json = JSON.stringify([
      { tipo: 'concepto', categoria: 'Test', pregunta: '¿Qué es X?', respuesta: 'Es Y' },
    ])
    const { cards, errors } = parseCards(json, { origen: 'manual' })
    expect(errors).toHaveLength(0)
    expect(cards).toHaveLength(1)
    expect(cards[0].estado).toBe('revisada')
  })

  it('marca como borrador las tarjetas de origen IA', () => {
    const json = JSON.stringify([{ tipo: 'concepto', categoria: 'Test', pregunta: 'P', respuesta: 'R' }])
    const { cards } = parseCards(json, { origen: 'ia' })
    expect(cards[0].estado).toBe('borrador')
    expect(cards[0].origen).toBe('ia')
  })

  it('reporta errores legibles cuando falta un campo obligatorio', () => {
    const json = JSON.stringify([{ tipo: 'concepto', categoria: 'Test', respuesta: 'R' }])
    const { cards, errors } = parseCards(json, { origen: 'manual' })
    expect(cards).toHaveLength(0)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0].mensaje).toMatch(/pregunta/)
  })

  it('acepta JSON envuelto en un bloque de código markdown', () => {
    const json = '```json\n[{"tipo":"concepto","categoria":"Test","pregunta":"P","respuesta":"R"}]\n```'
    const { cards, errors } = parseCards(json, { origen: 'manual' })
    expect(errors).toHaveLength(0)
    expect(cards).toHaveLength(1)
  })

  it('rechaza JSON mal formado con un mensaje de error', () => {
    const { cards, errors } = parseCards('{ esto no es json', { origen: 'manual' })
    expect(cards).toHaveLength(0)
    expect(errors).toHaveLength(1)
  })
})

describe('findDuplicate', () => {
  it('detecta una pregunta muy similar como duplicado', () => {
    const existing = card()
    const incoming = card({ id: 'nueva', pregunta: '¿Qué es Row Level Security (RLS) en Supabase?' })
    const dup = findDuplicate(incoming, [existing])
    expect(dup?.existing.id).toBe('existente')
  })

  it('no marca como duplicado preguntas distintas', () => {
    const existing = card()
    const incoming = card({ id: 'nueva', pregunta: '¿Qué es una URL prefirmada de S3?' })
    const dup = findDuplicate(incoming, [existing])
    expect(dup).toBeNull()
  })
})

describe('mergeReplace', () => {
  it('conserva id, creada y srs de la tarjeta existente', () => {
    const existing = card({ srs: { ...emptySrs(new Date('2026-01-01')), reps: 5 } })
    const incoming = card({ id: 'otra', creada: '2026-02-01T00:00:00.000Z', respuesta: 'Contenido actualizado' })
    const merged = mergeReplace(existing, incoming)
    expect(merged.id).toBe(existing.id)
    expect(merged.creada).toBe(existing.creada)
    expect(merged.srs).toEqual(existing.srs)
    expect(merged.respuesta).toBe('Contenido actualizado')
  })
})
