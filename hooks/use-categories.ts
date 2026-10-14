'use client'

import { useMemo } from 'react'
import { useCards, useSettings } from '@/hooks/use-data'

export function useCategories() {
  const cards = useCards()
  const settings = useSettings()
  return useMemo(() => {
    const set = new Set<string>(settings?.categorias ?? [])
    for (const c of cards ?? []) set.add(c.categoria)
    return [...set].sort((a, b) => a.localeCompare(b, 'es'))
  }, [cards, settings])
}
