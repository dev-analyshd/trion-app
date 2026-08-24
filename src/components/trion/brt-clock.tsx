'use client'

// BRT — Biological Rhythm Timer (L6.2): four live phase dials.
//
//   circadian: (t mod 86400)/86400        — 24h daily rhythm
//   ultradian: (t mod 5400)/5400          — 90-min cycle
//   lunar:     (t mod 2551442)/2551442    — 29.53-day synodic month
//   seasonal:  (t mod 31557600)/31557600  — tropical year

import { useEffect, useState } from 'react'
import { Panel, LiveBadge } from './primitives'

interface Phase {
  circadian: number; ultradian: number; lunar: number; seasonal: number
}

const brtPhases = (t: number): Phase => ({
  circadian: (t % 86400) / 86400,
  ultradian: (t % 5400) / 5400,
  lunar: (t % 2551442) / 2551442,
  seasonal: (t % 31557600) / 31557600,
})

/** Circular phase dial — one revolution = one full period. */
function PhaseDial({ label, period, phase, accent }: {
  label: string; period: string; phase: number; accent: string
}) {
  const r = 34
  const circ = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={92} height={92} viewBox="0 0 100 100" role="img"
        aria-label={`${label} phase ${(phase * 100).toFixed(1)}%`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={accent} strokeWidth="6"
          strokeDasharray={`${phase * circ} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dasharray 1s linear' }}
        />
        {/* phase marker at current angle */}
        <line
          x1="50" y1="16" x2="50" y2="26"
          stroke={accent} strokeWidth="2.5" strokeLinecap="round"
          transform={`rotate(${phase * 360} 50 50)`}
        />
        <circle cx="50" cy="50" r="2.5" fill={accent} />
        <text x="50" y="48" textAnchor="middle" fill={accent} fontSize="13" fontWeight="700" fontFamily="monospace">
          {(phase * 100).toFixed(0)}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#71717a" fontSize="8">%</text>
      </svg>
      <div className="text-center">
        <div className="text-xs font-semibold text-zinc-200">{label}</div>
        <div className="text-[10px] text-zinc-500">{period}</div>
      </div>
    </div>
  )
}

function nextWindow(phase: number, periodSec: number): { inMin: number; label: string } {
  const remaining = (1 - phase) * periodSec
  const inMin = remaining / 60
  if (inMin > 1440) return { inMin, label: `${(inMin / 1440).toFixed(1)} days` }
  if (inMin > 60) return { inMin, label: `${(inMin / 60).toFixed(1)} h` }
  return { inMin, label: `${inMin.toFixed(1)} min` }
}

export function BrtClock() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const phases = brtPhases(now)
  const ultra = nextWindow(phases.ultradian, 5400)
  const cicadian = nextWindow(phases.circadian, 86400)
  const bibtNextUltraLow = phases.ultradian > 0.5
    ? 'approaching low' : 'rising phase'

  return (
    <Panel title="Biological Rhythm Timer (L6.2)"
      action={<LiveBadge>live phases</LiveBadge>}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <PhaseDial label="Circadian" period="24 h" phase={phases.circadian} accent="#10b981" />
        <PhaseDial label="Ultradian" period="90 min" phase={phases.ultradian} accent="#fbbf24" />
        <PhaseDial label="Lunar" period="29.53 d" phase={phases.lunar} accent="#a78bfa" />
        <PhaseDial label="Seasonal" period="365.25 d" phase={phases.seasonal} accent="#38bdf8" />
      </div>
      <div className="mt-4 grid gap-2 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500 sm:grid-cols-3">
        <span>
          Next circadian boundary: <span className="font-mono text-zinc-300">{cicadian.label}</span>
        </span>
        <span>
          Next ultradian window: <span className="font-mono text-zinc-300">{ultra.label}</span>{' '}
          <span className="text-zinc-600">({bibtNextUltraLow})</span>
        </span>
        <span>
          BRT scheduling: <span className="text-amber-400/90">CONJECTURE (F14)</span> — 90-day validation pending
        </span>
      </div>
    </Panel>
  )
}
