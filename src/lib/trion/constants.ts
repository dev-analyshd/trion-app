// TRION Protocol — Canonical Constants (Whitepaper §L0–L9 + BTCP Master Spec)
// Every constant here is normative. Do not change without a spec amendment.

// ── L0.1: The 20 canonical VM-agnostic event types ──────────────────────────
export const EVENT_TYPES = [
  'TRANSFER', 'SWAP', 'LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOVERNANCE',
  'PROPOSAL', 'BORROW', 'REPAY', 'LIQUIDATE', 'BRIDGE', 'DEPLOY',
  'UPGRADE', 'MINT', 'BURN', 'ORACLE_UPDATE', 'MEV_CAPTURE',
  'FLASH_LOAN', 'AIRDROP', 'CLAIM',
] as const
export type EventType = (typeof EVENT_TYPES)[number]
export const EVENT_TYPE_IDS: Record<EventType, number> = EVENT_TYPES.reduce(
  (acc, name, i) => ({ ...acc, [name]: i }), {} as Record<EventType, number>
)

// Event-type weights for resonance scoring (L0.3)
export const EVENT_WEIGHTS: Record<EventType, number> = {
  TRANSFER: 1.0, SWAP: 1.3, LIQUIDITY: 1.4, STAKE: 1.2, UNSTAKE: 1.2,
  GOVERNANCE: 1.8, PROPOSAL: 1.6, BORROW: 1.3, REPAY: 1.2, LIQUIDATE: 1.6,
  BRIDGE: 1.5, DEPLOY: 2.0, UPGRADE: 2.0, MINT: 1.1, BURN: 1.1,
  ORACLE_UPDATE: 1.4, MEV_CAPTURE: 1.8, FLASH_LOAN: 1.8, AIRDROP: 1.3, CLAIM: 1.1,
}

// ── L5.2: Five-Plane Coherence weights ──────────────────────────────────────
// C(t) = α·Φ + β·M + γ·Σ + δ·K + ε·A
export interface PlaneWeights {
  alpha: number; beta: number; gamma: number; delta: number; epsilon: number
}

export const WEIGHT_PROFILES: Record<string, PlaneWeights> = {
  DEFAULT:     { alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 },
  NEW_TOKEN:   { alpha: 0.40, beta: 0.15, gamma: 0.30, delta: 0.10, epsilon: 0.05 },
  MATURE:      { alpha: 0.25, beta: 0.30, gamma: 0.25, delta: 0.10, epsilon: 0.10 },
  STABLECOIN:  { alpha: 0.20, beta: 0.35, gamma: 0.25, delta: 0.10, epsilon: 0.10 },
  GOVERNANCE:  { alpha: 0.20, beta: 0.20, gamma: 0.25, delta: 0.25, epsilon: 0.10 },
  BRIDGE:      { alpha: 0.20, beta: 0.20, gamma: 0.35, delta: 0.10, epsilon: 0.15 },
  WRAPPED:     { alpha: 0.20, beta: 0.25, gamma: 0.35, delta: 0.05, epsilon: 0.15 },
  SPEED:       { alpha: 0.50, beta: 0.20, gamma: 0.20, delta: 0.05, epsilon: 0.05 },
  INTELLIGENCE:{ alpha: 0.15, beta: 0.35, gamma: 0.15, delta: 0.05, epsilon: 0.30 },
  CERTAINTY:   { alpha: 0.15, beta: 0.20, gamma: 0.50, delta: 0.10, epsilon: 0.05 },
  FULL_SPECTRUM:{ alpha: 0.20, beta: 0.20, gamma: 0.20, delta: 0.20, epsilon: 0.20 },
}

// ── L5.1: Dynamic threshold Θ(t) = Θ_min + (Θ_max − Θ_min)·V(t) ─────────────
export const THETA_MIN = 0.55
export const THETA_MAX = 0.92

// ── L1.1: Physical plane — 9 Shannon-entropy feature weights (Σ = 1.0) ──────
export const PHI_WEIGHTS = [0.15, 0.15, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.10]

// ── L1.2: Manipulation fingerprint thresholds ───────────────────────────────
export const MF_THRESHOLDS = {
  ORACLE_ATTACK: 0.15,       // >15% TWAP deviation → MF = 1.0
  WASH_TRADING: 0.60,        // cyclic flow ratio
  SYBIL_LIQUIDITY: 0.80,     // top-5 LP share
  GOVERNANCE_CAPTURE: 4000,  // HHI
  MEV_SUSTAINED: 0.005,      // rate
  COORDINATED_PUMP: 0.80,    // sync ratio
  FAKE_VOLUME: 0.40,         // entropy deficit
}

// ── L4: DW-BFT / HHI enforcement ─────────────────────────────────────────────
export const HHI_TIERS = { HEALTHY: 1500, WARNING: 2500, DANGER: 4000 }
export const DELTA_BASE = 0.05 // dynamic consensus window δ(t) = δ_base·(1+V)
export const MIN_CONTINENTS = 4
export const MAX_SINGLE_REGION = 0.40
export const MAX_SINGLE_JURISDICTION = 0.30

// ── Bootstrap honesty values ────────────────────────────────────────────────
export const BOOTSTRAP = { SIGMA: 0.25, K: 0.10, ANIMA: 0.10 }
export const D_MINIMUM = 10_000

// ── L0.5: Moat factors M_moat = D·Q·R·X·F·N ─────────────────────────────────
export const MOAT = {
  D_DEPTH_SCALE: 1000,
  Q_K_FLOOR: 0.15,
  R_REFLEXIVITY_PEAK: 0.30,
  X_CHAIN_TARGET: 3,
  F_BASELINE: 0.90,
  N_TAU_SECONDS: 1e8, // ≈3.17 years
}

// ── BTCP score weights (BTCP Master Spec §4.2) ─────────────────────────────
export const BTCP_WEIGHTS = { NL: 0.25, GAS: 0.20, FINALITY: 0.20, CC: 0.15, BEO: 0.20 }
export const BTCP_MIN_SCORE = 0.10
export const BTCP_SAFE_SCORE = 0.50
export const GAS_99TH_PERCENTILE = 31.0 // USD, rolling 30d
export const NL_ALERT_THRESHOLD = 0.30
export const MIN_FINALITY_CONF = 0.80
export const MIN_VALIDATORS = 3

// ── 24 signal types (whitepaper §11 + BTCP spec §14.2) ──────────────────────
export const SIGNAL_TYPES = [
  { id: 0, name: 'VALUATION', critical: true },
  { id: 1, name: 'SILENCE', critical: true },
  { id: 2, name: 'LIQUIDITY_HEALTH', critical: true },
  { id: 3, name: 'MANIPULATION_ALERT', critical: true },
  { id: 4, name: 'GENESIS', critical: true },
  { id: 5, name: 'RESURRECTION', critical: false },
  { id: 6, name: 'FORK_RESOLUTION', critical: false },
  { id: 7, name: 'TRAJECTORY_ANOMALY', critical: false },
  { id: 8, name: 'REGULATORY_BEHAVIORAL', critical: false },
  { id: 9, name: 'GOVERNANCE_FRACTURE', critical: false },
  { id: 10, name: 'THERMODYNAMIC_ANOMALY', critical: false },
  { id: 11, name: 'PHASE_TRANSITION', critical: false },
  { id: 12, name: 'TEMPORAL_ANOMALY', critical: false },
  { id: 13, name: 'SHADOW_CHAIN', critical: false },
  { id: 14, name: 'LIQUIDITY_OCEAN', critical: false },
  { id: 15, name: 'CONSENSUS_ADAPTATION', critical: false },
  { id: 16, name: 'CHAIN_RELIABILITY', critical: false },
  { id: 17, name: 'BTCP_ROUTE', critical: true },
  { id: 18, name: 'BEHAVIORAL_TRUTH', critical: true },
  { id: 19, name: 'BTCP_ESCROW_EVENT', critical: false },
  { id: 20, name: 'BTCP_TIMEOUT', critical: false },
  { id: 21, name: 'GENESIS_COMMITMENT', critical: false },
  { id: 22, name: 'SYSTEMIC_RISK', critical: true },
  { id: 23, name: 'CONSENSUS_ADAPTATION_REQ', critical: false },
] as const

// ── BRT periods (L6.2) ──────────────────────────────────────────────────────
export const BRT_PERIODS = {
  CIRCADIAN: 86400,
  ULTRADIAN: 5400,
  LUNAR: 2551442.0,
  SEASONAL: 31557600.0,
}

// ── L7: Natural Liquidity ───────────────────────────────────────────────────
export const NL_WEIGHTS = { LD: 1, LO: 1, LC: 1, LS: 1 } // multiplicative

// ── Emergency windows (BTCP escrow) ────────────────────────────────────────
export const EMERGENCY_ESCAPE_SEC = 7 * 86400
export const AKASHIC_RECOVERY_SEC = 24 * 3600

// ── Slashing schedule (bps) ────────────────────────────────────────────────
export const SLASHING_BPS = {
  DOUBLE_SIGN: 5000, OFFLINE: 100, FALSE_SIGNAL: 300,
  MANIPULATION: 10000, SYBIL: 2500,
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
