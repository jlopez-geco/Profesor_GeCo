import tarjetasIniciales from '@/data/tarjetas.json'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import type { Card } from '@/lib/types'

let ensured: Promise<void> | null = null

/**
 * Primer arranque: si la biblioteca está vacía (IndexedDB recién creada en este
 * navegador), la precarga con las tarjetas del autor (data/tarjetas.json).
 * Si el usuario ya tiene tarjetas (las suyas, importadas o de ejemplo), no hace nada.
 */
export function ensureInitialLibrary(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const current = await tarjetasRepo.list()
      if (current.length === 0) {
        await tarjetasRepo.importAll(tarjetasIniciales as Card[])
      }
    })()
  }
  return ensured
}
