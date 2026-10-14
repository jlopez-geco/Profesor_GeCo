'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Languages, Play, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-header'
import { EmptyState, LoadingBlock } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { NativeSelect } from '@/components/native-select'
import { useCards } from '@/hooks/use-data'
import { startSession } from '@/lib/session'
import { isStudyable } from '@/lib/queue'
import { isMastered } from '@/lib/srs'
import {
  DOMINIOS_POR_LENGUA,
  DOMINIO_LABEL,
  LENGUAS,
  LENGUA_LABEL,
  NIVELES_POR_LENGUA,
  type Card,
  type Dominio,
  type Lengua,
  type Nivel,
} from '@/lib/types'

export default function IdiomasPage() {
  const router = useRouter()
  const cards = useCards()
  const [lengua, setLengua] = useState<Lengua>('en')
  const [nivel, setNivel] = useState<Nivel | ''>('')
  const [starting, setStarting] = useState(false)

  const dominios = DOMINIOS_POR_LENGUA[lengua]

  const stats = useMemo(() => {
    const porDominio = new Map<Dominio, { total: number; dominadas: number; porNivel: Map<string, number> }>()
    for (const d of dominios) porDominio.set(d, { total: 0, dominadas: 0, porNivel: new Map() })
    for (const c of cards ?? []) {
      if (c.idioma?.lengua !== lengua) continue
      const entry = porDominio.get(c.idioma.dominio)
      if (!entry) continue // dominio fuera de lo esperado para esta lengua (no debería ocurrir)
      entry.total++
      if (isMastered(c)) entry.dominadas++
      entry.porNivel.set(c.idioma.nivel, (entry.porNivel.get(c.idioma.nivel) ?? 0) + 1)
    }
    return porDominio
  }, [cards, lengua, dominios])

  const totalLengua = [...stats.values()].reduce((a, s) => a + s.total, 0)

  async function practicar(dominio: Dominio) {
    setStarting(true)
    const n = await startSession({
      filter: (c: Card) => c.idioma?.lengua === lengua && c.idioma?.dominio === dominio && (!nivel || c.idioma?.nivel === nivel),
      etiqueta: `${LENGUA_LABEL[lengua]} · ${DOMINIO_LABEL[dominio]}${nivel ? ` · ${nivel}` : ''}`,
    })
    if (n > 0) router.push('/estudiar')
    else {
      toast.message('Ya cumpliste tu cupo de nuevas de hoy en este dominio. Vuelve mañana o adelanta nuevas desde Hoy.')
      setStarting(false)
    }
  }

  if (!cards) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Idiomas" description="Practica por dominio y nivel, al estilo Duolingo." />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Idioma" className="flex gap-2">
          {LENGUAS.map((l) => (
            <Button key={l} type="button" role="tab" aria-selected={lengua === l} variant={lengua === l ? 'default' : 'outline'} onClick={() => { setLengua(l); setNivel('') }}>
              {LENGUA_LABEL[l]}
            </Button>
          ))}
        </div>
        <NativeSelect
          aria-label="Filtrar por nivel"
          value={nivel}
          onChange={(e) => setNivel(e.target.value as Nivel | '')}
          placeholder="Todos los niveles"
          options={NIVELES_POR_LENGUA[lengua].map((n) => ({ value: n, label: n }))}
          className="w-40"
        />
      </div>

      {totalLengua === 0 ? (
        <EmptyState
          icon={Languages}
          title={`Aún no tienes tarjetas de ${LENGUA_LABEL[lengua].toLowerCase()}`}
          description="Crea un set con el asistente de IA, elige el idioma y el dominio que necesites."
        >
          <Link href="/crear" className={buttonVariants({ className: 'h-10' })}>
            <Sparkles data-icon="inline-start" /> Crear con IA
          </Link>
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {dominios.map((d) => {
            const s = stats.get(d)!
            const disponibles = (cards ?? []).filter(
              (c) => c.idioma?.lengua === lengua && c.idioma?.dominio === d && (!nivel || c.idioma?.nivel === nivel) && isStudyable(c),
            ).length
            return (
              <li key={d} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{DOMINIO_LABEL[d]}</h2>
                  <Badge variant="secondary">{s.total} {s.total === 1 ? 'tarjeta' : 'tarjetas'}</Badge>
                </div>
                {s.total > 0 ? (
                  <>
                    <div className="flex flex-wrap gap-1.5">
                      {[...s.porNivel.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([n, count]) => (
                        <Badge key={n} variant="outline">
                          {n} · {count}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">{s.dominadas} de {s.total} dominadas.</p>
                    <Button className="h-10 self-start" onClick={() => practicar(d)} disabled={starting || disponibles === 0}>
                      <Play data-icon="inline-start" />
                      {disponibles > 0 ? `Practicar (${disponibles})` : 'Sin repasos pendientes'}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Todavía no tienes tarjetas en este dominio.</p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
