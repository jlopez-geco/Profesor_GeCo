import { db, getSettings } from '@/lib/db'
import { dayKey } from '@/lib/dates'
import { buildQueue, type QueueOptions } from '@/lib/queue'
import { applyRating } from '@/lib/srs'
import type { Card, Rating, StudySession } from '@/lib/types'

/** Si una tarjeta queda programada dentro de este margen, vuelve a aparecer en la misma sesión. */
const SAME_SESSION_MS = 20 * 60 * 1000

export function isSessionPending(session: StudySession | null | undefined, now = new Date()) {
  return !!session && session.dia === dayKey(now) && session.indice < session.cola.length
}

export async function startSession(options: QueueOptions & { etiqueta?: string } = {}) {
  const [cards, reviews, settings] = await Promise.all([db.cards.toArray(), db.reviews.toArray(), getSettings()])
  const cola = buildQueue(cards, reviews, settings, options)
  const session: StudySession = {
    id: 'actual',
    dia: dayKey(),
    cola,
    indice: 0,
    iniciada: new Date().toISOString(),
    etiqueta: options.etiqueta,
  }
  await db.sessions.put(session)
  return cola.length
}

export async function recordReview(card: Card, rating: Rating, durationMs: number, position: number) {
  const now = new Date()
  const srs = applyRating(card, rating, now)
  await db.transaction('rw', db.cards, db.reviews, db.sessions, async () => {
    await db.cards.update(card.id, { srs })
    await db.reviews.add({
      cardId: card.id,
      rating,
      fecha: now.toISOString(),
      duracionMs: Math.min(durationMs, 10 * 60 * 1000),
      eraNueva: card.srs.state === 'nueva',
      estadoPrevio: card.srs.state,
      categoria: card.categoria,
    })
    const session = await db.sessions.get('actual')
    if (!session) return
    const cola = [...session.cola]
    if (new Date(srs.due).getTime() - now.getTime() <= SAME_SESSION_MS) cola.push(card.id)
    await db.sessions.put({ ...session, cola, indice: position + 1 })
  })
}

export async function skipTo(position: number) {
  const session = await db.sessions.get('actual')
  if (session) await db.sessions.put({ ...session, indice: position })
}

export async function endSession() {
  await db.sessions.delete('actual')
}
