'use client'

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
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className={cn('size-11 rounded-full', className)}
      onClick={() => speak(text, lengua, slow ? 0.7 : 0.95)}
      disabled={typeof window !== 'undefined' && !canSpeak()}
      aria-label={label}
      title={label}
    >
      <Volume2 />
    </Button>
  )
}
