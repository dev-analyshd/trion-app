'use client'

// Shared TRION UI primitives — institutional terminal components.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Formula block — the signature look for whitepaper math. */
export function FormulaBlock({ children, label, className }: {
  children: React.ReactNode; label?: string; className?: string
}) {
  return (
    <div className={cn(
      'relative rounded-lg border border-emerald-500/20 bg-zinc-900/60 px-4 py-3',
      'font-mono text-[13px] leading-relaxed text-emerald-300',
      className
    )}>
      {label && (
        <span className="absolute -top-2 left-3 bg-zinc-950 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/80">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}

/** Live stat tile with animated pulse. */
export function StatTile({ label, value, sub, tone = 'default', live }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode
  tone?: 'default' | 'good' | 'warn' | 'bad'; live?: boolean
}) {
  const toneClass = {
    default: 'text-zinc-100',
    good: 'text-emerald-400',
    warn: 'text-amber-400',
    bad: 'text-rose-400',
  }[tone]
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-zinc-700">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        {live && <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" aria-label="live" />}
        {label}
      </div>
      <div className={cn('tabular mt-1.5 text-2xl font-semibold tracking-tight', toneClass)}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}

/** Section header. */
export function SectionHeader({ eyebrow, title, description }: {
  eyebrow?: string; title: string; description?: string
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-500">
          {eyebrow}
        </div>
      )}
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h2>
      {description && <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-400">{description}</p>}
    </div>
  )
}

/** Horizontal meter bar. */
export function MeterBar({ value, max = 1, tone = 'emerald', height = 'h-1.5', label }: {
  value: number; max?: number; tone?: 'emerald' | 'amber' | 'rose' | 'zinc'; height?: string; label?: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const toneClass = {
    emerald: 'bg-emerald-500', amber: 'bg-amber-400',
    rose: 'bg-rose-500', zinc: 'bg-zinc-500',
  }[tone]
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-[11px] text-zinc-500">
          <span>{label}</span>
          <span className="tabular">{value.toFixed(3)}</span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-zinc-800', height)}>
        <div className={cn('h-full rounded-full transition-all duration-700', toneClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/** Circular gauge for plane scores. */
export function PlaneGauge({ label, symbol, value, threshold = 0.55, size = 110 }: {
  label: string; symbol: string; value: number; threshold?: number; size?: number
}) {
  const r = 42
  const circ = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, value))
  const passes = value >= threshold
  const stroke = passes ? '#10b981' : '#f43f5e'
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${value.toFixed(3)}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="8" />
        <line
          x1="50" y1="8" x2="50" y2="14"
          stroke="#fbbf24" strokeWidth="2"
          transform={`rotate(${threshold * 360} 50 50)`}
        />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={stroke} strokeWidth="8"
          strokeDasharray={`${clamped * circ} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text x="50" y="46" textAnchor="middle" fill={stroke} fontSize="15" fontWeight="700" fontFamily="monospace">
          {clamped.toFixed(2)}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#71717a" fontSize="9">
          Θ={threshold}
        </text>
      </svg>
      <div className="text-center">
        <span className="font-mono text-sm font-bold" style={{ color: stroke }}>{symbol}</span>
        <div className="text-[11px] text-zinc-500">{label}</div>
      </div>
    </div>
  )
}

/** Live badge. */
export function LiveBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
      <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {children}
    </Badge>
  )
}

/** Loading skeleton grid. */
export function SkeletonGrid({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-lg" />
      ))}
    </div>
  )
}

/** Data table shell with header + rows. */
export function DataTableShell({ headers, children, className }: {
  headers: string[]; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-zinc-800', className)}>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/60">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">{children}</tbody>
      </table>
    </div>
  )
}

/** Card wrapper with consistent styling. */
export function Panel({ title, action, children, className }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <Card className={cn('border-zinc-800 bg-zinc-900/30', className)}>
      {(title || action) && (
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-200">{title}</CardTitle>
          {action}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** NEW: Sparkline — inline SVG time-series. */
export function Sparkline({ values, width = 220, height = 48, tone = '#10b981', threshold }: {
  values: number[]; width?: number; height?: number; tone?: string; threshold?: number
}) {
  if (values.length < 2) {
    return <div className="h-12 text-[11px] text-zinc-600">accumulating…</div>
  }
  const lo = Math.min(...values, threshold ?? Infinity)
  const hi = Math.max(...values, threshold ?? -Infinity)
  const range = hi - lo || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - ((v - lo) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const thresholdY = threshold !== undefined
    ? height - ((threshold - lo) / range) * height
    : null
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="time series">
      {thresholdY !== null && (
        <line x1="0" y1={thresholdY} x2={width} y2={thresholdY} stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 3" />
      )}
      <polyline points={pts.join(' ')} fill="none" stroke={tone} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={width} cy={pts[pts.length - 1].split(',')[1]} r="2.5" fill={tone} />
    </svg>
  )
}

/** NEW: SILENCE log row. */
export function SilenceLogRow({ entity, coherence, threshold, limitingPlane, createdAt }: {
  entity: string; coherence: number; threshold: number; limitingPlane: string | null; createdAt: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/60 bg-zinc-900/20 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
        <span className="truncate text-xs text-zinc-300">{entity}</span>
      </div>
      <div className="flex shrink-0 items-center gap-3 font-mono text-[11px]">
        <span className="text-zinc-400">C={coherence.toFixed(3)}</span>
        <span className="text-amber-400">Θ={threshold.toFixed(3)}</span>
        <span className="text-rose-400/80">{limitingPlane ?? '—'}</span>
        <span className="text-zinc-600">{new Date(createdAt).toLocaleTimeString('en-US', { hour12: false })}</span>
      </div>
    </div>
  )
}
