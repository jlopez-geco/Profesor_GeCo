'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function PromptBox({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      toast.success('Prompt copiado. Pégalo en tu IA (ChatGPT, Claude, Gemini o Copilot).')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar. Selecciona el texto y cópialo manualmente.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <pre
          tabIndex={0}
          aria-label="Prompt generado"
          className="max-h-96 overflow-auto rounded-xl border bg-muted/50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {prompt}
        </pre>
      </div>
      <Button onClick={copy} size="lg" className="h-11 self-start px-5">
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {copied ? 'Copiado' : 'Copiar prompt'}
      </Button>
    </div>
  )
}
