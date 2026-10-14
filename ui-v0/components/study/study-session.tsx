'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarCheck, Pencil, PartyPopper, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { EmptyState, LoadingBlock } from '@/components/empty-state'
import { RatingBar } from '@/components/rating-bar'
import { StudyCard, vocabMode } from '@/components/study-card'
import { useCards, useReviews, useSession } from '@/hooks/use-data'
import { isSessionPending, recordReview, startSession, endSession } from '@/lib/session'
import { previewIntervals } from '@/lib/srs'
import { dayKey, formatMinutes } from '@/lib/dates'
import type { Card, Rating } from '@/lib/types'

export function StudySession() {
  const router = useRouter()
  const cards = useCards()
  const reviews = useReviews()
  const session = useSession()
  const [revealed, setRevealed] = useState(false)
  const [suggested, setSuggested] = useState<Rating | undefined>()
  const [saving, setSaving] = useState(false)
  const startedAt = useRef(Date.now())

  const byId = useMemo(() => new Map((cards ?? []).map((c) => [c.id, c])), [cards])

  const current = useMemo(() => {
    if (!session || !cards) return null
    for (let i = session.indice; i < session.cola.length; i++) {
      const card = byId.get(session.cola[i])
      if (card && !card.archivada && card.estado === 'revisada') return { card, position: i }
    }
    return null
  }, [session, cards, byId])

  const currentKey = current ? `${current.card.id}-${current.position}` : 'none'
  useEffect(() => {
    startedAt.current = Date.now()
    setRevealed(false)
    setSuggested(undefined)
  }, [currentKey])

  const intervals = useMemo(() => (current ? previewIntervals(current.card) : null), [current])

  const onReveal = useCallback((s?: Rating) => {
    setRevealed(true)
    setSuggested(s)
  }, [])

  const rate = useCallback(
    async (rating: Rating) => {
      if (!current || saving) return
      setSaving(true)
      try {
        await recordReview(current.card, rating, Date.now() - startedAt.current, current.position)
      } finally {
        setSaving(false)
      }
    },
    [current, saving],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        router.push('/')
        return
      }
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !revealed))) return
      if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        rate(Number(e.key) as Rating)
      }
      if (revealed && e.code === 'Space' && suggested) {
        e.preventDefault()
        rate(suggested)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, rate, router, suggested])

  if (cards === undefined || session === undefined || reviews === undefined) {
    return (
      <Shell>
        <LoadingBlock />
      </Shell>
    )
  }

  if (!session || session.dia !== dayKey()) {
    return (
      <Shell>
        <NoSession onStart={async () => (await startSession()) === 0} />
      </Shell>
    )
  }

  if (!current || !isSessionPending(session)) {
    const sessionReviews = reviews.filter((r) => r.fecha >= session.iniciada)
    return (
      <Shell>
        <Finished
          count={sessionReviews.length}
          ms={sessionReviews.reduce((a, r) => a + r.duracionMs, 0)}
          correct={sessionReviews.filter((r) => r.rating > 1).length}
          onClose={async () => {
            await endSession()
            router.push('/')
          }}
        />
      </Shell>
    )
  }

  const total = session.cola.length
  const done = current.position
  const mode = vocabMode(current.card)

  return (
    <Shell
      header={
        <div className="flex flex-1 items-center gap-4">
          <Progress value={(done / total) * 100} className="flex-1" aria-label={`Tarjeta ${done + 1} de ${total}`} />
          <span className="text-sm text-muted-foreground tabular-nums">
            {done + 1} / {total}
          </span>
        </div>
      }
    >
      {session.etiqueta && <p className="mb-4 text-sm text-muted-foreground">Práctica: {session.etiqueta}</p>}
      <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-8">
        <StudyCard key={currentKey} card={current.card} revealed={revealed} onReveal={onReveal} mode={mode} />
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {revealed && intervals ? (
          <>
            <RatingBar intervals={intervals} onRate={rate} suggested={suggested} disabled={saving} />
            <p className="text-center text-xs text-muted-foreground">
              Califica con honestidad: así el sistema calcula el mejor momento para el próximo repaso.
            </p>
          </>
        ) : (
          <KeyboardHints card={current.card} />
        )}
        <div className="flex justify-center">
          <Link
            href={`/biblioteca/${current.card.id}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground' })}
          >
            <Pencil data-icon="inline-start" />
            Corregir esta tarjeta
          </Link>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children, header }: { children: React.ReactNode; header?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/90 px-4 backdrop-blur md:px-8">
        <Link
          href="/"
          className={buttonVariants({ variant: 'ghost', size: 'icon-lg', className: 'size-11' })}
          aria-label="Salir y guardar (Esc)"
          title="Salir y guardar (Esc)"
        >
          <X />
        </Link>
        {header ?? <span className="font-medium">Sesión de estudio</span>}
      </header>
      <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:py-10">
        {children}
      </main>
    </div>
  )
}

function KeyboardHints({ card }: { card: Card }) {
  const hint =
    card.tipo === 'alternativas'
      ? 'Elige con 1 a 4'
      : card.tipo === 'cloze'
        ? 'Escribe y presiona Enter'
        : card.tipo === 'desafio_codigo'
          ? 'Ctrl + Enter para ver la solución'
          : 'Espacio para revelar'
  return (
    <p className="hidden text-center text-xs text-muted-foreground md:block">
      {hint} · Luego califica con 1 a 4 · Esc para salir (tu avance queda guardado)
    </p>
  )
}

function NoSession({ onStart }: { onStart: () => Promise<boolean> }) {
  const router = useRouter()
  const [empty, setEmpty] = useState(false)
  return empty ? (
    <EmptyState icon={CalendarCheck} title="No hay tarjetas pendientes" description="Vas al día. Vuelve mañana o agrega tarjetas nuevas.">
      <Link href="/" className={buttonVariants({ variant: 'outline', className: 'h-10' })}>
        Volver a Hoy
      </Link>
      <Link href="/crear" className={buttonVariants({ className: 'h-10' })}>
        Crear tarjetas
      </Link>
    </EmptyState>
  ) : (
    <EmptyState icon={CalendarCheck} title="Lista para tu repaso de hoy" description="Armamos tu cola con los repasos vencidos y las nuevas del día.">
      <Button
        className="h-11 px-6"
        onClick={async () => {
          const isEmpty = await onStart()
          if (isEmpty) setEmpty(true)
          else router.refresh()
        }}
      >
        Empezar
      </Button>
    </EmptyState>
  )
}

function Finished({ count, ms, correct, onClose }: { count: number; ms: number; correct: number; onClose: () => void }) {
  const pct = count ? Math.round((correct / count) * 100) : 0
  return (
    <EmptyState
      icon={PartyPopper}
      title="¡Sesión terminada!"
      description={
        count > 0
          ? `Repasaste ${count} ${count === 1 ? 'tarjeta' : 'tarjetas'} en ${formatMinutes(ms)} y recordaste el ${pct}%.`
          : 'No quedan tarjetas en esta sesión.'
      }
    >
      <Button className="h-11 px-6" onClick={onClose}>
        Volver a Hoy
      </Button>
      <Link href="/progreso" className={buttonVariants({ variant: 'outline', className: 'h-11 px-6' })}>
        Ver progreso
      </Link>
    </EmptyState>
  )
}
