// L7 — Natural Liquidity: NL = LD·LO·LC·LS  (multiplicative)
// BTCP — Behavioral Transaction Continuity Protocol routing engine.
//
//   BTCP_score = [0.25·NL + 0.20·gas_norm + 0.20·finality_conf
//                 + 0.15·CC_coherence + 0.20·BEO_continuity] × (1 − MF)
//   Route priority: NETTING > SINGLE_CHAIN > SPLIT > MULTI_HOP > PARALLEL > BITP > DEFERRED

import {
  BTCP_WEIGHTS, GAS_99TH_PERCENTILE, NL_ALERT_THRESHOLD,
  clamp01, clamp,
} from './constants'

// ── NL score ─────────────────────────────────────────────────────────────────
export interface NLInputs {
  depthDistribution: number[]
  top5Share: number
  beoCount: number
  currentDepthSeries: number[]
  baselineDepthSeries: number[]
  stressDepth: number
  normalDepth: number
}

export interface NLResult {
  ld: number; lo: number; lc: number; ls: number
  nl: number
  alert: boolean
  factors: { key: string; name: string; value: number; formula: string }[]
}

const entropyOf = (values: number[]): number => {
  const total = values.reduce((a, b) => a + b, 0)
  if (total <= 0 || values.length <= 1) return 0
  let h = 0
  for (const v of values) {
    if (v <= 0) continue
    const p = v / total
    h -= p * Math.log2(p)
  }
  return h / Math.log2(values.length)
}

const pearson = (a: number[], b: number[]): number => {
  const n = Math.min(a.length, b.length)
  if (n < 2) return 1
  const ma = a.slice(0, n).reduce((x, y) => x + y, 0) / n
  const mb = b.slice(0, n).reduce((x, y) => x + y, 0) / n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb)
    da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2
  }
  const d = Math.sqrt(da * db)
  return d === 0 ? 1 : num / d
}

export const computeNL = (input: NLInputs): NLResult => {
  // LD — liquidity depth entropy
  const ld = entropyOf(input.depthDistribution)
  // LO — liquidity origin: 1 − Sybil ratio
  const sybilRatio = input.beoCount > 0
    ? clamp01(input.top5Share / Math.max(1, input.beoCount / 5))
    : 1
  const lo = clamp01(1 - sybilRatio)
  // LC — correlation with 90d baseline
  const lc = clamp01(pearson(input.currentDepthSeries, input.baselineDepthSeries))
  // LS — stress resilience ratio
  const ls = input.normalDepth > 0 ? clamp01(input.stressDepth / input.normalDepth) : 0
  const nl = ld * lo * lc * ls
  return {
    ld, lo, lc, ls, nl,
    alert: nl < NL_ALERT_THRESHOLD,
    factors: [
      { key: 'LD', name: 'Liquidity Depth Entropy', value: ld, formula: 'H(depth)/log2(k)' },
      { key: 'LO', name: 'Liquidity Origin', value: lo, formula: `1 − Sybil_ratio (top5 ${(input.top5Share * 100).toFixed(0)}% / ${input.beoCount} BEOs)` },
      { key: 'LC', name: 'Baseline Correlation', value: lc, formula: 'corr(LD_now, LD_90d)' },
      { key: 'LS', name: 'Stress Resilience', value: ls, formula: `LD(stress)/LD(normal) = ${input.stressDepth.toFixed(2)}/${input.normalDepth.toFixed(2)}` },
    ],
  }
}

// ── BTCP routing ─────────────────────────────────────────────────────────────
export type RouteType =
  | 'SINGLE_CHAIN' | 'SPLIT' | 'NETTING' | 'PARALLEL'
  | 'MULTI_HOP' | 'DEFERRED' | 'BITP'

export interface ChainAnalysis {
  chainId: number
  name: string
  nl: number
  gasMeanUsd: number
  finalitySec: number
  ccCoherence: number
  mfScore: number
  beoContinuity: number
  validators: number
}

export interface BtcpRouteResult {
  routeType: RouteType
  selectedChains: { chainId: number; name: string }[]
  btcpScore: number
  gasCostUsd: number
  gasSavedPct: number
  finalityConfidence: number
  oeCorrection: number
  breakdown: { component: string; value: number; weight: number; formula: string }[]
  reason: string
  valid: boolean
  nettingCounterparty?: string
  deferredWindowSec?: number
}

export interface BtcpIntentInput {
  sourceChain: number
  destChain: number
  magnitudeUsd: number
  urgencyMin: number
  analyses: ChainAnalysis[]
  hasNettingCounterparty?: boolean
  volatility?: number
}

/** BTCP_score for one candidate execution chain. */
export const btcpScoreFor = (a: ChainAnalysis): number => {
  const normalizeGas = Math.max(0, 1 - a.gasMeanUsd / GAS_99TH_PERCENTILE)
  const finalityConf = clamp01(1 - Math.min(1, a.finalitySec / 60))
  const base =
    BTCP_WEIGHTS.NL * a.nl +
    BTCP_WEIGHTS.GAS * normalizeGas +
    BTCP_WEIGHTS.FINALITY * finalityConf +
    BTCP_WEIGHTS.CC * a.ccCoherence +
    BTCP_WEIGHTS.BEO * a.beoContinuity
  return clamp01(base * (1 - clamp01(a.mfScore)))
}

/** Full route selection over candidate chains (priority ladder). */
export const selectBtcpRoute = (input: BtcpIntentInput): BtcpRouteResult => {
  const { analyses, sourceChain, destChain, magnitudeUsd, urgencyMin } = input
  const byId = new Map(analyses.map(a => [a.chainId, a]))
  const src = byId.get(sourceChain)
  const dst = byId.get(destChain)

  // 1 — NETTING
  if (input.hasNettingCounterparty) {
    const a = dst ?? src ?? analyses[0]
    const score = clamp01(btcpScoreFor(a) + 0.15)
    return {
      routeType: 'NETTING',
      selectedChains: analyses.slice(0, 2).map(a => ({ chainId: a.chainId, name: a.name })),
      btcpScore: Math.min(0.99, score),
      gasCostUsd: 0.05,
      gasSavedPct: 99.8,
      finalityConfidence: 0.99,
      oeCorrection: 0,
      breakdown: nettingBreakdown(a),
      reason: 'Counterparty with opposite intent matched — assets never move (zero-bridge)',
      valid: true,
      nettingCounterparty: 'BEO_counterparty',
    }
  }

  // 2 — SINGLE_CHAIN
  if (src && dst && dst.nl > 0.70 &&
      dst.nl > src.nl && dst.gasMeanUsd <= src.gasMeanUsd &&
      dst.finalitySec <= src.finalitySec) {
    return finish('SINGLE_CHAIN', [dst], src,
      'Destination chain superior on NL, gas and finality — no cross-chain flow needed')
  }

  // 3 — MULTI_HOP
  const endpoints = [src?.nl ?? 0, dst?.nl ?? 0]
  const via = analyses.find(a =>
    a.chainId !== sourceChain && a.chainId !== destChain &&
    a.nl >= Math.max(...endpoints) + 0.10)
  if (via && magnitudeUsd > 10_000) {
    return finish('MULTI_HOP', [src!, via, dst!].filter(Boolean), src,
      `Intermediate ${via.name} liquidity (NL=${via.nl.toFixed(2)}) exceeds endpoints by ≥0.10`)
  }

  // 4 — PARALLEL
  const parallelLegs = analyses.filter(a => a.nl >= 0.60)
  if (magnitudeUsd >= 1_000_000 && parallelLegs.length >= 2) {
    return finish('PARALLEL', parallelLegs, src,
      `Large intent ($${(magnitudeUsd / 1e6).toFixed(1)}M) split across ${parallelLegs.length} chains with NL ≥ 0.60`)
  }

  // 5 — BITP
  if (dst && dst.nl < 0.30) {
    const a = src ?? analyses[0]
    const score = btcpScoreFor(a) * 0.9
    return {
      routeType: 'BITP',
      selectedChains: [{ chainId: sourceChain, name: src?.name ?? 'source' }, { chainId: destChain, name: dst.name }],
      btcpScore: clamp01(score),
      gasCostUsd: 0.02,
      gasSavedPct: 99.9,
      finalityConfidence: 0.85,
      oeCorrection: 0,
      breakdown: bitpBreakdown(a),
      reason: `Destination NL=${dst.nl.toFixed(2)} < 0.30 — illiquid pair routed via behavioral info transfer (assets stay native)`,
      valid: true,
    }
  }

  // 6 — DEFERRED
  if (dst && urgencyMin > 60 && dst.nl >= 0.30 && dst.nl < 0.60) {
    const now = Math.floor(Date.now() / 1000)
    const window = 5400 - (now % 5400)
    return {
      routeType: 'DEFERRED',
      selectedChains: [{ chainId: destChain, name: dst.name }],
      btcpScore: clamp01(btcpScoreFor(dst) + 0.05),
      gasCostUsd: dst.gasMeanUsd * 0.22,
      gasSavedPct: 78,
      finalityConfidence: 0.85,
      oeCorrection: 0,
      breakdown: deferredBreakdown(dst),
      reason: `Non-urgent intent deferred to next BRT ultradian window in ${Math.round(window / 60)} min (NL in [0.30, 0.60])`,
      valid: true,
      deferredWindowSec: window,
    }
  }

  // 7 — SPLIT (default)
  return finish('SPLIT', [src, dst].filter(Boolean), src,
    'Anchor on source chain, execute on destination — the default zero-bridge route')

  function finish(
    type: RouteType, chains: ChainAnalysis[], srcRef: ChainAnalysis | undefined, reason: string
  ): BtcpRouteResult {
    const exec = chains[chains.length - 1]
    const score = btcpScoreFor(exec)
    const gas = chains.reduce((acc, c) => acc + c.gasMeanUsd, 0) / Math.max(1, chains.length)
    const singleChainGas = (srcRef ?? analyses[0]).gasMeanUsd + 30
    const finalityConf = clamp01(1 - Math.min(1, exec.finalitySec / 60))
    const oe = clamp01((input.volatility ?? 0.2) * 0.25)
    return {
      routeType: type,
      selectedChains: chains.map(c => ({ chainId: c.chainId, name: c.name })),
      btcpScore: clamp01(score * (1 - oe)),
      gasCostUsd: gas,
      gasSavedPct: clamp((1 - gas / singleChainGas) * 100, 0, 99.5),
      finalityConfidence: finalityConf,
      oeCorrection: oe,
      breakdown: splitBreakdown(exec),
      reason,
      valid: score >= 0.10,
    }
  }
}

const splitBreakdown = (a: ChainAnalysis) => {
  const normalizeGas = Math.max(0, 1 - a.gasMeanUsd / GAS_99TH_PERCENTILE)
  const finalityConf = clamp01(1 - Math.min(1, a.finalitySec / 60))
  return [
    { component: 'NL', value: a.nl, weight: BTCP_WEIGHTS.NL, formula: `0.25×${a.nl.toFixed(3)}` },
    { component: 'Gas', value: normalizeGas, weight: BTCP_WEIGHTS.GAS, formula: `0.20×max(0,1−${a.gasMeanUsd.toFixed(2)}/31)` },
    { component: 'Finality', value: finalityConf, weight: BTCP_WEIGHTS.FINALITY, formula: `0.20×${finalityConf.toFixed(3)}` },
    { component: 'CC', value: a.ccCoherence, weight: BTCP_WEIGHTS.CC, formula: `0.15×${a.ccCoherence.toFixed(3)}` },
    { component: 'BEO', value: a.beoContinuity, weight: BTCP_WEIGHTS.BEO, formula: `0.20×${a.beoContinuity.toFixed(3)}` },
    { component: 'MF penalty', value: 1 - clamp01(a.mfScore), weight: 1, formula: `×(1−${a.mfScore.toFixed(3)})` },
  ]
}
const nettingBreakdown = (a: ChainAnalysis) => [
  ...splitBreakdown(a),
  { component: 'Netting premium', value: 0.15, weight: 1, formula: '+0.15 (zero movement)' },
]
const bitpBreakdown = (a: ChainAnalysis) => [
  ...splitBreakdown(a),
  { component: 'BITP mode', value: 0.9, weight: 1, formula: '×0.9 (illiquid destination)' },
]
const deferredBreakdown = (a: ChainAnalysis) => [
  ...splitBreakdown(a),
  { component: 'BRT window', value: 0.78, weight: 1, formula: 'gas ×0.22 at ultradian low' },
]

/** Escrow state machine transitions (BTCP escrow). */
export const ESCROW_STATES = ['HOLDING', 'PENDING_AKASHIC', 'RELEASED', 'REVERTED', 'EMERGENCY_REVERTED'] as const
export type EscrowState = (typeof ESCROW_STATES)[number]

export const canTransitionEscrow = (from: EscrowState, to: EscrowState): boolean => {
  const transitions: Record<EscrowState, EscrowState[]> = {
    HOLDING: ['RELEASED', 'REVERTED', 'PENDING_AKASHIC', 'EMERGENCY_REVERTED'],
    PENDING_AKASHIC: ['RELEASED', 'REVERTED'],
    RELEASED: [], REVERTED: [], EMERGENCY_REVERTED: [],
  }
  return transitions[from].includes(to)
}
