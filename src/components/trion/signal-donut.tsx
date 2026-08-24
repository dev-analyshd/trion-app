'use client'

// Signal type donut — publication mix across the signal ledger.

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

/** SVG donut chart — segments with hover-expand + center total. */
function Donut({ segments, size = 160 }: {
  segments: { label: string; value: number; color: string }[]
  size?: number
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
            strokeWidth={22}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-startOffsets[i]}
            transform="rotate(-90 80 80)"
            opacity={0.9}
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

export function SignalTypeDonut() {
  const history = useQuery({
    queryKey: ['signal-history'],
    queryFn: () => fetchJSON<SignalHistoryResponse>('/api/signals/history?limit=300'),
    refetchInterval: 15000,
  })

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
    <Panel title="Signal Type Mix" action={<LiveBadge>{total} publications</LiveBadge>}>
      {segments.length === 0 ? (
        <p className="py-8 text-center text-xs text-zinc-600">no publications yet</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Donut segments={segments} />
          <div className="flex-1 space-y-1.5">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
                <span className="flex-1 text-xs text-zinc-300">{seg.label.replace(/_/g, ' ').toLowerCase()}</span>
                <span className="tabular font-mono text-xs text-zinc-400">{seg.value}</span>
                <span className="tabular w-12 text-right font-mono text-[11px] text-zinc-500">
                  {total > 0 ? `${((seg.value / total) * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}
