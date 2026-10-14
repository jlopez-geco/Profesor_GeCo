import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Home,
  Languages,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  mobile?: boolean
  soon?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Hoy', icon: Home, mobile: true },
  { href: '/estudiar', label: 'Estudiar', icon: GraduationCap, mobile: true },
  { href: '/biblioteca', label: 'Biblioteca', icon: BookOpen, mobile: true },
  { href: '/crear', label: 'Crear con IA', icon: Sparkles, mobile: true },
  { href: '/idiomas', label: 'Idiomas', icon: Languages },
  { href: '/progreso', label: 'Progreso', icon: BarChart3 },
  { href: '/ajustes', label: 'Ajustes', icon: Settings },
  { href: '/equipo', label: 'Equipo', icon: Users, soon: true },
]

export function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
