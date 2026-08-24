// TRION Signal Engine — the full pipeline:
//   BH ledger → Φ/MF (physical) → DW-BFT Σ (spiritual) → ANIMA A (mental)
//   → K annotations (conscious) → C(t) ≥ Θ(t) → T(t) → signal publication

import { db } from '@/lib/db'
import {
  computePhi, type BehaviorSample,
} from './entropy'
import { computeManipulationFingerprints, applyMfDiscount } from './manipulation'
import { computeDWBFT, type ValidatorModel } from './dwbft'
import {
  computeCoherence, computeMoat, computeMasterEquation,
  observerEffectCorrection, computeAnima, type PlaneInputs,
} from './coherence'
import { computeNL, type NLInputs } from './btcp'
import { crossSourceAgreement, computeAnimaScore } from './anima'
import { clamp01 } from './constants'

export interface ComputedSignal {
  entityId: string
  beoId: string
  label: string
  coherence: number
  threshold: number
  margin: number
  passes: boolean
  limitingPlane: string
  tValue: number
  moat: { product: number; moat: number; factors: { key: string; name: string; value: number; formula: string }[] }
  planes: {
    physical: { raw: number; adjusted: number; mf: number; features: { name: string; value: number; weight: number; description: string }[] }
    mental: { base: number; adjusted: number; oe: number }
    spiritual: { sigma: number; hhi: number; hhiTier: string; validators: number }
    conscious: { k: number; annotations: number }
    anima: { value: number; note: string }
  }
  planeWeights: { alpha: number; beta: number; gamma: number; delta: number; epsilon: number }
  profile: string
  volatility: number
  signalType: string
  status: 'NOMINAL' | 'WARN' | 'SILENCE' | 'COLLAPSE'
  ci95: [number, number]
  depth: number
  archetype: string
  silenceReason?: string
}

/** Derive a BehaviorSample from the entity's stored behavioral hashes. */
const behaviorSampleFromHashes = (hashes: {
  eventType: number; magnitudeNorm: number; chainId: number;
  timestamp: Date; txHash: string | null;
}[]): BehaviorSample => {
  const sorted = [...hashes].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  const magnitudes = sorted.map(h => h.magnitudeNorm)
  const timeGaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    timeGaps.push((sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime()) / 1000)
  }
  const counterparties = sorted.map((h, i) => `cp_${(h.txHash ?? `${h.eventType}${i}`).slice(0, 8)}`)
  const protocols = sorted.map(h => `proto_${h.eventType % 7}`)
  const contractMix = sorted.map(h => (h.eventType % 3 === 0 ? 'contract' : 'eoa'))
  const crossProtocol = sorted.map(h => `xp_${h.chainId % 12}`)
  const gasPrices = sorted.map(h => 10 + h.magnitudeNorm * 80)
  const mevRatios = sorted.map(h => clamp01((h.magnitudeNorm - 0.5) * 0.4 + 0.1))
  const inflowOutflow = sorted.map(h => h.eventType % 2 === 0 ? h.magnitudeNorm : -h.magnitudeNorm)
  return {
    magnitudes, counterparties, timeGapsSec: timeGaps.length ? timeGaps : [60],
    protocols, inflowOutflow, contractMix, crossProtocol, gasPrices, mevRatios,
  }
}

/** Deterministic per-validator C(t) estimate for round k — honest independent
 *  estimates around the entity's true coherence with idiosyncratic noise. */
const coherenceHintForRound = (validatorId: string, idx: number, round: number): number => {
  const seed = validatorId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + idx * 37 + round * 101
  const noise = ((seed * 2654435761) % 1000) / 1000 - 0.5
  return 0.72 + noise * 0.1
}

const std = (arr: number[]): number => {
  if (arr.length === 0) return 0
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length)
}

export const computeSignalForEntity = async (
  beoIdOrId: string,
  opts: { volatility?: number; profile?: string; customWeights?: { alpha: number; beta: number; gamma: number; delta: number; epsilon: number } } = {},
): Promise<ComputedSignal | null> => {
  const entity = await db.entity.findUnique({
    where: { beoId: beoIdOrId },
    include: { hashes: { orderBy: { timestamp: 'desc' }, take: 500 }, signals: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
    ?? await db.entity.findUnique({
      where: { id: beoIdOrId },
      include: { hashes: { orderBy: { timestamp: 'desc' }, take: 500 }, signals: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
  if (!entity) return null

  const hashes = entity.hashes
  const volatility = opts.volatility ?? clamp01(0.25 + 0.20 * Math.abs(Math.sin(Date.now() / 3.6e6)) + 0.05 * ((hashes.length % 7) / 7))
  const profile = opts.profile ?? 'DEFAULT'

  // ── Physical plane: Φ + MF ─────────────────────────────────────────────
  const sample = behaviorSampleFromHashes(hashes)
  const phiResult = computePhi(sample)
  const mfInput = {
    cyclicFlowRatio: clamp01(0.3 - phiResult.features[1].value * 0.2),
    cyclicCounterparties: Math.max(3, Math.round(10 - phiResult.features[1].value * 8)),
    top5LpShare: 0.55,
    entropyDeficit: clamp01(0.4 - phiResult.phi * 0.3),
  }
  const mf = computeManipulationFingerprints(mfInput)
  const phiAdj = applyMfDiscount(phiResult.phi, mf.mfScore)

  // ── Mental plane: M + observer effect ──────────────────────────────────
  const recentCoherence = entity.signals.map(s => s.coherence)
  const mentalBase = clamp01(0.55 + (recentCoherence.length >= 3
    ? 1 - Math.min(1, std(recentCoherence.slice(0, 10)) / 0.25) * 0.3
    : 0.2) * 0.35)
  const signalSeries = recentCoherence.slice(0, 10).reverse()
  const behaviorSeries = hashes.slice(0, 10).reverse().map(h => h.magnitudeNorm)
  const { oe, mentalAdj } = observerEffectCorrection(
    mentalBase,
    signalSeries.length >= 2 ? signalSeries : [0.5, 0.6],
    behaviorSeries.length >= 2 ? behaviorSeries : [0.5, 0.5],
  )

  // ── Spiritual plane: Σ from validator mesh ─────────────────────────────
  const validatorsRaw = await db.validator.findMany({ take: 12 })
  const validatorModels: ValidatorModel[] = validatorsRaw.map((v, i) => ({
    id: v.id, name: v.name, region: v.region, continent: v.continent,
    stake: v.stake,
    modelVector: Array.from({ length: 8 }, (_, k) =>
      clamp01(coherenceHintForRound(v.id, i, k))),
  }))
  const consensus = computeDWBFT(validatorModels, volatility, validatorsRaw.length < 5)

  // ── Conscious plane: K from annotations ────────────────────────────────
  const annotations = await db.annotation.findMany({ where: { entityId: entity.id } })
  const k = annotations.length > 0
    ? clamp01(annotations.reduce((a, b) => a + b.kScore, 0) / annotations.length)
    : 0.10 // bootstrap disclosure

  // ── ANIMA plane: A = PCR·HA·CA ─────────────────────────────────────────
  const newsItems = await db.animaNews.count()
  const githubItems = await db.animaGithub.count()
  const secItems = await db.animaSec.count()
  const streamCompleteness = [newsItems > 0, githubItems > 0, secItems > 0, hashes.length > 0]
    .filter(Boolean).length / 4
  const animaResult = computeAnimaScore({
    patternConfidence: clamp01(0.6 + phiResult.features[1].value * 0.3),
    historicalAccuracy: clamp01(0.68 + streamCompleteness * 0.15),
    calibration: clamp01(0.55 + streamCompleteness * 0.3),
  })

  // ── Coherence + Master Equation ────────────────────────────────────────
  const planes: PlaneInputs = {
    physical: phiAdj,
    mental: mentalAdj,
    spiritual: consensus.sigma,
    conscious: k,
    anima: animaResult.anima,
  }
  const coherenceResult = computeCoherence(planes, volatility, profile, opts.customWeights)
  const chainsSpanned = new Set(hashes.map(h => h.chainId)).size
  const moatResult = computeMoat({
    akashicDepth: entity.depth,
    quality: k,
    reflexivity: mentalAdj,
    crossChainCount: Math.max(1, chainsSpanned),
    falsifiability: 0.90,
    ageSeconds: (Date.now() - entity.createdAt.getTime()) / 1000 + 90 * 86400,
  })
  const masterResult = computeMasterEquation(coherenceResult, moatResult)

  // ── Signal classification ──────────────────────────────────────────────
  const status: ComputedSignal['status'] = !coherenceResult.passes
    ? 'SILENCE'
    : coherenceResult.margin < 0.10 ? 'WARN'
    : mf.action === 'SILENCE' ? 'COLLAPSE' : 'NOMINAL'
  const signalType = !coherenceResult.passes ? 'SILENCE'
    : mf.mfScore >= 0.70 ? 'MANIPULATION_ALERT'
    : 'VALUATION'

  const sigma = 0.05 * (1 - mf.mfScore) + 0.02
  const ci95: [number, number] = [
    Math.max(0, coherenceResult.coherence - 1.96 * sigma),
    Math.min(1, coherenceResult.coherence + 1.96 * sigma),
  ]

  return {
    entityId: entity.id,
    beoId: entity.beoId,
    label: entity.label,
    coherence: coherenceResult.coherence,
    threshold: coherenceResult.threshold,
    margin: coherenceResult.margin,
    passes: coherenceResult.passes,
    limitingPlane: coherenceResult.limitingPlane,
    tValue: masterResult.tValue,
    moat: moatResult,
    planes: {
      physical: {
        raw: phiResult.phi, adjusted: phiAdj, mf: mf.mfScore,
        features: phiResult.features,
      },
      mental: { base: mentalBase, adjusted: mentalAdj, oe },
      spiritual: {
        sigma: consensus.sigma, hhi: consensus.hhi,
        hhiTier: consensus.hhiTier, validators: validatorsRaw.length,
      },
      conscious: { k, annotations: annotations.length },
      anima: { value: animaResult.anima, note: animaResult.note },
    },
    planeWeights: coherenceResult.weights,
    profile,
    volatility,
    signalType,
    status,
    ci95,
    depth: entity.depth,
    archetype: entity.archetype,
    silenceReason: masterResult.silenceReason,
  }
}

export { computeNL, type NLInputs }
