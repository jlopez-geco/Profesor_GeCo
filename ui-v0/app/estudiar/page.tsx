import type { Metadata } from 'next'
import { StudySession } from '@/components/study/study-session'

export const metadata: Metadata = { title: 'Estudiar' }

export default function Page() {
  return <StudySession />
}
