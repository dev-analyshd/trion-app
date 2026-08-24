'use client'

// BTCP route analytics — route-type frequency + savings stats from the ledger.

import { useQuery } from '@tanstack/react-query'
import { fetchJSON, fmtInt, type BtcpIntentsResponse } from '@/lib/trion/client'
import { FormulaBlock, StatTile, Panel, MeterBar, LiveBadge, SkeletonGrid, Sparkline } from './primitives'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TYPE_TONE: Record<string, string> = {
  NETTING: 'border-emerald-500/40 text-emerald-400',
  SINGLE_CHAIN: 'border-teal-500/40 text-teal-400',
  SPLIT: 'border-sky-500/40 text-sky-400',
  MULTI_HOP: 'border-violet-500/40 text-violet-400',
  PARALLEL: 'border-cyan-500/40 text-cyan-400',
  BITP: 'border-amber-500/40 text-amber-400',
  DEFERRED: 'border-zinc-500/40 text-zinc-400',
}

export function BtcpAnalytics() {
  const q = useQuery({
    queryKey: ['btcp-intents'],
    queryFn: () => fetchJSON<BtcpIntentsResponse>('/api/btcp/intent'),
    refetchInterval: 15000,
  })

  const intents = q.data?.intents ?? []
  const routes = intents.flatMap(i =>
    i.routes.map(r => ({ ...r, entity: i.entity, magnitudeUsd: i.magnitudeUsd, createdAt: i.createdAt })))

  // frequency by route type
  const byType = new Map<string, { count: number; totalSaved: number; totalGas: number }>()
  for (const r of routes) {
    const t = r.routeType ?? 'UNKNOWN'
    const agg = byType.get(t) ?? { count: 0, totalSaved: 0, totalGas: 0 }
    agg.count++
    agg.totalSaved += r.gasSavedPct ?? 0
    agg.totalGas += r.btccpGas ?? r.gasCostUsd ?? 0
    byType.set(t, agg)
  }
  const typeStats = Array.from(byType.entries()).sort((a, b) => b[1].count - a[1].count)
  // Routes-over-time: 12 buckets of 2h each (24h window)
  const nowMs = Date.now()
  const BUCKETS = 12
  const bucketMs = 2 * 3600_000
  const timeSeries = new Array(BUCKETS).fill(0)
  for (const r of routes) {
    const bucket = Math.floor((nowMs - new Date(r.createdAt).getTime()) / bucketMs)
    if (bucket >= 0 && bucket < BUCKETS) timeSeries[BUCKETS - 1 - bucket]++
  }

  const totalRoutes = routes.length
  const completed = routes.filter(r => r.status === 'FINALIZED').length
  const avgSaved = totalRoutes > 0
    ? routes.reduce((s, r) => s + (r.gasSavedPct ?? 0), 0) / totalRoutes : 0
  const totalValue = intents.reduce((s, i) => s + i.magnitudeUsd, 0)

  return (
    <Panel title="BTCP Route Analytics" action={<LiveBadge>ledger stats</LiveBadge>}>
      {!q.data ? (
        <SkeletonGrid count={3} className="grid-cols-1" />
      ) : totalRoutes === 0 ? (
        <p className="py-6 text-center text-xs text-zinc-600">
          No routes yet — run the One-Click Zero-Bridge Flow on the Overview to generate analytics.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center">
              <div className="tabular font-mono text-xl font-bold text-zinc-100">{fmtInt(totalRoutes)}</div>
              <div className="text-[10px] uppercase text-zinc-500">routes</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center">
              <div className="tabular font-mono text-xl font-bold text-emerald-400">{fmtInt(completed)}</div>
              <div className="text-[10px] uppercase text-zinc-500">finalized</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center">
              <div className="tabular font-mono text-xl font-bold text-emerald-400">{avgSaved.toFixed(1)}%</div>
              <div className="text-[10px] uppercase text-zinc-500">avg saved</div>
            </div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center">
              <div className="tabular font-mono text-xl font-bold text-zinc-100">${fmtInt(totalValue)}</div>
              <div className="text-[10px] uppercase text-zinc-500">value routed</div>
            </div>
          </div>

          {/* routes over time */}
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Routes over time — last 24h (2h buckets)
              </span>
              <span className="tabular font-mono text-[10px] text-zinc-600">
                peak {Math.max(...timeSeries)}/bucket
              </span>
            </div>
            <Sparkline values={timeSeries} width={520} height={48} />
          </div>

          {/* frequency bars */}
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Route type frequency
            </div>
            <div className="space-y-2">
              {typeStats.map(([type, agg]) => (
                <div key={type} className="flex items-center gap-3">
                  <Badge variant="outline" className={cn('w-24 shrink-0 justify-center text-[10px]', TYPE_TONE[type] ?? 'border-zinc-600 text-zinc-400')}>
                    {type}
                  </Badge>
                  <div className="flex-1">
                    <MeterBar value={agg.count} max={Math.max(...typeStats.map(([, a]) => a.count))} height="h-2" />
                  </div>
                  <span className="tabular w-32 text-right font-mono text-[11px] text-zinc-500">
                    ×{agg.count} · avg {(agg.totalSaved / agg.count).toFixed(0)}% saved
                  </span>
                </div>
              ))}
            </div>
          </div>

          <FormulaBlock label="Zero-bridge ledger">
            {fmtInt(totalRoutes)} routes · ${fmtInt(totalValue)} value · 0 assets bridged · 0 wrapped tokens<br />
            <span className="text-[11px] text-zinc-500">
              every route locked value natively and released through the coherence gate
            </span>
          </FormulaBlock>
        </div>
      )}
    </Panel>
  )
}
