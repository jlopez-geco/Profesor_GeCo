'use client'

import { useRef, useState } from 'react'
import { CircleAlert, Download, Upload } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCards } from '@/hooks/use-data'
import { tarjetasRepo } from '@/lib/tarjetas-repo'
import { validateFullLibrary, type ImportError } from '@/lib/import'
import type { Card } from '@/lib/types'

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
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [errors, setErrors] = useState<ImportError[]>([])
  const [pending, setPending] = useState<Card[] | null>(null)
  const [importing, setImporting] = useState(false)

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
