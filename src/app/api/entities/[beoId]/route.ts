import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const EVENT_NAMES = [
  'TRANSFER', 'SWAP', 'LIQUIDITY', 'STAKE', 'UNSTAKE', 'GOVERNANCE',
  'PROPOSAL', 'BORROW', 'REPAY', 'LIQUIDATE', 'BRIDGE', 'DEPLOY',
  'UPGRADE', 'MINT', 'BURN', 'ORACLE_UPDATE', 'MEV_CAPTURE',
  'FLASH_LOAN', 'AIRDROP', 'CLAIM',
]

/**
 * GET — full BEO profile: event mix, chain span, magnitude distribution,
 * 48h activity series, and recent hashes.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ beoId: string }> },
) {
  const { beoId } = await params
  const entity = await db.entity.findUnique({ where: { beoId } })
  if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 })

  const hashes = await db.behavioralHash.findMany({
    where: { entityId: entity.id },
    orderBy: { timestamp: 'desc' },
    take: 500,
  })

  // Event mix
  const eventCounts = new Map<number, number>()
  for (const h of hashes) eventCounts.set(h.eventType, (eventCounts.get(h.eventType) ?? 0) + 1)
  const totalBh = hashes.length || 1
  const eventMix = Array.from(eventCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type: EVENT_NAMES[type] ?? `TYPE_${type}`,
      count,
      pct: count / totalBh,
    }))

  // Chain span
  const chainCounts = new Map<number, number>()
  for (const h of hashes) chainCounts.set(h.chainId, (chainCounts.get(h.chainId) ?? 0) + 1)
  const chainNames = await db.chain.findMany({
    where: { id: { in: Array.from(chainCounts.keys()) } },
    select: { id: true, name: true, vm: true },
  })
  const nameMap = new Map(chainNames.map(c => [c.id, c]))
  const chainSpan = Array.from(chainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([chainId, count]) => ({
      chainId,
      name: nameMap.get(chainId)?.name ?? `chain-${chainId}`,
      vm: nameMap.get(chainId)?.vm ?? '—',
      count,
      pct: count / totalBh,
    }))

  // Magnitude distribution (10 buckets)
  const buckets = new Array(10).fill(0)
  for (const h of hashes) {
    const idx = Math.min(9, Math.max(0, Math.floor(h.magnitudeNorm * 10)))
    buckets[idx]++
  }

  // 48h hourly activity series
  const nowMs = Date.now()
  const series = new Array(48).fill(0)
  for (const h of hashes) {
    const bucket = Math.floor((nowMs - h.timestamp.getTime()) / 3600_000)
    if (bucket >= 0 && bucket < 48) series[47 - bucket]++
  }

  // Signal stats
  const signals = await db.signal.findMany({
    where: { entityId: entity.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  const emitted = signals.filter(s => s.emitted).length

  return NextResponse.json({
    beoId: entity.beoId,
    label: entity.label,
    kind: entity.kind,
    archetype: entity.archetype,
    depth: entity.depth,
    coherence: entity.coherence,
    trustTier: entity.trustTier,
    eventMix,
    chainSpan,
    magnitudeBuckets: buckets,
    activitySeries: series,
    stats: {
      totalHashes: hashes.length,
      chainsSpanned: chainSpan.length,
      signals: signals.length,
      emitted,
      silenced: signals.length - emitted,
      silenceRate: signals.length > 0 ? (signals.length - emitted) / signals.length : 0,
      firstSeen: entity.createdAt,
      lastHashAt: hashes[0]?.timestamp ?? null,
    },
  })
}
