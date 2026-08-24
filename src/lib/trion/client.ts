'use client'

// Client-side fetch helpers for the TRION backend APIs.

export async function fetchJSON<T>(url: string, timeoutMs = 15000): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export async function postJSON<T>(url: string, body: unknown, timeoutMs = 20000): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    return await res.json() as T
  } catch {
    return null
  }
}

// ── Types mirroring the backend responses ───────────────────────────────────
export interface HealthResponse {
  status: string
  version: string
  akashicIndex: {
    entities: number; behavioralHashes: number; signals: number
    validators: number; btcpRoutes: number; btcpEscrows: number
  }
  network: { chains: number; vmFamilies: number; bridgePairsEliminated: number }
  liveRpcProbes: { chain: string; vm: string; online: boolean; latencyMs: number }[]
  uptimeSec: number
}

export interface EntitySummary {
  id: string; beoId: string; label: string; kind: string
  address: string | null; chains: number[]; depth: number
  archetype: string; coherence: number; trustTier: string; bhCount: number
}

export interface SignalResponse {
  label: string; beoId: string
  coherence: number; threshold: number; margin: number; passes: boolean
  limitingPlane: string; tValue: number
  moat: { product: number; moat: number; factors: { key: string; name: string; value: number; formula: string }[] }
  planes: {
    physical: { raw: number; adjusted: number; mf: number; features: { name: string; value: number; weight: number; description: string }[] }
    mental: { base: number; adjusted: number; oe: number }
    spiritual: { sigma: number; hhi: number; hhiTier: string; validators: number }
    conscious: { k: number; annotations: number }
    anima: { value: number; note: string }
  }
  planeWeights: { alpha: number; beta: number; gamma: number; delta: number; epsilon: number }
  volatility: number; signalType: string; status: string
  ci95: [number, number]; depth: number; archetype: string
  silenceReason?: string
}

export interface BhListResponse {
  total: number
  hashes: {
    id: number; entity: string; eventType: string; eventTypeCode: number
    magnitudeNorm: number; chainId: number; blockNumber: number
    timestamp: string; sense: string; antisense: string; complement: string
    payload: string; verified: boolean; invariant: boolean
  }[]
  chainDistribution: { chainId: number; count: number }[]
  eventTypes: string[]
}

export interface BtcpChainsResponse {
  total: number; vmFamilies: number; bridgePairsEliminated: number
  vmDistribution: Record<string, number>
  chains: {
    id: number; name: string; vm: string; category: string; nativeToken: string
    finalitySec: number; avgGasUsd: number; nlScore: number; status: string
    rpcs: string[]
  }[]
}

export interface BtcpRouteResponse {
  route: {
    routeType: string; btcpScore: number; gasCostUsd: number; gasSavedPct: number
    reason: string; valid: boolean
    breakdown: { component: string; value: number; weight: number; formula: string }[]
    selectedChains: { chainId: number; name: string }[]
  }
  gasComparisons: {
    singleChainEth: number; bridgeBaseline: number
    bridges: Record<string, number>; btcpSelected: number
  }
  candidates: {
    chainId: number; name: string; nl: number; gasMeanUsd: number
    finalitySec: number; mfScore: number
  }[]
  routeLadder: { type: string; description: string }[]
  zeroBridgeProof: { assetsBridged: boolean; crossChainMovement: number; bridge: string; note: string }
}

export interface ValidatorsResponse {
  sigma: number; consensusValue: number; hhi: number; hhiTier: string
  safetyMargin: number; continentsCovered: number; minContinentsRequired: number
  geographicDistribution: Record<string, number>
  validators: {
    name: string; region: string; continent: string; stake: number
    diversityWeight: number; effectiveStake: number; uptime: number
  }[]
  attackSimulation: {
    scenario: string; byzantineNominalShare: number; byzantineEffectiveShare: number
    theorem: string; conclusion: string
  } | null
}

export interface AnimaNewsResponse {
  fetched: number
  live: { title: string; source: string; url: string; sentiment: number; credibility: number; publishedAt: string }[]
  calibration: { crossSourceAgreement: number; credibilityWeightedSentiment: number; sources: string[] }
  degraded?: boolean
  note: string
}

export interface AnimaGithubResponse {
  fetched: number
  repos: { repo: string; stars: number; forks: number; openIssues: number; sentiment: number }[]
  ecosystemDevHealth: number
  degraded?: boolean
  note: string
}

export interface AnimaSecResponse {
  fetched: number
  filings: { company: string; form: string; filedAt: string; url: string; sentiment: number }[]
  degraded?: boolean
  note: string
}

export interface SignalHistoryResponse {
  total: number; emitted: number; silenced: number; silenceRate: number
  signals: {
    id: string; entity: string; type: string; status: string
    coherence: number; threshold: number; margin: number; tValue: number
    limitingPlane: string | null; volatility: number; emitted: boolean
    createdAt: string
  }[]
}

// ── Formatting helpers ───────────────────────────────────────────────────────
export const fmtNum = (n: number, digits = 2): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const fmtInt = (n: number): string => n.toLocaleString('en-US')

export const fmtCompact = (n: number): string => {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(Math.round(n))
}

export const truncateHex = (h: string, chars = 8): string =>
  h.length <= chars * 2 ? h : `${h.slice(0, chars)}…${h.slice(-chars)}`

export const sentimentColor = (s: number): string =>
  s > 0.6 ? 'text-emerald-400' : s < 0.4 ? 'text-rose-400' : 'text-zinc-400'

export const statusColor = (s: string): string => {
  switch (s) {
    case 'NOMINAL': case 'RELEASED': case 'COMPLETED': case 'FINALIZED': case 'ACTIVE': case 'HEALTHY':
      return 'text-emerald-400'
    case 'WARN': case 'PENDING': case 'ROUTING': case 'EXECUTING': case 'HOLDING': case 'WARNING':
      return 'text-amber-400'
    case 'SILENCE': case 'REVERTED': case 'EXPIRED': case 'FAILED': case 'DEGRADED':
      return 'text-zinc-400'
    case 'COLLAPSE': case 'HOSTILE': case 'EMERGENCY_REVERTED': case 'CRITICAL': case 'DANGER':
      return 'text-rose-400'
    default: return 'text-zinc-300'
  }
}

export interface NlResponse {
  formula: string
  factorDefinitions: { key: string; name: string; formula: string }[]
  alertThreshold: number
  total: number; routable: number; alertCount: number
  chains: {
    chainId: number; name: string; vm: string; nativeToken: string
    finalitySec: number; avgGasUsd: number
    nl: number; alert: boolean; action: string
    factors: { key: string; name: string; value: number; formula: string }[]
    ld: number; lo: number; lc: number; ls: number
  }[]
  worstChains: { name: string; nl: number }[]
  bestChains: { name: string; nl: number }[]
}
