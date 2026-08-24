'use client'

// Overview — the TRION dashboard: master equation, live stats, signal feed.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchJSON, fmtInt, fmtCompact, truncateHex,
  type HealthResponse, type EntitySummary, type BhListResponse, type SignalHistoryResponse,
} from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, LiveBadge, Panel,
  SkeletonGrid, DataTableShell, Sparkline, SilenceLogRow,
} from './primitives'
import { EntityDetail } from './entity-detail'
import { BrtClock } from './brt-clock'
import { BtcpQuickFlow } from './btcp-quick-flow'
import { BhLiveStream } from './bh-live-stream'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, FileJson } from 'lucide-react'

export function OverviewView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [detailBeo, setDetailBeo] = useState<string | null>(null)
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => fetchJSON<HealthResponse>('/api/health'),
    refetchInterval: 15000,
  })
  const entities = useQuery({
    queryKey: ['entities'],
    queryFn: () => fetchJSON<{ entities: EntitySummary[] }>('/api/entities'),
    refetchInterval: 30000,
  })
  const bh = useQuery({
    queryKey: ['bh-recent'],
    queryFn: () => fetchJSON<BhListResponse>('/api/bh?limit=12'),
    refetchInterval: 8000,
  })
  const history = useQuery({
    queryKey: ['signal-history'],
    queryFn: () => fetchJSON<SignalHistoryResponse>('/api/signals/history?limit=200'),
    refetchInterval: 10000,
  })

  const h = health.data
  const onlineProbes = h?.liveRpcProbes?.filter(p => p.online).length ?? 0
  const hist = history.data
  const silenceEvents = hist?.signals.filter(s => s.status === 'SILENCE').slice(-6).reverse() ?? []
  const coherenceSeries = hist?.signals.map(s => s.coherence) ?? []

  const exportHistory = (format: 'csv' | 'json') => {
    if (!hist) return
    let blob: Blob
    let filename: string
    if (format === 'csv') {
      const header = 'timestamp,entity,type,status,coherence,threshold,margin,tValue,limitingPlane,volatility,emitted'
      const rows = hist.signals.map(s =>
        [s.createdAt, JSON.stringify(s.entity), s.type, s.status, s.coherence.toFixed(6),
         s.threshold.toFixed(6), s.margin.toFixed(6), s.tValue.toFixed(6),
         s.limitingPlane ?? '', s.volatility.toFixed(4), s.emitted].join(','))
      blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
      filename = `trion-signal-history-${Date.now()}.csv`
    } else {
      blob = new Blob([JSON.stringify(hist, null, 2)], { type: 'application/json' })
      filename = `trion-signal-history-${Date.now()}.json`
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="hero-glow grid-pattern relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/20 px-6 py-10 sm:px-10">
        <div className="fade-up max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <LiveBadge>Live · Akashic Index</LiveBadge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400">
              v{h?.version ?? '3.0.0'}
            </Badge>
            {h && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                {onlineProbes}/{h.liveRpcProbes.length} RPC probes online
              </Badge>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">
            <span className="text-gradient-truth">Behavioral Truth</span> Infrastructure
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-400">
            TRION is the verification layer for the age of synthetic everything. Truth emits only
            when all five planes of reality are coherent. When any plane fails:{' '}
            <span className="font-semibold text-zinc-200">silence — and the silence is information.</span>
          </p>
          <div className="mt-6 max-w-xl">
            <FormulaBlock label="Master Equation">
              <div>T(t) = [C(t) ≥ Θ(t)] · S(t) · e^(M_moat · t)</div>
              <div className="mt-1.5 text-[11px] text-emerald-400/70">
                C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A
              </div>
            </FormulaBlock>
          </div>
        </div>
      </section>

      {/* ── Live stats ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="Akashic Index" title="System State"
          description="Every number below is computed live from the behavioral hash ledger — no simulation, no stubs." />
        {h ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile live label="Behavioral Hashes" value={fmtInt(h.akashicIndex.behavioralHashes)}
              sub="93-byte dual-strand" />
            <StatTile label="Entities (BEOs)" value={fmtInt(h.akashicIndex.entities)} sub="resolved across chains" />
            <StatTile label="Signals" value={fmtInt(h.akashicIndex.signals)} sub="emitted / silenced" />
            <StatTile label="Chains" value={fmtInt(h.network.chains)} sub={`${h.network.vmFamilies} VM families`} />
            <StatTile label="Bridge Pairs Eliminated" value={fmtCompact(h.network.bridgePairsEliminated)}
              sub="N(N−1)/2 network effect" tone="good" />
            <StatTile label="Validators" value={fmtInt(h.akashicIndex.validators)} sub="DW-BFT mesh" />
          </div>
        ) : (
          <SkeletonGrid count={6} className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" />
        )}
      </section>

      {/* ── NEW: Signal history + SILENCE log ───────────────────────────── */}
      {hist && hist.total > 0 && (
        <section className="grid gap-4 lg:grid-cols-5">
          <Panel title="Coherence History (live ledger)" className="lg:col-span-3"
            action={
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => exportHistory('csv')}
                  className="h-7 gap-1 px-2 text-[11px] text-zinc-500 hover:text-emerald-400"
                  title="Export as CSV">
                  <Download className="h-3 w-3" /> CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={() => exportHistory('json')}
                  className="h-7 gap-1 px-2 text-[11px] text-zinc-500 hover:text-emerald-400"
                  title="Export as JSON">
                  <FileJson className="h-3 w-3" /> JSON
                </Button>
                <LiveBadge>{hist.total} signals</LiveBadge>
              </div>
            }>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] uppercase tracking-wider text-zinc-500">C(t) over last {hist.signals.length} publications</span>
                <span className="font-mono text-[11px] text-zinc-500">silence rate {(hist.silenceRate * 100).toFixed(0)}%</span>
              </div>
              <Sparkline values={coherenceSeries} width={520} height={64} threshold={undefined} />
              <div className="mt-1 grid grid-cols-3 gap-3 text-center">
                <div className="rounded border border-emerald-500/20 bg-emerald-500/5 py-1.5">
                  <div className="tabular font-mono text-sm text-emerald-400">{hist.emitted}</div>
                  <div className="text-[10px] uppercase text-zinc-500">emitted</div>
                </div>
                <div className="rounded border border-zinc-700 bg-zinc-900/40 py-1.5">
                  <div className="tabular font-mono text-sm text-zinc-300">{hist.silenced}</div>
                  <div className="text-[10px] uppercase text-zinc-500">silenced</div>
                </div>
                <div className="rounded border border-amber-500/20 bg-amber-500/5 py-1.5">
                  <div className="tabular font-mono text-sm text-amber-400">{(hist.silenceRate * 100).toFixed(1)}%</div>
                  <div className="text-[10px] uppercase text-zinc-500">silence rate</div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="SILENCE Log — the honesty ledger" className="lg:col-span-2"
            action={<Badge variant="outline" className="border-zinc-700 text-zinc-500">C &lt; Θ</Badge>}>
            <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
              {silenceEvents.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">
                  No silence events yet — visit the Coherence Engine to generate signals
                </p>
              ) : (
                silenceEvents.map(s => (
                  <SilenceLogRow key={s.id} entity={s.entity} coherence={s.coherence}
                    threshold={s.threshold} limitingPlane={s.limitingPlane} createdAt={s.createdAt} />
                ))
              )}
            </div>
          </Panel>
        </section>
      )}

      {/* ── RPC liveness + entity board ─────────────────────────────────── */}
      <section className="grid gap-4 lg:grid-cols-5">
        <Panel title="Live RPC Probes" className="lg:col-span-2"
          action={<LiveBadge>real public RPCs</LiveBadge>}>
          <div className="space-y-2.5">
            {h?.liveRpcProbes?.map(p => (
              <div key={p.chain} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className={`live-dot h-2 w-2 rounded-full ${p.online ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  <span className="text-zinc-300">{p.chain}</span>
                  <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-500">{p.vm}</Badge>
                </div>
                <span className="tabular font-mono text-xs text-zinc-500">{p.latencyMs}ms</span>
              </div>
            )) ?? <SkeletonGrid count={4} className="grid-cols-1" />}
            <p className="pt-2 text-[11px] leading-relaxed text-zinc-600">
              Direct JSON-RPC to public endpoints. Solana getSlot, EVM eth_blockNumber, Bitcoin blockstream tip.
            </p>
          </div>
        </Panel>

        <Panel title="Entity Board" className="lg:col-span-3"
          action={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('coherence')}
              className="text-emerald-400 hover:text-emerald-300">
              Open Coherence Engine →
            </Button>
          }>
          <p className="mb-2 text-[11px] text-zinc-600">Click any row for the full BEO drill-down.</p>
          <DataTableShell headers={['Entity', 'Archetype', 'C(t)', 'Depth', 'Trust', 'BHs']}>
            {entities.data?.entities.slice(0, 8).map(e => (
              <tr key={e.id} onClick={() => setDetailBeo(e.beoId)}
                className="cursor-pointer transition-colors hover:bg-zinc-900/50">
                <td className="px-3 py-2 font-medium text-zinc-200">{e.label}</td>
                <td className="px-3 py-2 text-xs text-zinc-500">{e.archetype.replace(/_/g, ' ').toLowerCase()}</td>
                <td className={`tabular px-3 py-2 font-mono ${e.coherence >= 0.55 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {e.coherence.toFixed(3)}
                </td>
                <td className="tabular px-3 py-2 font-mono text-zinc-400">{fmtInt(e.depth)}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={
                    e.trustTier === 'EXEMPLARY' ? 'border-emerald-500/40 text-emerald-400'
                      : e.trustTier === 'TRUSTED' ? 'border-amber-500/40 text-amber-400'
                      : 'border-zinc-700 text-zinc-500'}>
                    {e.trustTier}
                  </Badge>
                </td>
                <td className="tabular px-3 py-2 font-mono text-zinc-400">{fmtInt(e.bhCount)}</td>
              </tr>
            ))}
          </DataTableShell>
        </Panel>
      </section>

      {/* ── Live BH stream ──────────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="L0.1 Behavioral Hash" title="Live Hash Stream"
          description="Every behavioral hash is 93 bytes, dual-strand SHA3-256 with a self-verifying XOR invariant." />
        <Panel action={<LiveBadge>streaming</LiveBadge>}>
          <DataTableShell headers={['Entity', 'Event', 'Magnitude', 'Chain', 'Sense (16)', 'Invariant']}>
            {bh.data?.hashes.map(bh_ => (
              <tr key={bh_.id} className="transition-colors hover:bg-zinc-900/50">
                <td className="px-3 py-2 text-zinc-300">{bh_.entity}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="border-emerald-500/25 text-[10px] text-emerald-400">
                    {bh_.eventType}
                  </Badge>
                </td>
                <td className="tabular px-3 py-2 font-mono text-zinc-400">{bh_.magnitudeNorm.toFixed(3)}</td>
                <td className="tabular px-3 py-2 font-mono text-zinc-500">{bh_.chainId}</td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-500">{truncateHex(bh_.sense, 8)}</td>
                <td className="px-3 py-2">
                  <span className={bh_.invariant ? 'text-emerald-400' : 'text-rose-400'}>
                    {bh_.invariant ? '✓ verified' : '✗ tampered'}
                  </span>
                </td>
              </tr>
            ))}
          </DataTableShell>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[11px] text-zinc-600">
              sense = SHA3-256(payload‖0x00) · antisense = SHA3-256(payload‖0xFF) ⊕ ¬sense
            </p>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('bh')}
              className="text-emerald-400 hover:text-emerald-300">
              Full explorer →
            </Button>
          </div>
        </Panel>
      </section>

      {/* ── Live SSE stream ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="L0.1 — Real-Time" title="Server-Pushed Hash Stream"
          description="A true EventSource connection pushes new behavioral hashes the moment they land in the ledger — zero polling, sub-second latency." />
        <BhLiveStream />
      </section>

      {/* ── E2E BTCP quick flow ──────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="BTCP — Live Demonstration" title="One-Click Zero-Bridge Flow"
          description="Register a real intent, watch the router score candidate chains, lock escrow natively, then release through the coherence gate — the full six-step lifecycle with zero bridged assets." />
        <BtcpQuickFlow />
      </section>

      {/* ── BRT phase clock ─────────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="L6.2 — Biological Rhythm Timer" title="BRT Phase Clock"
          description="Four biological rhythms govern timing intelligence: circadian (24h), ultradian (90-min), lunar (29.53d), and seasonal. DEFERRED BTCP routes schedule to the next ultradian low window." />
        <BrtClock />
      </section>

      {/* ── Pipeline diagram ────────────────────────────────────────────── */}
      <section>
        <SectionHeader eyebrow="Architecture" title="End-to-End Pipeline"
          description="From raw chain events to on-chain truth — every stage implements a whitepaper formula." />
        <div className="relative overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/20 p-6">
          <div className="flex min-w-[900px] items-stretch gap-2">
            {[
              { name: 'Chain Events', detail: '101 chains · 16 VMs', note: 'public RPCs' },
              { name: 'Behavioral Hash', detail: '93 bytes · dual-strand', note: 'L0.1' },
              { name: 'Akashic Index', detail: 'entity resolution · depth', note: 'L2' },
              { name: 'Five Planes', detail: 'Φ · M · Σ · K · A', note: 'L1–L4' },
              { name: 'Coherence', detail: 'C(t) ≥ Θ(t)', note: 'L5.2' },
              { name: 'Master Equation', detail: 'T(t) = S·e^M_moat', note: 'L5.3' },
              { name: 'Signal', detail: 'emit or SILENCE', note: '24 types' },
              { name: 'BTCP Route', detail: 'zero-bridge', note: 'intent → escrow' },
            ].map((stage, i) => (
              <div key={i} className="flex flex-1 items-center gap-2">
                <div className={`flex-1 rounded-lg border p-3 transition-colors hover:border-emerald-500/40
                  ${i === 4 || i === 5 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
                    {stage.note}
                  </div>
                  <div className="mt-0.5 text-[13px] font-semibold text-zinc-200">{stage.name}</div>
                  <div className="mt-0.5 text-[11px] text-zinc-500">{stage.detail}</div>
                </div>
                {i < 7 && <div className="h-px w-4 shrink-0 bg-zinc-700" />}
              </div>
            ))}
          </div>
          <div className="stream-line mt-4 h-px w-full" />
        </div>
      </section>

      {/* Entity drill-down slide-over */}
      {detailBeo && (
        <EntityDetail
          beoId={detailBeo}
          onClose={() => setDetailBeo(null)}
          onOpenCoherence={() => { setDetailBeo(null); onNavigate('coherence') }}
        />
      )}
    </div>
  )
}
