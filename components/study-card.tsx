'use client'

import { Check, Ear, Eye, Languages, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Markdown } from '@/components/markdown'
import { SpeakButton } from '@/components/speak-button'
import { speak, stripMarkdown } from '@/lib/speech'
import { CARD_TYPE_LABEL, LENGUA_LABEL, type Card, type Rating } from '@/lib/types'
import { cn } from '@/lib/utils'

export type VocabMode = 'reconocer' | 'escuchar' | 'traducir'
export const VOCAB_MODE_LABEL: Record<VocabMode, string> = {
  reconocer: 'Reconocer',
  escuchar: 'Escucha y escribe',
  traducir: 'Traducción corta',
}

/** Alterna el ejercicio de vocabulario según los repasos; la primera vista siempre es de reconocimiento. */
export function vocabMode(card: Card): VocabMode {
  if (card.tipo !== 'vocabulario' || card.srs.reps === 0) return 'reconocer'
  const modes: VocabMode[] = card.idioma?.audio ? ['reconocer', 'escuchar', 'traducir'] : ['reconocer', 'traducir']
  return modes[card.srs.reps % modes.length]
}

type Verdict = 'correcta' | 'casi' | 'incorrecta'

function norm(s: string, accents = true) {
  let out = stripMarkdown(s).toLowerCase().replace(/[’']/g, "'").replace(/[.!?¿¡,;:«»"]/g, '').replace(/\s+/g, ' ').trim()
  if (!accents) out = out.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return out
}

function compare(input: string, expected: string): Verdict {
  if (norm(input) === norm(expected)) return 'correcta'
  if (norm(input, false) === norm(expected, false)) return 'casi'
  return 'incorrecta'
}

const VERDICT_RATING: Record<Verdict, Rating> = { correcta: 3, casi: 2, incorrecta: 1 }

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export interface StudyCardProps {
  card: Card
  revealed: boolean
  onReveal: (suggested?: Rating) => void
  mode?: VocabMode
  /** Desactiva los atajos (por ejemplo en la vista previa del editor). */
  shortcuts?: boolean
}

export function StudyCard({ card, revealed, onReveal, mode = 'reconocer', shortcuts = true }: StudyCardProps) {
  const simpleReveal =
    card.tipo === 'concepto' || card.tipo === 'gramatica' || (card.tipo === 'vocabulario' && mode === 'reconocer')

  useEffect(() => {
    if (!shortcuts || revealed || !simpleReveal) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        onReveal()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts, revealed, simpleReveal, onReveal])

  return (
    <article className="flex flex-col gap-6" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{card.categoria}</Badge>
        {card.capa && <Badge variant="outline">{card.capa}</Badge>}
        <span className="text-xs text-muted-foreground">
          {card.tipo === 'vocabulario' && mode !== 'reconocer' ? VOCAB_MODE_LABEL[mode] : CARD_TYPE_LABEL[card.tipo]}
          {card.idioma && ` · ${LENGUA_LABEL[card.idioma.lengua]} ${card.idioma.nivel}`}
        </span>
      </div>

      {card.tipo === 'cloze' && <ClozeBody card={card} revealed={revealed} onReveal={onReveal} />}
      {card.tipo === 'alternativas' && (
        <ChoiceBody card={card} revealed={revealed} onReveal={onReveal} shortcuts={shortcuts} />
      )}
      {card.tipo === 'desafio_codigo' && (
        <CodeBody card={card} revealed={revealed} onReveal={onReveal} shortcuts={shortcuts} />
      )}
      {card.tipo === 'vocabulario' && <VocabBody card={card} revealed={revealed} onReveal={onReveal} mode={mode} />}
      {(card.tipo === 'concepto' || card.tipo === 'gramatica') && (
        <>
          <Markdown className="text-lg md:text-xl">{card.pregunta}</Markdown>
          {!revealed && <RevealButton onClick={() => onReveal()} />}
          {revealed && <Answer card={card} />}
        </>
      )}
    </article>
  )
}

function RevealButton({ onClick, label = 'Mostrar respuesta' }: { onClick: () => void; label?: string }) {
  return (
    <Button size="lg" className="h-12 w-full text-base sm:w-auto sm:self-start sm:px-6" onClick={onClick}>
      <Eye data-icon="inline-start" />
      {label}
      <kbd className="ml-2 hidden rounded bg-primary-foreground/20 px-1.5 font-mono text-xs md:inline">Espacio</kbd>
    </Button>
  )
}

function Answer({ card, hideMain }: { card: Card; hideMain?: boolean }) {
  return (
    <div className="flex flex-col gap-4 border-t pt-5">
      {!hideMain && <Markdown className="text-base md:text-lg">{card.respuesta}</Markdown>}
      {card.ejemplo && card.tipo !== 'vocabulario' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ejemplo</span>
          <Markdown className="text-sm">{card.ejemplo}</Markdown>
        </div>
      )}
      {card.explicacion && (
        <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
          <Markdown>{card.explicacion}</Markdown>
        </div>
      )}
      {card.idioma?.falsos_amigos && card.idioma.falsos_amigos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Falsos amigos:</span>
          {card.idioma.falsos_amigos.map((f) => (
            <Badge key={f} variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
              {f}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function VerdictBanner({ verdict, expected }: { verdict: Verdict; expected: string }) {
  const map = {
    correcta: { icon: Check, text: '¡Correcto!', cls: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300' },
    casi: { icon: Check, text: 'Casi: revisa los acentos.', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300' },
    incorrecta: { icon: X, text: 'No era esa.', cls: 'border-destructive/40 bg-destructive/10 text-destructive' },
  }[verdict]
  const Icon = map.icon
  return (
    <div className={cn('flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm', map.cls)} role="status">
      <Icon className="size-4" aria-hidden="true" />
      <span className="font-medium">{map.text}</span>
      {verdict !== 'correcta' && (
        <span>
          Respuesta esperada: <strong>{stripMarkdown(expected)}</strong>
        </span>
      )}
    </div>
  )
}

function TypedAnswer({
  expected,
  revealed,
  onReveal,
  label,
  placeholder,
  lang,
}: {
  expected: string
  revealed: boolean
  onReveal: (s?: Rating) => void
  label: string
  placeholder?: string
  lang?: string
}) {
  const [value, setValue] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function submit() {
    if (!value.trim()) {
      onReveal(1)
      setVerdict('incorrecta')
      return
    }
    const v = compare(value, expected)
    setVerdict(v)
    onReveal(VERDICT_RATING[v])
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          if (!revealed) submit()
        }}
      >
        <label className="sr-only" htmlFor="respuesta-escrita">
          {label}
        </label>
        <Input
          id="respuesta-escrita"
          ref={inputRef}
          value={value}
          lang={lang}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.nativeEvent.isComposing || e.keyCode === 229)) e.preventDefault()
          }}
          placeholder={placeholder ?? 'Escribe tu respuesta'}
          readOnly={revealed}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-12 text-base"
        />
        {!revealed && (
          <Button type="submit" size="lg" className="h-12 px-5">
            Comprobar
          </Button>
        )}
      </form>
      {revealed && verdict && <VerdictBanner verdict={verdict} expected={expected} />}
      {revealed && !verdict && <VerdictBanner verdict="incorrecta" expected={expected} />}
    </div>
  )
}

function ClozeBody({ card, revealed, onReveal }: { card: Card; revealed: boolean; onReveal: (s?: Rating) => void }) {
  const expected = typeof card.correcta === 'string' ? card.correcta : card.respuesta
  return (
    <>
      <Markdown className="text-lg md:text-xl">{card.pregunta.replace(/_{2,}/g, '`____`')}</Markdown>
      <TypedAnswer
        expected={expected}
        revealed={revealed}
        onReveal={onReveal}
        label="Completa el espacio en blanco"
        placeholder="Completa el espacio"
        lang={card.idioma?.lengua}
      />
      {revealed && <Answer card={card} />}
    </>
  )
}

function ChoiceBody({
  card,
  revealed,
  onReveal,
  shortcuts,
}: {
  card: Card
  revealed: boolean
  onReveal: (s?: Rating) => void
  shortcuts: boolean
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const options = card.opciones ?? []
  const correct = typeof card.correcta === 'number' ? card.correcta : options.indexOf(String(card.correcta))

  function choose(i: number) {
    if (revealed) return
    setPicked(i)
    onReveal(i === correct ? 3 : 1)
  }

  useEffect(() => {
    if (!shortcuts || revealed) return
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      const n = Number(e.key)
      if (n >= 1 && n <= options.length) {
        e.preventDefault()
        setPicked(n - 1)
        onReveal(n - 1 === correct ? 3 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcuts, revealed, options.length, correct, onReveal])

  return (
    <>
      <Markdown className="text-lg md:text-xl">{card.pregunta}</Markdown>
      <ul className="flex flex-col gap-2">
        {options.map((opt, i) => {
          const isCorrect = revealed && i === correct
          const isWrong = revealed && picked === i && i !== correct
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => choose(i)}
                disabled={revealed}
                aria-pressed={picked === i}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:border-primary/50 enabled:hover:bg-primary/5',
                  isCorrect && 'border-emerald-600/60 bg-emerald-600/10',
                  isWrong && 'border-destructive/60 bg-destructive/10',
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-muted font-mono text-xs">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <Markdown>{opt}</Markdown>
                </span>
                {isCorrect && <Check className="size-4 text-emerald-600" aria-label="Correcta" />}
                {isWrong && <X className="size-4 text-destructive" aria-label="Incorrecta" />}
              </button>
            </li>
          )
        })}
      </ul>
      {revealed && <Answer card={card} />}
    </>
  )
}

function CodeBody({
  card,
  revealed,
  onReveal,
  shortcuts,
}: {
  card: Card
  revealed: boolean
  onReveal: (s?: Rating) => void
  shortcuts: boolean
}) {
  const [code, setCode] = useState('')
  return (
    <>
      <Markdown className="text-base md:text-lg">{card.pregunta}</Markdown>
      <div className="flex flex-col gap-2">
        <label htmlFor="editor-codigo" className="text-sm font-medium">
          Tu solución
        </label>
        <Textarea
          id="editor-codigo"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (shortcuts && e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !revealed) {
              e.preventDefault()
              onReveal()
            }
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault()
              const el = e.currentTarget
              const { selectionStart: s, selectionEnd: end } = el
              const next = `${code.slice(0, s)}  ${code.slice(end)}`
              setCode(next)
              requestAnimationFrame(() => el.setSelectionRange(s + 2, s + 2))
            }
          }}
          spellCheck={false}
          placeholder="// Escribe aquí. Ctrl + Enter para ver la solución."
          className="min-h-44 font-mono text-sm leading-relaxed"
        />
      </div>
      {!revealed && <RevealButton onClick={() => onReveal()} label="Ver solución" />}
      {revealed && <Answer card={card} />}
    </>
  )
}

function VocabBody({
  card,
  revealed,
  onReveal,
  mode,
}: {
  card: Card
  revealed: boolean
  onReveal: (s?: Rating) => void
  mode: VocabMode
}) {
  const lengua = card.idioma?.lengua ?? 'en'
  const term = stripMarkdown(card.pregunta)
  const playedRef = useRef(false)

  useEffect(() => {
    if (mode === 'escuchar' && !playedRef.current) {
      playedRef.current = true
      const t = setTimeout(() => speak(term, lengua), 250)
      return () => clearTimeout(t)
    }
  }, [mode, term, lengua])

  if (mode === 'escuchar') {
    return (
      <>
        <div className="flex items-center gap-4">
          <SpeakButton text={term} lengua={lengua} label="Repetir audio" className="size-14" />
          <SpeakButton text={term} lengua={lengua} label="Repetir lento" slow className="size-11 opacity-80" />
          <p className="flex items-center gap-2 text-muted-foreground">
            <Ear className="size-4" aria-hidden="true" /> Escucha y escribe lo que oyes en {LENGUA_LABEL[lengua].toLowerCase()}.
          </p>
        </div>
        <TypedAnswer expected={term} revealed={revealed} onReveal={onReveal} label="Lo que escuchaste" lang={lengua} />
        {revealed && <VocabAnswer card={card} />}
      </>
    )
  }

  if (mode === 'traducir') {
    return (
      <>
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="size-4" aria-hidden="true" /> Escríbelo en {LENGUA_LABEL[lengua].toLowerCase()}:
          </p>
          <Markdown className="text-2xl font-semibold md:text-3xl">{card.respuesta}</Markdown>
        </div>
        <TypedAnswer
          expected={term}
          revealed={revealed}
          onReveal={onReveal}
          label={`Traducción al ${LENGUA_LABEL[lengua].toLowerCase()}`}
          lang={lengua}
        />
        {revealed && <VocabAnswer card={card} />}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <p className="text-3xl font-semibold tracking-tight md:text-4xl" lang={lengua}>
          {term}
        </p>
        {card.idioma?.audio !== false && <SpeakButton text={term} lengua={lengua} />}
      </div>
      {card.ejemplo && (
        <div className="flex items-start gap-3">
          <p className="text-lg text-muted-foreground italic" lang={lengua}>
            {stripMarkdown(card.ejemplo)}
          </p>
          <SpeakButton text={card.ejemplo} lengua={lengua} label="Escuchar ejemplo" className="size-9 shrink-0" />
        </div>
      )}
      {!revealed && <RevealButton onClick={() => onReveal()} label="Mostrar traducción" />}
      {revealed && (
        <div className="flex flex-col gap-4 border-t pt-5">
          <Markdown className="text-xl font-medium">{card.respuesta}</Markdown>
          <Answer card={card} hideMain />
        </div>
      )}
    </>
  )
}

function VocabAnswer({ card }: { card: Card }) {
  const lengua = card.idioma?.lengua ?? 'en'
  return (
    <div className="flex flex-col gap-4 border-t pt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-2xl font-semibold" lang={lengua}>
          {stripMarkdown(card.pregunta)}
        </span>
        <span className="text-lg text-muted-foreground">{stripMarkdown(card.respuesta)}</span>
      </div>
      {card.ejemplo && (
        <p className="text-muted-foreground italic" lang={lengua}>
          {stripMarkdown(card.ejemplo)}
        </p>
      )}
      <Answer card={card} hideMain />
    </div>
  )
}
