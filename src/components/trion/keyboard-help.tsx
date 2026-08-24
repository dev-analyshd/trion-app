'use client'

// Keyboard shortcuts help overlay — opens with "?" key.

import { useEffect } from 'react'
import { X, Command } from 'lucide-react'

const SHORTCUTS: { keys: string; label: string; group: string }[] = [
  { keys: '1', label: 'Overview', group: 'Views' },
  { keys: '2', label: 'Coherence Engine', group: 'Views' },
  { keys: '3', label: 'Behavioral Hash Explorer', group: 'Views' },
  { keys: '4', label: 'BTCP Zero-Bridge Exchange', group: 'Views' },
  { keys: '5', label: 'NL Score Explorer', group: 'Views' },
  { keys: '6', label: 'Validators (DW-BFT)', group: 'Views' },
  { keys: '7', label: 'ANIMA Intelligence', group: 'Views' },
  { keys: '8', label: 'Security', group: 'Views' },
  { keys: '9', label: 'Architecture', group: 'Views' },
  { keys: '?', label: 'Toggle this help', group: 'Global' },
  { keys: 'Esc', label: 'Close panels & menus', group: 'Global' },
]

export function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const groups = [...new Set(SHORTCUTS.map(s => s.group))]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
      onClick={onClose} role="presentation">
      <div role="dialog" aria-label="Keyboard shortcuts"
        className="fade-up w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} aria-label="Close shortcuts"
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>
        {groups.map(group => (
          <div key={group} className="mb-3">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-500/80">
              {group}
            </div>
            <ul className="space-y-1">
              {SHORTCUTS.filter(s => s.group === group).map(s => (
                <li key={s.keys + s.label} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">{s.label}</span>
                  <kbd className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                    {s.keys}
                  </kbd>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p className="mt-3 border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
          Shortcuts are disabled while typing in inputs.
        </p>
      </div>
    </div>
  )
}
