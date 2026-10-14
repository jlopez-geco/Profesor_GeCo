'use client'

import Link from 'next/link'
import { useState } from 'react'
import { FileJson, Sparkles, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { loadExamples } from '@/lib/seed'

export function Onboarding() {
  const [frances, setFrances] = useState(true)
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const n = await loadExamples({ frances })
      toast.success(`Cargamos ${n} tarjetas de ejemplo. ¡A estudiar!`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section aria-labelledby="bienvenida" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="bienvenida" className="text-xl font-semibold">
          Tu biblioteca está vacía
        </h2>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          Profesor GeCo te ayuda a recordar lo que aprendes con repasos breves y bien espaciados. Elige cómo empezar:
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <OptionCard
          icon={FileJson}
          title="Importar mis tarjetas"
          description="¿Ya tienes un JSON de tarjetas? Pégalo y lo validamos."
          action={
            <Link href="/crear?paso=3" className={buttonVariants({ variant: 'outline', className: 'h-10 w-full' })}>
              Importar JSON
            </Link>
          }
        />
        <OptionCard
          icon={Sparkles}
          title="Crear con IA"
          description="Describe tu trabajo, copia el prompt en tu IA favorita y pega el resultado."
          action={
            <Link href="/crear" className={buttonVariants({ variant: 'outline', className: 'h-10 w-full' })}>
              Abrir asistente
            </Link>
          }
        />
        <OptionCard
          icon={WandSparkles}
          title="Cargar ejemplos"
          description="8 tarjetas de Supabase, AWS, backend e inglés técnico."
          highlight
          action={
            <div className="flex w-full flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={frances} onCheckedChange={(v) => setFrances(Boolean(v))} />
                Incluir pack inicial de francés A1
              </label>
              <Button className="h-10 w-full" onClick={load} disabled={loading}>
                {loading ? 'Cargando…' : 'Cargar ejemplos'}
              </Button>
            </div>
          }
        />
      </div>
    </section>
  )
}

function OptionCard({
  icon: Icon,
  title,
  description,
  action,
  highlight,
}: {
  icon: typeof Sparkles
  title: string
  description: string
  action: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? 'flex flex-col gap-4 rounded-2xl border border-primary/40 bg-primary/5 p-5'
          : 'flex flex-col gap-4 rounded-2xl border bg-card p-5'
      }
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
