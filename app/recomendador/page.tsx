'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Page, PageHeader } from '@/components/page-header'
import { LoadingBlock } from '@/components/empty-state'
import { Field } from '@/components/card-form'
import { PromptBox } from '@/components/prompt-box'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { useCards } from '@/hooks/use-data'
import { useCategories } from '@/hooks/use-categories'
import { buildRecommenderPrompt } from '@/lib/prompts'
import { stripMarkdown } from '@/lib/speech'

export default function RecomendadorPage() {
  const cards = useCards()
  const categories = useCategories()
  const [intereses, setIntereses] = useState('')
  const [cantidad, setCantidad] = useState(5)
  const [prompt, setPrompt] = useState<string | null>(null)

  const conceptosExistentes = useMemo(() => (cards ?? []).map((c) => stripMarkdown(c.pregunta)), [cards])

  if (!cards) {
    return (
      <Page>
        <LoadingBlock />
      </Page>
    )
  }

  function generate() {
    setPrompt(
      buildRecommenderPrompt({
        categorias: categories,
        conceptosExistentes,
        intereses,
        cantidad,
      }),
    )
  }

  return (
    <Page className="max-w-3xl">
      <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'sm', className: '-ml-2 mb-4 text-muted-foreground' })}>
        <ArrowLeft data-icon="inline-start" /> Hoy
      </Link>
      <PageHeader
        title="Concepto nuevo del día"
        description="Genera un prompt que le pide a tu IA conceptos que todavía no tienes, conectados con lo que ya estudias. Un concepto recién agregado no se te exige practicar de inmediato: entra como una tarjeta nueva más."
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cuántos conceptos" htmlFor="cantidad">
            <Input id="cantidad" type="number" min={1} max={15} value={cantidad} onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))} />
          </Field>
        </div>
        <Field label="Intereses o flujo de trabajo actual (opcional)" htmlFor="intereses" hint="Ej. “ahora estoy armando Edge Functions que llaman a Bedrock”.">
          <Textarea id="intereses" value={intereses} onChange={(e) => setIntereses(e.target.value)} className="min-h-24" />
        </Field>

        <p className="text-sm text-muted-foreground">
          Categorías detectadas en tu biblioteca: {categories.length > 0 ? categories.join(', ') : 'aún no tienes categorías'}.
        </p>

        <Button size="lg" className="h-12 self-start px-6" onClick={generate}>
          Generar sugerencias
        </Button>

        {prompt && (
          <div className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
            <PromptBox prompt={prompt} />
            <Link href="/crear?paso=3" className={buttonVariants({ variant: 'outline', className: 'h-10 self-start' })}>
              Ya tengo el resultado de la IA →
            </Link>
          </div>
        )}
      </div>
    </Page>
  )
}
