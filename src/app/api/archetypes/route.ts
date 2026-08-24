import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET — archetype distribution across the Akashic Index.
 * Groups entities + behavioral-hash volume per archetype, with event-type
 * distribution per archetype (the L2.2 pattern signature).
 */
export async function GET() {
  const entities = await db.entity.findMany({
    select: { id: true, label: true, archetype: true, coherence: true, depth: true, bhCount: true, kind: true },
  })

  // BH volume per archetype via groupBy on joined hashes
  const bhByEntity = await db.behavioralHash.groupBy({
    by: ['entityId'],
    _count: { _all: true },
  })
  const bhMap = new Map(bhByEntity.map(r => [r.entityId, r._count._all]))

  // Event-type distribution per archetype
  const eventByEntity = await db.behavioralHash.groupBy({
    by: ['entityId', 'eventType'],
    _count: { _all: true },
  })
  const eventMap = new Map<string, Map<number, number>>()
  for (const r of eventByEntity) {
    if (!eventMap.has(r.entityId)) eventMap.set(r.entityId, new Map())
    eventMap.get(r.entityId)!.set(r.eventType, r._count._all)
  }

  interface ArchetypeAgg {
    archetype: string
    entityCount: number
    bhVolume: number
    avgCoherence: number
    totalDepth: number
    entities: { label: string; coherence: number; depth: number; bhCount: number; kind: string }[]
    eventMix: Record<string, number>
  }
  const agg = new Map<string, ArchetypeAgg>()

  for (const e of entities) {
    const a = agg.get(e.archetype) ?? {
      archetype: e.archetype, entityCount: 0, bhVolume: 0, avgCoherence: 0,
      totalDepth: 0, entities: [], eventMix: {},
    }
    a.entityCount++
    a.bhVolume += bhMap.get(e.id) ?? 0
    a.totalDepth += e.depth
    a.entities.push({
      label: e.label, coherence: e.coherence, depth: e.depth,
      bhCount: bhMap.get(e.id) ?? 0, kind: e.kind,
    })
    // merge event mix
    const mix = eventMap.get(e.id)
    if (mix) {
      for (const [type, count] of mix) {
        a.eventMix[String(type)] = (a.eventMix[String(type)] ?? 0) + count
      }
    }
    agg.set(e.archetype, a)
  }

  const EVENT_NAMES = [
    'TRANSFER', 'SWAP', 'LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOVERNANCE',
    'PROPOSAL', 'BORROW', 'REPAY', 'LIQUIDATE', 'BRIDGE', 'DEPLOY',
    'UPGRADE', 'MINT', 'BURN', 'ORACLE_UPDATE', 'MEV_CAPTURE',
    'FLASH_LOAN', 'AIRDROP', 'CLAIM',
  ]

  const archetypes = Array.from(agg.values()).map(a => {
    const coherences = a.entities.map(x => x.coherence)
    return {
      ...a,
      avgCoherence: coherences.length ? coherences.reduce((x, y) => x + y, 0) / coherences.length : 0,
      entities: a.entities.sort((x, y) => y.depth - x.depth),
      // top-5 event types by volume with names
      topEvents: Object.entries(a.eventMix)
        .sort((x, y) => y[1] - x[1])
        .slice(0, 5)
        .map(([type, count]) => ({
          type: EVENT_NAMES[Number(type)] ?? `TYPE_${type}`,
          count,
          pct: a.bhVolume > 0 ? count / a.bhVolume : 0,
        })),
    }
  }).sort((a, b) => b.bhVolume - a.bhVolume)

  const totalBh = archetypes.reduce((s, a) => s + a.bhVolume, 0)

  // Risk tier mapping (from seed archetypes)
  const RISK_TIERS: Record<string, { tier: string; note: string }> = {
    HEALTHY_DEFI: { tier: 'LOW', note: 'Diversified protocol behavior — normal DeFi cycle' },
    ORGANIC_GROWTH: { tier: 'LOW', note: 'Natural accumulation with governance participation' },
    INFRASTRUCTURE: { tier: 'LOW', note: 'Sequencer/bridge operational patterns' },
    ACCUMULATION: { tier: 'LOW-MED', note: 'Whale accumulation — large directional positions' },
    DORMANT_ACCUMULATION: { tier: 'LOW-MED', note: 'Long-hold wallets with minimal churn' },
    BOT_SWARM: { tier: 'MEDIUM', note: 'MEV-extraction signatures — monitored' },
    WASH_TRADING: { tier: 'HIGH', note: 'Cyclic flow patterns — MF discount applied' },
    PONZI_STRUCTURE: { tier: 'HIGH', note: 'Leverage cascade exposure — BIRP candidate' },
  }

  return NextResponse.json({
    totalArchetypes: archetypes.length,
    totalEntities: entities.length,
    totalBehavioralHashes: totalBh,
    archetypes: archetypes.map(a => ({
      ...a,
      risk: RISK_TIERS[a.archetype] ?? { tier: 'UNKNOWN', note: 'Unclassified archetype' },
      bhShare: totalBh > 0 ? a.bhVolume / totalBh : 0,
    })),
  })
}
