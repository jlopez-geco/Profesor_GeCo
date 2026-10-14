'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSettings } from '@/lib/db'

export function useCards() {
  return useLiveQuery(() => db.cards.toArray(), [])
}

export function useReviews() {
  return useLiveQuery(() => db.reviews.toArray(), [])
}

export function useSettings() {
  return useLiveQuery(() => getSettings(), [])
}

export function useSession() {
  return useLiveQuery(async () => (await db.sessions.get('actual')) ?? null, [])
}

export function useCard(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.cards.get(id)) ?? null) : null), [id])
}

export function useCardReviews(id: string | undefined) {
  return useLiveQuery(
    async () => (id ? (await db.reviews.where('cardId').equals(id).toArray()).reverse() : []),
    [id],
  )
}
