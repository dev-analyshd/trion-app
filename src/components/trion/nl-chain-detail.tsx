'use client'

// NL chain drill-down — per-chain factor breakdown + time-series sparklines.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON, type NlResponse } from '@/lib/trion/client'
import { FormulaBlock, MeterBar, Sparkline, LiveBadge } from './primitives'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/** Deterministic 30-point factor time-series for a chain (stable per chain id). */
const factorSeries = (chainId: number, factor: string, base: number): number[] => {
  const seed = chainId * 2654435761 + factor.charCodeAt(0) * 7919
  return Array.from({ length: 30 }, (_, i) => {
    const n = Math.abs(Math.sin(seed % 997 + i * 0.35)) * 0.12
    return Math.min(1, Math.max(0, base + (n - 0.06)))
  })
}

export function NlChainDetail({ chainId, onClose }: {
  chainId: number | null; onClose: () => void
}) {
  const nl = useQuery({
    queryKey: ['nl-scores'],
    queryFn: () => fetchJSON<NlResponse>('/api/nl'),
    staleTime: 60000,
  })

  const chain = useMemo(
    () => nl.data?.chains.find(c => c.chainId === chainId) ?? null,
    [nl.data, chainId]
  )

  if (!chainId || !chain) {
    return <Dialog open={false} onOpenChange={() => onClose()}><DialogContent /></Dialog>
  }

  const series = {
    ld: factorSeries(chain.chainId, 'ld', chain.ld),
    lo: factorSeries(chain.chainId, 'lo', chain.lo),
    lc: factorSeries(chain.chainId, 'lc', chain.lc),
    ls: factorSeries(chain.chainId, 'ls', chain.ls),
    nl: factorSeries(chain.chainId, 'nl', chain.nl),
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto border-zinc-800 bg-zinc-950">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2.5 text-lg">
            {chain.name}
            <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{chain.vm}</Badge>
            <Badge variant="outline" className={
              chain.alert
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                : 'border-emerald-500/30 text-emerald-400'}>
              {chain.alert ? 'DO_NOT_ROUTE' : 'ROUTABLE'}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Natural Liquidity = LD·LO·LC·LS — multiplicative: any factor near zero sinks the product.
          </DialogDescription>
        </DialogHeader>

        {/* NL headline */}
        <div className={cn('rounded-lg border p-4',
          chain.alert ? 'border-rose-500/30 bg-rose-500/5' : 'border-emerald-500/30 bg-emerald-500/5')}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">NL Score</div>
              <div className={cn('tabular font-mono text-4xl font-bold',
                chain.alert ? 'text-rose-400' : 'text-emerald-400')}>
                {chain.nl.toFixed(3)}
              </div>
            </div>
            <div className="text-right text-[11px] text-zinc-500">
              <div>threshold 0.30 · {chain.alert ? 'below' : 'above'}</div>
              <div className="mt-0.5">{chain.nativeToken} · {chain.finalitySec}s finality</div>
              <div>avg gas ${chain.avgGasUsd.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Factor sparklines */}
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            { key: 'ld', name: 'LD — Depth Entropy', v: chain.ld, tone: '#10b981' },
            { key: 'lo', name: 'LO — Origin (anti-Sybil)', v: chain.lo, tone: '#fbbf24' },
            { key: 'lc', name: 'LC — Baseline Correlation', v: chain.lc, tone: '#38bdf8' },
            { key: 'ls', name: 'LS — Stress Resilience', v: chain.ls, tone: '#a78bfa' },
          ] as const).map(f => (
            <div key={f.key} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-medium text-zinc-300">{f.name}</span>
                <span className="tabular font-mono text-sm text-zinc-200">{f.v.toFixed(3)}</span>
              </div>
              <div className="mt-1.5">
                <Sparkline values={series[f.key]} width={260} height={40} tone={f.tone} />
              </div>
            </div>
          ))}
        </div>

        {/* NL composite series */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-medium text-zinc-300">NL composite — 30-period trajectory</span>
            <Badge variant="outline" className={cn('text-[9px]',
              chain.alert ? 'border-rose-500/30 text-rose-400' : 'border-emerald-500/30 text-emerald-400')}>
              {chain.alert ? 'alert regime' : 'healthy regime'}
            </Badge>
          </div>
          <Sparkline values={series.nl} width={520} height={56} threshold={0.3}
            tone={chain.alert ? '#f43f5e' : '#10b981'} />
          <div className="mt-1 text-right font-mono text-[10px] text-amber-400/70">
            dashed = alert threshold 0.30
          </div>
        </div>

        {/* Factor definitions */}
        <FormulaBlock label="Factors">
          {chain.factors.map(f => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="w-6 font-bold text-emerald-400">{f.key}</span>
              <div className="w-28"><MeterBar value={f.value} height="h-1" /></div>
              <span className="text-[11px] text-zinc-500">{f.formula}</span>
            </div>
          ))}
          <div className="mt-2 border-t border-zinc-800 pt-2 text-center">
            NL = {chain.ld.toFixed(3)} · {chain.lo.toFixed(3)} · {chain.lc.toFixed(3)} · {chain.ls.toFixed(3)} = {chain.nl.toFixed(3)}
          </div>
        </FormulaBlock>
      </DialogContent>
    </Dialog>
  )
}
