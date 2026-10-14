'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { CircleAlert, Download, Monitor, Moon, Sun, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field } from '@/components/card-form'
import { useCards, useSettings } from '@/hooks/use-data'
import { saveSettings } from '@/lib/db'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { validateFullLibrary, type ImportError } from '@/lib/import'
import type { Card } from '@/lib/types'

const TEMAS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AjustesPage() {
  const cards = useCards()
  const settings = useSettings()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [nuevaCategoria, setNuevaCategoria] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<ImportError[]>([])
  const [pending, setPending] = useState<Card[] | null>(null)
  const [importing, setImporting] = useState(false)

  function agregarCategoria() {
    const nombre = nuevaCategoria.trim()
    if (!nombre || !settings) return
    if (!settings.categorias.includes(nombre)) saveSettings({ categorias: [...settings.categorias, nombre] })
    setNuevaCategoria('')
  }

  function quitarCategoria(nombre: string) {
    if (!settings) return
    saveSettings({ categorias: settings.categorias.filter((c) => c !== nombre) })
  }

  async function exportAll() {
    const data = await tarjetasRepo.exportAll()
    const fecha = new Date().toISOString().slice(0, 10)
    download(`profesor-geco-biblioteca-${fecha}.json`, JSON.stringify(data, null, 2))
    toast.success(`Exportamos ${data.length} tarjetas.`)
  }

  function validate(src: string) {
    const { cards: parsed, errors: errs } = validateFullLibrary(src)
    setErrors(errs)
    setPending(parsed.length > 0 ? parsed : null)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    file.text().then((content) => {
      setText(content)
      validate(content)
    })
    e.target.value = ''
  }

  async function confirmImport() {
    if (!pending) return
    setImporting(true)
    try {
      await tarjetasRepo.importAll(pending)
      toast.success(`Reemplazamos tu biblioteca con ${pending.length} tarjetas.`)
      setText('')
      setPending(null)
      setErrors([])
    } finally {
      setImporting(false)
    }
  }

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Ajustes" description="Tus datos viven solo en este navegador. Exporta seguido para tener un respaldo." />

      <div className="flex flex-col gap-6">
        <section aria-labelledby="apariencia" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 id="apariencia" className="font-semibold">
            Apariencia
          </h2>
          <div role="radiogroup" aria-label="Tema" className="flex gap-2">
            {TEMAS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={mounted && theme === value ? 'default' : 'outline'}
                aria-pressed={mounted && theme === value}
                onClick={() => setTheme(value)}
                className="h-10"
              >
                <Icon data-icon="inline-start" /> {label}
              </Button>
            ))}
          </div>
        </section>

        <section aria-labelledby="practica" className="flex flex-col gap-4 rounded-2xl border bg-card p-5">
          <h2 id="practica" className="font-semibold">
            Práctica diaria
          </h2>
          {!settings ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Objetivo diario (minutos)" htmlFor="objetivo" hint="Se usa para la barra de progreso de Hoy.">
                <Input
                  id="objetivo"
                  type="number"
                  min={1}
                  max={120}
                  value={settings.objetivoMinutos}
                  onChange={(e) => saveSettings({ objetivoMinutos: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
              <Field label="Tarjetas nuevas por día" htmlFor="limite" hint="Cupo de tarjetas nunca estudiadas que entran a la cola cada día.">
                <Input
                  id="limite"
                  type="number"
                  min={1}
                  max={100}
                  value={settings.limiteNuevas}
                  onChange={(e) => saveSettings({ limiteNuevas: Math.max(1, Number(e.target.value) || 1) })}
                />
              </Field>
            </div>
          )}
        </section>

        <section aria-labelledby="categorias" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 id="categorias" className="font-semibold">
            Categorías personalizadas
          </h2>
          <p className="text-sm text-muted-foreground">
            Aparecen como opción al crear tarjetas, aunque todavía no tengan ninguna. Las categorías en uso siempre se muestran, aunque no estén en esta lista.
          </p>
          <div className="flex flex-wrap gap-2">
            {(settings?.categorias ?? []).map((c) => (
              <Badge key={c} variant="secondary" className="gap-1 pr-1">
                {c}
                <button type="button" onClick={() => quitarCategoria(c)} aria-label={`Quitar categoría ${c}`} className="rounded-full p-0.5 hover:bg-background/60">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            {settings && settings.categorias.length === 0 && <p className="text-sm text-muted-foreground">Aún no agregas ninguna.</p>}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              agregarCategoria()
            }}
          >
            <Input value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} placeholder="Ej. Terraform" aria-label="Nueva categoría" className="h-10 max-w-60" />
            <Button type="submit" variant="outline" className="h-10" disabled={!nuevaCategoria.trim()}>
              Agregar
            </Button>
          </form>
        </section>

        <section aria-labelledby="efectos" className="flex flex-col gap-2 rounded-2xl border bg-card p-5">
          <h2 id="efectos" className="font-semibold">
            Efectos visuales
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={settings?.efectosVisuales ?? true}
              onCheckedChange={(v) => saveSettings({ efectosVisuales: Boolean(v) })}
              disabled={!settings}
            />
            Mostrar partículas, transiciones y confeti al completar la cola diaria
          </label>
          <p className="text-xs text-muted-foreground">
            Se desactivan igual si tu sistema pide "reducir movimiento". La app funciona completa sin ellos.
          </p>
        </section>

        <section aria-labelledby="exportar" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 id="exportar" className="font-semibold">
            Exportar biblioteca completa
          </h2>
          <p className="text-sm text-muted-foreground">
            Descarga un JSON con tus {cards?.length ?? 0} tarjetas (incluye historial de repaso y progreso). Sirve como respaldo o para moverte a otro navegador.
          </p>
          <Button className="h-10 self-start" onClick={exportAll} disabled={!cards || cards.length === 0}>
            <Download data-icon="inline-start" /> Exportar JSON
          </Button>
        </section>

        <section aria-labelledby="importar" className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
          <h2 id="importar" className="font-semibold">
            Importar biblioteca completa
          </h2>
          <p className="text-sm text-muted-foreground">
            Reemplaza <strong>toda</strong> tu biblioteca actual por el contenido de un JSON exportado antes. Si quieres agregar tarjetas sueltas sin perder las que ya tienes, usa{' '}
            <a href="/crear?paso=3" className="underline underline-offset-2">
              Crear con IA → pegar resultado
            </a>
            .
          </p>

          <div className="flex flex-wrap gap-3">
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
            <Button variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
              <Upload data-icon="inline-start" /> Elegir archivo .json
            </Button>
          </div>

          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (pending || errors.length) {
                setPending(null)
                setErrors([])
              }
            }}
            placeholder="…o pega aquí el JSON exportado."
            spellCheck={false}
            className="min-h-32 font-mono text-xs"
          />
          <Button variant="outline" className="h-10 self-start" disabled={!text.trim()} onClick={() => validate(text)}>
            Validar
          </Button>

          {errors.length > 0 && (
            <div role="alert" className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <CircleAlert className="size-4" aria-hidden="true" />
                {errors.length === 1 ? 'Encontramos 1 problema' : `Encontramos ${errors.length} problemas`}
              </p>
              <ul className="flex max-h-48 flex-col gap-1 overflow-auto">
                {errors.map((e, i) => (
                  <li key={i} className="flex flex-wrap gap-x-2">
                    <span className="font-mono text-xs text-muted-foreground">{e.ruta}</span>
                    <span>{e.mensaje}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pending && (
            <AlertDialog>
              <AlertDialogTrigger render={<Button className="h-10 self-start" />}>Reemplazar biblioteca con {pending.length} tarjetas</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Reemplazar toda tu biblioteca?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto borra tus {cards?.length ?? 0} tarjetas actuales (y su progreso de repaso) y las reemplaza por las {pending.length} del archivo. No se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={confirmImport} disabled={importing}>
                    {importing ? 'Importando…' : 'Reemplazar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </section>
      </div>
    </Page>
  )
}
