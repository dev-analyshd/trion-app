import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeDWBFT, type ValidatorModel } from '@/lib/trion/dwbft'
import { clamp01 } from '@/lib/trion/constants'

export const dynamic = 'force-dynamic'

/**
 * Each validator's model vector = a short time-series of its scalar output
 * estimates (what the validator believes C(t) is, per round). Honest
 * validators estimate independently (small idiosyncratic noise).
 */
const modelVectorFor = (seed: number): number[] => {
  const rng = (s: number) => {
    let t = (s * 2654435761) % 4294967296
    return () => { t = (t * 1103515245 + 12345) % 4294967296; return t / 4294967296 }
  }
  const r = rng(seed)
  const trueValue = 0.72
  return Array.from({ length: 8 }, () => clamp01(trueValue + (r() - 0.5) * 0.08))
}

/** GET — DW-BFT validator mesh: Σ(t), HHI, coordination-collapse demo. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const volatility = Number(url.searchParams.get('volatility') ?? 0.3)
  const simulateAttack = url.searchParams.get('attack') === '1'

  const validatorsRaw = await db.validator.findMany()
  const validatorModels: ValidatorModel[] = validatorsRaw.map((v, i) => ({
    id: v.id, name: v.name, region: v.region, continent: v.continent,
    stake: v.stake,
    modelVector: modelVectorFor(v.id.charCodeAt(0) + v.stake + i),
  }))

  const consensus = computeDWBFT(validatorModels, volatility, validatorsRaw.length < 5)

  const continents: Record<string, number> = {}
  validatorsRaw.forEach(v => { continents[v.continent] = (continents[v.continent] ?? 0) + v.stake })
  const totalStake = Object.values(continents).reduce((a, b) => a + b, 0)

  // ── Attack simulation (Coordination Collapse Theorem, spec §12.2) ────────
  const attack = simulateAttack ? (() => {
    const byzCount = Math.ceil(validatorModels.length * 0.4)
    const honest = validatorModels.slice(byzCount)
    const dims = 8
    const med: number[] = []
    for (let d = 0; d < dims; d++) {
      const col = honest.map(v => v.modelVector[d]).sort((a, b) => a - b)
      med.push(col[Math.floor(col.length / 2)])
    }
    const byz = validatorModels.slice(0, byzCount).map(v => ({ ...v, modelVector: med }))
    const mixed = [...byz, ...honest]
    const c = computeDWBFT(mixed, volatility)

    const totalEffective = c.diversityWeights.reduce((a, w) => a + w.effectiveStake, 0) || 1
    const byzEffective = c.diversityWeights
      .filter(w => byz.some(b => b.id === w.id))
      .reduce((acc, w) => acc + w.effectiveStake, 0)
    const byzNominal = byz.reduce((a, v) => a + v.stake, 0) /
      mixed.reduce((a, v) => a + v.stake, 0)

    return {
      scenario: '40% of validators coordinate — identical median-tracking outputs (Nash-optimal byzantine strategy)',
      byzantineNominalShare: byzNominal,
      byzantineEffectiveShare: byzEffective / totalEffective,
      theorem: 'lim(coordination→1) Σ_Byzantine s_j·d_j = 0 — because d_j = 1 − corr(M_j, M̄) → 0 when outputs are identical',
      exclusionNote: 'The alternative strategy (outputs deviating from median) is excluded by the δ(t) consensus window instead',
      conclusion: 'Coordinated attack self-destructs: perfect coordination = perfect correlation with the median = exactly zero diversity weight',
    }
  })() : null

  return NextResponse.json({
    sigma: consensus.sigma,
    consensusValue: consensus.consensusValue,
    dynamicDelta: consensus.dynamicDelta,
    hhi: consensus.hhi,
    hhiTier: consensus.hhiTier,
    safetyMargin: consensus.safetyMargin,
    geographicDistribution: Object.fromEntries(
      Object.entries(continents).map(([k, v]) => [k, +(v / totalStake).toFixed(3)])
    ),
    continentsCovered: Object.keys(continents).length,
    minContinentsRequired: 4,
    validators: consensus.diversityWeights.map(w => {
      const raw = validatorsRaw.find(v => v.id === w.id)!
      return {
        name: w.name, region: raw.region, continent: raw.continent,
        stake: raw.stake, diversityWeight: w.d, effectiveStake: w.effectiveStake,
        uptime: raw.uptime,
      }
    }).sort((a, b) => b.effectiveStake - a.effectiveStake),
    coordinationCollapse: consensus.coordinationCollapse,
    attackSimulation: attack,
    bootstrap: validatorsRaw.length < 5
      ? { disclosed: true, note: 'Σ = 0.25 bootstrap value — validator mesh below launch threshold' }
      : null,
  })
}
