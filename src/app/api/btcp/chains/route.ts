import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bridgePairsEliminated } from '@/lib/trion/chains'

export const dynamic = 'force-dynamic'

/** GET — full 100+ chain registry with NL scores and VM distribution. */
export async function GET() {
  const dbChains = await db.chain.findMany({ orderBy: { id: 'asc' } })
  const byVm: Record<string, number> = {}
  for (const c of dbChains) byVm[c.vm] = (byVm[c.vm] ?? 0) + 1

  return NextResponse.json({
    total: dbChains.length,
    vmFamilies: Object.keys(byVm).length,
    bridgePairsEliminated: bridgePairsEliminated(dbChains.length),
    networkEffectFormula: 'N(N−1)/2 — each new chain eliminates bridges with ALL previous chains',
    vmDistribution: byVm,
    chains: dbChains.map(c => ({
      id: c.id, name: c.name, nativeChainId: c.nativeChainId, vm: c.vm,
      category: c.category, explorer: c.explorer, nativeToken: c.nativeToken,
      finalitySec: c.finalitySec, avgGasUsd: c.avgGasUsd,
      blockTimeSec: c.blockTimeSec, status: c.status,
      nlScore: c.nlScore,
      rpcs: JSON.parse(c.rpcs),
    })),
  })
}
