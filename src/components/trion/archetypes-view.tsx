'use client'

// Archetype Distribution — the L2.2 pattern matrix across the Akashic Index.

import { useQuery } from '@tanstack/react-query'
import { fetchJSON, fmtInt, fmtCompact, type ArchetypesResponse } from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, SkeletonGrid, Sparkline,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const RISK_TONE: Record<string, string> = {
  LOW: 'border-emerald-500/40 text-emerald-400',
  'LOW-MED': 'border-lime-500/40 text-lime-400',
  MEDIUM: 'border-amber-500/40 text-amber-400',
  HIGH: 'border-rose-500/40 text-rose-400',
  UNKNOWN: 'border-zinc-600 text-zinc-400',
}

const EVENT_COLORS = ['#10b981', '#fbbf24', '#38bdf8', '#a78bfa', '#f43f5e']

export function ArchetypesView() {
  const q = useQuery({
    queryKey: ['archetypes'],
    queryFn: () => fetchJSON<ArchetypesResponse>('/api/archetypes'),
    refetchInterval: 60000,
  })

  const d = q.data

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L2.2 — Akashic Index" title="Archetype Distribution"
        description="The Akashic Index clusters behavioral hashes into archetypes — the pattern vocabulary for genesis inference and trajectory anomalies. Risk tiers drive MF discounts and BIRP candidacy." />

      {d ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile live label="Archetypes" value={d.totalArchetypes} sub="active pattern clusters" />
          <StatTile label="Entities" value={d.totalEntities} sub="classified BEOs" />
          <StatTile label="Behavioral Hashes" value={fmtInt(d.totalBehavioralHashes)} sub="across all archetypes" />
          <StatTile label="High-Risk Archetypes" value={d.archetypes.filter(a => a.risk.tier === 'HIGH').length}
            tone="bad" sub="MF-discounted clusters" />
        </div>
      ) : (
        <SkeletonGrid count={4} className="grid-cols-2 sm:grid-cols-4" />
      )}

      {/* BH volume distribution bar */}
      {d && (
        <Panel title="Behavioral Hash Volume by Archetype">
          <div className="space-y-2.5">
            {d.archetypes.map(a => (
              <div key={a.archetype} className="flex items-center gap-3">
                <span className="w-40 truncate text-xs font-medium text-zinc-300">
                  {a.archetype.replace(/_/g, ' ').toLowerCase()}
                </span>
                <div className="flex-1">
                  <MeterBar value={a.bhShare} tone={
                    a.risk.tier === 'HIGH' ? 'rose' : a.risk.tier === 'MEDIUM' ? 'amber' : 'emerald'
                  } height="h-2" />
                </div>
                <span className="tabular w-20 text-right font-mono text-xs text-zinc-400">
                  {fmtInt(a.bhVolume)} · {(a.bhShare * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Archetype cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {d?.archetypes.map(a => (
          <div key={a.archetype}
            className={cn('card-lift rounded-xl border p-5',
              a.risk.tier === 'HIGH' ? 'border-rose-500/25 bg-rose-500/[0.03]'
                : a.risk.tier === 'MEDIUM' ? 'border-amber-500/25 bg-amber-500/[0.03]'
                : 'border-zinc-800 bg-zinc-900/30')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {a.archetype.replace(/_/g, ' ').toLowerCase()}
                  </h3>
                  <Badge variant="outline" className={cn('text-[9px]', RISK_TONE[a.risk.tier] ?? RISK_TONE.UNKNOWN)}>
                    {a.risk.tier} RISK
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-zinc-500">{a.risk.note}</p>
              </div>
              <div className="text-right">
                <div className="tabular font-mono text-lg font-bold text-zinc-200">{fmtCompact(a.bhVolume)}</div>
                <div className="text-[10px] uppercase text-zinc-500">BHs · {(a.bhShare * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* event mix */}
            <div className="mt-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Event signature (top 5)
              </div>
              <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
                {a.topEvents.map((e, i) => (
                  <div key={e.type}
                    className="h-full transition-all"
                    style={{ width: `${e.pct * 100}%`, background: EVENT_COLORS[i % EVENT_COLORS.length] }}
                    title={`${e.type}: ${fmtInt(e.count)} (${(e.pct * 100).toFixed(1)}%)`} />
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {a.topEvents.map((e, i) => (
                  <span key={e.type} className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_COLORS[i % EVENT_COLORS.length] }} />
                    {e.type} <span className="tabular text-zinc-400">{(e.pct * 100).toFixed(0)}%</span>
                  </span>
                ))}
              </div>
            </div>

            {/* BH activity time-series (48h) */}
            <div className="mt-3">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  BH activity — last 48h (hourly)
                </span>
                <span className="tabular font-mono text-[10px] text-zinc-600">
                  peak {Math.max(...a.bhSeries)}/h
                </span>
              </div>
              <Sparkline
                values={a.bhSeries}
                width={440} height={40}
                tone={a.risk.tier === 'HIGH' ? '#f43f5e' : a.risk.tier === 'MEDIUM' ? '#fbbf24' : '#10b981'}
              />
            </div>

            {/* stats row */}
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-zinc-800/60 pt-3 text-center">
              <div>
                <div className="tabular font-mono text-sm text-zinc-200">{a.entityCount}</div>
                <div className="text-[9px] uppercase text-zinc-500">entities</div>
              </div>
              <div>
                <div className={cn('tabular font-mono text-sm',
                  a.avgCoherence >= 0.55 ? 'text-emerald-400' : 'text-rose-400')}>
                  {a.avgCoherence.toFixed(3)}
                </div>
                <div className="text-[9px] uppercase text-zinc-500">avg C(t)</div>
              </div>
              <div>
                <div className="tabular font-mono text-sm text-zinc-200">{fmtCompact(a.totalDepth)}</div>
                <div className="text-[9px] uppercase text-zinc-500">Σ depth</div>
              </div>
            </div>

            {/* member entities */}
            <div className="mt-3 space-y-1">
              {a.entities.slice(0, 3).map(e => (
                <div key={e.label} className="flex items-center justify-between text-[11px]">
                  <span className="truncate text-zinc-400">{e.label}</span>
                  <span className="flex shrink-0 items-center gap-2 font-mono">
                    <span className={e.coherence >= 0.55 ? 'text-emerald-400' : 'text-rose-400'}>
                      C={e.coherence.toFixed(2)}
                    </span>
                    <span className="text-zinc-600">{fmtInt(e.bhCount)} BHs</span>
                  </span>
                </div>
              ))}
              {a.entities.length > 3 && (
                <div className="text-[10px] text-zinc-600">+{a.entities.length - 3} more…</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <FormulaBlock label="L2.2 Genesis Inference">
        archetype_match = cos(BH_vector, centroid) &gt; τ_arch (0.55) → else NEW archetype → GENESIS signal<br />
        <span className="text-[11px] text-zinc-500">
          trajectory_anomaly = KL(P_actual ‖ P_expected | archetype) &gt; 0.50 → signal invalidated + MANIPULATION_ALERT
        </span>
      </FormulaBlock>
    </div>
  )
}
