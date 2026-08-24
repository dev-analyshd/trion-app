'use client'

// Escrow state timeline — horizontal HOLDING → terminal-state visualization
// for the BTCP ledger rows.

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface EscrowTimelineData {
  lockedAt: string
  resolvedAt: string | null
  durationMin: number
  coherenceAtRelease: number | null
}

const STATE_META: Record<string, { label: string; tone: string; dot: string }> = {
  HOLDING: { label: 'HOLDING', tone: 'border-amber-500/40 text-amber-400', dot: 'bg-amber-400' },
  PENDING_AKASHIC: { label: 'PENDING AKASHIC', tone: 'border-sky-500/40 text-sky-400', dot: 'bg-sky-400' },
  RELEASED: { label: 'RELEASED', tone: 'border-emerald-500/40 text-emerald-400', dot: 'bg-emerald-400' },
  REVERTED: { label: 'REVERTED', tone: 'border-zinc-500/40 text-zinc-400', dot: 'bg-zinc-500' },
  EMERGENCY_REVERTED: { label: 'EMERGENCY', tone: 'border-rose-500/40 text-rose-400', dot: 'bg-rose-500' },
}

/** Compact horizontal timeline: lock → duration bar → terminal state. */
export function EscrowTimeline({ state, timeline }: {
  state: string; timeline: EscrowTimelineData
}) {
  const meta = STATE_META[state] ?? STATE_META.HOLDING
  const pct = Math.min(100, (timeline.durationMin / 60) * 100) // full width at 60 min
  const isTerminal = state === 'RELEASED' || state === 'REVERTED' || state === 'EMERGENCY_REVERTED'

  return (
    <div className="w-full min-w-[180px]">
      {/* bar */}
      <div className="relative h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500',
            state === 'RELEASED' ? 'bg-emerald-500'
              : state === 'REVERTED' || state === 'EMERGENCY_REVERTED' ? 'bg-zinc-500'
              : 'bg-amber-400')}
          style={{ width: `${Math.max(pct, 8)}%` }}
        />
      </div>
      {/* labels */}
      <div className="mt-1 flex items-center justify-between text-[9px]">
        <span className="flex items-center gap-1 text-zinc-500">
          <span className="h-1 w-1 rounded-full bg-amber-400" />
          locked {new Date(timeline.lockedAt).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="tabular font-mono text-zinc-600">
          {timeline.durationMin}m
        </span>
        {isTerminal ? (
          <span className="flex items-center gap-1 text-zinc-400">
            {timeline.coherenceAtRelease !== null && `C=${timeline.coherenceAtRelease.toFixed(2)}`}
            <span className={cn('h-1 w-1 rounded-full', meta.dot)} />
            {new Date(timeline.resolvedAt ?? '').toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : (
          <Badge variant="outline" className={cn('px-1 py-0 text-[8px]', meta.tone)}>
            {meta.label}
          </Badge>
        )}
      </div>
    </div>
  )
}
