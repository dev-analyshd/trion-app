'use client'

// Coherence profile editor — tune α–ε weights per entity with server validation.
// Custom profiles persist to localStorage keyed by BEO id.

import { useEffect, useState } from 'react'
import { postJSON } from '@/lib/trion/client'
import { FormulaBlock, Panel, MeterBar } from './primitives'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { RotateCcw, Save, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface CustomWeights {
  alpha: number; beta: number; gamma: number; delta: number; epsilon: number
}

const DEFAULTS: CustomWeights = { alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 }

const LABELS: { key: keyof CustomWeights; sym: string; plane: string }[] = [
  { key: 'alpha', sym: 'α', plane: 'Physical — empiricism' },
  { key: 'beta', sym: 'β', plane: 'Mental — rationalism' },
  { key: 'gamma', sym: 'γ', plane: 'Spiritual — consensus' },
  { key: 'delta', sym: 'δ', plane: 'Conscious — hermeneutics' },
  { key: 'epsilon', sym: 'ε', plane: 'ANIMA — coherentism' },
]

const storageKey = (beoId: string) => `trion-profile:${beoId}`

export function loadCustomProfile(beoId: string | null): CustomWeights | null {
  if (!beoId || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey(beoId))
    return raw ? (JSON.parse(raw) as CustomWeights) : null
  } catch { return null }
}

export function ProfileEditor({ beoId, weights, onApply, onReset }: {
  beoId: string | null
  weights: CustomWeights
  onApply: (w: CustomWeights) => void
  onReset: () => void
}) {
  const { toast } = useToast()
  const [draft, setDraft] = useState<CustomWeights>(weights)
  const [validating, setValidating] = useState(false)

  useEffect(() => { setDraft(weights) }, [weights])

  const sum = draft.alpha + draft.beta + draft.gamma + draft.delta + draft.epsilon
  const sumOk = Math.abs(sum - 1) <= 0.02

  const setW = (key: keyof CustomWeights, value: number) =>
    setDraft(d => ({ ...d, [key]: value }))

  const normalize = () => {
    const s = draft.alpha + draft.beta + draft.gamma + draft.delta + draft.epsilon
    if (s <= 0) return
    setDraft({
      alpha: draft.alpha / s, beta: draft.beta / s, gamma: draft.gamma / s,
      delta: draft.delta / s, epsilon: draft.epsilon / s,
    })
  }

  const save = async () => {
    setValidating(true)
    const res = await postJSON<{
      valid: boolean; error?: string; normalized?: CustomWeights
      preview?: { balancedCoherence: number; note: string }
    }>('/api/profile', { weights: draft })
    setValidating(false)

    if (!res?.valid || !res.normalized) {
      toast({
        title: 'Profile rejected',
        description: res?.error ?? 'Weights must sum to 1.0',
        variant: 'destructive',
      })
      return
    }
    if (beoId) {
      localStorage.setItem(storageKey(beoId), JSON.stringify(res.normalized))
    }
    onApply(res.normalized)
    toast({
      title: 'Custom profile applied',
      description: res.preview?.note ?? 'Weights normalized and saved',
    })
  }

  return (
    <Panel title="Profile Editor — α·β·γ·δ·ε"
      action={
        <Badge variant="outline" className={cn(
          sumOk ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400')}>
          Σ = {sum.toFixed(3)}
        </Badge>
      }>
      <div className="space-y-3.5">
        {LABELS.map(({ key, sym, plane }) => (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-mono font-semibold text-emerald-400">{sym}</span>
              <span className="text-zinc-500">{plane}</span>
              <span className="tabular font-mono text-zinc-300">{draft[key].toFixed(3)}</span>
            </div>
            <Slider
              value={[Math.round(draft[key] * 100)]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setW(key, v / 100)}
              aria-label={`${sym} weight`}
            />
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={normalize}
            className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100"
            disabled={sumOk}>
            <Wand2 className="h-3.5 w-3.5" /> Normalize (Σ→1)
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setDraft(DEFAULTS); onReset() }}
            className="gap-1.5 border-zinc-700 text-zinc-300 hover:text-zinc-100">
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </Button>
          <Button size="sm" onClick={save} disabled={validating || !sumOk}
            className="ml-auto gap-1.5 bg-emerald-600 text-zinc-950 hover:bg-emerald-500">
            <Save className="h-3.5 w-3.5" /> {validating ? 'Validating…' : 'Apply & Save'}
          </Button>
        </div>

        {!sumOk && (
          <p className="text-[11px] text-amber-400">
            Σ = {sum.toFixed(3)} — adjust to 1.0 (±0.02) or click Normalize. The signal endpoint
            recomputes C(t) with these weights via the custom profile mechanism.
          </p>
        )}

        <FormulaBlock label="Preview">
          C(t) = {draft.alpha.toFixed(2)}·Φ + {draft.beta.toFixed(2)}·M + {draft.gamma.toFixed(2)}·Σ +{' '}
          {draft.delta.toFixed(2)}·K + {draft.epsilon.toFixed(2)}·A
        </FormulaBlock>
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Custom profiles persist per-entity in localStorage and are server-validated
          (non-negative, Σ≈1) before application. Built-in whitepaper profiles remain the normative
          reference.
        </p>
      </div>
    </Panel>
  )
}
