'use client'

// Signal type donut — publication mix across the signal ledger.

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchJSON, type SignalHistoryResponse } from '@/lib/trion/client'
import { Panel, LiveBadge } from './primitives'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  VALUATION: '#10b981',
  SILENCE: '#71717a',
  MANIPULATION_ALERT: '#f43f5e',
  BTCP_ESCROW_EVENT: '#fbbf24',
  BTCP_TIMEOUT: '#a78bfa',
}

/** Cumulative start offsets for donut segments (module-level pure helper). */
function computeStartOffsets(
  segments: { value: number }[],
  total: number,
  circumference: number,
): number[] {
  const offsets: number[] = []
  let cum = 0
  for (const seg of segments) {
    offsets.push(cum)
    cum += (seg.value / total) * circumference
  }
  return offsets
}

/** SVG donut chart — segments with click-to-filter + center total. */
function Donut({ segments, size = 160, selected, onToggle }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  selected: string | null
  onToggle: (label: string) => void
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const r = 60
  const cx = 80, cy = 80
  const circumference = 2 * Math.PI * r

  // Precompute cumulative start offsets — each segment begins where the last ended.
  // Built with a plain loop OUTSIDE JSX so no variable is reassigned during render.
  const startOffsets = computeStartOffsets(segments, total, circumference)

  return (
    <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Signal type distribution">
      {segments.map((seg, i) => {
        const frac = seg.value / total
        const dash = frac * circumference
        return (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={selected === seg.label ? 26 : 22}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-startOffsets[i]}
            transform="rotate(-90 80 80)"
            opacity={selected === null || selected === seg.label ? 0.95 : 0.35}
            className="cursor-pointer transition-all"
            onClick={() => toggle(seg.label)}
          >
            <title>{`${seg.label}: ${seg.value} (${(frac * 100).toFixed(1)}%)`}</title>
          </circle>
        )
      })}
      <circle cx={cx} cy={cy} r={r - 16} fill="var(--background, #0a0a0b)" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#fafafa" fontSize="20" fontWeight="700" fontFamily="monospace">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#71717a" fontSize="8" letterSpacing="1">
        SIGNALS
      </text>
    </svg>
  )
}

export function SignalTypeDonut({ onSelect }: { onSelect?: (type: string | null) => void } = {}) {
  const [selected, setSelected] = useState<string | null>(null)
  const history = useQuery({
    queryKey: ['signal-history'],
    queryFn: () => fetchJSON<SignalHistoryResponse>('/api/signals/history?limit=300'),
    refetchInterval: 15000,
  })

  const toggle = (type: string) => {
    const next = selected === type ? null : type
    setSelected(next)
    onSelect?.(next)
  }

  const signals = history.data?.signals ?? []
  const byType = new Map<string, number>()
  for (const s of signals) byType.set(s.type, (byType.get(s.type) ?? 0) + 1)

  const segments = Array.from(byType.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({
      label, value,
      color: TYPE_COLORS[label] ?? '#38bdf8',
    }))

  const total = segments.reduce((s, x) => s + x.value, 0)

  return (
    <Panel title="Signal Type Mix" action={<LiveBadge>{selected ? `${selected} filter` : `${total} publications`}</LiveBadge>}>
      {segments.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-600">no publications yet</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Donut segments={segments} selected={selected} onToggle={toggle} />
          <div className="flex-1 space-y-1.5">
            {segments.map(seg => (
              <button key={seg.label} onClick={() => toggle(seg.label)}
                className={cn('flex w-full items-center gap-2.5 rounded px-1 py-0.5 text-left transition-colors',
                  selected === seg.label ? 'bg-zinc-800/60' : 'hover:bg-zinc-900/40')}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: seg.color }} />
                <span className="flex-1 text-xs text-zinc-300">{seg.label.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="tabular font-mono text-xs text-zinc-400">{seg.value}</span>
                <span className="tabular w-12 text-right font-mono text-[11px] text-zinc-500">
                  {total > 0 ? `${((seg.value / total) * 100).toFixed(0)}%` : '—'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
