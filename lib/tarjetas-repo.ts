import { db } from '@/lib/db'
import type { Card } from '@/lib/types'

/**
 * Puerto de persistencia de tarjetas. La UI solo debe depender de esta interfaz,
 * nunca de Dexie directo, para poder cambiar a Supabase en fase 2 sin tocarla.
 */
export interface TarjetasRepo {
  get(id: string): Promise<Card | undefined>
  list(): Promise<Card[]>
  upsert(card: Card): Promise<void>
  delete(id: string): Promise<void>
  exportAll(): Promise<Card[]>
  importAll(cards: Card[]): Promise<void>
}

class DexieTarjetasRepo implements TarjetasRepo {
  get(id: string) {
    return db.cards.get(id)
  }

  list() {
    return db.cards.toArray()
  }

  async upsert(card: Card) {
    await db.cards.put(card)
  }

  async delete(id: string) {
    await db.cards.delete(id)
  }

  exportAll() {
    return db.cards.toArray()
  }

  /** Reemplaza la biblioteca completa (usado en el primer arranque y en "importar biblioteca completa"). */
  async importAll(cards: Card[]) {
    await db.transaction('rw', db.cards, async () => {
      await db.cards.clear()
      await db.cards.bulkAdd(cards)
    })
  }
}

export const tarjetasRepo: TarjetasRepo = new DexieTarjetasRepo()
