'use client'

// Entity drill-down — slide-over detail panel showing full BEO profile.

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchJSON, fmtInt, truncateHex, type SignalResponse, type SignalHistoryResponse, type EntitySummary,
} from '@/lib/trion/client'
import { Panel, MeterBar, Sparkline, LiveBadge } from './primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { X, ExternalLink, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export function EntityDetail({ beoId, onClose, onOpenCoherence }: {
  beoId: string; onClose: () => void; onOpenCoherence: (beoId: string) => void
}) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const entity = useQuery({
    queryKey: ['entities'],
    queryFn: () => fetchJSON<{ entities: EntitySummary[] }>('/api/entities'),
  })
  const signal = useQuery({
    queryKey: ['entity-signal', beoId],
    queryFn: () => fetchJSON<SignalResponse>(`/api/signal/${beoId}`, 25000),
    staleTime: 30000,
  })
  const history = useQuery({
    queryKey: ['signal-history', beoId],
    queryFn: () => fetchJSON<SignalHistoryResponse>(`/api/signals/history?entityId=${beoId}&limit=60`),
  })

  const summary = entity.data?.entities.find(e => e.beoId === beoId)
  const s = signal.data

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyBeo = async () => {
    await navigator.clipboard.writeText(beoId)
    setCopied(true)
    toast({ title: 'BEO id copied', description: truncateHex(beoId, 10) })
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm"
        onClick={onClose} aria-hidden />
      {/* Slide-over */}
      <aside role="dialog" aria-label={`Entity detail: ${summary?.label ?? 'entity'}`}
        className="fade-up fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">
                {summary?.kind ?? 'ENTITY'}
              </Badge>
              <Badge variant="outline" className={
                summary?.trustTier === 'EXEMPLARY' ? 'border-emerald-500/40 text-emerald-400'
                  : summary?.trustTier === 'TRUSTED' ? 'border-amber-500/40 text-amber-400'
                  : 'border-zinc-700 text-zinc-500'}>
                {summary?.trustTier ?? '—'}
              </Badge>
            </div>
            <h3 className="mt-1.5 truncate text-lg font-semibold text-zinc-100">
              {summary?.label ?? 'Loading…'}
            </h3>
            <button onClick={copyBeo}
              className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 transition-colors hover:text-emerald-400">
              {truncateHex(beoId, 12)}
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
          <button onClick={onClose} aria-label="Close detail panel"
            className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-200">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Live coherence */}
          {!s ? (
            <div className="space-y-2">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          ) : (
            <>
              <div className={cn('rounded-lg border p-4',
                s.passes ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
                <div className="flex items-center justify-between">
                  <span className={cn('text-sm font-bold', s.passes ? 'text-emerald-400' : 'text-rose-400')}>
                    {s.passes ? 'SIGNAL EMITTED' : 'SILENCE'}
                  </span>
                  <Badge variant="outline" className={cn(
                    s.status === 'NOMINAL' ? 'border-emerald-500/40 text-emerald-400'
                      : s.status === 'WARN' ? 'border-amber-500/40 text-amber-400'
                      : 'border-rose-500/40 text-rose-400')}>
                    {s.status}
                  </Badge>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500">C(t)</div>
                    <div className="tabular font-mono text-xl font-bold text-zinc-100">{s.coherence.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500">Θ(t)</div>
                    <div className="tabular font-mono text-xl font-bold text-amber-400">{s.threshold.toFixed(3)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-zinc-500">T(t)</div>
                    <div className="tabular font-mono text-xl font-bold text-emerald-400">{s.tValue.toFixed(2)}</div>
                  </div>
                </div>
                {s.silenceReason && (
                  <p className="mt-2 font-mono text-[11px] text-zinc-500">{s.silenceReason}</p>
                )}
              </div>

              {/* Five planes mini */}
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Five Planes
                </div>
                <div className="space-y-2.5">
                  {[
                    { sym: 'Φ', name: 'Physical', v: s.planes.physical.adjusted, note: `MF ${s.planes.physical.mf.toFixed(2)}` },
                    { sym: 'M', name: 'Mental', v: s.planes.mental.adjusted, note: `OE ${s.planes.mental.oe.toFixed(2)}` },
                    { sym: 'Σ', name: 'Spiritual', v: s.planes.spiritual.sigma, note: `HHI ${Math.round(s.planes.spiritual.hhi)}` },
                    { sym: 'K', name: 'Conscious', v: s.planes.conscious.k, note: `${s.planes.conscious.annotations} annot.` },
                    { sym: 'A', name: 'ANIMA', v: s.planes.anima.value, note: 'live data' },
                  ].map(p => (
                    <div key={p.sym} className="flex items-center gap-3">
                      <span className="w-4 font-mono text-xs font-bold text-emerald-400">{p.sym}</span>
                      <div className="flex-1"><MeterBar value={p.v} height="h-1" /></div>
                      <span className="tabular w-10 text-right font-mono text-xs text-zinc-300">{p.v.toFixed(2)}</span>
                      <span className="w-16 text-right text-[10px] text-zinc-600">{p.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Publication history sparkline */}
          {history.data && history.data.signals.length >= 2 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  C(t) history
                </span>
                <span className="text-[10px] text-zinc-600">
                  {history.data.emitted} emitted · {history.data.silenced} silenced
                </span>
              </div>
              <Sparkline values={history.data.signals.map(x => x.coherence)} width={340} height={48} />
            </div>
          )}

          {/* Entity facts */}
          {summary && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                BEO Profile
              </div>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Archetype</dt>
                  <dd className="font-mono text-zinc-300">{summary.archetype.replace(/_/g, ' ').toLowerCase()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Akashic depth D(t)</dt>
                  <dd className="tabular font-mono text-zinc-300">{fmtInt(summary.depth)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Behavioral hashes</dt>
                  <dd className="tabular font-mono text-zinc-300">{fmtInt(summary.bhCount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Chains spanned</dt>
                  <dd className="tabular font-mono text-zinc-300">{summary.chains.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Primary address</dt>
                  <dd className="font-mono text-zinc-400">
                    {summary.address
                      ? <a href={summary.address.startsWith('0x')
                          ? `https://etherscan.io/address/${summary.address}`
                          : '#'}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:text-emerald-400">
                        {truncateHex(summary.address, 8)} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* CTA */}
          <Button onClick={() => onOpenCoherence(beoId)}
            className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
            Open in Coherence Engine →
          </Button>
        </div>
      </aside>
    </>
  )
}
