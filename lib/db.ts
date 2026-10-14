import Dexie, { type Table } from 'dexie'
import { DEFAULT_SETTINGS, type AppSettings, type Card, type Review, type StudySession } from '@/lib/types'

interface SettingsRow {
  key: 'app'
  value: AppSettings
}

class GecoDB extends Dexie {
  cards!: Table<Card, string>
  reviews!: Table<Review, number>
  sessions!: Table<StudySession, string>
  settings!: Table<SettingsRow, string>

  constructor() {
    super('profesor-geco')
    this.version(1).stores({
      cards: 'id, tipo, categoria, estado, origen, *etiquetas, creada',
      reviews: '++id, cardId, fecha',
      sessions: 'id',
      settings: 'key',
    })
  }
}

export const db = new GecoDB()

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...row?.value }
}

export async function saveSettings(patch: Partial<AppSettings>) {
  const current = await getSettings()
  await db.settings.put({ key: 'app', value: { ...current, ...patch } })
}
