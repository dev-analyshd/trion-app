'use client'

// Behavioral Hash Explorer — live ledger + interactive hash minting.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchJSON, postJSON, truncateHex, fmtInt,
  type BhListResponse,
} from '@/lib/trion/client'
import {
  FormulaBlock, SectionHeader, Panel, LiveBadge, SkeletonGrid, DataTableShell,
} from './primitives'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { sha3_256 } from 'js-sha3'

const CHAIN_OPTIONS = [
  { id: 1, name: 'Ethereum' }, { id: 137, name: 'Polygon' },
  { id: 8453, name: 'Base' }, { id: 42161, name: 'Arbitrum' },
  { id: 900, name: 'Solana' }, { id: 21000, name: 'Bitcoin' },
  { id: 5003, name: 'Sui' }, { id: 4000, name: 'Cosmos' },
]

const EVENT_OPTIONS = [
  'TRANSFER', 'SWAP', 'LIQUIDITY', 'STAKE', 'BORROW', 'GOVERNANCE',
  'PROPOSAL', 'REPAY', 'LIQUIDATE', 'BRIDGE', 'DEPLOY', 'MINT',
  'BURN', 'FLASH_LOAN', 'AIRDROP', 'CLAIM',
]

export function BhExplorerView() {
  const { toast } = useToast()
  const [limit, setLimit] = useState(25)
  const bh = useQuery({
    queryKey: ['bh', limit],
    queryFn: () => fetchJSON<BhListResponse>(`/api/bh?limit=${limit}`),
    refetchInterval: 10000,
  })

  // Interactive minting
  const [entityId, setEntityId] = useState('ab'.repeat(32))
  const [eventType, setEventType] = useState('SWAP')
  const [magnitude, setMagnitude] = useState(0.5)
  const [chainId, setChainId] = useState(1)
  const [result, setResult] = useState<{
    senseHex: string; antisenseHex: string; complementHex: string
    payloadHex: string; verified: boolean
  } | null>(null)
  const [minting, setMinting] = useState(false)

  const mint = async () => {
    setMinting(true)
    const blockHash = sha3_256(`block:${Date.now()}:${Math.random()}`)
    const r = await postJSON<typeof result>('/api/bh', {
      entityId, eventType, magnitudeNorm: magnitude, chainId,
      blockHash, timestamp: Math.floor(Date.now() / 1000),
    })
    setMinting(false)
    if (r && 'senseHex' in r) {
      setResult(r)
      toast({ title: 'Behavioral hash minted', description: `sense ${truncateHex(r.senseHex, 6)}… verified: ${r.verified}` })
    } else {
      toast({ title: 'Mint failed', description: 'Check entity id (64-char hex) and inputs', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader eyebrow="L0.1 — Universal Primitives" title="Behavioral Hash Explorer"
        description="Every on-chain interaction produces a 93-byte canonical hash with dual-strand SHA3-256 construction. The XOR invariant makes every hash self-verifying — tamper with either strand and complementarity breaks instantly." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Construction spec */}
        <Panel title="The 93-Byte Canonical Payload">
          <div className="space-y-2 font-mono text-xs">
            {[
              { range: '0–31', name: 'entity_id', size: '32B', desc: 'SHA3-256 of normalized identifier' },
              { range: '32', name: 'event_type', size: '1B', desc: 'canonical type 0–19' },
              { range: '33–40', name: 'magnitude_nano', size: '8B', desc: 'magnitude_norm × 1e9' },
              { range: '41–48', name: 'context', size: '8B', desc: 'venue/settlement bits' },
              { range: '49–56', name: 'timestamp', size: '8B', desc: 'unix seconds' },
              { range: '57–60', name: 'chain_id', size: '4B', desc: 'TRION internal chain id' },
              { range: '61–92', name: 'block_hash', size: '32B', desc: 'anchor block hash' },
            ].map(row => (
              <div key={row.name} className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="w-14 text-zinc-600">{row.range}</span>
                <span className="w-32 font-semibold text-emerald-400">{row.name}</span>
                <span className="w-8 text-zinc-500">{row.size}</span>
                <span className="text-zinc-500">{row.desc}</span>
              </div>
            ))}
          </div>
          <FormulaBlock label="Dual-Strand" className="mt-3">
            sense = SHA3-256(payload ‖ 0x00)<br />
            antisense = SHA3-256(payload ‖ 0xFF) ⊕ ¬sense<br />
            invariant: sense ⊕ antisense ≡ ¬SHA3-256(payload ‖ 0xFF)
          </FormulaBlock>
        </Panel>

        {/* Interactive minting */}
        <Panel title="Mint a Behavioral Hash" action={<Badge variant="outline" className="border-emerald-500/30 text-emerald-400">live compute</Badge>}>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-500">Entity ID (64-char hex)</Label>
              <Input value={entityId} onChange={e => setEntityId(e.target.value)}
                className="mt-1 bg-zinc-900/60 font-mono text-xs" maxLength={64} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-zinc-500">Event type</Label>
                <select value={eventType} onChange={e => setEventType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                  {EVENT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs text-zinc-500">Chain</Label>
                <select value={chainId} onChange={e => setChainId(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm">
                  {CHAIN_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-zinc-500">Magnitude (normalized)</Label>
              <div className="mt-1 flex items-center gap-3">
                <input type="range" min="0" max="1" step="0.01" value={magnitude}
                  onChange={e => setMagnitude(Number(e.target.value))}
                  className="h-1 flex-1 accent-emerald-500" />
                <span className="tabular font-mono text-sm text-emerald-400">{magnitude.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={mint} disabled={minting}
              className="w-full bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
              {minting ? 'Computing SHA3-256…' : 'Mint Behavioral Hash'}
            </Button>
            {result && (
              <div className="fade-up space-y-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 font-mono text-[11px]">
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">sense</span>
                  <span className="truncate text-emerald-300">{result.senseHex}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">antisense</span>
                  <span className="truncate text-amber-300">{result.antisenseHex}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-500">complement</span>
                  <span className="truncate text-zinc-400">{result.complementHex}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className={result.verified ? 'text-emerald-400' : 'text-rose-400'}>
                    {result.verified ? '✓ XOR invariant verified' : '✗ invariant broken'}
                  </span>
                  <span className="text-zinc-600">· {result.payloadHex.length / 2} bytes</span>
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Live ledger */}
      <Panel title={`Akashic BH Ledger — ${fmtInt(bh.data?.total ?? 0)} hashes`}
        action={<LiveBadge>live</LiveBadge>}>
        {!bh.data ? (
          <SkeletonGrid count={5} className="grid-cols-1" />
        ) : (
          <DataTableShell headers={['#', 'Entity', 'Event', '|m|', 'Chain', 'Block', 'Sense', 'Antisense', 'Verified']}>
            {bh.data.hashes.map(h => (
              <tr key={h.id} className="transition-colors hover:bg-zinc-900/50">
                <td className="px-3 py-2 font-mono text-xs text-zinc-600">{h.id}</td>
                <td className="px-3 py-2 text-zinc-300">{h.entity}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="border-emerald-500/25 text-[10px] text-emerald-400">{h.eventType}</Badge>
                </td>
                <td className="tabular px-3 py-2 font-mono text-zinc-400">{h.magnitudeNorm.toFixed(2)}</td>
                <td className="tabular px-3 py-2 font-mono text-zinc-500">{h.chainId}</td>
                <td className="tabular px-3 py-2 font-mono text-zinc-500">{fmtInt(h.blockNumber)}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-emerald-300/70">{truncateHex(h.sense, 6)}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-amber-300/70">{truncateHex(h.antisense, 6)}</td>
                <td className="px-3 py-2">
                  <span className={h.invariant ? 'text-emerald-400' : 'text-rose-400'}>
                    {h.invariant ? '✓' : '✗'}
                  </span>
                </td>
              </tr>
            ))}
          </DataTableShell>
        )}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11px] text-zinc-600">
            Invariant re-verified client-side on every render: sense ⊕ antisense ≡ ¬SHA3-256(payload ‖ 0xFF)
          </p>
          <Button variant="outline" size="sm" onClick={() => setLimit(l => Math.min(200, l + 25))}>
            Load more
          </Button>
        </div>
      </Panel>

      {/* Chain distribution */}
      {bh.data && (
        <Panel title="Hash Distribution by Chain">
          <div className="flex flex-wrap gap-2">
            {bh.data.chainDistribution
              .sort((a, b) => b.count - a.count)
              .map(c => {
                const total = bh.data!.total || 1
                const pct = (c.count / total) * 100
                return (
                  <div key={c.chainId}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5"
                    title={`chain ${c.chainId}`}>
                    <span className="tabular font-mono text-xs text-zinc-400">{c.chainId}</span>
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, pct * 4)}%` }} />
                    </div>
                    <span className="tabular font-mono text-xs text-zinc-500">{c.count}</span>
                  </div>
                )
              })}
          </div>
        </Panel>
      )}
    </div>
  )
}
