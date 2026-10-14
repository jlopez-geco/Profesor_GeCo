'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ArrowRight, CalendarCheck, Flame, Lightbulb, Play, RotateCcw, Timer } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Page, PageHeader } from '@/components/page-header'
import { EmptyState, LoadingBlock } from '@/components/empty-state'
import { Onboarding } from '@/components/today/onboarding'
import { useCards, useReviews, useSession, useSettings } from '@/hooks/use-data'
import { useEffectsEnabled } from '@/hooks/use-effects-enabled'
import { LazyParticlesBackground } from '@/components/effects/lazy-particles-background'
import { buildQueue, isStudyable } from '@/lib/queue'
import { isSessionPending, startSession } from '@/lib/session'
import { streak, todayReviews } from '@/lib/stats'
import { formatMinutes } from '@/lib/dates'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function TodayView() {
  const router = useRouter()
  const cards = useCards()
  const reviews = useReviews()
  const settings = useSettings()
  const session = useSession()
  const [starting, setStarting] = useState(false)
  const effects = useEffectsEnabled()

  const data = useMemo(() => {
    if (!cards || !reviews || !settings) return null
    const queue = buildQueue(cards, reviews, settings)
    const byId = new Map(cards.map((c) => [c.id, c]))
    const queued = queue.map((id) => byId.get(id)!).filter(Boolean)
    const perCategory = new Map<string, number>()
    for (const c of queued) perCategory.set(c.categoria, (perCategory.get(c.categoria) ?? 0) + 1)
    const today = todayReviews(reviews)
    return {
      queue: queued,
      nuevas: queued.filter((c) => c.srs.state === 'nueva').length,
      perCategory: [...perCategory.entries()].sort((a, b) => b[1] - a[1]),
      streak: streak(reviews),
      hoyMs: today.reduce((a, r) => a + r.duracionMs, 0),
      hoyCount: today.length,
      borradores: cards.filter((c) => c.estado === 'borrador' && !c.archivada).length,
      nuevasDisponibles: cards.filter((c) => isStudyable(c) && c.srs.state === 'nueva').length,
    }
  }, [cards, reviews, settings])

  async function begin(extraNew?: number) {
    setStarting(true)
    const n = await startSession({ extraNew })
    if (n > 0) router.push('/estudiar')
    else setStarting(false)
  }

  if (!cards || !data || !settings || session === undefined) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  if (cards.length === 0) {
    return (
      <Page>
        <PageHeader title={`${greeting()}.`} description="Cinco minutos al día bastan para no olvidar lo que importa." />
        <Onboarding />
      </Page>
    )
  }

  const pending = isSessionPending(session)
  const remainingInSession = pending ? session!.cola.length - session!.indice : 0
  const goalMs = settings.objetivoMinutos * 60000
  const goalPct = Math.min(100, Math.round((data.hoyMs / goalMs) * 100))

  return (
    <Page className="relative">
      {effects && <LazyParticlesBackground className="pointer-events-none absolute inset-0 -z-10" />}
      <PageHeader title={`${greeting()}.`} description="Este es tu repaso de hoy." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section
          aria-labelledby="pendientes"
          className="flex flex-col gap-6 rounded-2xl border bg-card p-6 lg:col-span-2 md:p-8"
        >
          {pending ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 id="pendientes" className="text-sm font-medium text-muted-foreground">
                  Sesión en curso
                </h2>
                <p className="flex items-baseline gap-3">
                  <span className="text-6xl font-semibold tracking-tight tabular-nums md:text-7xl">
                    {remainingInSession}
                  </span>
                  <span className="text-lg text-muted-foreground">
                    {remainingInSession === 1 ? 'tarjeta por terminar' : 'tarjetas por terminar'}
                  </span>
                </p>
              </div>
              <Link href="/estudiar" className={buttonVariants({ size: 'lg', className: 'h-12 w-full text-base sm:w-auto sm:self-start sm:px-8' })}>
                <RotateCcw data-icon="inline-start" />
                Retomar sesión
              </Link>
            </>
          ) : data.queue.length > 0 ? (
            <>
              <div className="flex flex-col gap-1">
                <h2 id="pendientes" className="text-sm font-medium text-muted-foreground">
                  Pendientes hoy
                </h2>
                <p className="flex items-baseline gap-3">
                  <span className="text-6xl font-semibold tracking-tight tabular-nums md:text-7xl">{data.queue.length}</span>
                  <span className="text-lg text-muted-foreground">
                    {data.queue.length - data.nuevas} repasos · {data.nuevas} nuevas
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Aprox. {Math.max(1, Math.round(data.queue.length * 0.4))} min
                </p>
              </div>
              <Button
                size="lg"
                className="h-12 w-full text-base sm:w-auto sm:self-start sm:px-8"
                onClick={() => begin()}
                disabled={starting}
              >
                <Play data-icon="inline-start" />
                Empezar
              </Button>
            </>
          ) : (
            <EmptyState
              icon={CalendarCheck}
              title="Sin repasos pendientes por hoy"
              description={
                data.nuevasDisponibles > 0
                  ? `Vas al día. Si quieres seguir, puedes adelantar tarjetas nuevas (${data.nuevasDisponibles} disponibles).`
                  : 'Vas al día. Agrega tarjetas nuevas para seguir aprendiendo.'
              }
              className="border-none bg-transparent py-6"
            >
              {data.nuevasDisponibles > 0 ? (
                <Button onClick={() => begin(5)} disabled={starting} className="h-10">
                  Adelantar 5 nuevas
                </Button>
              ) : (
                <Link href="/crear" className={buttonVariants({ className: 'h-10' })}>
                  Crear tarjetas
                </Link>
              )}
            </EmptyState>
          )}

          {data.perCategory.length > 0 && !pending && (
            <ul className="flex flex-wrap gap-2" aria-label="Pendientes por categoría">
              {data.perCategory.map(([cat, n]) => (
                <li key={cat} className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm">
                  <span>{cat}</span>
                  <span className="font-medium tabular-nums text-muted-foreground">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          <section aria-label="Racha" className="flex items-center gap-4 rounded-2xl border bg-card p-5">
            <div className="flex size-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Flame className="size-6" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tabular-nums">
                {data.streak.count} {data.streak.count === 1 ? 'día' : 'días'}
              </span>
              <span className="text-sm text-muted-foreground">
                {data.streak.studiedToday ? 'de racha. ¡Hoy ya cumpliste!' : 'de racha. Estudia hoy para mantenerla.'}
              </span>
            </div>
          </section>

          <section aria-label="Objetivo diario" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
                Objetivo de hoy
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatMinutes(data.hoyMs)} / {settings.objetivoMinutos} min
              </span>
            </div>
            <Progress value={goalPct} aria-label="Avance del objetivo diario" />
            <span className="text-xs text-muted-foreground">{data.hoyCount} tarjetas repasadas hoy</span>
          </section>

          <Link
            href="/recomendador"
            className="group flex flex-col gap-2 rounded-2xl border bg-primary p-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium opacity-90">
              <Lightbulb className="size-4" aria-hidden="true" />
              Concepto nuevo del día
            </span>
            <span className="text-pretty">Descubre qué te conviene aprender después, según lo que ya estudias.</span>
            <span className="flex items-center gap-1 text-sm font-medium">
              Ver recomendaciones
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
            </span>
          </Link>

          {data.borradores > 0 && (
            <Link
              href="/biblioteca?estado=borrador"
              className="rounded-2xl border border-dashed bg-card p-4 text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="font-medium">{data.borradores} borradores</span>{' '}
              <span className="text-muted-foreground">esperan revisión antes de entrar a tus repasos.</span>
            </Link>
          )}
        </div>
      </div>
    </Page>
  )
}
