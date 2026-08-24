'use client'

// RPC heartbeat — rolling latency history per probe chain.

import { useEffect, useState } from 'react'
import { fetchJSON, type HealthResponse } from '@/lib/trion/client'
import { Panel, Sparkline, LiveBadge } from './primitives'
import { cn } from '@/lib/utils'

const MAX_POINTS = 24 // ~6 minutes at 15s intervals

interface ProbeHistory {
  chain: string
  vm: string
  latencies: number[]
  online: boolean
  latencyMs: number
}

export function RpcHeartbeat() {
  const [histories, setHistories] = useState<ProbeHistory[]>([])

  useEffect(() => {
    let cancelled = false
    const probe = async () => {
      const h = await fetchJSON<HealthResponse>('/api/health')
      if (cancelled || !h) return
      setHistories(prev => {
        const map = new Map(prev.map(p => [p.chain, p]))
        for (const p of h.liveRpcProbes) {
          const prior = map.get(p.chain) ?? {
            chain: p.chain, vm: p.vm, latencies: [], online: p.online, latencyMs: p.latencyMs,
          }
          map.set(p.chain, {
            ...prior,
            latencies: [...prior.latencies, p.latencyMs].slice(-MAX_POINTS),
            online: p.online,
            latencyMs: p.latencyMs,
          })
        }
        return Array.from(map.values())
      })
    }
    probe()
    const id = setInterval(probe, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const onlineCount = histories.filter(h => h.online).length

  return (
    <Panel title="RPC Heartbeat — Rolling Latency"
      action={<LiveBadge>{onlineCount}/{histories.length} online</LiveBadge>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {histories.map(h => (
          <div key={h.chain}
            className={cn('card-lift rounded-lg border p-3',
              h.online ? 'border-zinc-800 bg-zinc-900/40' : 'border-rose-500/30 bg-rose-500/5')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('live-dot h-2 w-2 rounded-full',
                  h.online ? 'bg-emerald-400' : 'bg-rose-500')} />
                <span className="text-xs font-medium text-zinc-200">{h.chain}</span>
              </div>
              <span className={cn('tabular font-mono text-[11px]',
                h.latencyMs < 800 ? 'text-emerald-400' : h.latencyMs < 2500 ? 'text-amber-400' : 'text-rose-400')}>
                {h.online ? `${h.latencyMs}ms` : 'offline'}
              </span>
            </div>
            <div className="mt-2">
              {h.latencies.length >= 2 ? (
                <Sparkline
                  values={h.latencies}
                  width={200} height={36}
                  tone={h.online ? (h.latencyMs < 800 ? '#10b981' : '#fbbf24') : '#f43f5e'}
                />
              ) : (
                <div className="flex h-9 items-center text-[10px] text-zinc-600">accumulating…</div>
              )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
              <span>{h.vm}</span>
              {h.latencies.length >= 2 && (
                <span className="tabular">
                  min {Math.min(...h.latencies)}ms · max {Math.max(...h.latencies)}ms
                </span>
              )}
            </div>
          </div>
        ))}
        {histories.length === 0 && (
          <p className="col-span-full py-6 text-center text-xs text-zinc-600">
            first probes arriving…
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        Each tile is a live public-RPC probe polled every 15s; the sparkline shows the rolling
        latency window (last {MAX_POINTS} probes). Green &lt;800ms, amber &lt;2.5s, rose beyond.
      </p>
    </Panel>
  )
}
