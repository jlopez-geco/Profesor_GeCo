'use client'

import { RATING_LABEL, type Rating } from '@/lib/types'
import { cn } from '@/lib/utils'

const STYLE: Record<Rating, string> = {
  1: 'hover:border-destructive/60 hover:bg-destructive/10 data-[suggested=true]:border-destructive/60 data-[suggested=true]:bg-destructive/10',
  2: 'hover:border-amber-500/60 hover:bg-amber-500/10 data-[suggested=true]:border-amber-500/60 data-[suggested=true]:bg-amber-500/10',
  3: 'hover:border-primary/60 hover:bg-primary/10 data-[suggested=true]:border-primary/60 data-[suggested=true]:bg-primary/10',
  4: 'hover:border-emerald-600/60 hover:bg-emerald-600/10 data-[suggested=true]:border-emerald-600/60 data-[suggested=true]:bg-emerald-600/10',
}

export function RatingBar({
  intervals,
  onRate,
  suggested,
  disabled,
}: {
  intervals: Record<Rating, string>
  onRate: (r: Rating) => void
  suggested?: Rating
  disabled?: boolean
}) {
  return (
    <div role="group" aria-label="¿Qué tan bien lo recordaste?" className="grid grid-cols-4 gap-2">
      {([1, 2, 3, 4] as Rating[]).map((r) => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          data-suggested={suggested === r}
          onClick={() => onRate(r)}
          className={cn(
            'flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border bg-card px-1 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
            STYLE[r],
          )}
        >
          <span>{RATING_LABEL[r]}</span>
          <span className="text-xs font-normal text-muted-foreground tabular-nums">{intervals[r]}</span>
          <kbd className="mt-0.5 hidden rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground md:inline">
            {r}
          </kbd>
        </button>
      ))}
    </div>
  )
}
