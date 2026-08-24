// L5 — Coherence Engine + Master Equation + Moat.
//
//   C(t) = α·Φ_adj + β·M_adj + γ·Σ + δ·K + ε·A
//   Θ(t) = Θ_min + (Θ_max − Θ_min)·V(t)
//   T(t) = [C ≥ Θ] · S(t) · e^(M_moat)
//   M_moat = D·Q·R·X·F·N  (multiplicative — a partial moat is no moat)

import {
  WEIGHT_PROFILES, THETA_MIN, THETA_MAX, MOAT, clamp01,
  type PlaneWeights,
} from './constants'

export interface PlaneInputs {
  physical: number      // Φ_adj (already MF-discounted)
  mental: number        // M_adj (already OE-discounted)
  spiritual: number     // Σ(t) from DW-BFT
  conscious: number     // K(t) annotation
  anima: number         // A(t) = PCR·HA·CA
}

export interface CoherenceResult {
  coherence: number
  threshold: number
  margin: number
  passes: boolean
  limitingPlane: 'physical' | 'mental' | 'spiritual' | 'conscious' | 'anima'
  weights: PlaneWeights
  profile: string
  weightedContributions: Record<keyof PlaneInputs, number>
}

export const computeTheta = (volatility: number): number =>
  THETA_MIN + (THETA_MAX - THETA_MIN) * clamp01(volatility)

export const computeCoherence = (
  planes: PlaneInputs,
  volatility: number,
  profile = 'DEFAULT',
  customWeights?: PlaneWeights,
): CoherenceResult => {
  const w = customWeights ?? WEIGHT_PROFILES[profile] ?? WEIGHT_PROFILES.DEFAULT
  const weighted = {
    physical: w.alpha * planes.physical,
    mental: w.beta * planes.mental,
    spiritual: w.gamma * planes.spiritual,
    conscious: w.delta * planes.conscious,
    anima: w.epsilon * planes.anima,
  }
  const coherence = clamp01(
    weighted.physical + weighted.mental + weighted.spiritual +
    weighted.conscious + weighted.anima
  )
  const threshold = computeTheta(volatility)
  const limitingPlane = (Object.keys(weighted) as (keyof PlaneInputs)[])
    .reduce((min, k) => (weighted[k] < weighted[min] ? k : min), 'physical')
  return {
    coherence, threshold,
    margin: coherence - threshold,
    passes: coherence >= threshold,
    limitingPlane,
    weights: w,
    profile,
    weightedContributions: weighted,
  }
}

// ── Moat: M_moat = D·Q·R·X·F·N ──────────────────────────────────────────────
export interface MoatInputs {
  akashicDepth: number
  quality: number
  reflexivity: number
  crossChainCount: number
  falsifiability: number
  ageSeconds: number
}

export interface MoatResult {
  factors: { key: string; name: string; value: number; formula: string }[]
  product: number
  moat: number
}

export const computeMoat = (m: MoatInputs): MoatResult => {
  const D = Math.log1p(m.akashicDepth / MOAT.D_DEPTH_SCALE) / Math.log1p(10)
  const Q = Math.min(1, m.quality + MOAT.Q_K_FLOOR)
  const R = Math.min(1, 1 - MOAT.R_REFLEXIVITY_PEAK * (m.reflexivity - 0.5) ** 2)
  const X = Math.log1p(m.crossChainCount / MOAT.X_CHAIN_TARGET * 3) / Math.log(3)
  const F = clamp01(m.falsifiability || MOAT.F_BASELINE)
  const N = 1 - Math.exp(-m.ageSeconds / MOAT.N_TAU_SECONDS)
  const product = D * Q * R * X * F * N
  return {
    factors: [
      { key: 'D', name: 'Akashic Depth', value: D, formula: `log1p(${m.akashicDepth}/1000)/log1p(10)` },
      { key: 'Q', name: 'Quality (K-plane)', value: Q, formula: `min(1, K + 0.15)` },
      { key: 'R', name: 'Reflexivity Balance', value: R, formula: `1 − 0.30·(M_adj−0.5)²` },
      { key: 'X', name: 'Cross-Chain Span', value: X, formula: `log1p(${m.crossChainCount}/3·3)/log(3)` },
      { key: 'F', name: 'Falsifiability', value: F, formula: `registry baseline ${MOAT.F_BASELINE}` },
      { key: 'N', name: 'Network Growth', value: N, formula: `1 − e^(−t/τ), τ≈3.17y` },
    ],
    product,
    moat: Math.log1p(product),
  }
}

// ── Master Equation ──────────────────────────────────────────────────────────
export interface MasterEquationResult {
  gate: 0 | 1
  signalValue: number
  moat: number
  tValue: number
  silenceReason?: string
  amplification: number
}

export const computeMasterEquation = (
  coherenceResult: CoherenceResult,
  moatResult: MoatResult,
  signalStrength = coherenceResult.coherence,
): MasterEquationResult => {
  const gate: 0 | 1 = coherenceResult.passes ? 1 : 0
  const amplification = Math.exp(moatResult.moat)
  const tValue = gate * signalStrength * amplification
  return {
    gate,
    signalValue: signalStrength,
    moat: moatResult.moat,
    tValue,
    amplification,
    silenceReason: gate === 0
      ? `C(t)=${coherenceResult.coherence.toFixed(3)} < Θ(t)=${coherenceResult.threshold.toFixed(3)} — limiting plane: ${coherenceResult.limitingPlane}`
      : undefined,
  }
}

// ── L3.2: Observer Effect — M_adj = M·(1−OE) ────────────────────────────────
export const observerEffectCorrection = (
  mentalBase: number,
  signalStrengthSeries: number[],
  behaviorChangeSeries: number[],
): { oe: number; mentalAdj: number } => {
  if (signalStrengthSeries.length !== behaviorChangeSeries.length ||
      signalStrengthSeries.length < 2) {
    return { oe: 0, mentalAdj: mentalBase }
  }
  const n = signalStrengthSeries.length
  const ms = signalStrengthSeries.reduce((a, b) => a + b, 0) / n
  const mb = behaviorChangeSeries.reduce((a, b) => a + b, 0) / n
  let num = 0, ds = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (signalStrengthSeries[i] - ms) * (behaviorChangeSeries[i] - mb)
    ds += (signalStrengthSeries[i] - ms) ** 2
    db += (behaviorChangeSeries[i] - mb) ** 2
  }
  const denom = Math.sqrt(ds * db)
  const corr = denom === 0 ? 0 : num / denom
  const oe = Math.abs(corr)
  return { oe, mentalAdj: mentalBase * (1 - oe) }
}

// ── L6.2: Biological Rhythm Timer ────────────────────────────────────────────
import { BRT_PERIODS } from './constants'
export const brtPhases = (t: number) => ({
  circadian: ((t % BRT_PERIODS.CIRCADIAN) / BRT_PERIODS.CIRCADIAN),
  ultradian: ((t % BRT_PERIODS.ULTRADIAN) / BRT_PERIODS.ULTRADIAN),
  lunar: ((t % BRT_PERIODS.LUNAR) / BRT_PERIODS.LUNAR),
  seasonal: ((t % BRT_PERIODS.SEASONAL) / BRT_PERIODS.SEASONAL),
})

// ── L3.3: ANIMA — A = PCR·HA·CA ─────────────────────────────────────────────
export const computeAnima = (
  patternConfidence: number,
  historicalAccuracy: number,
  calibration: number,
): { anima: number; note?: string } => {
  if (historicalAccuracy < 0.60) {
    return { anima: 0, note: 'HA < 0.60 → ANIMA disabled (honest disclosure)' }
  }
  return { anima: clamp01(patternConfidence * historicalAccuracy * calibration) }
}
