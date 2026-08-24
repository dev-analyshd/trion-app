'use client'

// Coherence Engine — five-plane radar, C(t) vs Θ(t), master equation breakdown.

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchJSON, fmtInt, type EntitySummary, type SignalResponse, type SignalHistoryResponse,
} from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, PlaneGauge, MeterBar,
  SkeletonGrid, LiveBadge, Sparkline,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProfileEditor, loadCustomProfile, type CustomWeights } from './profile-editor'
import { cn } from '@/lib/utils'

const PROFILES = [
  'DEFAULT', 'NEW_TOKEN', 'STABLECOIN', 'GOVERNANCE', 'BRIDGE',
  'SPEED', 'INTELLIGENCE', 'CERTAINTY', 'FULL_SPECTRUM',
]

export function CoherenceView() {
  const entities = useQuery({
    queryKey: ['entities'],
    queryFn: () => fetchJSON<{ entities: EntitySummary[] }>('/api/entities'),
  })
  const [selected, setSelected] = useState<string | null>(null)
  const [profile, setProfile] = useState('DEFAULT')
  const [volatility, setVolatility] = useState(0.3)
  const [signal, setSignal] = useState<SignalResponse | null>(null)
  const [computing, setComputing] = useState(false)
  const [customW, setCustomW] = useState<CustomWeights | null>(null)

  const beoId = selected ?? entities.data?.entities[0]?.beoId ?? null

  // Load persisted custom profile when the entity changes
  useEffect(() => {
    setCustomW(loadCustomProfile(beoId))
  }, [beoId])

  useEffect(() => {
    if (!beoId) return
    let cancelled = false
    const t = setTimeout(() => setComputing(true), 0)
    const wParam = customW
      ? `&w=${customW.alpha},${customW.beta},${customW.gamma},${customW.delta},${customW.epsilon}`
      : ''
    fetchJSON<SignalResponse>(
      `/api/signal/${beoId}?profile=${profile}&volatility=${volatility}${wParam}`
    ).then(s => { if (!cancelled) { setSignal(s); setComputing(false) } })
    return () => { cancelled = true; clearTimeout(t) }
  }, [beoId, profile, volatility, customW])

  const history = useQuery({
    queryKey: ['signal-history', beoId],
    queryFn: () => fetchJSON<SignalHistoryResponse>(`/api/signals/history?entityId=${beoId}&limit=60`),
    refetchInterval: 8000,
  })

  const planes = signal?.planes

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L5 — TRION Master" title="Five-Plane Coherence Engine"
        description="C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A. Five independent epistemologies — empiricism, rationalism, consensus, hermeneutics, coherentism — must converge for truth to emit." />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={beoId ?? ''} onValueChange={setSelected}>
          <SelectTrigger className="w-[260px] bg-zinc-900/60">
            <SelectValue placeholder="Select entity" />
          </SelectTrigger>
          <SelectContent>
            {entities.data?.entities.map(e => (
              <SelectItem key={e.id} value={e.beoId}>
                {e.label} · C={e.coherence.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={profile} onValueChange={setProfile}>
          <SelectTrigger className="w-[180px] bg-zinc-900/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROFILES.map(p => <SelectItem key={p} value={p}>{p.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2">
          <span className="text-xs text-zinc-500">Volatility V(t)</span>
          <input
            type="range" min="0" max="1" step="0.05" value={volatility}
            onChange={e => setVolatility(Number(e.target.value))}
            className="h-1 w-32 accent-emerald-500"
            aria-label="Market volatility"
          />
          <span className="tabular font-mono text-xs text-emerald-400">{volatility.toFixed(2)}</span>
        </div>
        {computing && <Badge variant="outline" className="border-amber-500/30 text-amber-400">computing…</Badge>}
        {customW && (
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            custom profile α={customW.alpha.toFixed(2)} β={customW.beta.toFixed(2)} γ={customW.gamma.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* Profile editor (collapsible row) */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-xs text-zinc-500 transition-colors hover:text-emerald-400 [&::-webkit-details-marker]:hidden">
          <span className="rounded border border-zinc-700 px-1.5 py-0.5 font-mono text-[10px]">⚙</span>
          Profile editor — tune α·β·γ·δ·ε weights {customW ? '(custom active)' : ''}
          <span className="text-zinc-600 transition-transform group-open:rotate-90">▸</span>
        </summary>
        <div className="mt-3">
          <ProfileEditor
            beoId={beoId}
            weights={customW ?? { alpha: signal?.planeWeights.alpha ?? 0.25, beta: signal?.planeWeights.beta ?? 0.30, gamma: signal?.planeWeights.gamma ?? 0.25, delta: signal?.planeWeights.delta ?? 0.10, epsilon: signal?.planeWeights.epsilon ?? 0.10 }}
            onApply={(w) => setCustomW(w)}
            onReset={() => setCustomW(null)}
          />
        </div>
      </details>

      {!signal ? (
        <SkeletonGrid count={4} className="grid-cols-1 md:grid-cols-2" />
      ) : (
        <>
          {/* Gate result */}
          <div className={cn(
            'rounded-xl border p-5 transition-colors',
            signal.passes
              ? 'gate-panel-pass border-emerald-500/30 bg-emerald-500/5'
              : 'gate-panel-fail border-rose-500/30 bg-rose-500/5'
          )}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn('text-2xl font-bold', signal.passes ? 'text-emerald-400' : 'text-rose-400')}>
                    {signal.passes ? 'SIGNAL EMITTED' : 'SILENCE'}
                  </span>
                  <Badge variant="outline" className={cn(
                    signal.status === 'NOMINAL' ? 'border-emerald-500/40 text-emerald-400'
                      : signal.status === 'WARN' ? 'border-amber-500/40 text-amber-400'
                      : 'border-rose-500/40 text-rose-400')}>
                    {signal.status}
                  </Badge>
                </div>
                <div className="mt-1 font-mono text-sm text-zinc-400">
                  {signal.silenceReason ?? `${signal.label} — T(t) = ${signal.tValue.toFixed(3)} · ${signal.signalType}`}
                </div>
              </div>
              <div className="flex items-end gap-6">
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">C(t)</div>
                  <div className="tabular font-mono text-3xl font-bold text-zinc-100">
                    {signal.coherence.toFixed(3)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">Θ(t)</div>
                  <div className="tabular font-mono text-3xl font-bold text-amber-400">
                    {signal.threshold.toFixed(3)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500">margin</div>
                  <div className={cn('tabular font-mono text-3xl font-bold',
                    signal.margin >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                    {signal.margin >= 0 ? '+' : ''}{signal.margin.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <MeterBar value={signal.coherence} label="C(t) vs Θ(t)" tone={signal.passes ? 'emerald' : 'rose'} />
              <div className="relative mt-0.5 h-0">
                <div className="absolute -top-[22px] h-1 w-0.5 bg-amber-400"
                  style={{ left: `${signal.threshold * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Plane gauges */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <PlaneGauge symbol="Φ" label="Physical" value={planes?.physical.adjusted ?? 0} />
              <div className="text-center text-[10px] text-zinc-600">
                MF discount {(1 - (planes?.physical.mf ?? 0)).toFixed(2)}×
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <PlaneGauge symbol="M" label="Mental" value={planes?.mental.adjusted ?? 0} />
              <div className="text-center text-[10px] text-zinc-600">
                OE {(planes?.mental.oe ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <PlaneGauge symbol="Σ" label="Spiritual" value={planes?.spiritual.sigma ?? 0} />
              <div className="text-center text-[10px] text-zinc-600">
                HHI {Math.round(planes?.spiritual.hhi ?? 0)} · {planes?.spiritual.hhiTier}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <PlaneGauge symbol="K" label="Conscious" value={planes?.conscious.k ?? 0} />
              <div className="text-center text-[10px] text-zinc-600">
                {planes?.conscious.annotations ?? 0} annotations
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
              <PlaneGauge symbol="A" label="ANIMA" value={planes?.anima.value ?? 0} />
              <div className="text-center text-[10px] text-zinc-600">
                live external data
              </div>
            </div>
          </div>

          {/* NEW: entity signal history sparkline */}
          {history.data && history.data.signals.length >= 2 && (
            <Panel title={`${signal.label} — Publication History`}
              action={<LiveBadge>{history.data.signals.length} signals</LiveBadge>}>
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-[11px] text-zinc-500">
                  <span>C(t) across recent publications</span>
                  <span className="font-mono">latest: {history.data.signals[history.data.signals.length - 1].coherence.toFixed(3)}</span>
                </div>
                <Sparkline values={history.data.signals.map(s => s.coherence)} width={720} height={56} />
                <div className="mt-1 flex gap-4 text-[11px] text-zinc-600">
                  <span>Σ emitted: <span className="text-emerald-400">{history.data.emitted}</span></span>
                  <span>Σ silenced: <span className="text-zinc-400">{history.data.silenced}</span></span>
                  <span>silence rate: <span className="text-amber-400">{(history.data.silenceRate * 100).toFixed(1)}%</span></span>
                </div>
              </div>
            </Panel>
          )}

          {/* Weighted contributions + master equation */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Weighted Contributions">
              <div className="space-y-3">
                {[
                  { sym: 'α·Φ', name: 'Physical (empiricism)', w: signal.planeWeights.alpha, v: planes?.physical.adjusted ?? 0 },
                  { sym: 'β·M', name: 'Mental (rationalism)', w: signal.planeWeights.beta, v: planes?.mental.adjusted ?? 0 },
                  { sym: 'γ·Σ', name: 'Spiritual (consensus)', w: signal.planeWeights.gamma, v: planes?.spiritual.sigma ?? 0 },
                  { sym: 'δ·K', name: 'Conscious (hermeneutics)', w: signal.planeWeights.delta, v: planes?.conscious.k ?? 0 },
                  { sym: 'ε·A', name: 'ANIMA (coherentism)', w: signal.planeWeights.epsilon, v: planes?.anima.value ?? 0 },
                ].map(row => (
                  <div key={row.sym}>
                    <div className="mb-1 flex items-baseline justify-between text-xs">
                      <span className="font-mono text-zinc-300">{row.sym}</span>
                      <span className="text-zinc-500">
                        {row.name} · w={row.w.toFixed(2)} → <span className="font-mono text-zinc-300">{(row.w * row.v).toFixed(4)}</span>
                      </span>
                    </div>
                    <MeterBar value={row.v} />
                  </div>
                ))}
                <div className="border-t border-zinc-800 pt-3">
                  <FormulaBlock label="Result" className="text-center">
                    C(t) = {signal.coherence.toFixed(4)} {signal.passes ? '≥' : '<'} Θ(t) = {signal.threshold.toFixed(4)}
                  </FormulaBlock>
                </div>
              </div>
            </Panel>

            <div className="space-y-4">
              <Panel title="Master Equation Breakdown">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <span className="font-mono text-xs text-zinc-400">Step 1 — gate</span>
                    <Badge variant="outline" className={signal.passes ? 'border-emerald-500/40 text-emerald-400' : 'border-rose-500/40 text-rose-400'}>
                      [C ≥ Θ] = {signal.passes ? '1' : '0'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <span className="font-mono text-xs text-zinc-400">Step 2 — signal S(t)</span>
                    <span className="tabular font-mono text-sm text-zinc-200">{signal.coherence.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <span className="font-mono text-xs text-zinc-400">Step 3 — e^(M_moat)</span>
                    <span className="tabular font-mono text-sm text-emerald-400">×{Math.exp(signal.moat.moat).toFixed(3)}</span>
                  </div>
                  <FormulaBlock label="T(t)" className="text-center text-base">
                    {signal.tValue.toFixed(4)}
                  </FormulaBlock>
                  <div className="text-center text-[11px] text-zinc-600">
                    CI_95: [{signal.ci95[0].toFixed(3)}, {signal.ci95[1].toFixed(3)}] ·
                    limiting plane: <span className="text-amber-400">{signal.limitingPlane}</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Moat Factors — M_moat = D·Q·R·X·F·N">
                <div className="space-y-2">
                  {signal.moat.factors.map(f => (
                    <div key={f.key} className="flex items-center gap-3">
                      <span className="w-5 font-mono text-xs font-bold text-emerald-400">{f.key}</span>
                      <div className="flex-1"><MeterBar value={f.value} height="h-1" /></div>
                      <span className="tabular w-12 text-right font-mono text-xs text-zinc-400">{f.value.toFixed(3)}</span>
                    </div>
                  ))}
                  <div className="border-t border-zinc-800 pt-2 text-center font-mono text-xs text-zinc-400">
                    M_moat = ln(1 + {signal.moat.product.toFixed(4)}) = {signal.moat.moat.toFixed(4)}
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* Physical plane features */}
          <Panel title="Physical Plane — 9 Shannon-Entropy Features (L1.1)">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(planes?.physical.features ?? []).map(f => (
                <div key={f.name} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium text-zinc-300">{f.name}</span>
                    <span className="tabular font-mono text-sm text-zinc-200">{f.value.toFixed(3)}</span>
                  </div>
                  <div className="mt-1.5"><MeterBar value={f.value} height="h-1" /></div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
                    <span>{f.description}</span>
                    <span>w={f.weight.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span>Φ_raw = <span className="font-mono text-zinc-300">{(planes?.physical.raw ?? 0).toFixed(3)}</span></span>
              <span>MF = <span className="font-mono text-amber-400">{(planes?.physical.mf ?? 0).toFixed(3)}</span></span>
              <span>Φ_adj = Φ·(1−MF) = <span className="font-mono text-emerald-400">{(planes?.physical.adjusted ?? 0).toFixed(3)}</span></span>
              <span>HA note: <span className="text-zinc-400">{planes?.anima.note}</span></span>
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
