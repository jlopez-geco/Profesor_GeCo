import { addDays, dayKey, endOfDay } from '@/lib/dates'
import { isMastered } from '@/lib/srs'
import { isStudyable } from '@/lib/queue'
import type { Card, Review } from '@/lib/types'

export function streak(reviews: Review[], now = new Date()) {
  const days = new Set(reviews.map((r) => dayKey(r.fecha)))
  let count = 0
  let cursor = new Date(now)
  if (!days.has(dayKey(cursor))) cursor = addDays(cursor, -1)
  while (days.has(dayKey(cursor))) {
    count++
    cursor = addDays(cursor, -1)
  }
  return { count, studiedToday: days.has(dayKey(now)) }
}

/** Porcentaje de repasos (no primeras vistas) recordados: calificación distinta de "Otra vez". */
export function retention(reviews: Review[]) {
  const relevant = reviews.filter((r) => !r.eraNueva)
  if (relevant.length === 0) return null
  return Math.round((relevant.filter((r) => r.rating > 1).length / relevant.length) * 100)
}

export function retentionByCategory(reviews: Review[]) {
  const map = new Map<string, Review[]>()
  for (const r of reviews) {
    const list = map.get(r.categoria) ?? []
    list.push(r)
    map.set(r.categoria, list)
  }
  return [...map.entries()]
    .map(([categoria, list]) => ({ categoria, retencion: retention(list), repasos: list.length }))
    .sort((a, b) => b.repasos - a.repasos)
}

export function masteryBreakdown(cards: Card[]) {
  const active = cards.filter((c) => !c.archivada)
  let dominadas = 0
  let aprendiendo = 0
  let nuevas = 0
  let borradores = 0
  for (const c of active) {
    if (c.estado === 'borrador') borradores++
    else if (c.srs.state === 'nueva') nuevas++
    else if (isMastered(c)) dominadas++
    else aprendiendo++
  }
  return { dominadas, aprendiendo, nuevas, borradores, total: active.length }
}

export function forecast(cards: Card[], days = 7, now = new Date()) {
  const studyable = cards.filter((c) => isStudyable(c) && c.srs.state !== 'nueva')
  return Array.from({ length: days }, (_, i) => {
    const end = endOfDay(addDays(now, i))
    const start = i === 0 ? new Date(0) : endOfDay(addDays(now, i - 1))
    const count = studyable.filter((c) => {
      const d = new Date(c.srs.due)
      return d > start && d <= end
    }).length
    const label = i === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(end)
    return { dia: label, repasos: count }
  })
}

export function timeStudied(reviews: Review[], days = 7, now = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(now, i - (days - 1))
    const key = dayKey(d)
    const ms = reviews.filter((r) => dayKey(r.fecha) === key).reduce((acc, r) => acc + r.duracionMs, 0)
    return {
      dia: i === days - 1 ? 'Hoy' : new Intl.DateTimeFormat('es-CL', { weekday: 'short' }).format(d),
      minutos: Math.round(ms / 6000) / 10,
    }
  })
}

export function todayReviews(reviews: Review[], now = new Date()) {
  const key = dayKey(now)
  return reviews.filter((r) => dayKey(r.fecha) === key)
}
