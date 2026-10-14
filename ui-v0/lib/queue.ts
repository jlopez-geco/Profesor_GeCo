import { dayKey } from '@/lib/dates'
import type { AppSettings, Card, Review } from '@/lib/types'

export interface QueueOptions {
  filter?: (card: Card) => boolean
  /** Nuevas extra por sobre el cupo diario (para "adelantar"). */
  extraNew?: number
}

export function isStudyable(card: Card) {
  return card.estado === 'revisada' && !card.archivada
}

export function newSeenToday(reviews: Review[], now = new Date()) {
  const today = dayKey(now)
  const ids = new Set<string>()
  for (const r of reviews) if (r.eraNueva && dayKey(r.fecha) === today) ids.add(r.cardId)
  return ids.size
}

/** Ordena evitando dos tarjetas seguidas de la misma categoría cuando es posible. */
export function interleave(cards: Card[], lastCategory?: string): Card[] {
  const groups = new Map<string, Card[]>()
  for (const c of cards) {
    const g = groups.get(c.categoria) ?? []
    g.push(c)
    groups.set(c.categoria, g)
  }
  const out: Card[] = []
  let last = lastCategory
  while (out.length < cards.length) {
    const candidates = [...groups.entries()].filter(([, g]) => g.length > 0).sort((a, b) => b[1].length - a[1].length)
    const pick = candidates.find(([cat]) => cat !== last) ?? candidates[0]
    const card = pick[1].shift()!
    out.push(card)
    last = card.categoria
  }
  return out
}

export function buildQueue(
  cards: Card[],
  reviews: Review[],
  settings: AppSettings,
  options: QueueOptions = {},
  now = new Date(),
): string[] {
  const eligible = cards.filter((c) => isStudyable(c) && (options.filter ? options.filter(c) : true))

  const due = eligible
    .filter((c) => c.srs.state !== 'nueva' && new Date(c.srs.due) <= now)
    .sort((a, b) => a.srs.due.localeCompare(b.srs.due))

  const quota = Math.max(0, settings.limiteNuevas - newSeenToday(reviews, now)) + (options.extraNew ?? 0)
  const fresh = eligible
    .filter((c) => c.srs.state === 'nueva')
    .sort((a, b) => a.creada.localeCompare(b.creada))
    .slice(0, quota)

  const dueOrdered = interleave(due)
  const freshOrdered = interleave(fresh, dueOrdered.at(-1)?.categoria)
  const queue = [...dueOrdered, ...freshOrdered]

  if (queue.length > 0 && !queue.some((c) => c.tipo === 'desafio_codigo')) {
    const challenge = eligible
      .filter((c) => c.tipo === 'desafio_codigo')
      .sort((a, b) => a.srs.due.localeCompare(b.srs.due))[0]
    if (challenge) {
      const at = Math.min(queue.length, Math.max(1, Math.floor(queue.length / 2)))
      queue.splice(at, 0, challenge)
    }
  }

  return queue.map((c) => c.id)
}
