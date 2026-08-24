// L1.1 — Physical Plane: Φ(t) from 9 Shannon-entropy features.

import { PHI_WEIGHTS, clamp01 } from './constants'

/** Normalized Shannon entropy H(X)/log2(k) over counts. */
export const shannonEntropy = (counts: number[]): number => {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total <= 0 || counts.length <= 1) return 0
  let h = 0
  for (const c of counts) {
    if (c <= 0) continue
    const p = c / total
    h -= p * Math.log2(p)
  }
  return clamp01(h / Math.log2(counts.length))
}

/** Bin values into k buckets and return the normalized entropy. */
export const binnedEntropy = (values: number[], k = 10): number => {
  if (values.length === 0) return 0
  const lo = Math.min(...values), hi = Math.max(...values)
  const counts = new Array(k).fill(0)
  for (const v of values) {
    const idx = hi === lo ? 0 : Math.min(k - 1, Math.floor(((v - lo) / (hi - lo)) * k))
    counts[idx]++
  }
  return shannonEntropy(counts)
}

/** Frequency entropy over discrete labels. */
export const frequencyEntropy = (labels: string[]): number => {
  if (labels.length === 0) return 0
  const freq: Record<string, number> = {}
  for (const l of labels) freq[l] = (freq[l] ?? 0) + 1
  return shannonEntropy(Object.values(freq))
}

export interface BehaviorSample {
  magnitudes: number[]      // f1: value distribution
  counterparties: string[]  // f2: counterparty diversity
  timeGapsSec: number[]     // f3: temporal spacing
  protocols: string[]       // f4: protocol distribution
  inflowOutflow: number[]   // f5: value-flow directionality (+in/−out)
  contractMix: string[]     // f6: EOA vs contract interactions
  crossProtocol: string[]   // f7: cross-protocol engagement
  gasPrices: number[]       // f8: gas-price pattern
  mevRatios: number[]       // f9: MEV interaction (priority fee ratio)
}

export interface PhiResult {
  features: { name: string; value: number; weight: number; description: string }[]
  phi: number
}

const FEATURE_NAMES = [
  'Volume Entropy', 'Counterparty Diversity', 'Temporal Spacing',
  'Protocol Entropy', 'Value-Flow Directionality', 'Wallet Architecture',
  'Cross-Protocol reach', 'Gas Pattern', 'MEV Interaction',
]

const FEATURE_DESCS = [
  'Shannon entropy of transaction value distribution',
  'Diversity of counterparties engaged',
  'Regularity of inter-transaction timing',
  'Distribution across protocols (DEX/lending/staking)',
  'Balance between inflows and outflows',
  'Mix of EOA vs contract interactions',
  'Cross-protocol behavioral engagement',
  'Gas-price bidding pattern regularity',
  'Exposure to MEV-extraction patterns',
]

/** Φ(t) = Σ w_i · f_i — the Physical plane score. */
export const computePhi = (s: BehaviorSample): PhiResult => {
  const f = [
    binnedEntropy(s.magnitudes),
    frequencyEntropy(s.counterparties),
    binnedEntropy(s.timeGapsSec),
    frequencyEntropy(s.protocols),
    binnedEntropy(s.inflowOutflow),
    frequencyEntropy(s.contractMix),
    frequencyEntropy(s.crossProtocol),
    binnedEntropy(s.gasPrices),
    binnedEntropy(s.mevRatios),
  ]
  const phi = f.reduce((acc, v, i) => acc + PHI_WEIGHTS[i] * v, 0)
  return {
    features: f.map((value, i) => ({
      name: FEATURE_NAMES[i], value, weight: PHI_WEIGHTS[i], description: FEATURE_DESCS[i],
    })),
    phi,
  }
}

/** Entropy regime classification (L9.2 entropy engine). */
export const entropyRegime = (hNorm: number): {
  regime: 'EMPTY' | 'DEGENERATE' | 'HEALTHY' | 'RANDOM'; note: string
} => {
  if (hNorm < 0.01) return { regime: 'EMPTY', note: 'No behavioral history' }
  if (hNorm < 0.15) return { regime: 'DEGENERATE', note: 'Suspiciously uniform — wash-trading signature' }
  if (hNorm > 0.85) return { regime: 'RANDOM', note: 'Uniformly random — possibly bot noise' }
  return { regime: 'HEALTHY', note: 'Structured behavioral diversity' }
}
