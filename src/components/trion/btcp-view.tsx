'use client'

// BTCP — Zero-Bridge Exchange: route simulator, intent lifecycle, chain registry.

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchJSON, postJSON, fmtInt, fmtCompact, statusColor,
  type BtcpChainsResponse, type BtcpRouteResponse, type EntitySummary,
} from '@/lib/trion/client'
import {
  FormulaBlock, StatTile, SectionHeader, Panel, MeterBar, LiveBadge,
  SkeletonGrid, DataTableShell,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const POPULAR = [
  { src: 1, dst: 8453, label: 'Ethereum → Base' },
  { src: 1, dst: 42161, label: 'Ethereum → Arbitrum' },
  { src: 1, dst: 900, label: 'Ethereum → Solana' },
  { src: 42161, dst: 900, label: 'Arbitrum → Solana' },
  { src: 900, dst: 1, label: 'Solana → Ethereum' },
  { src: 4000, dst: 5003, label: 'Cosmos → Sui' },
]

export function BtcpView() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [source, setSource] = useState(1)
  const [dest, setDest] = useState(8453)
  const [magnitude, setMagnitude] = useState(5000)
  const [urgency, setUrgency] = useState(60)
  const [netting, setNetting] = useState(false)
  const [routeResult, setRouteResult] = useState<BtcpRouteResponse | null>(null)
  const [routing, setRouting] = useState(false)

  const [entity, setEntity] = useState<string>('')
  const [lifecycle, setLifecycle] = useState<{
    intent: { status: string; routeType: string }
    route: { routeId: string; type: string; btcpScore: number; gasCostUsd: number; gasSavedPct: number; reason: string }
    escrow: { escrowId: string; state: string; amountUsd: number }
    lifecycle: { step: number; name: string; detail: string }[]
  } | null>(null)
  const [executing, setExecuting] = useState(false)

  const chains = useQuery({
    queryKey: ['btcp-chains'],
    queryFn: () => fetchJSON<BtcpChainsResponse>('/api/btcp/chains'),
  })
  const entities = useQuery({
    queryKey: ['entities'],
    queryFn: () => fetchJSON<{ entities: EntitySummary[] }>('/api/entities'),
  })
  const intents = useQuery({
    queryKey: ['btcp-intents'],
    queryFn: () => fetchJSON('/api/btcp/intent'),
    refetchInterval: 10000,
  })

  const chainOptions = chains.data?.chains ?? []
  const vmStats = chains.data?.vmDistribution ?? {}

  const computeRoute = async () => {
    setRouting(true)
    const r = await postJSON<BtcpRouteResponse>('/api/btcp/route', {
      sourceChain: source, destChain: dest, magnitudeUsd: magnitude,
      urgencyMin: urgency, hasNettingCounterparty: netting,
    })
    setRouting(false)
    if (r) setRouteResult(r)
    else toast({ title: 'Route computation failed', variant: 'destructive' })
  }

  const createIntent = async () => {
    setExecuting(true)
    const beoId = entity || entities.data?.entities[0]?.beoId
    const r = await postJSON<typeof lifecycle>('/api/btcp/intent', {
      entityId: beoId, sourceChain: source, destChain: dest,
      magnitudeUsd: magnitude, tradeAction: 'SWAP', assetIn: 'ETH', assetOut: 'USDC',
    })
    setExecuting(false)
    if (r && 'intent' in r) {
      setLifecycle(r)
      queryClient.invalidateQueries({ queryKey: ['btcp-intents'] })
      toast({ title: 'Intent registered', description: `${r.intent.routeType} route · escrow HOLDING` })
    } else {
      toast({ title: 'Intent failed', description: 'Check entity and chains', variant: 'destructive' })
    }
  }

  const executeEscrow = async () => {
    if (!lifecycle) return
    setExecuting(true)
    const r = await postJSON<{ transition?: string; error?: string }>('/api/btcp/intent', {
      action: 'execute', escrowId: lifecycle.escrow.escrowId,
    })
    setExecuting(false)
    if (r?.transition) {
      toast({ title: `Escrow ${r.transition}`, description: 'Coherence gate passed — funds released natively' })
      queryClient.invalidateQueries({ queryKey: ['btcp-intents'] })
    } else {
      toast({ title: 'Release blocked', description: r?.error ?? 'Coherence gate', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="BTCP — Behavioral Transaction Continuity Protocol" title="Zero-Bridge Exchange"
        description="Assets never leave their native chains. Only behavioral facts cross. 101 integrated chains across 16 VM families eliminate 5,050 bridge honey-pots." />

      {chains.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile live label="Integrated Chains" value={chains.data.total} sub="public RPC verified" />
          <StatTile label="VM Families" value={chains.data.vmFamilies} sub="EVM → Move → UTXO" />
          <StatTile label="Bridge Pairs Eliminated" value={fmtCompact(chains.data.bridgePairsEliminated)} tone="good" sub="N(N−1)/2" />
          <StatTile label="Zero-Bridge Invariant" value="ACTIVE" tone="good" sub="assets never move cross-chain" />
        </div>
      )}

      <Tabs defaultValue="simulator" className="space-y-4">
        <TabsList className="bg-zinc-900/60">
          <TabsTrigger value="simulator">Route Simulator</TabsTrigger>
          <TabsTrigger value="lifecycle">Intent Lifecycle</TabsTrigger>
          <TabsTrigger value="chains">Chain Registry</TabsTrigger>
          <TabsTrigger value="intents">Ledger</TabsTrigger>
        </TabsList>

        {/* ── Route simulator ─────────────────────────────────────────── */}
        <TabsContent value="simulator" className="space-y-4">
          <Panel title="Route Computation — BTCP_score" action={<LiveBadge>real math</LiveBadge>}>
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-zinc-500">Source chain</Label>
                    <select value={source} onChange={e => setSource(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                      {chainOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-zinc-500">Destination</Label>
                    <select value={dest} onChange={e => setDest(Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                      {chainOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Amount (USD)</Label>
                  <Input type="number" value={magnitude} min={10} step={100}
                    onChange={e => setMagnitude(Number(e.target.value))}
                    className="mt-1 bg-zinc-900/60 tabular" />
                </div>
                <div>
                  <Label className="text-xs text-zinc-500">Urgency (minutes to deadline)</Label>
                  <Input type="number" value={urgency} min={5} step={5}
                    onChange={e => setUrgency(Number(e.target.value))}
                    className="mt-1 bg-zinc-900/60 tabular" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-400">
                  <input type="checkbox" checked={netting} onChange={e => setNetting(e.target.checked)}
                    className="h-4 w-4 accent-emerald-500" />
                  Netting counterparty available (opposite intent found)
                </label>
                <Button onClick={computeRoute} disabled={routing}
                  className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
                  {routing ? 'Analyzing BIBL…' : 'Compute Optimal Route'}
                </Button>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR.map(p => (
                    <button key={p.label} onClick={() => { setSource(p.src); setDest(p.dst) }}
                      className="rounded-full border border-zinc-800 bg-zinc-900/40 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-emerald-500/40 hover:text-emerald-400">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3">
                {!routeResult ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-600">
                    Configure intent and compute route — the router runs the real BTCP_score priority ladder.
                  </div>
                ) : (
                  <div className="fade-up space-y-3">
                    <div className={cn('rounded-lg border p-4',
                      routeResult.route.valid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-emerald-400" />
                          <span className="text-lg font-bold text-zinc-100">{routeResult.route.routeType}</span>
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
                            score {routeResult.route.btcpScore.toFixed(3)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-[10px] uppercase text-zinc-500">gas cost</div>
                            <div className="tabular font-mono text-lg font-bold text-emerald-400">
                              ${routeResult.route.gasCostUsd.toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-zinc-500">vs bridge</div>
                            <div className="tabular font-mono text-lg font-bold text-emerald-400">
                              −{routeResult.route.gasSavedPct.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{routeResult.route.reason}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <ShieldCheck className="h-3 w-3" />
                        zero-bridge proof: assetsBridged={String(routeResult.zeroBridgeProof.assetsBridged)} · bridge={routeResult.zeroBridgeProof.bridge}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="mb-2 font-mono text-[11px] text-zinc-500">
                        BTCP_score = [0.25·NL + 0.20·Gas + 0.20·Finality + 0.15·CC + 0.20·BEO] × (1−MF)
                      </div>
                      <div className="space-y-1.5">
                        {routeResult.route.breakdown.map(b => (
                          <div key={b.component} className="flex items-center gap-3 text-xs">
                            <span className="w-16 text-zinc-400">{b.component}</span>
                            <div className="flex-1"><MeterBar value={b.value} height="h-1" /></div>
                            <span className="font-mono text-zinc-500">{b.formula}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        Gas cost comparison (USD)
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'Single-chain (ETH only)', cost: routeResult.gasComparisons.singleChainEth, tone: 'rose' as const },
                          { name: 'Wormhole bridge', cost: routeResult.gasComparisons.bridges.wormhole, tone: 'rose' as const },
                          { name: 'LayerZero', cost: routeResult.gasComparisons.bridges.layerzero, tone: 'rose' as const },
                          { name: 'Axelar', cost: routeResult.gasComparisons.bridges.axelar, tone: 'rose' as const },
                          { name: 'BTCP selected route', cost: routeResult.gasComparisons.btcpSelected, tone: 'emerald' as const },
                        ].map(row => (
                          <div key={row.name} className="flex items-center gap-3">
                            <span className="w-36 text-xs text-zinc-400">{row.name}</span>
                            <div className="flex-1">
                              <MeterBar value={row.cost} max={Math.max(routeResult.gasComparisons.singleChainEth, 1)}
                                tone={row.tone} height="h-2" />
                            </div>
                            <span className={cn('tabular w-14 text-right font-mono text-xs',
                              row.tone === 'emerald' ? 'text-emerald-400' : 'text-zinc-500')}>
                              ${row.cost.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* ── Intent lifecycle ────────────────────────────────────────── */}
        <TabsContent value="lifecycle" className="space-y-4">
          <Panel title="Intent → Route → Escrow (zero-bridge lifecycle)">
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="space-y-3 lg:col-span-2">
                <div>
                  <Label className="text-xs text-zinc-500">Entity (BEO)</Label>
                  <select value={entity} onChange={e => setEntity(e.target.value)}
                    className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                    <option value="">Top entity (highest depth)</option>
                    {entities.data?.entities.map(e => (
                      <option key={e.id} value={e.beoId}>{e.label} · C={e.coherence.toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <Button onClick={createIntent} disabled={executing}
                  className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
                  {executing ? 'Registering…' : 'Register Intent & Lock Escrow'}
                </Button>
                <FormulaBlock label="Escrow guarantee">
                  HOLDING → RELEASED (coherence ≥ 0.55)<br />
                  HOLDING → REVERTED (timeout, anyone)<br />
                  7-day emergency escape · 24h Akashic window
                </FormulaBlock>
                <p className="text-[11px] leading-relaxed text-zinc-600">
                  The full object lives in the Akashic Index; on-chain stores only the intent hash.
                  Escrow locks value on the source chain natively — no bridge, no wrapped token.
                </p>
              </div>

              <div className="lg:col-span-3">
                {!lifecycle ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-dashed border-zinc-800 text-sm text-zinc-600">
                    Register an intent to watch the six-step lifecycle execute live.
                  </div>
                ) : (
                  <div className="fade-up space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {lifecycle.lifecycle.map((s, i) => (
                        <div key={s.step}
                          className={cn('min-w-[140px] flex-1 rounded-lg border p-3 text-center',
                            i < 4 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40')}>
                          <div className="text-[10px] font-semibold text-emerald-500">STEP {s.step}</div>
                          <div className="mt-0.5 text-xs font-semibold text-zinc-200">{s.name}</div>
                          <div className="mt-0.5 text-[10px] leading-snug text-zinc-500">{s.detail}</div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-zinc-500">Escrow {lifecycle.escrow.escrowId.slice(0, 20)}…</div>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant="outline" className="border-amber-500/40 text-amber-400">
                              {lifecycle.escrow.state}
                            </Badge>
                            <span className="tabular font-mono text-sm text-zinc-300">
                              ${fmtInt(lifecycle.escrow.amountUsd)}
                            </span>
                          </div>
                        </div>
                        <Button onClick={executeEscrow} disabled={executing}
                          variant="outline" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
                          Execute Release (coherence gate 0.55)
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-zinc-600">{lifecycle.route.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* ── Chain registry ──────────────────────────────────────────── */}
        <TabsContent value="chains" className="space-y-4">
          <Panel title="101 Chains Across 16 VM Families"
            action={<LiveBadge>public RPC registry</LiveBadge>}>
            <div className="mb-4 flex flex-wrap gap-2">
              {Object.entries(vmStats).sort((a, b) => b[1] - a[1]).map(([vm, count]) => (
                <div key={vm} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5">
                  <span className="font-mono text-xs font-semibold text-emerald-400">{vm}</span>
                  <span className="ml-2 tabular text-xs text-zinc-500">{count} chains</span>
                </div>
              ))}
            </div>
            {!chains.data ? (
              <SkeletonGrid count={6} className="grid-cols-1" />
            ) : (
              <div className="max-h-[480px] overflow-y-auto">
                <DataTableShell headers={['Chain', 'VM', 'Category', 'Token', 'Finality', 'Gas', 'NL Score']}>
                  {chains.data.chains.map(c => (
                    <tr key={c.id} className="transition-colors hover:bg-zinc-900/50">
                      <td className="px-3 py-2 font-medium text-zinc-200">{c.name}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="border-zinc-700 text-[10px] text-zinc-400">{c.vm}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-500">{c.category}</td>
                      <td className="px-3 py-2 text-xs text-zinc-400">{c.nativeToken}</td>
                      <td className="tabular px-3 py-2 font-mono text-xs text-zinc-500">{c.finalitySec}s</td>
                      <td className="tabular px-3 py-2 font-mono text-xs text-zinc-500">${c.avgGasUsd.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <div className="w-20"><MeterBar value={c.nlScore} height="h-1"
                          tone={c.nlScore >= 0.3 ? 'emerald' : 'rose'} /></div>
                      </td>
                    </tr>
                  ))}
                </DataTableShell>
              </div>
            )}
          </Panel>
        </TabsContent>

        {/* ── Intents ledger ─────────────────────────────────────────── */}
        <TabsContent value="intents" className="space-y-4">
          <Panel title="BTCP Intent Ledger" action={<LiveBadge>live</LiveBadge>}>
            <DataTableShell headers={['Entity', 'Action', 'Magnitude', 'Route', 'Score', 'Gas Saved', 'Escrow', 'Status']}>
              {(intents.data as { intents: any[] })?.intents?.map((i: any) => (
                <tr key={i.id} className="transition-colors hover:bg-zinc-900/50">
                  <td className="px-3 py-2 text-zinc-300">{i.entity}</td>
                  <td className="px-3 py-2 text-xs text-zinc-400">{i.action} {i.assetIn}→{i.assetOut}</td>
                  <td className="tabular px-3 py-2 font-mono text-zinc-400">${fmtInt(i.magnitudeUsd)}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="border-emerald-500/25 text-[10px] text-emerald-400">
                      {i.routeType ?? '—'}
                    </Badge>
                  </td>
                  <td className="tabular px-3 py-2 font-mono text-xs text-zinc-400">
                    {i.routes[0]?.btcpScore?.toFixed(3) ?? '—'}
                  </td>
                  <td className="tabular px-3 py-2 font-mono text-xs text-emerald-400">
                    {i.routes[0] ? `${i.routes[0].gasSavedPct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn('text-xs', statusColor(i.routes[0]?.escrow?.state ?? ''))}>
                      {i.routes[0]?.escrow?.state ?? '—'}
                    </span>
                  </td>
                  <td className={cn('px-3 py-2 text-xs', statusColor(i.status))}>{i.status}</td>
                </tr>
              )) ?? null}
            </DataTableShell>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  )
}
