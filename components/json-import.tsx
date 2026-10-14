'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Check, CircleAlert, Copy, Pencil, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CardForm } from '@/components/card-form'
import { useCards } from '@/hooks/use-data'
import { useCategories } from '@/hooks/use-categories'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { findDuplicate, mergeReplace, parseCards, type DuplicateMatch, type ImportError } from '@/lib/import'
import { stripMarkdown } from '@/lib/speech'
import { CARD_TYPE_LABEL, type Card } from '@/lib/types'
import { cn } from '@/lib/utils'

type Decision = 'aprobar' | 'borrador' | 'descartar'
type DupAction = 'omitir' | 'reemplazar'

interface Item {
  card: Card
  decision: Decision
  dup: DuplicateMatch | null
  dupAction: DupAction
}

export function JsonImport({
  defaultFromAi = true,
  onDone,
}: {
  defaultFromAi?: boolean
  onDone?: (count: number) => void
}) {
  const library = useCards()
  const categories = useCategories()
  const [text, setText] = useState('')
  const [fromAi, setFromAi] = useState(defaultFromAi)
  const [errors, setErrors] = useState<ImportError[]>([])
  const [items, setItems] = useState<Item[] | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  function validate() {
    const result = parseCards(text, { origen: fromAi ? 'ia' : 'manual' })
    setErrors(result.errors)
    const seen: Card[] = [...(library ?? [])]
    const next = result.cards.map((card) => {
      const dup = findDuplicate(card, seen)
      seen.push(card)
      return {
        card,
        decision: (card.estado === 'borrador' ? 'borrador' : 'aprobar') as Decision,
        dup,
        dupAction: 'omitir' as DupAction,
      }
    })
    setItems(next.length ? next : null)
    if (result.errors.length === 0 && next.length) toast.success(`${next.length} tarjetas válidas.`)
  }

  function update(i: number, patch: Partial<Item>) {
    setItems((list) => list && list.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  }

  const summary = useMemo(() => {
    if (!items) return null
    const incoming = items.filter((it) => it.decision !== 'descartar' && !(it.dup && it.dupAction === 'omitir'))
    return {
      total: incoming.length,
      reemplazos: incoming.filter((it) => it.dup).length,
      borradores: incoming.filter((it) => it.decision === 'borrador').length,
    }
  }, [items])

  async function commit() {
    if (!items) return
    setSaving(true)
    try {
      const libIds = new Set((library ?? []).map((c) => c.id))
      let count = 0
      for (const it of items) {
        if (it.decision === 'descartar') continue
        if (it.dup && it.dupAction === 'omitir') continue
        const estado = it.decision === 'aprobar' ? 'revisada' : 'borrador'
        const card = { ...it.card, estado } as Card
        if (it.dup && libIds.has(it.dup.existing.id)) await tarjetasRepo.upsert(mergeReplace(it.dup.existing, card))
        else await tarjetasRepo.upsert(card)
        count++
      }
      toast.success(`Importamos ${count} ${count === 1 ? 'tarjeta' : 'tarjetas'}.`)
      setItems(null)
      setText('')
      setErrors([])
      onDone?.(count)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="json-pegado">Pega aquí el JSON</Label>
        <Textarea
          id="json-pegado"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            if (items) setItems(null)
          }}
          placeholder='{ "tarjetas": [ ... ] }  — también sirve el texto completo de la IA, con o sin bloque ```json'
          spellCheck={false}
          className="min-h-48 font-mono text-xs"
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={validate} disabled={!text.trim()} className="h-10 px-5">
            Validar
          </Button>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={fromAi} onCheckedChange={(v) => setFromAi(Boolean(v))} />
            Generadas con IA (entran como borrador)
          </label>
        </div>
      </div>

      {errors.length > 0 && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 font-medium text-destructive">
            <CircleAlert className="size-4" aria-hidden="true" />
            {errors.length === 1 ? 'Encontramos 1 problema' : `Encontramos ${errors.length} problemas`}
            {items && ' (las tarjetas válidas igual se pueden importar)'}
          </p>
          <ul className="flex max-h-60 flex-col gap-1 overflow-auto text-sm">
            {errors.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-xs text-muted-foreground">{e.ruta}</span>
                <span>{e.mensaje}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Consejo: pídele a tu IA &quot;Corrige estos errores y devuelve solo el JSON&quot; y pega la lista.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              navigator.clipboard
                .writeText(`Corrige estos errores del JSON y devuelve solo el JSON válido:\n${errors.map((e) => `- ${e.ruta}: ${e.mensaje}`).join('\n')}`)
                .then(() => toast.success('Errores copiados.'))
            }
          >
            <Copy data-icon="inline-start" /> Copiar errores para la IA
          </Button>
        </div>
      )}

      {items && summary && (
        <section aria-labelledby="vista-previa-import" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="vista-previa-import" className="font-semibold">
              Vista previa ({items.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setItems(items.map((it) => (it.decision === 'descartar' ? it : { ...it, decision: 'aprobar' })))}>
                Aprobar todas
              </Button>
              <Button variant="outline" size="sm" onClick={() => setItems(items.map((it) => (it.decision === 'descartar' ? it : { ...it, decision: 'borrador' })))}>
                Todas como borrador
              </Button>
            </div>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((it, i) => (
              <li
                key={it.card.id}
                className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4', it.decision === 'descartar' && 'opacity-50')}
              >
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium">{stripMarkdown(it.card.pregunta)}</span>
                  <span className="line-clamp-2 text-sm text-muted-foreground">{stripMarkdown(it.card.respuesta)}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{it.card.categoria}</Badge>
                    {it.card.capa && <Badge variant="outline">{it.card.capa}</Badge>}
                    <span className="text-xs text-muted-foreground">{CARD_TYPE_LABEL[it.card.tipo]}</span>
                  </span>
                </div>

                {it.dup && it.decision !== 'descartar' && (
                  <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <span>
                        Posible duplicado ({Math.round(it.dup.score * 100)}% similar) de: <strong>{stripMarkdown(it.dup.existing.pregunta)}</strong>
                      </span>
                    </p>
                    <div role="radiogroup" aria-label="Qué hacer con el duplicado" className="flex flex-wrap gap-2">
                      {(['omitir', 'reemplazar'] as DupAction[]).map((a) => (
                        <Button
                          key={a}
                          size="sm"
                          variant={it.dupAction === a ? 'default' : 'outline'}
                          role="radio"
                          aria-checked={it.dupAction === a}
                          onClick={() => update(i, { dupAction: a })}
                        >
                          {a === 'omitir' ? 'Omitir' : 'Reemplazar (mantiene el historial)'}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {it.decision === 'descartar' ? (
                    <Button size="sm" variant="outline" onClick={() => update(i, { decision: 'borrador' })}>
                      <Undo2 data-icon="inline-start" /> Recuperar
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={it.decision === 'aprobar' ? 'default' : 'outline'}
                        aria-pressed={it.decision === 'aprobar'}
                        onClick={() => update(i, { decision: it.decision === 'aprobar' ? 'borrador' : 'aprobar' })}
                      >
                        <Check data-icon="inline-start" /> {it.decision === 'aprobar' ? 'Aprobada' : 'Aprobar'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(i)}>
                        <Pencil data-icon="inline-start" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => update(i, { decision: 'descartar' })}>
                        <Trash2 data-icon="inline-start" /> Descartar
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm md:bottom-4">
            <span className="text-sm text-muted-foreground">
              {summary.total} para importar
              {summary.borradores > 0 && ` · ${summary.borradores} como borrador`}
              {summary.reemplazos > 0 && ` · ${summary.reemplazos} reemplazos`}
            </span>
            <Button onClick={commit} disabled={saving || summary.total === 0} className="h-10 px-5">
              {saving ? 'Importando…' : `Importar ${summary.total}`}
            </Button>
          </div>
        </section>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar antes de importar</DialogTitle>
            <DialogDescription>Los cambios se aplican solo a esta vista previa hasta que importes.</DialogDescription>
          </DialogHeader>
          {editing !== null && items?.[editing] && (
            <CardForm
              compact
              initial={items[editing].card}
              categories={categories}
              submitLabel="Aplicar cambios"
              onSubmit={(card) => {
                update(editing, { card })
                setEditing(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
