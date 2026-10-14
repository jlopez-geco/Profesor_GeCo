'use client'

import { useEffect, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { canSpeak, speak } from '@/lib/speech'
import type { Lengua } from '@/lib/types'
import { cn } from '@/lib/utils'

export function SpeakButton({
  text,
  lengua,
  label = 'Escuchar pronunciación',
  className,
  slow,
}: {
  text: string
  lengua: Lengua
  label?: string
  className?: string
  slow?: boolean
}) {
  // Se calcula tras montar: en el servidor no hay window, y declarar la tarjeta sin
  // audio de entrada confundiría más que mostrarla habilitada un instante.
  const [available, setAvailable] = useState(true)
  useEffect(() => setAvailable(canSpeak()), [])

  const title = available ? label : 'Audio no disponible en este navegador'

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn('size-11 rounded-full', className)}
      onClick={() => speak(text, lengua, slow ? 0.7 : 0.95)}
      disabled={!available}
      aria-label={title}
      title={title}
    >
      <Volume2 />
    </Button>
  )
}
