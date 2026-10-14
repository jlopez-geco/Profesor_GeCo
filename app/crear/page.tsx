'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Page as PageLayout, PageHeader } from '@/components/page-header'
import { LoadingBlock } from '@/components/empty-state'
import { PromptBox } from '@/components/prompt-box'
import { JsonImport } from '@/components/json-import'
import { Field } from '@/components/card-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { NativeSelect } from '@/components/native-select'
import { useCategories } from '@/hooks/use-categories'
import { buildLanguagePrompt, buildTechPrompt } from '@/lib/prompts'
import { cn } from '@/lib/utils'
import {
  CARD_TYPES,
  CARD_TYPE_LABEL,
  DIFICULTADES,
  DIFICULTAD_LABEL,
  DOMINIO_LABEL,
  LENGUAS,
  LENGUA_LABEL,
  REGISTROS,
  type CardType,
  type Dificultad,
  type Dominio,
  type Lengua,
  type Nivel,
  type Registro,
} from '@/lib/types'

type Modo = 'tecnica' | 'idioma'
type Paso = 'elegir' | 'pegar'

/** Francés solo cubre conversacional A1-B1 (A6); inglés cubre los 5 dominios y A1-C1. */
const DOMINIOS_POR_LENGUA: Record<Lengua, Dominio[]> = {
  en: ['conversacional', 'software', 'legal', 'finanzas', 'sostenibilidad'],
  fr: ['conversacional'],
}
const NIVELES_POR_LENGUA: Record<Lengua, Nivel[]> = {
  en: ['A1', 'A2', 'B1', 'B2', 'C1'],
  fr: ['A1', 'A2', 'B1'],
}

const TIPOS_TECNICOS = CARD_TYPES.filter((t) => t !== 'vocabulario' && t !== 'gramatica')

function Stepper({ paso }: { paso: Paso }) {
  const steps: { id: Paso; label: string }[] = [
    { id: 'elegir', label: 'Elegir tema' },
    { id: 'pegar', label: 'Pegar resultado' },
  ]
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Pasos para crear con IA">
      {steps.map((s, i) => (
        <li key={s.id} className="flex items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
              paso === s.id && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {i + 1}
          </span>
          <span className={cn(paso === s.id && 'font-medium text-foreground')}>{s.label}</span>
          {i < steps.length - 1 && <span aria-hidden="true" className="mx-1 text-muted-foreground/50">—</span>}
        </li>
      ))}
    </ol>
  )
}

function CrearContent() {
  const router = useRouter()
  const params = useSearchParams()
  const categories = useCategories()
  const [paso, setPaso] = useState<Paso>(params.get('paso') === '3' ? 'pegar' : 'elegir')
  const [prompt, setPrompt] = useState<string | null>(null)

  const [modo, setModo] = useState<Modo>('tecnica')
  const [tema, setTema] = useState('')
  const [categoria, setCategoria] = useState('')
  const [capa, setCapa] = useState('')
  const [cantidad, setCantidad] = useState(8)
  const [dificultad, setDificultad] = useState<Dificultad>('intermedia')
  const [tipos, setTipos] = useState<CardType[]>(['concepto', 'alternativas', 'desafio_codigo'])

  const [lengua, setLengua] = useState<Lengua>('en')
  const [dominio, setDominio] = useState<Dominio>('software')
  const [nivel, setNivel] = useState<Nivel>('B1')
  const [registro, setRegistro] = useState<Registro>('neutro')

  function toggleTipo(t: CardType) {
    setTipos((list) => (list.includes(t) ? list.filter((x) => x !== t) : [...list, t]))
  }

  function changeLengua(l: Lengua) {
    setLengua(l)
    if (!DOMINIOS_POR_LENGUA[l].includes(dominio)) setDominio(DOMINIOS_POR_LENGUA[l][0])
    if (!NIVELES_POR_LENGUA[l].includes(nivel)) setNivel(NIVELES_POR_LENGUA[l][0])
  }

  function generate() {
    const p =
      modo === 'tecnica'
        ? buildTechPrompt({ tema, categoria, capa, cantidad, dificultad, tipos: tipos.length ? tipos : ['concepto'] })
        : buildLanguagePrompt({ lengua, dominio, nivel, registro, tema, cantidad })
    setPrompt(p)
  }

  return (
    <PageLayout className="max-w-3xl">
      <PageHeader title="Crear con IA" description="Describe tu tema, copia el prompt en tu asistente de IA favorito (ChatGPT, Claude, Gemini, Copilot) y pega el resultado." />
      <Stepper paso={paso} />

      {paso === 'elegir' && (
        <div className="flex flex-col gap-6">
          <div role="radiogroup" aria-label="Tipo de contenido" className="flex gap-2">
            <Button type="button" variant={modo === 'tecnica' ? 'default' : 'outline'} aria-pressed={modo === 'tecnica'} onClick={() => setModo('tecnica')}>
              Conceptos técnicos
            </Button>
            <Button type="button" variant={modo === 'idioma' ? 'default' : 'outline'} aria-pressed={modo === 'idioma'} onClick={() => setModo('idioma')}>
              Idiomas
            </Button>
          </div>

          {modo === 'tecnica' ? (
            <div className="flex flex-col gap-4">
              <Field label="Tema o contexto de trabajo" htmlFor="tema" hint='Ej. "voy a trabajar con RLS en Supabase" o pega una descripción de tu proyecto.'>
                <Textarea id="tema" value={tema} onChange={(e) => setTema(e.target.value)} className="min-h-28" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Categoría (opcional)" htmlFor="categoria">
                  <Input id="categoria" list="categorias-existentes" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej. Supabase, AWS" />
                  <datalist id="categorias-existentes">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Capa (opcional)" htmlFor="capa">
                  <Input id="capa" value={capa} onChange={(e) => setCapa(e.target.value)} placeholder="Ej. Base de datos" />
                </Field>
                <Field label="Dificultad" htmlFor="dificultad">
                  <NativeSelect
                    id="dificultad"
                    value={dificultad}
                    onChange={(e) => setDificultad(e.target.value as Dificultad)}
                    options={DIFICULTADES.map((d) => ({ value: d, label: DIFICULTAD_LABEL[d] }))}
                  />
                </Field>
                <Field label="Cantidad de tarjetas" htmlFor="cantidad">
                  <Input id="cantidad" type="number" min={1} max={20} value={cantidad} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
              </div>
              <Field label="Tipos de tarjeta" htmlFor="tipos">
                <div className="flex flex-wrap gap-3">
                  {TIPOS_TECNICOS.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={tipos.includes(t)} onCheckedChange={() => toggleTipo(t)} />
                      {CARD_TYPE_LABEL[t]}
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Idioma" htmlFor="lengua">
                  <NativeSelect id="lengua" value={lengua} onChange={(e) => changeLengua(e.target.value as Lengua)} options={LENGUAS.map((l) => ({ value: l, label: LENGUA_LABEL[l] }))} />
                </Field>
                <Field label="Dominio" htmlFor="dominio">
                  <NativeSelect
                    id="dominio"
                    value={dominio}
                    onChange={(e) => setDominio(e.target.value as Dominio)}
                    options={DOMINIOS_POR_LENGUA[lengua].map((d) => ({ value: d, label: DOMINIO_LABEL[d] }))}
                  />
                </Field>
                <Field label="Nivel" htmlFor="nivel">
                  <NativeSelect id="nivel" value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)} options={NIVELES_POR_LENGUA[lengua].map((n) => ({ value: n, label: n }))} />
                </Field>
                <Field label="Registro" htmlFor="registro">
                  <NativeSelect id="registro" value={registro} onChange={(e) => setRegistro(e.target.value as Registro)} options={REGISTROS.map((r) => ({ value: r, label: r }))} />
                </Field>
                <Field label="Cantidad de tarjetas" htmlFor="cantidad-idioma">
                  <Input id="cantidad-idioma" type="number" min={1} max={20} value={cantidad} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />
                </Field>
              </div>
              <Field label="Contexto (opcional)" htmlFor="tema-idioma" hint='Ej. "vocabulario de contratos en inglés para revisar propuestas con clientes".'>
                <Textarea id="tema-idioma" value={tema} onChange={(e) => setTema(e.target.value)} className="min-h-24" />
              </Field>
            </div>
          )}

          <Button size="lg" className="h-12 self-start px-6" onClick={generate} disabled={modo === 'tecnica' && !tema.trim()}>
            Generar prompt
          </Button>

          {prompt && (
            <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
              <PromptBox prompt={prompt} />
              <Button variant="outline" className="h-10 self-start" onClick={() => setPaso('pegar')}>
                Ya tengo el resultado de la IA →
              </Button>
            </div>
          )}
        </div>
      )}

      {paso === 'pegar' && (
        <div className="flex flex-col gap-4">
          <Button variant="ghost" size="sm" className="self-start text-muted-foreground" onClick={() => setPaso('elegir')}>
            ← Volver a elegir tema
          </Button>
          <JsonImport
            onDone={(count) => {
              toast.success(`${count} ${count === 1 ? 'tarjeta lista' : 'tarjetas listas'}.`)
              router.push('/biblioteca')
            }}
          />
        </div>
      )}
    </PageLayout>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <PageLayout>
          <LoadingBlock />
        </PageLayout>
      }
    >
      <CrearContent />
    </Suspense>
  )
}
