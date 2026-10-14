'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Page, PageHeader } from '@/components/page-header'
import { LoadingBlock } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { useCards, useReviews } from '@/hooks/use-data'
import { forecast, masteryBreakdown, retentionByCategory, streak, timeStudied } from '@/lib/stats'
import { formatMinutes } from '@/lib/dates'

const FORECAST_CONFIG = { repasos: { label: 'Repasos', color: 'var(--chart-1)' } } satisfies ChartConfig
const TIEMPO_CONFIG = { minutos: { label: 'Minutos', color: 'var(--chart-2)' } } satisfies ChartConfig

export default function ProgresoPage() {
  const cards = useCards()
  const reviews = useReviews()

  const data = useMemo(() => {
    if (!cards || !reviews) return null
    return {
      racha: streak(reviews),
      mastery: masteryBreakdown(cards),
      porCategoria: retentionByCategory(reviews),
      forecast: forecast(cards),
      tiempo: timeStudied(reviews),
      minutosTotales: reviews.reduce((a, r) => a + r.duracionMs, 0),
    }
  }, [cards, reviews])

  if (!cards || !reviews || !data) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  const { mastery } = data
  const pct = (n: number) => (mastery.total ? Math.round((n / mastery.total) * 100) : 0)

  return (
    <Page className="max-w-5xl">
      <PageHeader title="Progreso" description="Cómo te ha ido estudiando, en conjunto." />

      <div className="grid gap-4 lg:grid-cols-3">
        <section aria-label="Racha y tiempo total" className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{data.racha.count}</p>
            <p className="text-sm text-muted-foreground">{data.racha.count === 1 ? 'día de racha' : 'días de racha'}</p>
          </div>
          <div>
            <p className="text-3xl font-semibold tabular-nums">{formatMinutes(data.minutosTotales)}</p>
            <p className="text-sm text-muted-foreground">estudiados en total</p>
          </div>
        </section>

        <section aria-labelledby="dominio" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 id="dominio" className="font-semibold">
            Dominadas vs. en aprendizaje
          </h2>
          {mastery.total === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no tienes tarjetas activas.</p>
          ) : (
            <>
              <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${pct(mastery.dominadas)}% dominadas, ${pct(mastery.aprendiendo)}% en aprendizaje, ${pct(mastery.nuevas)}% nuevas`}>
                <div className="bg-emerald-600" style={{ width: `${pct(mastery.dominadas)}%` }} />
                <div className="bg-primary" style={{ width: `${pct(mastery.aprendiendo)}%` }} />
                <div className="bg-muted-foreground/40" style={{ width: `${pct(mastery.nuevas)}%` }} />
              </div>
              <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-600" /> {mastery.dominadas} dominadas</li>
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" /> {mastery.aprendiendo} en aprendizaje</li>
                <li className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40" /> {mastery.nuevas} nuevas</li>
                {mastery.borradores > 0 && <li className="text-muted-foreground">{mastery.borradores} borradores (no cuentan)</li>}
              </ul>
            </>
          )}
        </section>

        <section aria-labelledby="calendario" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 lg:col-span-2">
          <h2 id="calendario" className="font-semibold">
            Repasos de los próximos 7 días
          </h2>
          <ChartContainer config={FORECAST_CONFIG} className="aspect-auto h-48 w-full">
            <BarChart data={data.forecast}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="repasos" fill="var(--color-repasos)" radius={4} />
            </BarChart>
          </ChartContainer>
        </section>

        <section aria-labelledby="tiempo" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 id="tiempo" className="font-semibold">
            Minutos estudiados (7 días)
          </h2>
          <ChartContainer config={TIEMPO_CONFIG} className="aspect-auto h-48 w-full">
            <BarChart data={data.tiempo}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="minutos" fill="var(--color-minutos)" radius={4} />
            </BarChart>
          </ChartContainer>
        </section>

        <section aria-labelledby="retencion" className="flex flex-col gap-3 rounded-2xl border bg-card p-5 lg:col-span-3">
          <h2 id="retencion" className="font-semibold">
            Retención por categoría
          </h2>
          {data.porCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground">Repasa algunas tarjetas para ver tu retención por categoría.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.porCategoria.map((c) => (
                <li key={c.categoria} className="flex items-center gap-3">
                  <Badge variant="secondary" className="w-40 shrink-0 justify-start truncate">
                    {c.categoria}
                  </Badge>
                  <Progress value={c.retencion ?? 0} className="flex-1" aria-label={`Retención en ${c.categoria}`} />
                  <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                    {c.retencion === null ? '—' : `${c.retencion}%`} · {c.repasos}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  )
}
