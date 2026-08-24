// L1.2 — Manipulation Fingerprint Detection: 7 archetypes M1–M7.
// Aggregation: ORACLE_ATTACK collapses to 1.0 (absolute SILENCE);
// otherwise MF = max(detected) with action DISCOUNT_PHI (<0.70) or SILENCE.

import { MF_THRESHOLDS, clamp01 } from './constants'

export interface MFDetectorInput {
  spotVsTwapDeviation?: number
  cyclicFlowRatio?: number
  cyclicCounterparties?: number
  top5LpShare?: number
  governanceHhi?: number
  youngestProposalAgeH?: number
  mevRate?: number
  mevSustainedDays?: number
  coordinatedSyncRatio?: number
  entropyDeficit?: number
  volumeSpikeMultiple?: number
  roundtripRatio?: number
}

export interface MFDetection {
  type: string
  detected: boolean
  score: number
  confidence: number
  formula: string
  action: 'NONE' | 'DISCOUNT_PHI' | 'SILENCE'
}

export interface MFResult {
  detections: MFDetection[]
  mfScore: number
  action: 'NONE' | 'DISCOUNT_PHI' | 'SILENCE'
}

export const computeManipulationFingerprints = (input: MFDetectorInput): MFResult => {
  const d: MFDetection[] = []

  // M1 — ORACLE_ATTACK: spot deviates >15% from TWAP within 10 blocks → MF = 1.0
  const oracleDev = input.spotVsTwapDeviation ?? 0
  d.push({
    type: 'ORACLE_ATTACK',
    detected: oracleDev > MF_THRESHOLDS.ORACLE_ATTACK,
    score: oracleDev > MF_THRESHOLDS.ORACLE_ATTACK ? 1.0 : clamp01(oracleDev / MF_THRESHOLDS.ORACLE_ATTACK * 0.4),
    confidence: oracleDev > MF_THRESHOLDS.ORACLE_ATTACK ? 0.98 : 0.5,
    formula: `dev=${(oracleDev * 100).toFixed(1)}% > ${(MF_THRESHOLDS.ORACLE_ATTACK * 100)}% → MF=1.0`,
    action: oracleDev > MF_THRESHOLDS.ORACLE_ATTACK ? 'SILENCE' : 'NONE',
  })

  // M2 — WASH_TRADING: cyclic_flow_ratio > 0.60 AND counterparties < 5 → 0.70×ratio
  const cyc = input.cyclicFlowRatio ?? 0
  const cycCp = input.cyclicCounterparties ?? 99
  const washDetected = cyc > MF_THRESHOLDS.WASH_TRADING && cycCp < 5
  d.push({
    type: 'WASH_TRADING',
    detected: washDetected,
    score: washDetected ? Math.min(0.95, 0.70 * cyc) : clamp01(cyc * 0.5),
    confidence: washDetected ? 0.9 : 0.5,
    formula: `cyclic=${cyc.toFixed(2)}, cp=${cycCp} → 0.70×${cyc.toFixed(2)} = ${(Math.min(0.95, 0.70 * cyc)).toFixed(2)}`,
    action: 'NONE',
  })

  // M3 — SYBIL_LIQUIDITY: top-5 LP share > 80% → 0.60×concentration (cap 0.80)
  const top5 = input.top5LpShare ?? 0
  const sybilDetected = top5 > MF_THRESHOLDS.SYBIL_LIQUIDITY
  d.push({
    type: 'SYBIL_LIQUIDITY',
    detected: sybilDetected,
    score: sybilDetected ? Math.min(0.80, 0.60 * top5) : clamp01(top5 * 0.5),
    confidence: sybilDetected ? 0.85 : 0.5,
    formula: `top5LP=${(top5 * 100).toFixed(0)}% > 80% → 0.60×${top5.toFixed(2)}`,
    action: 'NONE',
  })

  // M4 — GOVERNANCE_CAPTURE: HHI > 4000 AND proposal age < 48h → 0.50×(HHI−2500)/7500
  const hhi = input.governanceHhi ?? 0
  const age = input.youngestProposalAgeH ?? 999
  const govDetected = hhi > MF_THRESHOLDS.GOVERNANCE_CAPTURE && age < 48
  d.push({
    type: 'GOVERNANCE_CAPTURE',
    detected: govDetected,
    score: govDetected ? clamp01(0.50 * (hhi - 2500) / 7500) : 0,
    confidence: govDetected ? 0.8 : 0.5,
    formula: `HHI=${hhi.toFixed(0)}, age=${age.toFixed(0)}h → 0.50×(HHI−2500)/7500`,
    action: 'NONE',
  })

  // M5 — MEV_EXTRACTION_SUSTAINED: rate > 0.5% sustained > 7 days → 0.40×(rate−0.005)/0.045
  const mev = input.mevRate ?? 0
  const mevDays = input.mevSustainedDays ?? 0
  const mevDetected = mev > MF_THRESHOLDS.MEV_SUSTAINED && mevDays > 7
  d.push({
    type: 'MEV_EXTRACTION_SUSTAINED',
    detected: mevDetected,
    score: mevDetected ? clamp01(0.40 * (mev - 0.005) / 0.045) : 0,
    confidence: mevDetected ? 0.75 : 0.5,
    formula: `rate=${(mev * 100).toFixed(2)}% for ${mevDays}d → 0.40×(rate−0.5%)/4.5%`,
    action: 'NONE',
  })

  // M6 — COORDINATED_PUMP: ≥3 entities sync ratio > 0.80 → 0.85×avg_sync
  const sync = input.coordinatedSyncRatio ?? 0
  const pumpDetected = sync > MF_THRESHOLDS.COORDINATED_PUMP
  d.push({
    type: 'COORDINATED_PUMP',
    detected: pumpDetected,
    score: pumpDetected ? 0.85 * sync : 0,
    confidence: pumpDetected ? 0.85 : 0.5,
    formula: `sync=${sync.toFixed(2)} > 0.80 → 0.85×${sync.toFixed(2)} = ${(0.85 * sync).toFixed(2)}`,
    action: 'NONE',
  })

  // M7 — FAKE_VOLUME: entropy deficit > 0.40 or spike>10× + roundtrip>0.20 → 0.80×deficit
  const deficit = input.entropyDeficit ?? 0
  const spike = input.volumeSpikeMultiple ?? 1
  const rr = input.roundtripRatio ?? 0
  const fakeDetected = deficit > MF_THRESHOLDS.FAKE_VOLUME || (spike > 10 && rr > 0.20)
  const effectiveDeficit = Math.max(deficit, spike > 10 ? rr : 0)
  d.push({
    type: 'FAKE_VOLUME',
    detected: fakeDetected,
    score: fakeDetected ? clamp01(0.80 * effectiveDeficit) : 0,
    confidence: fakeDetected ? 0.8 : 0.5,
    formula: `deficit=${deficit.toFixed(2)}, spike=${spike.toFixed(1)}×, roundtrip=${rr.toFixed(2)} → 0.80×${effectiveDeficit.toFixed(2)}`,
    action: 'NONE',
  })

  // Aggregation
  const oracleAttack = d[0].detected
  const mfScore = oracleAttack ? 1.0 : Math.max(0, ...d.map(x => x.score))
  const action: MFResult['action'] = mfScore >= 0.70 ? 'SILENCE' : mfScore > 0.05 ? 'DISCOUNT_PHI' : 'NONE'
  return { detections: d, mfScore, action }
}

/** Φ_adj = Φ·(1−MF) — the manipulation discount. */
export const applyMfDiscount = (phi: number, mf: number): number =>
  phi * (1 - clamp01(mf))
