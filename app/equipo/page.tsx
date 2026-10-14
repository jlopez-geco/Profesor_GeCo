import { Users } from 'lucide-react'
import { Page, PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'

export default function EquipoPage() {
  return (
    <Page>
      <PageHeader title="Equipo" />
      <EmptyState
        icon={Users}
        title="Mazos compartidos del equipo"
        description="Próximamente: comparte categorías o tarjetas con tus colegas sin perder tu biblioteca personal. Por ahora, cada persona usa Profesor GeCo con su propia biblioteca en su navegador."
      />
    </Page>
  )
}
