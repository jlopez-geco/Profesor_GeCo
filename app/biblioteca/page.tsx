import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LibraryView } from '@/components/library/library-view'

export const metadata: Metadata = { title: 'Biblioteca' }

export default function Page() {
  return (
    <Suspense>
      <LibraryView />
    </Suspense>
  )
}
