'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Archive, CheckCheck, FileQuestion, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Page, PageHeader } from '@/components/page-header'
import { EmptyState, LoadingBlock } from '@/components/empty-state'
import { CardForm } from '@/components/card-form'
import { useCard, useCardReviews } from '@/hooks/use-data'
import { useCategories } from '@/hooks/use-categories'
import { db } from '@/lib/db'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { formatDate } from '@/lib/dates'
import { SRS_STATE_LABEL } from '@/lib/srs'
import { RATING_LABEL } from '@/lib/types'

export function CardDetail({ id }: { id: string }) {
  const router = useRouter()
  const card = useCard(id)
  const reviews = useCardReviews(id)
  const categories = useCategories()

  if (card === undefined) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  if (card === null) {
    return (
      <Page>
        <EmptyState icon={FileQuestion} title="No encontramos esta tarjeta" description="Puede que la hayas borrado o que venga de otro navegador.">
          <Link href="/biblioteca" className={buttonVariants({ className: 'h-10' })}>
            Ir a la biblioteca
          </Link>
        </EmptyState>
      </Page>
    )
  }

  const due = new Date(card.srs.due)

  return (
    <Page className="max-w-6xl">
      <Link href="/biblioteca" className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2 mb-4 text-muted-foreground' })}>
        <ArrowLeft data-icon="inline-start" /> Biblioteca
      </Link>
      <PageHeader
        title="Editar tarjeta"
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{SRS_STATE_LABEL[card.srs.state]}</Badge>
            {card.estado === 'borrador' && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                Borrador: no entra a los repasos
              </Badge>
            )}
            {card.archivada && <Badge variant="outline">Archivada</Badge>}
            <span className="text-sm">
              {card.srs.state === 'nueva' ? 'Sin repasar aún' : `Próximo repaso: ${formatDate(card.srs.due)}`}
              {due.getTime() <= Date.now() && card.srs.state !== 'nueva' && ' (vencida)'}
            </span>
          </span>
        }
        actions={
          <>
            {card.estado === 'borrador' && (
              <Button
                className="h-10"
                onClick={async () => {
                  await tarjetasRepo.upsert({ ...card, estado: 'revisada' })
                  toast.success('Marcada como revisada. Ya entra a tus repasos.')
                }}
              >
                <CheckCheck data-icon="inline-start" /> Marcar revisada
              </Button>
            )}
            <Button
              variant="outline"
              className="h-10"
              onClick={async () => {
                await tarjetasRepo.upsert({ ...card, archivada: !card.archivada })
                toast.success(card.archivada ? 'Tarjeta restaurada.' : 'Tarjeta archivada.')
              }}
            >
              <Archive data-icon="inline-start" /> {card.archivada ? 'Restaurar' : 'Archivar'}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="outline" className="h-10 text-destructive" />}>
                <Trash2 data-icon="inline-start" /> Eliminar
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar esta tarjeta?</AlertDialogTitle>
                  <AlertDialogDescription>Se borra la tarjeta y su historial de repasos. No se puede deshacer.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={async () => {
                      await db.reviews.where('cardId').equals(card.id).delete()
                      await tarjetasRepo.delete(card.id)
                      toast.success('Tarjeta eliminada.')
                      router.push('/biblioteca')
                    }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <CardForm
        key={card.id}
        initial={card}
        categories={categories}
        submitLabel="Guardar cambios"
        onSubmit={async (next) => {
          await tarjetasRepo.upsert({ ...next, srs: card.srs, estado: card.estado, archivada: card.archivada })
          toast.success('Cambios guardados.')
        }}
      />

      <section aria-labelledby="historial" className="mt-10 flex flex-col gap-3">
        <h2 id="historial" className="text-lg font-semibold">
          Historial de repasos
        </h2>
        {!reviews || reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay repasos de esta tarjeta.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card text-sm">
            {reviews.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span>{formatDate(r.fecha)}</span>
                <span className="font-medium">{RATING_LABEL[r.rating]}</span>
                <span className="text-muted-foreground tabular-nums">{Math.round(r.duracionMs / 1000)} s</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Repasos: {card.srs.reps} · Olvidos: {card.srs.lapses} · Estabilidad: {card.srs.stability.toFixed(1)} días
        </p>
      </section>
    </Page>
  )
}
