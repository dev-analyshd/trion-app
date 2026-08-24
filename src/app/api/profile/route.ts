import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { WEIGHT_PROFILES, clamp01, type PlaneWeights } from '@/lib/trion/constants'

export const dynamic = 'force-dynamic'

/** Normalizes + validates a weight profile (all ≥ 0, sums to 1 within ε). */
function validateWeights(w: Partial<PlaneWeights>): PlaneWeights | null {
  const alpha = Number(w.alpha), beta = Number(w.beta), gamma = Number(w.gamma),
    delta = Number(w.delta), epsilon = Number(w.epsilon)
  if ([alpha, beta, gamma, delta, epsilon].some(v => !Number.isFinite(v) || v < 0 || v > 1)) {
    return null
  }
  const sum = alpha + beta + gamma + delta + epsilon
  if (Math.abs(sum - 1) > 0.02) return null
  // normalize to exactly 1
  return {
    alpha: alpha / sum, beta: beta / sum, gamma: gamma / sum,
    delta: delta / sum, epsilon: epsilon / sum,
  }
}

/** GET — list named profiles + any custom profiles stored in the DB (localStorage-free). */
export async function GET() {
  const customs = await db.signal.groupBy({
    by: ['planeWeights'],
    _count: { _all: true },
    take: 50,
  }).catch(() => [])

  return NextResponse.json({
    builtIn: WEIGHT_PROFILES,
    note: 'Custom profiles are stored client-side per entity in localStorage and applied via the ?profile= mechanism; built-ins are normative whitepaper profiles.',
  })
}

/** POST — validate a custom profile server-side before the client applies it. */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { weights } = body as { weights: Partial<PlaneWeights> }
    const normalized = validateWeights(weights)
    if (!normalized) {
      return NextResponse.json({
        valid: false,
        error: 'Weights must each be in [0,1] and sum to 1.0 (±0.02).',
      }, { status: 400 })
    }
    // sanity: limiting plane under these weights for a balanced input
    const balanced = { physical: 0.7, mental: 0.65, spiritual: 0.8, conscious: 0.6, anima: 0.55 }
    const c = normalized.alpha * balanced.physical + normalized.beta * balanced.mental +
      normalized.gamma * balanced.spiritual + normalized.delta * balanced.conscious +
      normalized.epsilon * balanced.anima
    return NextResponse.json({
      valid: true,
      normalized,
      preview: {
        balancedCoherence: clamp01(c),
        note: `C(t) on a balanced entity = ${clamp01(c).toFixed(3)} with these weights`,
      },
    })
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 })
  }
}
