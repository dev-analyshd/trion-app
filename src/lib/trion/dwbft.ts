// L4.1 — Diversity-Weighted BFT: Σ(t), d_j, HHI, coordination collapse.
//
//   d_j = 1 − corr(M_j, M̄)              diversity weight per validator
//   Σ(t) = Σ_j [s_j·d_j·𝟙(|v_j−v̄|≤δ(t))] / Σ_j [s_j·d_j]
//   δ(t) = δ_base·(1+V)                   dynamic consensus window
//   HHI = Σ (w_j/W)² × 10000              Herfindahl concentration
//   Coordination collapse: corr→1 ⇒ d_j→0 ⇒ byzantine power → 0

import { DELTA_BASE, HHI_TIERS, clamp01 } from './constants'

export interface ValidatorModel {
  id: string
  name: string
  region: string
  continent: string
  stake: number
  /** Model output vector — time-series of scalar output estimates. */
  modelVector: number[]
}

export interface ConsensusResult {
  sigma: number
  consensusValue: number
  diversityWeights: { id: string; name: string; d: number; effectiveStake: number }[]
  hhi: number
  hhiTier: 'HEALTHY' | 'WARNING' | 'DANGER' | 'CRITICAL'
  byzantineEffectivePower: number
  honestEffectivePower: number
  safetyMargin: number
  dynamicDelta: number
  coordinationCollapse: { coordinated: number; honest: number; note: string }
}

const pearson = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 0
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2
    db += (b[i] - mb) ** 2
  }
  const denom = Math.sqrt(da * db)
  return denom === 0 ? 0 : num / denom
}

const median = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

const medianVector = (vectors: number[][]): number[] => {
  const dims = Math.min(...vectors.map(v => v.length))
  const out: number[] = []
  for (let i = 0; i < dims; i++) out.push(median(vectors.map(v => v[i])))
  return out
}

export const computeDWBFT = (
  validators: ValidatorModel[],
  volatility: number,
  bootstrap = false,
): ConsensusResult => {
  if (validators.length === 0) {
    return {
      sigma: 0.25, consensusValue: 0.5, diversityWeights: [], hhi: 0,
      hhiTier: 'HEALTHY', byzantineEffectivePower: 0, honestEffectivePower: 0,
      safetyMargin: 0, dynamicDelta: DELTA_BASE,
      coordinationCollapse: { coordinated: 0, honest: 0, note: 'Bootstrap: Σ = 0.25 disclosed' },
    }
  }

  const mBar = medianVector(validators.map(v => v.modelVector))
  const delta = DELTA_BASE * (1 + clamp01(volatility))
  const values = validators.map(v => median(v.modelVector))
  const vBar = median(values)

  // d_j = 1 − corr(M_j, M̄)
  const dj = validators.map(v => {
    const c = pearson(v.modelVector, mBar)
    return clamp01(1 - Math.abs(c))
  })

  const weights = validators.map((v, i) => v.stake * dj[i])
  const totalW = weights.reduce((a, b) => a + b, 0) || 1

  // Σ(t) = Σ inlier weights / Σ weights
  let inlierW = 0
  validators.forEach((_, i) => {
    if (Math.abs(values[i] - vBar) <= delta) inlierW += weights[i]
  })
  const sigma = bootstrap ? 0.25 : inlierW / totalW

  // HHI of effective stake shares
  const hhi = weights.reduce((acc, w) => acc + (w / totalW) ** 2, 0) * 10000
  const hhiTier = hhi > HHI_TIERS.DANGER ? 'CRITICAL'
    : hhi > HHI_TIERS.WARNING ? 'DANGER'
    : hhi > HHI_TIERS.HEALTHY ? 'WARNING' : 'HEALTHY'

  // Coordination collapse demo: coordinate 40% of validators (corr → 0.97)
  const byzCount = Math.max(1, Math.floor(validators.length * 0.4))
  let byzEff = 0
  validators.slice(0, byzCount).forEach((v) => {
    const c = 0.97 // near-perfect coordination
    byzEff += v.stake * (1 - Math.abs(c))
  })
  const honestEff = totalW - validators.slice(0, byzCount).reduce((acc, v, i) => acc + v.stake * dj[i], 0)
  const safetyMargin = honestEff - (2 / 3) * totalW

  return {
    sigma,
    consensusValue: vBar,
    diversityWeights: validators.map((v, i) => ({
      id: v.id, name: v.name, d: dj[i], effectiveStake: weights[i],
    })),
    hhi, hhiTier,
    byzantineEffectivePower: byzEff,
    honestEffectivePower: honestEff,
    safetyMargin,
    dynamicDelta: delta,
    coordinationCollapse: {
      coordinated: byzEff / totalW,
      honest: honestEff / totalW,
      note: '40% coordinated byzantine set: effective power → 0 as corr → 1 (d_j = 1−corr → 0)',
    },
  }
}
