'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, isActive } from '@/components/nav-items'
import { Logo } from '@/components/logo'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const focusMode = pathname === '/estudiar'

  if (focusMode) {
    return <div className="min-h-dvh">{children}</div>
  }

  return (
    <div className="flex min-h-dvh">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <NavSidebar pathname={pathname} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <Logo />
        </header>
        <main id="contenido" className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <NavBottom pathname={pathname} />
    </div>
  )
}

function NavSidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar px-3 py-5 md:flex">
      <div className="px-3 pb-6">
        <Logo />
      </div>
      <nav aria-label="Principal" className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                active && 'bg-sidebar-accent text-sidebar-accent-foreground',
                item.soon && 'mt-auto text-muted-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Pronto
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

function NavBottom({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false)
  const primary = NAV_ITEMS.filter((i) => i.mobile)
  const rest = NAV_ITEMS.filter((i) => !i.mobile)
  const restActive = rest.some((i) => isActive(pathname, i.href))

  return (
    <>
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {primary.map((item) => {
          const active = isActive(pathname, item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
                active && 'text-primary',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {item.label === 'Crear con IA' ? 'Crear' : item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
            restActive && 'text-primary',
          )}
        >
          <MoreHorizontal className="size-5" aria-hidden />
          Más
        </button>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Más secciones</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 px-4 pb-6">
            {rest.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-muted aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {item.soon && <span className="text-xs text-muted-foreground">Próximamente</span>}
                </Link>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
