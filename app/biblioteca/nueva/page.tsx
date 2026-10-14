'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Page as PageLayout, PageHeader } from '@/components/page-header'
import { LoadingBlock } from '@/components/empty-state'
import { CardForm, blankCard } from '@/components/card-form'
import { useCategories } from '@/hooks/use-categories'
import { useCards } from '@/hooks/use-data'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { CARD_TYPES, type Card, type CardType } from '@/lib/types'

/** Última categoría usada en la biblioteca: evita que crear algo se sienta engorroso. */
function ultimaCategoria(cards: Card[]) {
  return [...cards].sort((a, b) => b.creada.localeCompare(a.creada))[0]?.categoria ?? ''
}

function NuevaTarjetaContent() {
  const router = useRouter()
  const params = useSearchParams()
  const categories = useCategories()
  const cards = useCards()

  if (!cards) {
    return (
      <PageLayout>
        <LoadingBlock />
      </PageLayout>
    )
  }

  const tipoParam = params.get('tipo')
  const tipo = (CARD_TYPES as readonly string[]).includes(tipoParam ?? '') ? (tipoParam as CardType) : undefined
  const initial: Card = { ...blankCard(), ...(tipo && { tipo }), categoria: ultimaCategoria(cards) }

  return (
    <PageLayout className="max-w-6xl">
      <PageHeader title="Nueva tarjeta" description="Las tarjetas manuales entran directo a tus repasos. Sugerimos la categoría por ti; cámbiala si no calza." />
      <CardForm
        initial={initial}
        categories={categories}
        submitLabel="Crear tarjeta"
        onSubmit={async (card) => {
          await tarjetasRepo.upsert(card)
          toast.success('Tarjeta creada.')
          router.push('/biblioteca')
        }}
      />
    </PageLayout>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <LoadingBlock />
        </PageLayout>
      }
    >
      <NuevaTarjetaContent />
    </Suspense>
  )
}
