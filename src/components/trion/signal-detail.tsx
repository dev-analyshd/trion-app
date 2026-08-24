'use client'

// Signal detail dialog — click any signal-history row for the full breakdown.

import { useQuery } from '@tanstack/react-query'
import { fetchJSON, type SignalHistoryResponse, fmtInt } from '@/lib/trion/client'
import { FormulaBlock, MeterBar } from './primitives'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export interface SignalDetailData {
  id: string
  entity: string
  type: string
  status: string
  coherence: number
  threshold: number
  margin: number
  tValue: number
  moat: number
  limitingPlane: string | null
  volatility: number
  emitted: boolean
  createdAt: string
}

export function SignalDetail({ signal, onClose }: {
  signal: SignalDetailData | null; onClose: () => void
}) {
  const history = useQuery({
    queryKey: ['signal-history'],
    queryFn: () => fetchJSON<SignalHistoryResponse>('/api/signals/history?limit=200'),
    enabled: !!signal,
  })

  if (!signal) {
    return <Dialog open={false} onOpenChange={() => onClose()}><DialogContent /></Dialog>
  }

  // Context: the entity's neighbors around this signal in the ledger
  const all = history.data?.signals ?? []
  const idx = all.findIndex(s => s.id === signal.id)
  const context = idx >= 0 ? all.slice(Math.max(0, idx - 2), idx + 3) : []

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2.5 text-base">
            <span className="font-mono text-sm">{signal.type}</span>
            <Badge variant="outline" className={cn(
              signal.emitted ? 'border-emerald-500/40 text-emerald-400' : 'border-zinc-600 text-zinc-400')}>
              {signal.emitted ? 'EMITTED' : 'SILENCED'}
            </Badge>
            <Badge variant="outline" className={cn(
              signal.status === 'NOMINAL' ? 'border-emerald-500/40 text-emerald-400'
                : signal.status === 'WARN' ? 'border-amber-500/40 text-amber-400'
                : 'border-rose-500/40 text-rose-400')}>
              {signal.status}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {signal.entity} · {new Date(signal.createdAt).toLocaleString('en-US', { hour12: false })}
          </DialogDescription>
        </DialogHeader>

        {/* Gate arithmetic */}
        <div className={cn('rounded-lg border p-4',
          signal.emitted ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-700 bg-zinc-900/30')}>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">C(t)</div>
              <div className="tabular font-mono text-lg font-bold text-zinc-100">{signal.coherence.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">Θ(t)</div>
              <div className="tabular font-mono text-lg font-bold text-amber-400">{signal.threshold.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">margin</div>
              <div className={cn('tabular font-mono text-lg font-bold',
                signal.margin >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                {signal.margin >= 0 ? '+' : ''}{signal.margin.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">T(t)</div>
              <div className="tabular font-mono text-lg font-bold text-emerald-400">{signal.tValue.toFixed(2)}</div>
            </div>
          </div>
          <div className="mt-3">
            <MeterBar value={signal.coherence} tone={signal.emitted ? 'emerald' : 'rose'}
              label="C(t) vs gate" />
          </div>
        </div>

        {/* Facts */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Volatility V(t)</div>
            <div className="tabular mt-1 font-mono text-sm text-zinc-200">{signal.volatility.toFixed(3)}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Moat M</div>
            <div className="tabular mt-1 font-mono text-sm text-zinc-200">{signal.moat.toFixed(4)}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Limiting plane</div>
            <div className="mt-1 font-mono text-sm text-amber-400">{signal.limitingPlane ?? '—'}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Amplification e^M</div>
            <div className="tabular mt-1 font-mono text-sm text-emerald-400">×{Math.exp(signal.moat).toFixed(3)}</div>
          </div>
        </div>

        {/* Ledger context */}
        {context.length > 1 && (
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Ledger context (±2 publications)
            </div>
            <div className="space-y-1">
              {context.map(s => (
                <div key={s.id}
                  className={cn('flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-[11px]',
                    s.id === signal.id
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-zinc-800/60 bg-zinc-900/20')}>
                  <span className="flex items-center gap-2">
                    <span className={cn('h-1.5 w-1.5 rounded-full',
                      s.emitted ? 'bg-emerald-400' : 'bg-zinc-600')} />
                    <span className="text-zinc-400">{s.entity.slice(0, 22)}</span>
                  </span>
                  <span className="flex items-center gap-3 font-mono">
                    <span className="text-zinc-300">{s.coherence.toFixed(3)}</span>
                    <span className="text-amber-400/70">{s.threshold.toFixed(3)}</span>
                    <span className={s.emitted ? 'text-emerald-400' : 'text-zinc-500'}>
                      {s.emitted ? 'emit' : 'silence'}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <FormulaBlock label="Gate">
          [{signal.coherence.toFixed(3)} {signal.emitted ? '≥' : '<'} {signal.threshold.toFixed(3)}] = {signal.emitted ? '1' : '0'}{' '}
          → T(t) = {signal.tValue.toFixed(4)}
        </FormulaBlock>
      </DialogContent>
    </Dialog>
  )
}
