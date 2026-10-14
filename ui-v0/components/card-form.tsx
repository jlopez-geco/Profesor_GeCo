'use client'

import { useState } from 'react'
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/native-select'
import { StudyCard } from '@/components/study-card'
import { emptySrs } from '@/lib/srs'
import {
  CARD_TYPES,
  CARD_TYPE_LABEL,
  DIFICULTADES,
  DIFICULTAD_LABEL,
  DOMINIOS,
  DOMINIO_LABEL,
  LENGUAS,
  LENGUA_LABEL,
  NIVELES,
  REGISTROS,
  type Card,
  type IdiomaInfo,
} from '@/lib/types'

const CAPAS = ['Auth', 'Base de datos', 'Storage', 'Edge Functions', 'Red', 'Lógica', 'Observabilidad', 'Infraestructura']

export function blankCard(): Card {
  return {
    id: crypto.randomUUID(),
    tipo: 'concepto',
    categoria: '',
    etiquetas: [],
    pregunta: '',
    respuesta: '',
    dificultad: 'intermedia',
    origen: 'manual',
    estado: 'revisada',
    creada: new Date().toISOString(),
    srs: emptySrs(),
  }
}

const DEFAULT_IDIOMA: IdiomaInfo = { lengua: 'en', dominio: 'software', nivel: 'B1', registro: 'neutro', falsos_amigos: [], audio: true }

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function CardForm({
  initial,
  categories,
  onSubmit,
  submitLabel = 'Guardar',
  secondary,
  compact,
}: {
  initial: Card
  categories: string[]
  onSubmit: (card: Card) => void | Promise<void>
  submitLabel?: string
  secondary?: React.ReactNode
  compact?: boolean
}) {
  const [card, setCard] = useState<Card>(initial)
  const [tagsText, setTagsText] = useState(initial.etiquetas.join(', '))
  const [falsosText, setFalsosText] = useState(initial.idioma?.falsos_amigos?.join(', ') ?? '')
  const [revealed, setRevealed] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const needsIdioma = card.tipo === 'vocabulario' || card.tipo === 'gramatica'
  const hasIdioma = needsIdioma || !!card.idioma

  function set<K extends keyof Card>(key: K, value: Card[K]) {
    setCard((c) => ({ ...c, [key]: value }))
  }
  function setIdioma(patch: Partial<IdiomaInfo>) {
    setCard((c) => ({ ...c, idioma: { ...DEFAULT_IDIOMA, ...c.idioma, ...patch } }))
  }

  function changeType(tipo: Card['tipo']) {
    setCard((c) => {
      const next: Card = { ...c, tipo }
      if (tipo === 'alternativas' && !c.opciones) {
        next.opciones = ['', '', '', '']
        next.correcta = 0
      }
      if (tipo === 'cloze' && typeof c.correcta !== 'string') next.correcta = ''
      if (tipo !== 'alternativas' && tipo !== 'cloze') {
        delete next.opciones
        delete next.correcta
      }
      if ((tipo === 'vocabulario' || tipo === 'gramatica') && !c.idioma) next.idioma = { ...DEFAULT_IDIOMA }
      return next
    })
  }

  function finalCard(): Card {
    const etiquetas = tagsText.split(',').map((t) => t.trim()).filter(Boolean)
    const out: Card = { ...card, categoria: card.categoria.trim(), etiquetas }
    if (out.idioma) out.idioma = { ...out.idioma, falsos_amigos: falsosText.split(',').map((t) => t.trim()).filter(Boolean) }
    if (out.tipo === 'alternativas') out.opciones = (out.opciones ?? []).map((o) => o.trim()).filter(Boolean)
    for (const k of ['capa', 'explicacion', 'ejemplo'] as const) if (!out[k]?.trim()) delete out[k]
    return out
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const c = finalCard()
    if (!c.categoria) return setError('Indica una categoría.')
    if (!c.pregunta.trim() || !c.respuesta.trim()) return setError('La pregunta y la respuesta son obligatorias.')
    if (c.tipo === 'alternativas' && (c.opciones!.length < 2 || typeof c.correcta !== 'number' || c.correcta >= c.opciones!.length))
      return setError('Las alternativas necesitan al menos 2 opciones y una correcta.')
    if (c.tipo === 'cloze' && (typeof c.correcta !== 'string' || !c.correcta.trim()))
      return setError('Indica el texto exacto que completa el espacio.')
    if (c.tipo === 'cloze' && !/_{2,}/.test(c.pregunta)) return setError('Marca el espacio en la pregunta con ____.')
    setError(null)
    setSaving(true)
    try {
      await onSubmit(c)
    } finally {
      setSaving(false)
    }
  }

  const preview = finalCard()

  return (
    <form onSubmit={submit} className={compact ? 'flex flex-col gap-6' : 'grid gap-8 lg:grid-cols-[1fr_minmax(0,26rem)]'}>
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo" htmlFor="tipo">
            <NativeSelect
              id="tipo"
              value={card.tipo}
              onChange={(e) => changeType(e.target.value as Card['tipo'])}
              options={CARD_TYPES.map((t) => ({ value: t, label: CARD_TYPE_LABEL[t] }))}
            />
          </Field>
          <Field label="Dificultad" htmlFor="dificultad">
            <NativeSelect
              id="dificultad"
              value={card.dificultad}
              onChange={(e) => set('dificultad', e.target.value as Card['dificultad'])}
              options={DIFICULTADES.map((d) => ({ value: d, label: DIFICULTAD_LABEL[d] }))}
            />
          </Field>
          <Field label="Categoría" htmlFor="categoria">
            <Input id="categoria" list="categorias-lista" value={card.categoria} onChange={(e) => set('categoria', e.target.value)} className="h-10" placeholder="Ej. Supabase" />
            <datalist id="categorias-lista">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Capa (opcional)" htmlFor="capa">
            <Input id="capa" list="capas-lista" value={card.capa ?? ''} onChange={(e) => set('capa', e.target.value)} className="h-10" placeholder="Ej. Auth" />
            <datalist id="capas-lista">
              {CAPAS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Etiquetas" htmlFor="etiquetas" hint="Separadas por coma.">
          <Input id="etiquetas" value={tagsText} onChange={(e) => setTagsText(e.target.value)} className="h-10" placeholder="rls, seguridad" />
        </Field>

        <Field
          label={card.tipo === 'vocabulario' ? 'Término' : 'Pregunta'}
          htmlFor="pregunta"
          hint={card.tipo === 'cloze' ? 'Marca el espacio con ____ (cuatro guiones bajos). Admite markdown.' : 'Admite markdown y bloques de código.'}
        >
          <Textarea id="pregunta" value={card.pregunta} onChange={(e) => set('pregunta', e.target.value)} className="min-h-24 font-mono text-sm" />
        </Field>

        {card.tipo === 'cloze' && (
          <Field label="Texto que completa el espacio" htmlFor="correcta-cloze">
            <Input id="correcta-cloze" value={typeof card.correcta === 'string' ? card.correcta : ''} onChange={(e) => set('correcta', e.target.value)} className="h-10" />
          </Field>
        )}

        {card.tipo === 'alternativas' && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Opciones (marca la correcta)</legend>
            {(card.opciones ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correcta"
                  checked={card.correcta === i}
                  onChange={() => set('correcta', i)}
                  aria-label={`Opción ${i + 1} es la correcta`}
                  className="size-4 accent-primary"
                />
                <Input
                  value={opt}
                  onChange={(e) => set('opciones', card.opciones!.map((o, j) => (j === i ? e.target.value : o)))}
                  aria-label={`Opción ${i + 1}`}
                  className="h-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={`Quitar opción ${i + 1}`}
                  disabled={(card.opciones?.length ?? 0) <= 2}
                  onClick={() =>
                    setCard((c) => {
                      const opciones = c.opciones!.filter((_, j) => j !== i)
                      const correcta = typeof c.correcta === 'number' ? (c.correcta === i ? 0 : c.correcta > i ? c.correcta - 1 : c.correcta) : 0
                      return { ...c, opciones, correcta }
                    })
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
            {(card.opciones?.length ?? 0) < 6 && (
              <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => set('opciones', [...(card.opciones ?? []), ''])}>
                <Plus data-icon="inline-start" /> Agregar opción
              </Button>
            )}
          </fieldset>
        )}

        <Field label={card.tipo === 'vocabulario' ? 'Traducción' : card.tipo === 'desafio_codigo' ? 'Solución' : 'Respuesta'} htmlFor="respuesta">
          <Textarea id="respuesta" value={card.respuesta} onChange={(e) => set('respuesta', e.target.value)} className="min-h-28 font-mono text-sm" />
        </Field>
        <Field label="Explicación (opcional)" htmlFor="explicacion">
          <Textarea id="explicacion" value={card.explicacion ?? ''} onChange={(e) => set('explicacion', e.target.value)} className="min-h-20" />
        </Field>
        <Field label="Ejemplo (opcional)" htmlFor="ejemplo">
          <Textarea id="ejemplo" value={card.ejemplo ?? ''} onChange={(e) => set('ejemplo', e.target.value)} className="min-h-20 font-mono text-sm" />
        </Field>

        {!needsIdioma && (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={!!card.idioma}
              onCheckedChange={(v) => setCard((c) => ({ ...c, idioma: v ? { ...DEFAULT_IDIOMA } : undefined }))}
            />
            Es una tarjeta de idioma
          </label>
        )}

        {hasIdioma && card.idioma && (
          <fieldset className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <legend className="px-1 text-sm font-medium">Idioma</legend>
            <Field label="Lengua" htmlFor="lengua">
              <NativeSelect id="lengua" value={card.idioma.lengua} onChange={(e) => setIdioma({ lengua: e.target.value as IdiomaInfo['lengua'] })} options={LENGUAS.map((l) => ({ value: l, label: LENGUA_LABEL[l] }))} />
            </Field>
            <Field label="Dominio" htmlFor="dominio">
              <NativeSelect id="dominio" value={card.idioma.dominio} onChange={(e) => setIdioma({ dominio: e.target.value as IdiomaInfo['dominio'] })} options={DOMINIOS.map((d) => ({ value: d, label: DOMINIO_LABEL[d] }))} />
            </Field>
            <Field label="Nivel" htmlFor="nivel">
              <NativeSelect id="nivel" value={card.idioma.nivel} onChange={(e) => setIdioma({ nivel: e.target.value as IdiomaInfo['nivel'] })} options={NIVELES.map((n) => ({ value: n, label: n }))} />
            </Field>
            <Field label="Registro" htmlFor="registro">
              <NativeSelect id="registro" value={card.idioma.registro ?? 'neutro'} onChange={(e) => setIdioma({ registro: e.target.value as IdiomaInfo['registro'] })} options={REGISTROS.map((r) => ({ value: r, label: r[0].toUpperCase() + r.slice(1) }))} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Falsos amigos" htmlFor="falsos" hint="Separados por coma.">
                <Input id="falsos" value={falsosText} onChange={(e) => setFalsosText(e.target.value)} className="h-10" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox checked={card.idioma.audio !== false} onCheckedChange={(v) => setIdioma({ audio: Boolean(v) })} />
              Habilitar audio (pronunciación)
            </label>
          </fieldset>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-10 px-5" disabled={saving}>
            {saving ? 'Guardando…' : submitLabel}
          </Button>
          {secondary}
        </div>
      </div>

      {!compact && (
        <aside aria-label="Vista previa" className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Vista previa</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRevealed((r) => !r)}>
              {revealed ? <EyeOff data-icon="inline-start" /> : <Eye data-icon="inline-start" />}
              {revealed ? 'Ocultar respuesta' : 'Mostrar respuesta'}
            </Button>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            {preview.pregunta.trim() ? (
              <StudyCard
                key={`${preview.tipo}-${revealed}`}
                card={preview}
                revealed={revealed}
                onReveal={() => setRevealed(true)}
                shortcuts={false}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Escribe una pregunta para ver la vista previa.</p>
            )}
          </div>
        </aside>
      )}
    </form>
  )
}
