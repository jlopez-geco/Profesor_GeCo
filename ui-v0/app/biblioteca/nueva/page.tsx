'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-header'
import { CardForm, blankCard } from '@/components/card-form'
import { useCategories } from '@/hooks/use-categories'
import { db } from '@/lib/db'

export default function NewCardPage() {
  const router = useRouter()
  const categories = useCategories()
  const [initial] = useState(blankCard)

  return (
    <Page className="max-w-6xl">
      <PageHeader title="Nueva tarjeta" description="Las tarjetas manuales entran directo a tus repasos." />
      <CardForm
        initial={initial}
        categories={categories}
        submitLabel="Crear tarjeta"
        onSubmit={async (card) => {
          await db.cards.add(card)
          toast.success('Tarjeta creada.')
          router.push('/biblioteca')
        }}
      />
    </Page>
  )
}
