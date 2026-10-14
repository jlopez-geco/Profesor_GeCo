'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Archive, BookOpen, CheckCheck, FolderInput, LayoutGrid, List, Plus, Search, Tag, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Page, PageHeader } from '@/components/page-header'
import { EmptyState, LoadingBlock } from '@/components/empty-state'
import { NativeSelect } from '@/components/native-select'
import { useCards } from '@/hooks/use-data'
import { useCategories } from '@/hooks/use-categories'
import { useEffectsEnabled } from '@/hooks/use-effects-enabled'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { formatDate } from '@/lib/dates'
import { SRS_STATE_LABEL } from '@/lib/srs'
import { stripMarkdown } from '@/lib/speech'
import { normalizeText } from '@/lib/similarity'
import { CARD_TYPES, CARD_TYPE_LABEL, type Card } from '@/lib/types'
import { cn } from '@/lib/utils'

type View = 'lista' | 'cuadricula'
type Vista = 'tarjetas' | 'aprendizaje' | 'todas'

const TIPOS_APRENDIZAJE = CARD_TYPES.filter((t) => t !== 'concepto')

export function LibraryView() {
  const router = useRouter()
  const params = useSearchParams()
  const cards = useCards()
  const categories = useCategories()
  const effects = useEffectsEnabled()

  const [vista, setVista] = useState<Vista>(() => {
    const v = params.get('vista')
    if (v === 'aprendizaje' || v === 'tarjetas') return v
    // Un deep link como "?estado=borrador" (desde Hoy) no sabe en qué vista están esas
    // tarjetas: no restringimos por vista hasta que la persona elija una pestaña.
    return params.get('estado') ? 'todas' : 'tarjetas'
  })
  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('')
  const [etiqueta, setEtiqueta] = useState('')
  const [tipo, setTipo] = useState('')
  const [origen, setOrigen] = useState('')
  const [estado, setEstado] = useState(params.get('estado') ?? '')
  const [view, setView] = useState<View>('lista')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [moveTo, setMoveTo] = useState('')
  const [newTag, setNewTag] = useState('')

  function changeVista(v: Vista) {
    setVista(v)
    setTipo('')
    setSelected(new Set())
  }

  const tags = useMemo(() => [...new Set((cards ?? []).flatMap((c) => c.etiquetas))].sort(), [cards])

  const conteoVistas = useMemo(() => {
    const activas = (cards ?? []).filter((c) => !c.archivada)
    return {
      tarjetas: activas.filter((c) => c.tipo === 'concepto').length,
      aprendizaje: activas.filter((c) => c.tipo !== 'concepto').length,
    }
  }, [cards])

  const filtered = useMemo(() => {
    if (!cards) return []
    const nq = normalizeText(q)
    return cards
      .filter((c) => {
        if (vista !== 'todas' && (vista === 'tarjetas' ? c.tipo !== 'concepto' : c.tipo === 'concepto')) return false
        if (estado === 'archivada') {
          if (!c.archivada) return false
        } else if (c.archivada) return false
        if (estado && estado !== 'archivada' && c.estado !== estado) return false
        if (categoria && c.categoria !== categoria) return false
        if (etiqueta && !c.etiquetas.includes(etiqueta)) return false
        if (tipo && c.tipo !== tipo) return false
        if (origen && c.origen !== origen) return false
        if (nq && !normalizeText(`${c.pregunta} ${c.respuesta} ${c.etiquetas.join(' ')}`).includes(nq)) return false
        return true
      })
      .sort((a, b) => b.creada.localeCompare(a.creada))
  }, [cards, vista, q, categoria, etiqueta, tipo, origen, estado])

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))
  const hasFilters = q || categoria || etiqueta || tipo || origen || estado

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function bulk(label: string, fn: (c: Card) => Partial<Card>) {
    const ids = [...selected]
    for (const id of ids) {
      const c = await tarjetasRepo.get(id)
      if (c) await tarjetasRepo.upsert({ ...c, ...fn(c) })
    }
    toast.success(`${label}: ${ids.length} ${ids.length === 1 ? 'tarjeta' : 'tarjetas'}.`)
    setSelected(new Set())
  }

  if (!cards) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  return (
    <Page className="max-w-6xl">
      <PageHeader
        title={vista === 'tarjetas' ? 'Biblioteca de tarjetas' : vista === 'aprendizaje' ? 'Biblioteca de aprendizaje' : 'Biblioteca'}
        description={
          vista === 'tarjetas'
            ? `El universo completo de conceptos: ${conteoVistas.tarjetas} tarjetas de referencia.`
            : vista === 'aprendizaje'
              ? `Lo que practicas a diario: ${conteoVistas.aprendizaje} preguntas y desafíos.`
              : 'Elige una pestaña para distinguir tus conceptos de referencia de tus preguntas de práctica.'
        }
        actions={
          <Link href={`/biblioteca/nueva?tipo=${vista === 'aprendizaje' ? 'alternativas' : 'concepto'}`} className={buttonVariants({ className: 'h-10' })}>
            <Plus data-icon="inline-start" />
            Nueva tarjeta
          </Link>
        }
      />

      {cards.length === 0 ? (
        <EmptyState icon={BookOpen} title="Aún no tienes tarjetas" description="Crea una a mano, impórtalas desde JSON o genera un set con IA.">
          <Link href="/biblioteca/nueva" className={buttonVariants({ variant: 'outline', className: 'h-10' })}>
            Nueva tarjeta
          </Link>
          <Link href="/crear" className={buttonVariants({ className: 'h-10' })}>
            Crear con IA
          </Link>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          <div role="tablist" aria-label="Biblioteca" className="flex gap-2">
            <Button type="button" role="tab" aria-selected={vista === 'tarjetas'} variant={vista === 'tarjetas' ? 'default' : 'outline'} onClick={() => changeVista('tarjetas')}>
              Tarjetas <Badge variant="secondary" className="ml-1">{conteoVistas.tarjetas}</Badge>
            </Button>
            <Button type="button" role="tab" aria-selected={vista === 'aprendizaje'} variant={vista === 'aprendizaje' ? 'default' : 'outline'} onClick={() => changeVista('aprendizaje')}>
              Aprendizaje <Badge variant="secondary" className="ml-1">{conteoVistas.aprendizaje}</Badge>
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <label htmlFor="buscar" className="sr-only">
                  Buscar tarjetas
                </label>
                <Input id="buscar" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en preguntas, respuestas y etiquetas" className="h-10 pl-9" />
              </div>
              <ToggleGroup
                value={[view]}
                onValueChange={(v) => v[0] && setView(v[0] as View)}
                variant="outline"
                aria-label="Vista"
              >
                <ToggleGroupItem value="lista" aria-label="Vista de lista" className="h-10 w-10">
                  <List />
                </ToggleGroupItem>
                <ToggleGroupItem value="cuadricula" aria-label="Vista de cuadrícula" className="h-10 w-10">
                  <LayoutGrid />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className={cn('grid grid-cols-2 gap-2', vista === 'tarjetas' ? 'md:grid-cols-4' : 'md:grid-cols-5')}>
              <NativeSelect aria-label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Todas las categorías" options={categories.map((c) => ({ value: c, label: c }))} />
              <NativeSelect aria-label="Etiqueta" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Todas las etiquetas" options={tags.map((t) => ({ value: t, label: t }))} />
              {vista !== 'tarjetas' && (
                <NativeSelect
                  aria-label="Tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Todos los tipos"
                  options={(vista === 'todas' ? CARD_TYPES : TIPOS_APRENDIZAJE).map((t) => ({ value: t, label: CARD_TYPE_LABEL[t] }))}
                />
              )}
              <NativeSelect aria-label="Origen" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Cualquier origen" options={[{ value: 'manual', label: 'Manual' }, { value: 'ia', label: 'IA' }]} />
              <NativeSelect
                aria-label="Estado"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                placeholder="Activas"
                options={[
                  { value: 'revisada', label: 'Revisadas' },
                  { value: 'borrador', label: 'Borradores' },
                  { value: 'archivada', label: 'Archivadas' },
                ]}
                className="col-span-2 md:col-span-1"
              />
            </div>
          </div>

          <div className="flex min-h-10 flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((c) => c.id)) : new Set())}
                aria-label="Seleccionar todas las visibles"
              />
              <span className="text-muted-foreground">
                {selected.size > 0 ? `${selected.size} seleccionadas` : `${filtered.length} resultados`}
              </span>
            </label>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQ('')
                  setCategoria('')
                  setEtiqueta('')
                  setTipo('')
                  setOrigen('')
                  setEstado('')
                  router.replace('/biblioteca')
                }}
              >
                <X data-icon="inline-start" /> Limpiar filtros
              </Button>
            )}
          </div>

          {selected.size > 0 && (
            <div role="toolbar" aria-label="Acciones masivas" className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2 shadow-sm">
              <div className="flex items-center gap-1">
                <Input list="mover-lista" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} placeholder="Categoría" aria-label="Mover a categoría" className="h-9 w-36" />
                <datalist id="mover-lista">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <Button size="sm" variant="outline" className="h-9" disabled={!moveTo.trim()} onClick={() => bulk('Movidas', () => ({ categoria: moveTo.trim() })).then(() => setMoveTo(''))}>
                  <FolderInput data-icon="inline-start" /> Mover
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Etiqueta" aria-label="Etiqueta a agregar" className="h-9 w-32" />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={!newTag.trim()}
                  onClick={() =>
                    bulk('Etiquetadas', (c) => ({ etiquetas: [...new Set([...c.etiquetas, newTag.trim()])] })).then(() => setNewTag(''))
                  }
                >
                  <Tag data-icon="inline-start" /> Etiquetar
                </Button>
              </div>
              <Button size="sm" variant="outline" className="h-9" onClick={() => bulk('Marcadas como revisadas', () => ({ estado: 'revisada' }))}>
                <CheckCheck data-icon="inline-start" /> Marcar revisada
              </Button>
              {estado === 'archivada' ? (
                <Button size="sm" variant="outline" className="h-9" onClick={() => bulk('Restauradas', () => ({ archivada: false }))}>
                  <Archive data-icon="inline-start" /> Restaurar
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="h-9" onClick={() => bulk('Archivadas', () => ({ archivada: true }))}>
                  <Archive data-icon="inline-start" /> Archivar
                </Button>
              )}
              <Button size="sm" variant="ghost" className="ml-auto h-9" onClick={() => setSelected(new Set())}>
                Cancelar
              </Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="Sin resultados" description="Prueba con otros filtros o términos de búsqueda." />
          ) : view === 'lista' ? (
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {filtered.map((c, i) => (
                <ListItem key={c.id} animate={effects} delayIndex={i} as="li" className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label="Seleccionar tarjeta" className="mt-1" />
                  <Link href={`/biblioteca/detalle?id=${c.id}`} className="flex min-w-0 flex-1 flex-col gap-1.5 rounded outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span className="line-clamp-2 font-medium">{stripMarkdown(c.pregunta)}</span>
                    <CardMeta card={c} />
                  </Link>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">{formatDate(c.creada)}</span>
                </ListItem>
              ))}
            </ul>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c, i) => (
                <ListItem
                  key={c.id}
                  animate={effects}
                  delayIndex={i}
                  as="li"
                  className={cn('relative flex flex-col gap-3 rounded-2xl border bg-card p-4', selected.has(c.id) && 'border-primary ring-1 ring-primary')}
                >
                  <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} aria-label="Seleccionar tarjeta" className="absolute top-4 right-4" />
                  <Link href={`/biblioteca/detalle?id=${c.id}`} className="flex flex-1 flex-col gap-3 rounded pr-6 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span className="line-clamp-3 font-medium">{stripMarkdown(c.pregunta)}</span>
                    <span className="line-clamp-2 text-sm text-muted-foreground">{stripMarkdown(c.respuesta)}</span>
                    <div className="mt-auto">
                      <CardMeta card={c} />
                    </div>
                  </Link>
                </ListItem>
              ))}
            </ul>
          )}
        </div>
      )}
    </Page>
  )
}

/** Entrada de lista animada (A10): sin efectos, es un <li>/<div> normal, sin animación. */
function ListItem({
  animate,
  delayIndex,
  as: Tag = 'li',
  className,
  children,
}: {
  animate: boolean
  delayIndex: number
  as?: 'li'
  className?: string
  children: React.ReactNode
}) {
  if (!animate) return <Tag className={className}>{children}</Tag>
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(delayIndex, 8) * 0.02 }}
      className={className}
    >
      {children}
    </motion.li>
  )
}

function CardMeta({ card }: { card: Card }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant="secondary">{card.categoria}</Badge>
      {card.capa && <Badge variant="outline">{card.capa}</Badge>}
      <span className="text-xs text-muted-foreground">{CARD_TYPE_LABEL[card.tipo]}</span>
      <span className="text-xs text-muted-foreground">· {SRS_STATE_LABEL[card.srs.state]}</span>
      {card.estado === 'borrador' && (
        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
          Borrador
        </Badge>
      )}
      {card.origen === 'ia' && <Badge variant="outline">IA</Badge>}
    </span>
  )
}
