'use client'

// Validators — DW-BFT mesh, HHI enforcement, coordination collapse theorem.

import { useQuery } from '@tanstack/react-query'
import { fetchJSON, fmtCompact, type ValidatorsResponse } from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, LiveBadge,
  SkeletonGrid, DataTableShell,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function ValidatorsView() {
  const v = useQuery({
    queryKey: ['validators-attack'],
    queryFn: () => fetchJSON<ValidatorsResponse>('/api/validators?attack=1'),
    refetchInterval: 30000,
  })

  const d = v.data
  const hhiTone = d?.hhiTier === 'HEALTHY' ? 'good' : d?.hhiTier === 'WARNING' ? 'warn' : 'bad'
  const atk = d?.attackSimulation

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L4 — Spiritual Security" title="Diversity-Weighted BFT Validator Mesh"
        description="Validators who think too much like the majority receive diminished weight, not increased rewards. Perfect coordination equals exactly zero effective power — honesty is the Nash equilibrium." />

      {d ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile live label="Σ(t) Consensus" value={d.sigma.toFixed(3)} tone="good"
            sub={`δ(t) = ${(d.sigma * 0.065).toFixed(3)} dynamic window`} />
          <StatTile label="HHI Concentration" value={Math.round(d.hhi).toLocaleString()}
            tone={hhiTone as never} sub={d.hhiTier} />
          <StatTile label="Continents" value={`${d.continentsCovered}/4`}
            tone={d.continentsCovered >= 4 ? 'good' : 'warn'} sub="min. for launch" />
          <StatTile label="Consensus Value" value={d.consensusValue.toFixed(3)} sub="median estimate v̄" />
          <StatTile label="Safety Margin" value={fmtCompact(d.safetyMargin)}
            tone={d.safetyMargin > 0 ? 'good' : 'bad'} sub="honest − ⅔ total" />
        </div>
      ) : (
        <SkeletonGrid count={5} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Coordination Collapse Theorem" action={<Badge variant="outline" className="border-emerald-500/30 text-emerald-400">PROVED</Badge>}>
          <FormulaBlock label="Theorem">
            d_j = 1 − corr(M_j, M̄)<br />
            w_j_effective = s_j · d_j<br />
            lim(coordination → 1) Σ_Byzantine s_j·d_j = 0
          </FormulaBlock>
          <p className="mt-3 text-xs leading-relaxed text-zinc-400">
            As coordination approaches 1, all byzantine validators produce identical outputs.
            Their correlation with the median approaches 1, so their diversity weights approach 0,
            and their effective stake — the product — collapses to exactly zero.
          </p>
        </Panel>

        {atk && (
          <Panel title="Live Attack Simulation — 40% Coordinated Byzantine" action={<LiveBadge>real math</LiveBadge>}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Nominal stake share</div>
                  <div className="tabular mt-1 font-mono text-3xl font-bold text-rose-400">
                    {(atk.byzantineNominalShare * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Effective power</div>
                  <div className="tabular mt-1 font-mono text-3xl font-bold text-emerald-400">
                    {(atk.byzantineEffectiveShare * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              <MeterBar value={atk.byzantineNominalShare} max={0.6} tone="rose" label="Nominal byzantine share" />
              <MeterBar value={atk.byzantineEffectiveShare} max={0.6} tone="emerald" label="Effective byzantine power after diversity weighting" />
              <p className="text-[11px] leading-relaxed text-zinc-500">{atk.scenario}</p>
              <p className="text-[11px] leading-relaxed text-emerald-400/80">{atk.conclusion}</p>
            </div>
          </Panel>
        )}
      </div>

      <Panel title={`Validator Mesh — ${d?.validators.length ?? 0} validators`} action={<LiveBadge>live</LiveBadge>}>
        {!d ? (
          <SkeletonGrid count={6} className="grid-cols-1" />
        ) : (
          <DataTableShell headers={['Validator', 'Region', 'Continent', 'Stake', 'Diversity d_j', 'Effective Stake', 'Uptime']}>
            {d.validators.map(v_ => (
              <tr key={v_.name} className="transition-colors hover:bg-zinc-900/50">
                <td className="px-3 py-2 font-medium text-zinc-200">{v_.name}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">{v_.region}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{v_.continent}</td>
                <td className="tabular px-3 py-2 font-mono text-zinc-400">{fmtCompact(v_.stake)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-16"><MeterBar value={v_.diversityWeight} height="h-1" /></div>
                    <span className="tabular font-mono text-xs text-zinc-400">{v_.diversityWeight.toFixed(2)}</span>
                  </div>
                </td>
                <td className="tabular px-3 py-2 font-mono text-emerald-400">{fmtCompact(v_.effectiveStake)}</td>
                <td className="tabular px-3 py-2 font-mono text-zinc-500">{(v_.uptime * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </DataTableShell>
        )}
      </Panel>

      {d && (
        <Panel title="Geographic Distribution — HHI Enforcement (L4.8)">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {Object.entries(d.geographicDistribution).map(([continent, share]) => (
              <div key={continent} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">{continent}</div>
                <div className={cn('tabular mt-1 font-mono text-lg font-bold',
                  share > 0.40 ? 'text-rose-400' : 'text-zinc-200')}>
                  {(share * 100).toFixed(1)}%
                </div>
                <div className="mt-1.5"><MeterBar value={share} max={0.5} height="h-1"
                  tone={share > 0.40 ? 'rose' : 'emerald'} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            Constraints: max single region 40% · max single jurisdiction 30% · minimum 4 continents.
            HHI &gt; 2500 for 30 days triggers falsifiability condition F8.
          </p>
        </Panel>
      )}
    </div>
  )
}
