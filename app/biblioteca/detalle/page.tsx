'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CardDetail } from '@/components/library/card-detail'
import { Page as PageLayout } from '@/components/page-header'
import { LoadingBlock } from '@/components/empty-state'

function DetalleContent() {
  const params = useSearchParams()
  const id = params.get('id') ?? ''
  return <CardDetail id={id} />
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
      <DetalleContent />
    </Suspense>
  )
}
