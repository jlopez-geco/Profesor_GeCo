import Ajv, { type ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import localizeEs from 'ajv-i18n/localize/es'
import { cardSchema } from '@/lib/schema/card-schema'
import { emptySrs } from '@/lib/srs'
import { DUPLICATE_THRESHOLD, similarity } from '@/lib/similarity'
import type { Card, Origen } from '@/lib/types'

const ajv = new Ajv({ allErrors: true, strict: false })
addFormats(ajv)
const validateCard = ajv.compile(cardSchema)

export interface ImportError {
  ruta: string
  mensaje: string
}

export interface ParseResult {
  cards: Card[]
  errors: ImportError[]
}

export function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = (fenced ? fenced[1] : text).trim()
  if (fenced) return body
  const start = body.search(/[[{]/)
  return start > 0 ? body.slice(start) : body
}

function describeJsonError(err: unknown, src: string): ImportError {
  const msg = err instanceof Error ? err.message : String(err)
  const pos = Number(msg.match(/position (\d+)/)?.[1])
  if (!Number.isNaN(pos)) {
    const before = src.slice(0, pos)
    const line = before.split('\n').length
    const col = pos - before.lastIndexOf('\n')
    return { ruta: `línea ${line}, columna ${col}`, mensaje: 'El JSON no es válido cerca de este punto. Revisa comas, comillas y llaves.' }
  }
  return { ruta: 'documento', mensaje: `El texto no es JSON válido (${msg}).` }
}

function formatAjvError(e: ErrorObject, index: number): ImportError {
  const base = `tarjeta ${index + 1}`
  const path = e.instancePath ? e.instancePath.replace(/^\//, '').replace(/\//g, ' › ') : ''
  let mensaje = e.message ?? 'valor no válido'
  if (e.keyword === 'required') mensaje = `falta el campo obligatorio "${(e.params as { missingProperty: string }).missingProperty}"`
  if (e.keyword === 'additionalProperties')
    mensaje = `el campo "${(e.params as { additionalProperty: string }).additionalProperty}" no es parte del esquema`
  if (e.keyword === 'enum') mensaje = `${mensaje}: ${(e.params as { allowedValues: string[] }).allowedValues.join(', ')}`
  return { ruta: path ? `${base} › ${path}` : base, mensaje }
}

export interface NormalizeOptions {
  origen: Origen
  /** Si es true, toda tarjeta entra como borrador sin importar lo que traiga. */
  forzarBorrador?: boolean
}

export function parseCards(text: string, options: NormalizeOptions): ParseResult {
  const src = extractJson(text)
  if (!src) return { cards: [], errors: [{ ruta: 'documento', mensaje: 'Pega el JSON con tus tarjetas.' }] }

  let data: unknown
  try {
    data = JSON.parse(src)
  } catch (err) {
    return { cards: [], errors: [describeJsonError(err, src)] }
  }

  let list: unknown[]
  if (Array.isArray(data)) list = data
  else if (data && typeof data === 'object' && Array.isArray((data as { tarjetas?: unknown }).tarjetas))
    list = (data as { tarjetas: unknown[] }).tarjetas
  else if (data && typeof data === 'object') list = [data]
  else return { cards: [], errors: [{ ruta: 'documento', mensaje: 'Se esperaba una tarjeta, un arreglo o { "tarjetas": [...] }.' }] }

  if (list.length === 0) return { cards: [], errors: [{ ruta: 'documento', mensaje: 'No hay tarjetas en el JSON.' }] }

  const errors: ImportError[] = []
  const cards: Card[] = []
  const now = new Date()

  list.forEach((raw, i) => {
    if (!validateCard(raw)) {
      const errs = validateCard.errors ?? []
      localizeEs(errs)
      const meaningful = errs.filter((e) => e.keyword !== 'if' && e.keyword !== 'allOf')
      for (const e of meaningful) errors.push(formatAjvError(e, i))
      return
    }
    const r = raw as Partial<Card> & Pick<Card, 'tipo' | 'categoria' | 'pregunta' | 'respuesta'>
    if (r.tipo === 'alternativas' && typeof r.correcta === 'number' && r.opciones && r.correcta >= r.opciones.length) {
      errors.push({ ruta: `tarjeta ${i + 1} › correcta`, mensaje: `el índice ${r.correcta} no existe en "opciones"` })
      return
    }
    const origen = r.origen ?? options.origen
    const estado = options.forzarBorrador || origen === 'ia' ? 'borrador' : (r.estado ?? 'revisada')
    cards.push({
      ...r,
      id: r.id ?? crypto.randomUUID(),
      categoria: r.categoria.trim(),
      etiquetas: r.etiquetas ?? [],
      dificultad: r.dificultad ?? 'intermedia',
      origen,
      estado,
      creada: r.creada ?? now.toISOString(),
      srs: r.srs ? { ...{ stability: 0, difficulty: 0, reps: 0, lapses: 0 }, ...r.srs } : emptySrs(now),
      idioma: r.idioma ? { audio: r.idioma.lengua === 'fr', ...r.idioma } : undefined,
    } as Card)
  })

  return { cards, errors }
}

export interface DuplicateMatch {
  existing: Card
  score: number
}

export function findDuplicate(card: Card, library: Card[]): DuplicateMatch | null {
  let best: DuplicateMatch | null = null
  for (const ex of library) {
    if (ex.id === card.id) return { existing: ex, score: 1 }
    const score = similarity(card.pregunta, ex.pregunta)
    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { existing: ex, score }
  }
  return best
}

/** Reemplaza el contenido manteniendo identidad, fecha de creación e historial SRS. */
export function mergeReplace(existing: Card, incoming: Card): Card {
  return { ...incoming, id: existing.id, creada: existing.creada, srs: existing.srs }
}
