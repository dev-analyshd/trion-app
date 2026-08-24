'use client'

// TRION Protocol — the institutional frontend shell.

import { useState, useEffect, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OverviewView } from '@/components/trion/overview'
import { CoherenceView } from '@/components/trion/coherence-view'
import { BhExplorerView } from '@/components/trion/bh-explorer'
import { BtcpView } from '@/components/trion/btcp-view'
import { ValidatorsView } from '@/components/trion/validators-view'
import { AnimaView } from '@/components/trion/anima-view'
import { SecurityView } from '@/components/trion/security-view'
import { ArchitectureView } from '@/components/trion/architecture-view'
import { NlExplorerView } from '@/components/trion/nl-explorer'
import { KeyboardHelp } from '@/components/trion/keyboard-help'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10000, retry: 1 } },
})

const NAV = [
  { id: 'overview', label: 'Overview', key: '1' },
  { id: 'coherence', label: 'Coherence Engine', key: '2' },
  { id: 'bh', label: 'Behavioral Hash', key: '3' },
  { id: 'btcp', label: 'BTCP Zero-Bridge', key: '4' },
  { id: 'nl', label: 'NL Explorer', key: '5' },
  { id: 'validators', label: 'Validators', key: '6' },
  { id: 'anima', label: 'ANIMA Intelligence', key: '7' },
  { id: 'security', label: 'Security', key: '8' },
  { id: 'architecture', label: 'Architecture', key: '9' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-zinc-950" fill="currentColor" aria-hidden>
          <path d="M4 4h16v3.5H13.8V20h-3.6V7.5H4z" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-bold tracking-tight text-zinc-100">TRION</div>
        <div className="text-[10px] font-medium uppercase tracking-widest text-emerald-500">
          Behavioral Truth
        </div>
      </div>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11, 19) + ' UTC')
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="tabular hidden font-mono text-xs text-zinc-500 sm:inline" suppressHydrationWarning>
      {time || '--:--:--'}
    </span>
  )
}

export default function Home() {
  const [view, setView] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const navigate = useCallback((v: string) => {
    setView(v)
    setMenuOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Keyboard shortcuts: 1-9 switch views, ? opens help, Esc closes menus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      // Don't hijack typing in inputs/selects/textareas
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      if (e.key >= '1' && e.key <= '9') {
        const item = NAV.find(n => n.key === e.key)
        if (item) navigate(item.id)
      } else if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setHelpOpen(o => !o)
      } else if (e.key === 'Escape') {
        setHelpOpen(false)
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-zinc-950">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-6">
              <Logo />
              <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
                {NAV.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      view === item.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                    aria-current={view === item.id ? 'page' : undefined}
                  >
                    {item.label}
                    <kbd className={cn('hidden rounded border px-1 font-mono text-[9px] leading-4 xl:inline',
                      view === item.id ? 'border-emerald-500/30 text-emerald-500/70' : 'border-zinc-700 text-zinc-600')}>
                      {item.key}
                    </kbd>
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <LiveClock />
              <button
                onClick={() => setHelpOpen(true)}
                aria-label="Keyboard shortcuts"
                className="hidden rounded-md p-2 text-zinc-500 transition-colors hover:text-emerald-400 sm:block">
                <kbd className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">?</kbd>
              </button>
              <button
                className="rounded-md p-2 text-zinc-400 hover:text-zinc-200 lg:hidden"
                onClick={() => setMenuOpen(o => !o)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {/* Mobile nav */}
          {menuOpen && (
            <nav className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 lg:hidden" aria-label="Mobile">
              <div className="grid grid-cols-2 gap-1">
                {NAV.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                      view === item.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    <kbd className="rounded border border-zinc-700 px-1 font-mono text-[9px] text-zinc-600">{item.key}</kbd>
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>
          )}
        </header>

        {/* Main */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
          {view === 'overview' && <OverviewView onNavigate={navigate} />}
          {view === 'coherence' && <CoherenceView />}
          {view === 'bh' && <BhExplorerView />}
          {view === 'btcp' && <BtcpView />}
          {view === 'nl' && <NlExplorerView />}
          {view === 'validators' && <ValidatorsView />}
          {view === 'anima' && <AnimaView />}
          {view === 'security' && <SecurityView />}
          {view === 'architecture' && <ArchitectureView />}
        </main>

        {/* Keyboard help overlay */}
        <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

        {/* Footer — sticky bottom */}
        <footer className="mt-auto border-t border-zinc-800 bg-zinc-950">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="live" />
                <span className="text-xs text-zinc-500">
                  TRION Protocol · Behavioral Truth Infrastructure · CC0
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-zinc-600">
                <span>101 chains · 16 VMs</span>
                <span>5,050 bridges eliminated</span>
                <span className="font-mono">T(t) = [C≥Θ]·S·e^M</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
