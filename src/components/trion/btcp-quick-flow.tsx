'use client'

// E2E BTCP Quick-Flow — one-click register → route → escrow → execute.
// Demonstrates the full zero-bridge lifecycle in a single guided action.

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchJSON, postJSON, fmtInt, type EntitySummary } from '@/lib/trion/client'
import { FormulaBlock, Panel, LiveBadge } from './primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Zap, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlowStep {
  key: string
  name: string
  detail: string
  state: 'pending' | 'active' | 'done' | 'blocked'
}

const INITIAL_STEPS: FlowStep[] = [
  { key: 'intent', name: 'Intent Registered', detail: 'SWAP intent hashed into Akashic Index', state: 'pending' },
  { key: 'bibl', name: 'BIBL Analysis', detail: 'Candidate chains scored (NL · gas · finality · CC · MF)', state: 'pending' },
  { key: 'route', name: 'Route Selected', detail: 'Zero-bridge route with BTCP_score', state: 'pending' },
  { key: 'escrow', name: 'Escrow HOLDING', detail: 'Value locked natively on source chain', state: 'pending' },
  { key: 'gate', name: 'Coherence Gate', detail: 'C(t) ≥ 0.55 checked at release', state: 'pending' },
  { key: 'akasha', name: 'Akashic Record', detail: 'Both BHs recorded — BTCP_ROUTE signal emitted', state: 'pending' },
]

export function BtcpQuickFlow() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [steps, setSteps] = useState<FlowStep[]>(INITIAL_STEPS)
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'routing' | 'holding' | 'released'>('idle')
  const [escrowId, setEscrowId] = useState<string | null>(null)
  const [result, setResult] = useState<{
    routeType: string; btcpScore: number; gasCostUsd: number; gasSavedPct: number
    amountUsd: number; coherence: number; reason: string
  } | null>(null)

  const mark = (key: string, state: FlowStep['state'], detail?: string) =>
    setSteps(prev => prev.map(s =>
      s.key === key ? { ...s, state, detail: detail ?? s.detail } : s
    ))

  const entitiesQuery = useQuery({
    queryKey: ['entities'],
    queryFn: () => fetchJSON<{ entities: EntitySummary[] }>('/api/entities'),
    staleTime: 60000,
  })
  const [entityId, setEntityId] = useState<string>('')
  const [magnitude, setMagnitude] = useState(10000)
  const [sourceChain, setSourceChain] = useState(1)
  const [destChain, setDestChain] = useState(8453)

  const run = async () => {
    setRunning(true)
    setPhase('routing')
    setSteps(INITIAL_STEPS.map(s => ({ ...s })))

    // 1+2+3+4 — register intent (computes BIBL, selects route, locks escrow)
    const list = entitiesQuery.data?.entities ?? []
    const beo = entityId || list.find(e => e.coherence > 0.6)?.beoId || list[0]?.beoId || ''
    if (!beo) {
      toast({ title: 'No entity available', variant: 'destructive' })
      setRunning(false)
      setPhase('idle')
      return
    }
    const reg = await postJSON<{
      intent?: { routeType: string }
      route?: { btcpScore: number; gasCostUsd: number; gasSavedPct: number; reason: string }
      escrow?: { escrowId: string; amountUsd: number }
      error?: string
    }>('/api/btcp/intent', {
      entityId: beo, sourceChain, destChain, magnitudeUsd: magnitude,
      tradeAction: 'SWAP', assetIn: 'ETH', assetOut: 'USDC',
    })

    if (!reg?.escrow) {
      toast({ title: 'Intent registration failed', description: reg?.error ?? 'unknown', variant: 'destructive' })
      setRunning(false)
      setPhase('idle')
      return
    }

    mark('intent', 'done')
    mark('bibl', 'done')
    mark('route', 'done', `${reg.intent?.routeType} — score ${reg.route?.btcpScore.toFixed(3)}`)
    mark('escrow', 'done', `$${fmtInt(reg.escrow.amountUsd)} locked (native, zero-bridge)`)
    setEscrowId(reg.escrow.escrowId)
    setPhase('holding')
    setRunning(false)

    toast({
      title: `${reg.intent?.routeType} route locked`,
      description: `Score ${reg.route?.btcpScore.toFixed(3)} · $${reg.route?.gasCostUsd.toFixed(2)} gas · ${reg.route?.gasSavedPct.toFixed(0)}% saved vs bridge`,
    })

    // stash for release
    setResult({
      routeType: reg.intent?.routeType ?? 'SPLIT',
      btcpScore: reg.route?.btcpScore ?? 0,
      gasCostUsd: reg.route?.gasCostUsd ?? 0,
      gasSavedPct: reg.route?.gasSavedPct ?? 0,
      amountUsd: reg.escrow.amountUsd,
      coherence: 0,
      reason: reg.route?.reason ?? '',
    })
  }

  const execute = async () => {
    if (!escrowId) return
    setRunning(true)
    mark('gate', 'active')

    const rel = await postJSON<{
      transition?: string; error?: string; escrow?: { coherenceAtRelease: number | null }
    }>('/api/btcp/intent', { action: 'execute', escrowId })

    if (rel?.transition) {
      mark('gate', 'done', `C(t) = ${rel.escrow?.coherenceAtRelease?.toFixed(3) ?? '—'} ≥ 0.55 — gate passed`)
      mark('akasha', 'done', 'BTCP_ESCROW_EVENT emitted · route FINALIZED')
      setPhase('released')
      setResult(r => r ? { ...r, coherence: rel.escrow?.coherenceAtRelease ?? 0 } : r)
      toast({ title: `Escrow ${rel.transition}`, description: 'Funds released natively — assets never left the source chain' })
      queryClient.invalidateQueries({ queryKey: ['btcp-intents'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
    } else {
      mark('gate', 'blocked', rel?.error ?? 'gate blocked')
      toast({ title: 'Release blocked', description: rel?.error ?? 'coherence gate', variant: 'destructive' })
    }
    setRunning(false)
  }

  return (
    <Panel title="E2E Zero-Bridge Flow — One Click"
      action={<LiveBadge>live lifecycle</LiveBadge>}>
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Controls */}
        <div className="space-y-3 lg:col-span-2">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Entity</label>
            <select value={entityId} onChange={e => setEntityId(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
              <option value="">Best coherent entity (auto)</option>
              {(entitiesQuery.data?.entities ?? []).map(e => (
                <option key={e.id} value={e.beoId}>{e.label} · C={e.coherence.toFixed(2)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Amount</label>
              <input type="number" value={magnitude} min={100} step={1000}
                onChange={e => setMagnitude(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-sm tabular" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">From</label>
              <select value={sourceChain} onChange={e => setSourceChain(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-sm">
                <option value={1}>Ethereum</option>
                <option value={42161}>Arbitrum</option>
                <option value={137}>Polygon</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">To</label>
              <select value={destChain} onChange={e => setDestChain(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-sm">
                <option value={8453}>Base</option>
                <option value={900}>Solana</option>
                <option value={5003}>Sui</option>
              </select>
            </div>
          </div>

          {phase === 'idle' && (
            <Button onClick={run} disabled={running}
              className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
              <Zap className="mr-1.5 h-4 w-4" />
              Run Zero-Bridge Flow
            </Button>
          )}
          {phase === 'holding' && (
            <Button onClick={execute} disabled={running}
              variant="outline"
              className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              {running ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
              Execute Release (gate 0.55)
            </Button>
          )}
          {phase === 'released' && (
            <Button onClick={run}
              className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
              <Zap className="mr-1.5 h-4 w-4" />
              Run Again
            </Button>
          )}

          {result && phase === 'released' && (
            <div className="fade-up rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">{result.routeType} COMPLETE</span>
                <span className="tabular font-mono text-emerald-400">${fmtInt(result.amountUsd)}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="rounded bg-zinc-900/60 py-1.5">
                  <div className="tabular font-mono text-sm text-zinc-200">{result.btcpScore.toFixed(2)}</div>
                  <div className="text-zinc-500">BTCP score</div>
                </div>
                <div className="rounded bg-zinc-900/60 py-1.5">
                  <div className="tabular font-mono text-sm text-emerald-400">${result.gasCostUsd.toFixed(2)}</div>
                  <div className="text-zinc-500">gas</div>
                </div>
                <div className="rounded bg-zinc-900/60 py-1.5">
                  <div className="tabular font-mono text-sm text-emerald-400">{result.coherence.toFixed(2)}</div>
                  <div className="text-zinc-500">C(t) at release</div>
                </div>
              </div>
            </div>
          )}

          <FormulaBlock label="invariant">
            assetsBridged = false · bridge = NONE<br />
            <span className="text-[11px] text-zinc-500">only behavioral facts cross chains</span>
          </FormulaBlock>
        </div>

        {/* Steps */}
        <div className="lg:col-span-3">
          <ol className="relative space-y-2 border-l border-zinc-800 pl-5">
            {steps.map((s, i) => (
              <li key={s.key} className="relative">
                {/* node */}
                <span className={cn(
                  'absolute -left-[27px] flex h-4 w-4 items-center justify-center rounded-full border-2 text-[8px]',
                  s.state === 'done' && 'border-emerald-500 bg-emerald-500',
                  s.state === 'active' && 'animate-pulse border-amber-400 bg-amber-400/30',
                  s.state === 'blocked' && 'border-rose-500 bg-rose-500',
                  s.state === 'pending' && 'border-zinc-700 bg-zinc-900',
                )} aria-hidden>
                  {s.state === 'done' && '✓'}
                  {s.state === 'blocked' && '✗'}
                </span>
                <div className={cn(
                  'rounded-lg border px-3 py-2 transition-all duration-500',
                  s.state === 'done' && 'border-emerald-500/30 bg-emerald-500/5',
                  s.state === 'active' && 'border-amber-500/40 bg-amber-500/5',
                  s.state === 'blocked' && 'border-rose-500/30 bg-rose-500/5',
                  s.state === 'pending' && 'border-zinc-800 bg-zinc-900/30',
                )}>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xs font-semibold',
                      s.state === 'pending' ? 'text-zinc-500' : 'text-zinc-200')}>
                      {i + 1}. {s.name}
                    </span>
                    {s.state === 'done' && (
                      <Badge variant="outline" className="border-emerald-500/30 text-[9px] text-emerald-400">done</Badge>
                    )}
                    {s.state === 'blocked' && (
                      <Badge variant="outline" className="border-rose-500/30 text-[9px] text-rose-400">blocked</Badge>
                    )}
                  </div>
                  <p className={cn('mt-0.5 text-[11px]',
                    s.state === 'pending' ? 'text-zinc-600' : 'text-zinc-400')}>
                    {s.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {phase === 'released' && (
            <div className="fade-up mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Full lifecycle complete — $0 bridged, $0 wrapped tokens, zero trust beyond TRION consensus.
              <ArrowRight className="ml-auto h-3 w-3" />
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
