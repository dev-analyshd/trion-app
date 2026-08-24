'use client'

// TRION Protocol — the institutional frontend shell.

import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OverviewView } from '@/components/trion/overview'
import { CoherenceView } from '@/components/trion/coherence-view'
import { BhExplorerView } from '@/components/trion/bh-explorer'
import { BtcpView } from '@/components/trion/btcp-view'
import { ValidatorsView } from '@/components/trion/validators-view'
import { AnimaView } from '@/components/trion/anima-view'
import { SecurityView } from '@/components/trion/security-view'
import { ArchitectureView } from '@/components/trion/architecture-view'
import { cn } from '@/lib/utils'
import { Menu, X } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10000, retry: 1 } },
})

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'coherence', label: 'Coherence Engine' },
  { id: 'bh', label: 'Behavioral Hash' },
  { id: 'btcp', label: 'BTCP Zero-Bridge' },
  { id: 'validators', label: 'Validators' },
  { id: 'anima', label: 'ANIMA Intelligence' },
  { id: 'security', label: 'Security' },
  { id: 'architecture', label: 'Architecture' },
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
  return <span className="tabular font-mono text-xs text-zinc-500">{time}</span>
}

export default function Home() {
  const [view, setView] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)

  const navigate = (v: string) => {
    setView(v)
    setMenuOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
                      'rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
                      view === item.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                    aria-current={view === item.id ? 'page' : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <LiveClock />
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
                      'rounded-md px-3 py-2 text-left text-sm font-medium transition-colors',
                      view === item.id
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
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
          {view === 'validators' && <ValidatorsView />}
          {view === 'anima' && <AnimaView />}
          {view === 'security' && <SecurityView />}
          {view === 'architecture' && <ArchitectureView />}
        </main>

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
