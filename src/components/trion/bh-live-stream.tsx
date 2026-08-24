'use client'

// Live BH Stream — SSE-connected real-time behavioral hash feed.

import { useEffect, useRef, useState } from 'react'
import { fetchJSON, type BhListResponse } from '@/lib/trion/client'
import { Panel, LiveBadge } from './primitives'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StreamBh {
  id: number
  entity: string
  beoId: string
  eventType: string
  magnitudeNorm: number
  chainId: number
  timestamp: string
  sense: string
  antisense: string
  invariant: boolean
}

export function BhLiveStream() {
  const [items, setItems] = useState<StreamBh[]>([])
  const [connected, setConnected] = useState(false)
  const [lastPing, setLastPing] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Seed with the most recent hashes so the panel isn't empty on mount
    fetchJSON<BhListResponse>('/api/bh?limit=8').then(d => {
      if (d) setItems(d.hashes.slice(0, 8).map(h => ({
        id: h.id, entity: h.entity, beoId: h.beoId, eventType: h.eventType,
        magnitudeNorm: h.magnitudeNorm, chainId: h.chainId,
        timestamp: h.timestamp, sense: h.sense.slice(0, 16),
        antisense: h.antisense.slice(0, 16), invariant: h.invariant,
      })))
    })

    const es = new EventSource('/api/bh/stream')
    esRef.current = es

    es.addEventListener('hello', () => setConnected(true))
    es.addEventListener('ping', (e) => {
      setConnected(true)
      try { setLastPing(JSON.parse((e as MessageEvent).data).ts) } catch { /* ignore */ }
    })
    es.addEventListener('bh', (e) => {
      try {
        const bh = JSON.parse((e as MessageEvent).data) as StreamBh
        setItems(prev => [bh, ...prev].slice(0, 8))
        setFlash(bh.id)
        setTimeout(() => setFlash(null), 1200)
      } catch { /* ignore */ }
    })
    es.onerror = () => setConnected(false)

    return () => { es.close(); esRef.current = null }
  }, [])

  return (
    <Panel title="Live BH Stream — Server-Sent Events"
      action={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn(
            connected ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400')}>
            <span className={cn('mr-1 inline-block h-1.5 w-1.5 rounded-full',
              connected ? 'live-dot bg-emerald-400' : 'bg-amber-400')} />
            {connected ? 'SSE connected' : 'reconnecting…'}
          </Badge>
          {lastPing && (
            <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">
              ping {new Date(lastPing).toLocaleTimeString('en-US', { hour12: false })}
            </span>
          )}
        </div>
      }>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-600">waiting for stream…</p>
        )}
        {items.map(bh => (
          <div key={bh.id}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-all duration-500',
              flash === bh.id
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : 'border-zinc-800/60 bg-zinc-900/20'
            )}>
            <div className="flex min-w-0 items-center gap-2.5">
              <Badge variant="outline" className="shrink-0 border-emerald-500/25 text-[9px] text-emerald-400">
                {bh.eventType}
              </Badge>
              <span className="truncate text-xs text-zinc-300">{bh.entity}</span>
              <span className="hidden shrink-0 font-mono text-[10px] text-zinc-600 sm:inline">
                ch {bh.chainId}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3 font-mono text-[10px]">
              <span className="hidden text-emerald-300/60 md:inline">{bh.sense.slice(0, 8)}…</span>
              <span className="text-zinc-500">|m| {bh.magnitudeNorm.toFixed(2)}</span>
              <span className={bh.invariant ? 'text-emerald-400' : 'text-rose-400'}>
                {bh.invariant ? '✓' : '✗'}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
        True server push via EventSource — no polling. New behavioral hashes flash emerald as they
        arrive; the XOR invariant is re-verified on every event.
      </p>
    </Panel>
  )
}
