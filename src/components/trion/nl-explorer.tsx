'use client'

// NL Score Explorer — Natural Liquidity per chain: NL = LD·LO·LC·LS.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON, type NlResponse } from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, LiveBadge,
  SkeletonGrid, DataTableShell,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { NlChainDetail } from './nl-chain-detail'
import { cn } from '@/lib/utils'

export function NlExplorerView() {
  const nl = useQuery({
    queryKey: ['nl-scores'],
    queryFn: () => fetchJSON<NlResponse>('/api/nl'),
    refetchInterval: 60000,
  })
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<'nl' | 'ld' | 'lo' | 'lc' | 'ls'>('nl')
  const [detailChain, setDetailChain] = useState<number | null>(null)

  const d = nl.data
  const chains = (d?.chains ?? [])
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b[sortKey] - a[sortKey])

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L7 — Natural Liquidity" title="NL Score Explorer"
        description="NL = LD·LO·LC·LS. Multiplicative by design: a partial liquidity is no liquidity. Chains below 0.30 emit LIQUIDITY_HEALTH alerts and BTCP refuses to route — the AAVE March 2026 prevention." />

      {d && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile live label="Chains Scored" value={d.total} sub="live NL computation" />
          <StatTile label="Routable" value={d.routable} tone="good" sub="NL ≥ 0.30" />
          <StatTile label="DO_NOT_ROUTE" value={d.alertCount} tone="bad" sub="NL < 0.30 threshold" />
          <StatTile label="Alert Threshold" value="0.30" sub="LIQUIDITY_HEALTH emission" />
        </div>
      )}

      {/* Factor definitions */}
      <Panel title="The Four Multiplicative Factors">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(d?.factorDefinitions ?? [
            { key: 'LD', name: 'Liquidity Depth Entropy', formula: 'H(depth)/log2(k)' },
            { key: 'LO', name: 'Liquidity Origin', formula: '1 − Sybil_LP_ratio' },
            { key: 'LC', name: 'Baseline Correlation', formula: 'corr(LD_now, LD_90d)' },
            { key: 'LS', name: 'Stress Resilience', formula: 'LD(stress)/LD(normal)' },
          ]).map(f => (
            <div key={f.key} className="card-lift rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="font-mono text-lg font-bold text-emerald-400">{f.key}</div>
              <div className="mt-0.5 text-xs font-medium text-zinc-300">{f.name}</div>
              <div className="mt-1 font-mono text-[10px] text-zinc-500">{f.formula}</div>
            </div>
          ))}
        </div>
        <FormulaBlock label="Formula" className="mt-3">
          NL(asset, t) = LD(a,t) · LO(a,t) · LC(a,t) · LS(a,t)
        </FormulaBlock>
      </Panel>

      {/* Best / worst */}
      {d && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Deepest Natural Liquidity">
            {d.bestChains.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3 py-1.5">
                <span className="w-5 font-mono text-xs text-zinc-600">{i + 1}</span>
                <span className="flex-1 text-sm text-zinc-300">{c.name}</span>
                <div className="w-24"><MeterBar value={c.nl} height="h-1.5" tone="emerald" /></div>
                <span className="tabular w-12 text-right font-mono text-xs text-emerald-400">{c.nl.toFixed(3)}</span>
              </div>
            ))}
          </Panel>
          <Panel title="LIQUIDITY_HEALTH Alerts — DO_NOT_ROUTE">
            {d.worstChains.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-600">No chains below threshold</p>
            ) : d.worstChains.map((c) => (
              <div key={c.name} className="flex items-center gap-3 py-1.5">
                <Badge variant="outline" className="border-rose-500/30 text-[9px] text-rose-400">ALERT</Badge>
                <span className="flex-1 text-sm text-zinc-300">{c.name}</span>
                <div className="w-24"><MeterBar value={c.nl} max={0.5} height="h-1.5" tone="rose" /></div>
                <span className="tabular w-12 text-right font-mono text-xs text-rose-400">{c.nl.toFixed(3)}</span>
              </div>
            ))}
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
              NL &lt; 0.30 on $1M slippage: the AAVE March 2026 incident saw NL=0.09 deliver 97.4%
              slippage. TRION routes around these pools entirely.
            </p>
          </Panel>
        </div>
      )}

      {/* Full table */}
      <Panel title={`Chain NL Registry — ${chains.length} chains`}
        action={<LiveBadge>live factors</LiveBadge>}
        className="overflow-hidden">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-600" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search chains…"
              className="pl-8 bg-zinc-900/60 text-sm" />
          </div>
          <div className="flex gap-1">
            {(['nl', 'ld', 'lo', 'lc', 'ls'] as const).map(k => (
              <button key={k} onClick={() => setSortKey(k)}
                className={cn('rounded-md px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase transition-colors',
                  sortKey === k ? 'bg-emerald-500/10 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300')}>
                {k}
              </button>
            ))}
          </div>
        </div>
        {!d ? (
          <SkeletonGrid count={6} className="grid-cols-1" />
        ) : (
          <div className="max-h-[520px] overflow-y-auto panel-scroll">
            <DataTableShell headers={['Chain', 'VM', 'NL', 'LD', 'LO', 'LC', 'LS', 'Action']}>
              {chains.map(c => (
                <tr key={c.chainId} onClick={() => setDetailChain(c.chainId)}
                  className="cursor-pointer transition-colors hover:bg-zinc-900/50">
                  <td className="px-3 py-2 font-medium text-emerald-400/90 hover:text-emerald-300">{c.name}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{c.vm}</Badge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16"><MeterBar value={c.nl} height="h-1.5"
                        tone={c.nl >= 0.3 ? 'emerald' : 'rose'} /></div>
                      <span className={cn('tabular font-mono text-xs',
                        c.nl >= 0.3 ? 'text-emerald-400' : 'text-rose-400')}>
                        {c.nl.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  {(['ld', 'lo', 'lc', 'ls'] as const).map(k => (
                    <td key={k} className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-10"><MeterBar value={c[k]} height="h-1" tone="zinc" /></div>
                        <span className="tabular font-mono text-[11px] text-zinc-500">{c[k].toFixed(2)}</span>
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={
                      c.alert
                        ? 'border-rose-500/40 bg-rose-500/10 text-[9px] text-rose-400'
                        : 'border-emerald-500/30 text-[9px] text-emerald-400'}>
                      {c.alert ? 'DO_NOT_ROUTE' : 'ROUTABLE'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </DataTableShell>
          </div>
        )}
        <p className="mt-3 text-[11px] text-zinc-600">Click any chain row for the full NL factor drill-down with per-factor time-series.</p>
      </Panel>

      {/* Chain drill-down dialog */}
      <NlChainDetail chainId={detailChain} onClose={() => setDetailChain(null)} />
    </div>
  )
}
