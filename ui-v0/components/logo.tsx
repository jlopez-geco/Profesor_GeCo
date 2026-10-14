import Link from 'next/link'

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md font-semibold tracking-tight">
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
      >
        G
      </span>
      <span className="text-base">
        Profesor <span className="text-primary">GeCo</span>
      </span>
    </Link>
  )
}
