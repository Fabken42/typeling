'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
  LayoutDashboard,
  BookMarked,
  Brain,
  Settings as SettingsIcon,
  Upload,
  LogOut,
  ChevronDown,
  Play,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/client'
import { signOutAction } from '@/app/actions'
import { useSettingsStore } from '@/store/settingsStore'

interface HeaderProps {
  user: { name?: string | null; email?: string | null; image?: string | null }
  initialQueued: number
  lastPlayed: { id: string; title: string } | null
}

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vocabulary', label: 'Vocabulário', icon: BookMarked },
  { href: '/review', label: 'Revisar', icon: Brain, badge: true },
  { href: '/settings', label: 'Configurações', icon: SettingsIcon },
]

export function Header({ user, initialQueued, lastPlayed }: HeaderProps) {
  const pathname = usePathname()
  const [queued, setQueued] = useState(initialQueued)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const loadSettings = useSettingsStore((s) => s.load)

  // Load settings once (applies theme) and refresh the review badge on nav.
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    let alive = true
    api
      .get<{ queued: number }>('/api/review/stats')
      .then((r) => {
        if (alive) setQueued(r.queued)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [pathname])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/dashboard" className="mr-4 flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-600 font-bold text-white">
            T
          </span>
          <span className="text-lg font-semibold tracking-tight">Typeling</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-surface-2 text-fg'
                    : 'text-muted hover:bg-surface-2 hover:text-fg',
                )}
              >
                <Icon size={16} />
                {item.label}
                {item.badge && queued > 0 && (
                  <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {queued}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {lastPlayed && pathname !== `/play/${lastPlayed.id}` && (
            <Link
              href={`/play/${lastPlayed.id}`}
              title={`Continuar: ${lastPlayed.title}`}
              className="inline-flex h-9 max-w-[200px] items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <Play size={16} className="shrink-0" />
              <span className="hidden truncate lg:inline">{lastPlayed.title}</span>
              <span className="hidden sm:inline lg:hidden">Continuar</span>
            </Link>
          )}

          <Link
            href="/upload"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Adicionar</span>
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1 rounded-full border border-border p-0.5 pr-1.5 hover:bg-surface-2"
            >
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? 'Avatar'}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-2 text-xs">
                  {(user.name ?? user.email ?? '?')[0]?.toUpperCase()}
                </span>
              )}
              <ChevronDown size={14} className="text-muted" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-xl animate-fade-in">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="truncate text-sm font-medium text-fg">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted">{user.email}</p>
                </div>
                <nav className="flex flex-col p-1 sm:hidden">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg"
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <form action={signOutAction} className="p-1">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-fg"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
